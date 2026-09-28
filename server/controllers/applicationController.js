const prisma = require('../config/db');
const cloudinary = require('../config/cloudinary');
const { verifyApplicationDocuments } = require('./verificationController');

// Create a new DRAFT application
const createApplication = async (req, res) => {
  try {
    const { schemeId } = req.body;
    const applicantId = req.user.userId;

    if (!schemeId) {
      return res.status(400).json({ message: 'Scheme ID is required.' });
    }

    // Verify scheme exists and is active
    const scheme = await prisma.scheme.findUnique({ where: { id: schemeId } });
    if (!scheme || !scheme.isActive) {
      return res.status(404).json({ message: 'Scheme not found or inactive.' });
    }

    // Check if applicant already has an active application for this scheme
    const existing = await prisma.application.findFirst({
      where: {
        applicantId,
        schemeId,
        status: { notIn: ['REJECTED'] },
      },
    });
    if (existing) {
      return res.status(409).json({
        message: 'You already have an application for this scheme.',
        applicationId: existing.id,
      });
    }

    const application = await prisma.application.create({
      data: { applicantId, schemeId, status: 'DRAFT' },
    });

    res.status(201).json({ message: 'Application created as draft.', application });
  } catch (error) {
    console.error('Create application error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// List applicant's own applications
const getMyApplications = async (req, res) => {
  try {
    const applicantId = req.user.userId;

    const applications = await prisma.application.findMany({
      where: { applicantId },
      include: {
        scheme: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({ applications });
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// Get one application with all details
const getApplicationById = async (req, res) => {
  try {
    const { id } = req.params;
    const applicantId = req.user.userId;

    const application = await prisma.application.findFirst({
      where: { id, applicantId },
      include: {
        scheme: {
          include: {
            applicationFields: { orderBy: { displayOrder: 'asc' } },
            documentRequirements: { orderBy: { createdAt: 'asc' } },
          },
        },
        fieldValues: { include: { field: true } },
        documents: { include: { documentRequirement: true } },
      },
    });

    if (!application) {
      return res.status(404).json({ message: 'Application not found.' });
    }

    res.json({ application });
  } catch (error) {
    console.error('Get application error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// Save/update field values (partial save for drafts)
const updateFieldValues = async (req, res) => {
  try {
    const { id } = req.params;
    const applicantId = req.user.userId;
    const { fieldValues } = req.body; // Array of { fieldId, value }

    const application = await prisma.application.findFirst({
      where: { id, applicantId },
    });

    if (!application) {
      return res.status(404).json({ message: 'Application not found.' });
    }

    if (application.status !== 'DRAFT' && application.status !== 'DEFICIENT') {
      return res.status(403).json({ message: 'Cannot edit application in current status.' });
    }

    if (!Array.isArray(fieldValues)) {
      return res.status(400).json({ message: 'fieldValues must be an array.' });
    }

    // Upsert each field value
    const upserts = fieldValues.map((fv) =>
      prisma.applicationFieldValue.upsert({
        where: {
          applicationId_fieldId: {
            applicationId: id,
            fieldId: fv.fieldId,
          },
        },
        create: {
          applicationId: id,
          fieldId: fv.fieldId,
          value: String(fv.value),
        },
        update: {
          value: String(fv.value),
        },
      })
    );

    await prisma.$transaction(upserts);

    res.json({ message: 'Field values saved successfully.' });
  } catch (error) {
    console.error('Update field values error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// Submit application
const submitApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const applicantId = req.user.userId;

    const application = await prisma.application.findFirst({
      where: { id, applicantId },
      include: {
        scheme: {
          include: {
            applicationFields: true,
            documentRequirements: true,
          },
        },
        fieldValues: true,
        documents: true,
      },
    });

    if (!application) {
      return res.status(404).json({ message: 'Application not found.' });
    }

    if (application.status !== 'DRAFT' && application.status !== 'DEFICIENT') {
      return res.status(403).json({ message: 'Application cannot be submitted in current status.' });
    }

    // Validate required fields
    const requiredFields = application.scheme.applicationFields.filter(f => f.isRequired);
    const filledFieldIds = application.fieldValues.map(fv => fv.fieldId);
    const missingFields = requiredFields.filter(f => {
      const val = application.fieldValues.find(fv => fv.fieldId === f.id);
      return !val || !val.value || val.value.trim() === '';
    });

    // Validate mandatory documents
    const mandatoryDocs = application.scheme.documentRequirements.filter(d => d.isMandatory);
    const uploadedDocReqIds = application.documents.map(d => d.documentRequirementId);
    const missingDocs = mandatoryDocs.filter(d => !uploadedDocReqIds.includes(d.id));

    if (missingFields.length > 0 || missingDocs.length > 0) {
      return res.status(400).json({
        message: 'Cannot submit: missing required fields or documents.',
        missingFields: missingFields.map(f => ({ id: f.id, label: f.fieldLabel })),
        missingDocuments: missingDocs.map(d => ({ id: d.id, name: d.documentName })),
      });
    }

    // Update status to SUBMITTED
    const updated = await prisma.application.update({
      where: { id },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
    });

    // Trigger AI document verification in background
    verifyApplicationDocuments(id).catch(err => {
      console.error('Auto-verification error:', err);
    });

    res.json({ message: 'Application submitted successfully.', application: updated });
  } catch (error) {
    console.error('Submit application error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// Upload document
const uploadDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const applicantId = req.user.userId;
    const { documentRequirementId } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    if (!documentRequirementId) {
      return res.status(400).json({ message: 'Document requirement ID is required.' });
    }

    const application = await prisma.application.findFirst({
      where: { id, applicantId },
    });

    if (!application) {
      return res.status(404).json({ message: 'Application not found.' });
    }

    if (application.status !== 'DRAFT' && application.status !== 'DEFICIENT') {
      return res.status(403).json({ message: 'Cannot upload documents in current status.' });
    }

    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `shiksha-saarthi/applications/${id}`,
          resource_type: 'auto',
          public_id: `${documentRequirementId}_${Date.now()}`,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(req.file.buffer);
    });

    // Remove existing doc for same requirement if any
    await prisma.applicationDocument.deleteMany({
      where: { applicationId: id, documentRequirementId },
    });

    // Save document record
    const doc = await prisma.applicationDocument.create({
      data: {
        applicationId: id,
        documentRequirementId,
        fileUrl: result.secure_url,
        fileName: req.file.originalname,
        status: 'PENDING',
      },
    });

    res.status(201).json({ message: 'Document uploaded successfully.', document: doc });
  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({ message: error.message || 'Internal server error.' });
  }
};

// Delete document
const deleteDocument = async (req, res) => {
  try {
    const { id, docId } = req.params;
    const applicantId = req.user.userId;

    const application = await prisma.application.findFirst({
      where: { id, applicantId },
    });

    if (!application) {
      return res.status(404).json({ message: 'Application not found.' });
    }

    if (application.status !== 'DRAFT' && application.status !== 'DEFICIENT') {
      return res.status(403).json({ message: 'Cannot delete documents in current status.' });
    }

    await prisma.applicationDocument.delete({ where: { id: docId } });

    res.json({ message: 'Document deleted successfully.' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Document not found.' });
    }
    console.error('Delete document error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

module.exports = {
  createApplication, getMyApplications, getApplicationById,
  updateFieldValues, submitApplication, uploadDocument, deleteDocument,
};
