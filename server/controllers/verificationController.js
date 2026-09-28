const prisma = require('../config/db');
const { processDocument } = require('../services/ocrService');
const { extractFields } = require('../services/fieldExtractionService');
const { compareFields } = require('../services/matchingService');

/**
 * Run verification pipeline on all documents for an application.
 * Called internally after submission or via API.
 */
const verifyApplicationDocuments = async (applicationId) => {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      documents: {
        include: { documentRequirement: true },
      },
      fieldValues: {
        include: { field: true },
      },
    },
  });

  if (!application) {
    throw new Error('Application not found.');
  }

  const results = [];

  for (const doc of application.documents) {
    try {
      // Step 1: OCR
      const { extractedText, confidenceScore, error: ocrError } = await processDocument(doc.fileUrl);

      if (ocrError || !extractedText || extractedText.trim().length < 10) {
        // OCR failed or returned garbage
        await prisma.applicationDocument.update({
          where: { id: doc.id },
          data: {
            extractedText: extractedText || '',
            confidenceScore: confidenceScore || 0,
            aiStatus: 'FAILED',
            aiFlagReason: 'OCR could not extract readable text from this document.',
            processedAt: new Date(),
          },
        });
        results.push({ docId: doc.id, aiStatus: 'FAILED' });
        continue;
      }

      // Step 2: Extract fields
      const documentType = doc.documentRequirement.documentName;
      const extractedFields = extractFields(extractedText, documentType);

      // Step 3: Match against application data
      const matchResult = compareFields(extractedFields, application.fieldValues);

      // Step 4: Determine AI status using dynamic threshold
      let aiStatus = 'VERIFIED';
      let aiFlagReason = null;

      // Fetch dynamic threshold for this document type (falls back to 80 if not found)
      let confidenceThreshold = 80;
      try {
        const thresholdRecord = await prisma.documentTypeThreshold.findUnique({
          where: { documentType },
        });
        if (thresholdRecord) {
          confidenceThreshold = thresholdRecord.currentConfidenceThreshold;
        }
      } catch (e) {
        // Table might not exist yet during initial setup — use default
      }

      const lowThreshold = Math.max(30, confidenceThreshold - 30); // dynamic low bar

      // Check confidence score against dynamic threshold
      if (confidenceScore < lowThreshold) {
        aiStatus = 'FLAGGED';
        aiFlagReason = `Low OCR confidence (${confidenceScore.toFixed(1)}%, threshold: ${lowThreshold}%). Document may be unclear or of poor quality.`;
      }

      // Check field matches
      const fieldMismatches = Object.entries(matchResult)
        .filter(([_, result]) => result.match === false);

      if (fieldMismatches.length > 0) {
        aiStatus = 'FLAGGED';
        const mismatchDetails = fieldMismatches
          .map(([field, result]) => `${field}: expected "${result.expected}", found "${result.found}"`)
          .join('; ');
        aiFlagReason = aiFlagReason
          ? `${aiFlagReason} Also: field mismatches \u2014 ${mismatchDetails}`
          : `Field mismatch detected \u2014 ${mismatchDetails}`;
      }

      // If confidence meets dynamic threshold and all matched fields actually matched
      if (confidenceScore >= confidenceThreshold && fieldMismatches.length === 0) {
        aiStatus = 'VERIFIED';
      }

      // Update document record
      await prisma.applicationDocument.update({
        where: { id: doc.id },
        data: {
          extractedText,
          extractedFields: JSON.stringify(extractedFields),
          confidenceScore,
          matchResult: JSON.stringify(matchResult),
          aiStatus,
          aiFlagReason,
          processedAt: new Date(),
        },
      });

      results.push({ docId: doc.id, aiStatus, confidenceScore });
    } catch (err) {
      console.error(`Verification error for doc ${doc.id}:`, err.message);
      await prisma.applicationDocument.update({
        where: { id: doc.id },
        data: {
          aiStatus: 'FAILED',
          aiFlagReason: `Processing error: ${err.message}`,
          processedAt: new Date(),
        },
      });
      results.push({ docId: doc.id, aiStatus: 'FAILED' });
    }
  }

  // Update application status to UNDER_VERIFICATION
  if (application.status === 'SUBMITTED') {
    await prisma.application.update({
      where: { id: applicationId },
      data: { status: 'UNDER_VERIFICATION' },
    });
  }

  return results;
};

/**
 * POST /api/applications/:id/verify-documents
 * Triggers document verification pipeline.
 */
const triggerVerification = async (req, res) => {
  try {
    const { id } = req.params;
    
    const application = await prisma.application.findUnique({ where: { id } });
    if (!application) {
      return res.status(404).json({ message: 'Application not found.' });
    }

    // Run verification asynchronously (don't block the response)
    res.json({ message: 'Document verification started.', applicationId: id });
    
    // Process in background
    verifyApplicationDocuments(id).catch(err => {
      console.error('Background verification error:', err);
    });
  } catch (error) {
    console.error('Trigger verification error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * GET /api/applications/:id/verification-results
 * Returns all documents with their AI verification results.
 */
const getVerificationResults = async (req, res) => {
  try {
    const { id } = req.params;
    
    const documents = await prisma.applicationDocument.findMany({
      where: { applicationId: id },
      include: { documentRequirement: true },
      orderBy: { createdAt: 'asc' },
    });

    const results = documents.map(doc => ({
      id: doc.id,
      documentName: doc.documentRequirement.documentName,
      fileName: doc.fileName,
      fileUrl: doc.fileUrl,
      status: doc.status,
      aiStatus: doc.aiStatus,
      confidenceScore: doc.confidenceScore,
      extractedFields: doc.extractedFields ? JSON.parse(doc.extractedFields) : null,
      matchResult: doc.matchResult ? JSON.parse(doc.matchResult) : null,
      aiFlagReason: doc.aiFlagReason,
      processedAt: doc.processedAt,
    }));

    res.json({ results });
  } catch (error) {
    console.error('Get verification results error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

module.exports = { verifyApplicationDocuments, triggerVerification, getVerificationResults };
