const prisma = require('../config/db');
const { changeApplicationStatus } = require('../utils/statusHelper');

/**
 * Helper: get scheme IDs assigned to this officer
 */
const getOfficerSchemeIds = async (officerId) => {
  const assignments = await prisma.officerSchemeAssignment.findMany({
    where: { officerId },
    select: { schemeId: true },
  });
  return assignments.map(a => a.schemeId);
};

// GET /api/officer/applications
const getApplicationQueue = async (req, res) => {
  try {
    const officerId = req.user.userId;
    const schemeIds = await getOfficerSchemeIds(officerId);

    if (schemeIds.length === 0) {
      return res.json({ applications: [], total: 0 });
    }

    const { status, schemeId, search, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      schemeId: { in: schemeIds },
      status: { notIn: ['DRAFT'] },
      applicant: {
        role: { not: 'ADMIN' }
      }
    };

    if (status) where.status = status;
    if (schemeId && schemeIds.includes(schemeId)) where.schemeId = schemeId;
    if (search) {
      where.applicant.name = { contains: search, mode: 'insensitive' };
    }

    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where,
        include: {
          applicant: { select: { id: true, name: true, email: true } },
          scheme: { select: { id: true, name: true } },
          assignedOfficer: { select: { id: true, name: true } },
        },
        orderBy: { submittedAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.application.count({ where }),
    ]);

    res.json({ applications, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    console.error('Get application queue error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// GET /api/officer/applications/:id
const getApplicationDetail = async (req, res) => {
  try {
    const officerId = req.user.userId;
    const schemeIds = await getOfficerSchemeIds(officerId);
    const { id } = req.params;

    const application = await prisma.application.findFirst({
      where: { id, schemeId: { in: schemeIds } },
      include: {
        applicant: { select: { id: true, name: true, email: true } },
        scheme: {
          include: {
            applicationFields: { orderBy: { displayOrder: 'asc' } },
            documentRequirements: true,
            eligibilityRules: true,
          },
        },
        assignedOfficer: { select: { id: true, name: true } },
        fieldValues: { include: { field: true } },
        documents: { include: { documentRequirement: true } },
        deficiencies: { orderBy: { raisedAt: 'desc' } },
        statusHistory: { orderBy: { changedAt: 'desc' } },
      },
    });

    if (!application) {
      return res.status(404).json({ message: 'Application not found or not in your assigned schemes.' });
    }

    // Parse JSON fields in documents for the response
    const docs = application.documents.map(doc => ({
      ...doc,
      extractedFields: doc.extractedFields ? JSON.parse(doc.extractedFields) : null,
      matchResult: doc.matchResult ? JSON.parse(doc.matchResult) : null,
    }));

    res.json({ application: { ...application, documents: docs } });
  } catch (error) {
    console.error('Get application detail error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// POST /api/officer/applications/:id/claim
const claimApplication = async (req, res) => {
  try {
    const officerId = req.user.userId;
    const schemeIds = await getOfficerSchemeIds(officerId);
    const { id } = req.params;

    const application = await prisma.application.findFirst({
      where: { id, schemeId: { in: schemeIds } },
    });

    if (!application) {
      return res.status(404).json({ message: 'Application not found or not in your assigned schemes.' });
    }

    if (application.assignedOfficerId && application.assignedOfficerId !== officerId) {
      return res.status(409).json({ message: 'This application is already claimed by another officer.' });
    }

    await prisma.application.update({
      where: { id },
      data: { assignedOfficerId: officerId },
    });

    res.json({ message: 'Application claimed successfully.' });
  } catch (error) {
    console.error('Claim application error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// PATCH /api/officer/documents/:docId/override
const overrideDocumentStatus = async (req, res) => {
  try {
    const officerId = req.user.userId;
    const { docId } = req.params;
    const { newStatus, overrideReason } = req.body;

    if (!newStatus || !overrideReason) {
      return res.status(400).json({ message: 'newStatus and overrideReason are required.' });
    }

    if (!['VERIFIED', 'FLAGGED'].includes(newStatus)) {
      return res.status(400).json({ message: 'newStatus must be VERIFIED or FLAGGED.' });
    }

    const doc = await prisma.applicationDocument.findUnique({
      where: { id: docId },
      include: { application: true, documentRequirement: true },
    });

    if (!doc) return res.status(404).json({ message: 'Document not found.' });

    // Verify officer has access to this scheme
    const schemeIds = await getOfficerSchemeIds(officerId);
    if (!schemeIds.includes(doc.application.schemeId)) {
      return res.status(403).json({ message: 'Not authorized for this scheme.' });
    }

    const wasOverridden = doc.aiStatus !== newStatus;

    await prisma.applicationDocument.update({
      where: { id: docId },
      data: {
        originalAiStatus: doc.originalAiStatus || doc.aiStatus,
        aiStatus: newStatus,
        overriddenById: officerId,
        overrideReason,
        status: newStatus,
      },
    });

    // Log to AIFeedbackLog
    await prisma.aIFeedbackLog.create({
      data: {
        applicationDocumentId: docId,
        documentType: doc.documentRequirement.documentName,
        originalAiStatus: doc.aiStatus,
        originalConfidenceScore: doc.confidenceScore,
        originalMatchResult: doc.matchResult,
        officerFinalStatus: newStatus,
        overrideReason,
        officerId,
        wasOverridden,
      },
    });

    res.json({ message: `Document status overridden to ${newStatus}.` });
  } catch (error) {
    console.error('Override document error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// GET /api/officer/applications/:id/eligibility-check
const checkEligibility = async (req, res) => {
  try {
    const officerId = req.user.userId;
    const schemeIds = await getOfficerSchemeIds(officerId);
    const { id } = req.params;

    const application = await prisma.application.findFirst({
      where: { id, schemeId: { in: schemeIds } },
      include: {
        scheme: { include: { eligibilityRules: true } },
        fieldValues: { include: { field: true } },
      },
    });

    if (!application) {
      return res.status(404).json({ message: 'Application not found.' });
    }

    const rules = application.scheme.eligibilityRules;
    const fieldMap = {};
    application.fieldValues.forEach(fv => {
      fieldMap[fv.field.fieldLabel.toLowerCase()] = fv.value;
    });

    const failedRules = [];
    for (const rule of rules) {
      const fieldValue = fieldMap[rule.fieldName.toLowerCase()];
      if (fieldValue === undefined) {
        failedRules.push({ rule: rule.fieldName, reason: 'Field not found in application data' });
        continue;
      }

      let passed = true;
      const numVal = parseFloat(fieldValue);
      const ruleVal = parseFloat(rule.value);

      switch (rule.operator) {
        case 'LESS_THAN':
          passed = !isNaN(numVal) && !isNaN(ruleVal) && numVal < ruleVal;
          break;
        case 'GREATER_THAN':
          passed = !isNaN(numVal) && !isNaN(ruleVal) && numVal > ruleVal;
          break;
        case 'EQUALS':
          passed = fieldValue.toLowerCase() === rule.value.toLowerCase();
          break;
        case 'IN':
          const allowed = rule.value.split(',').map(v => v.trim().toLowerCase());
          passed = allowed.includes(fieldValue.toLowerCase());
          break;
        default:
          passed = true;
      }

      if (!passed) {
        failedRules.push({
          rule: rule.fieldName,
          operator: rule.operator,
          expected: rule.value,
          actual: fieldValue,
          reason: `${rule.fieldName} ${rule.operator} ${rule.value} — actual value: ${fieldValue}`,
        });
      }
    }

    res.json({ eligible: failedRules.length === 0, failedRules });
  } catch (error) {
    console.error('Eligibility check error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// POST /api/officer/applications/:id/deficiencies
const raiseDeficiency = async (req, res) => {
  try {
    const officerId = req.user.userId;
    const schemeIds = await getOfficerSchemeIds(officerId);
    const { id } = req.params;
    const { reason, documentId } = req.body;

    if (!reason) return res.status(400).json({ message: 'Reason is required.' });

    const application = await prisma.application.findFirst({
      where: { id, schemeId: { in: schemeIds } },
    });
    if (!application) return res.status(404).json({ message: 'Application not found.' });

    const deficiency = await prisma.deficiencyRequest.create({
      data: {
        applicationId: id,
        documentId: documentId || null,
        reason,
        raisedById: officerId,
      },
    });

    // Change status to DEFICIENT
    await changeApplicationStatus(id, 'DEFICIENT', officerId, `Deficiency raised: ${reason}`);

    res.status(201).json({ message: 'Deficiency raised.', deficiency });
  } catch (error) {
    console.error('Raise deficiency error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// GET /api/officer/applications/:id/deficiencies
const getDeficiencies = async (req, res) => {
  try {
    const officerId = req.user.userId;
    const schemeIds = await getOfficerSchemeIds(officerId);
    const { id } = req.params;

    const application = await prisma.application.findFirst({
      where: { id, schemeId: { in: schemeIds } },
    });
    if (!application) return res.status(404).json({ message: 'Application not found.' });

    const deficiencies = await prisma.deficiencyRequest.findMany({
      where: { applicationId: id },
      orderBy: { raisedAt: 'desc' },
    });

    res.json({ deficiencies });
  } catch (error) {
    console.error('Get deficiencies error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// PATCH /api/officer/deficiencies/:id/resolve
const resolveDeficiency = async (req, res) => {
  try {
    const { id } = req.params;

    const deficiency = await prisma.deficiencyRequest.findUnique({ where: { id } });
    if (!deficiency) return res.status(404).json({ message: 'Deficiency not found.' });

    await prisma.deficiencyRequest.update({
      where: { id },
      data: { status: 'RESOLVED', resolvedAt: new Date() },
    });

    res.json({ message: 'Deficiency resolved.' });
  } catch (error) {
    console.error('Resolve deficiency error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// POST /api/officer/applications/:id/complete-scrutiny
const completeScrutiny = async (req, res) => {
  try {
    const officerId = req.user.userId;
    const schemeIds = await getOfficerSchemeIds(officerId);
    const { id } = req.params;
    const { remarks } = req.body;

    if (!remarks) return res.status(400).json({ message: 'Remarks are required.' });

    const application = await prisma.application.findFirst({
      where: { id, schemeId: { in: schemeIds } },
      include: {
        documents: { include: { documentRequirement: true } },
      },
    });
    if (!application) return res.status(404).json({ message: 'Application not found.' });

    // Log "confirmed" feedback for documents the officer did NOT override
    for (const doc of application.documents) {
      if (!doc.overriddenById) {
        // Officer implicitly confirmed the AI's decision
        await prisma.aIFeedbackLog.create({
          data: {
            applicationDocumentId: doc.id,
            documentType: doc.documentRequirement.documentName,
            originalAiStatus: doc.aiStatus,
            originalConfidenceScore: doc.confidenceScore,
            originalMatchResult: doc.matchResult,
            officerFinalStatus: doc.aiStatus,
            overrideReason: null,
            officerId,
            wasOverridden: false,
          },
        });
      }
    }

    await prisma.application.update({
      where: { id },
      data: {
        officerRemarks: remarks,
        scrutinyCompletedAt: new Date(),
      },
    });

    await changeApplicationStatus(id, 'READY_FOR_SELECTION', officerId, remarks);

    res.json({ message: 'Scrutiny completed. Application moved to READY_FOR_SELECTION.' });
  } catch (error) {
    console.error('Complete scrutiny error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// PATCH /api/officer/applications/:id/status
const updateApplicationStatus = async (req, res) => {
  try {
    const officerId = req.user.userId;
    const schemeIds = await getOfficerSchemeIds(officerId);
    const { id } = req.params;
    const { status, remarks } = req.body;

    if (!status) return res.status(400).json({ message: 'Status is required.' });

    const application = await prisma.application.findFirst({
      where: { id, schemeId: { in: schemeIds } },
    });
    if (!application) return res.status(404).json({ message: 'Application not found.' });

    await changeApplicationStatus(id, status, officerId, remarks);

    res.json({ message: `Application status updated to ${status}.` });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// PATCH /api/officer/applications/:id/remarks
const saveRemarks = async (req, res) => {
  try {
    const officerId = req.user.userId;
    const schemeIds = await getOfficerSchemeIds(officerId);
    const { id } = req.params;
    const { remarks } = req.body;

    const application = await prisma.application.findFirst({
      where: { id, schemeId: { in: schemeIds } },
    });
    if (!application) return res.status(404).json({ message: 'Application not found.' });

    await prisma.application.update({
      where: { id },
      data: { officerRemarks: remarks },
    });

    res.json({ message: 'Remarks saved.' });
  } catch (error) {
    console.error('Save remarks error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// GET /api/officer/my-schemes
const getMySchemes = async (req, res) => {
  try {
    const officerId = req.user.userId;
    const assignments = await prisma.officerSchemeAssignment.findMany({
      where: { officerId },
      include: { scheme: true }
    });
    const schemes = assignments.map(a => a.scheme);
    res.json({ schemes });
  } catch (error) {
    console.error('Get my schemes error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

module.exports = {
  getApplicationQueue, getApplicationDetail, claimApplication,
  overrideDocumentStatus, checkEligibility,
  raiseDeficiency, getDeficiencies, resolveDeficiency,
  completeScrutiny, updateApplicationStatus, saveRemarks,
  getMySchemes,
};
