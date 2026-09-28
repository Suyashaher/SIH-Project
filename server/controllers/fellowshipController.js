const prisma = require('../config/db');
const cloudinary = require('../config/cloudinary');

// === Fellowship Records ===

/**
 * Creates a FellowshipRecord when an application is selected.
 * Called from selectionController.decideApplication.
 */
const createFellowshipRecord = async (applicationId, applicantId, schemeId) => {
  // Check if record already exists
  const existing = await prisma.fellowshipRecord.findUnique({ where: { applicationId } });
  if (existing) return existing;

  const fellowship = await prisma.fellowshipRecord.create({
    data: {
      applicationId,
      applicantId,
      schemeId,
      fellowshipStatus: 'ACTIVE',
      startDate: new Date(),
      disbursementFrequency: 'QUARTERLY', // default, can be scheme-specific later
    },
  });

  // Auto-generate disbursement installments (default: quarterly for 2 years = 8 installments)
  const frequency = fellowship.disbursementFrequency;
  let numInstallments = 8;
  let intervalMonths = 3;
  const amount = 25000; // default per installment

  if (frequency === 'MONTHLY') { numInstallments = 24; intervalMonths = 1; }
  else if (frequency === 'QUARTERLY') { numInstallments = 8; intervalMonths = 3; }
  else if (frequency === 'ANNUAL') { numInstallments = 2; intervalMonths = 12; }
  else if (frequency === 'ONE_TIME') { numInstallments = 1; intervalMonths = 0; }

  const installments = [];
  for (let i = 0; i < numInstallments; i++) {
    const dueDate = new Date(fellowship.startDate);
    dueDate.setMonth(dueDate.getMonth() + (intervalMonths * (i + 1)));
    installments.push({
      fellowshipRecordId: fellowship.id,
      installmentNumber: i + 1,
      amount,
      status: 'PENDING',
      dueDate,
    });
  }

  if (installments.length > 0) {
    await prisma.disbursementRecord.createMany({ data: installments });
  }

  // Set expected end date based on last installment
  if (installments.length > 0) {
    await prisma.fellowshipRecord.update({
      where: { id: fellowship.id },
      data: { expectedEndDate: installments[installments.length - 1].dueDate },
    });
  }

  return fellowship;
};

// GET /api/admin/fellowships
const getAllFellowships = async (req, res) => {
  try {
    const { schemeId, status, search } = req.query;
    const where = {
      applicant: { role: { not: 'ADMIN' } }
    };
    if (schemeId) where.schemeId = schemeId;
    if (status) where.fellowshipStatus = status;
    if (search) {
      where.applicant.name = { contains: search, mode: 'insensitive' };
    }

    const fellowships = await prisma.fellowshipRecord.findMany({
      where,
      include: {
        applicant: { select: { id: true, name: true, email: true } },
        scheme: { select: { id: true, name: true } },
        disbursements: { orderBy: { installmentNumber: 'asc' } },
        documentRequirements: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Add computed fields
    const enriched = fellowships.map(f => {
      const nextDisbursement = f.disbursements.find(d => d.status === 'PENDING');
      const pendingDocs = f.documentRequirements.filter(d => d.status === 'PENDING' || d.status === 'OVERDUE').length;
      return {
        ...f,
        nextDisbursementDue: nextDisbursement?.dueDate || null,
        pendingDocumentsCount: pendingDocs,
      };
    });

    res.json({ fellowships: enriched });
  } catch (error) {
    console.error('Get fellowships error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// GET /api/admin/fellowships/:id
const getFellowshipById = async (req, res) => {
  try {
    const { id } = req.params;
    const fellowship = await prisma.fellowshipRecord.findUnique({
      where: { id },
      include: {
        applicant: { select: { id: true, name: true, email: true } },
        scheme: { select: { id: true, name: true } },
        application: { select: { id: true, status: true, submittedAt: true } },
        disbursements: { orderBy: { installmentNumber: 'asc' } },
        documentRequirements: {
          orderBy: { dueDate: 'asc' },
          include: { reviewedBy: { select: { name: true } } },
        },
        communications: {
          orderBy: { sentAt: 'desc' },
          include: { sentBy: { select: { name: true } } },
        },
      },
    });

    if (!fellowship) return res.status(404).json({ message: 'Fellowship not found.' });
    res.json({ fellowship });
  } catch (error) {
    console.error('Get fellowship error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// PATCH /api/admin/fellowships/:id/status
const updateFellowshipStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;

    if (!status || !['ACTIVE', 'SUSPENDED', 'COMPLETED', 'TERMINATED'].includes(status)) {
      return res.status(400).json({ message: 'Invalid fellowship status.' });
    }
    if (!remarks) {
      return res.status(400).json({ message: 'Remarks are required for status changes.' });
    }

    const fellowship = await prisma.fellowshipRecord.update({
      where: { id },
      data: { fellowshipStatus: status },
    });

    // Log as communication
    await prisma.fellowshipCommunication.create({
      data: {
        fellowshipRecordId: id,
        message: `Fellowship status changed to ${status}. Reason: ${remarks}`,
        sentById: req.user.userId,
      },
    });

    res.json({ message: `Fellowship status updated to ${status}.`, fellowship });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Fellowship not found.' });
    console.error('Update fellowship status error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// === Disbursements ===

// GET /api/admin/fellowships/:id/disbursements
const getDisbursements = async (req, res) => {
  try {
    const { id } = req.params;
    const disbursements = await prisma.disbursementRecord.findMany({
      where: { fellowshipRecordId: id },
      orderBy: { installmentNumber: 'asc' },
    });
    res.json({ disbursements });
  } catch (error) {
    console.error('Get disbursements error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// PATCH /api/admin/disbursements/:id/process
const processDisbursement = async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;

    const disbursement = await prisma.disbursementRecord.update({
      where: { id },
      data: { status: 'PROCESSED', processedDate: new Date(), remarks },
    });

    res.json({ message: 'Disbursement marked as processed.', disbursement });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Disbursement not found.' });
    console.error('Process disbursement error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// PATCH /api/admin/disbursements/:id/hold
const holdDisbursement = async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;

    if (!remarks) return res.status(400).json({ message: 'Remarks required for placing on hold.' });

    const disbursement = await prisma.disbursementRecord.update({
      where: { id },
      data: { status: 'ON_HOLD', remarks },
    });

    res.json({ message: 'Disbursement placed on hold.', disbursement });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Disbursement not found.' });
    console.error('Hold disbursement error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// POST /api/admin/check-overdue — marks overdue disbursements and documents
const checkOverdue = async (req, res) => {
  try {
    const now = new Date();

    // Mark overdue disbursements
    const overdueDisb = await prisma.disbursementRecord.updateMany({
      where: { status: 'PENDING', dueDate: { lt: now } },
      data: { status: 'DELAYED' },
    });

    // Mark overdue documents
    const overdueDocs = await prisma.postSelectionDocument.updateMany({
      where: { status: 'PENDING', dueDate: { lt: now } },
      data: { status: 'OVERDUE' },
    });

    res.json({
      message: 'Overdue check complete.',
      overdueDisb: overdueDisb.count,
      overdueDocs: overdueDocs.count,
    });
  } catch (error) {
    console.error('Check overdue error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// === Post-Selection Documents ===

// POST /api/admin/fellowships/:id/document-requirements
const addDocumentRequirement = async (req, res) => {
  try {
    const { id } = req.params;
    const { documentType, dueDate } = req.body;

    if (!documentType || !dueDate) {
      return res.status(400).json({ message: 'documentType and dueDate are required.' });
    }

    const doc = await prisma.postSelectionDocument.create({
      data: {
        fellowshipRecordId: id,
        documentType,
        dueDate: new Date(dueDate),
      },
    });

    res.status(201).json({ document: doc });
  } catch (error) {
    console.error('Add doc requirement error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// GET /api/admin/fellowships/:id/document-requirements (also accessible by applicant for own record)
const getDocumentRequirements = async (req, res) => {
  try {
    const { id } = req.params;
    const docs = await prisma.postSelectionDocument.findMany({
      where: { fellowshipRecordId: id },
      orderBy: { dueDate: 'asc' },
      include: { reviewedBy: { select: { name: true } } },
    });
    res.json({ documents: docs });
  } catch (error) {
    console.error('Get doc requirements error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// POST /api/applicant/fellowships/:id/documents/:reqId/submit
const submitPostDocument = async (req, res) => {
  try {
    const { id, reqId } = req.params;

    // Verify the fellowship belongs to this applicant
    const fellowship = await prisma.fellowshipRecord.findUnique({ where: { id } });
    if (!fellowship || fellowship.applicantId !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized.' });
    }

    if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });

    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'shiksha_post_docs', resource_type: 'auto' },
        (error, result) => error ? reject(error) : resolve(result)
      );
      stream.end(req.file.buffer);
    });

    await prisma.postSelectionDocument.update({
      where: { id: reqId },
      data: {
        fileUrl: result.secure_url,
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
    });

    res.json({ message: 'Document submitted successfully.' });
  } catch (error) {
    console.error('Submit post document error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// PATCH /api/admin/fellowship-documents/:id/review
const reviewPostDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // APPROVED or PENDING (resubmit)

    if (!status || !['APPROVED', 'PENDING'].includes(status)) {
      return res.status(400).json({ message: 'Status must be APPROVED or PENDING.' });
    }

    const doc = await prisma.postSelectionDocument.update({
      where: { id },
      data: { status, reviewedById: req.user.userId },
    });

    res.json({ message: `Document ${status === 'APPROVED' ? 'approved' : 'sent back for resubmission'}.`, document: doc });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Document not found.' });
    console.error('Review post document error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// === Communication ===

// POST /api/admin/fellowships/:id/communicate
const sendCommunication = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message) return res.status(400).json({ message: 'Message is required.' });

    const comm = await prisma.fellowshipCommunication.create({
      data: {
        fellowshipRecordId: id,
        message,
        sentById: req.user.userId,
      },
    });

    res.status(201).json({ communication: comm });
  } catch (error) {
    console.error('Send communication error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// GET /api/applicant/fellowships/:id/communications
const getCommunications = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify the fellowship belongs to this applicant
    const fellowship = await prisma.fellowshipRecord.findUnique({ where: { id } });
    if (!fellowship || fellowship.applicantId !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized.' });
    }

    const communications = await prisma.fellowshipCommunication.findMany({
      where: { fellowshipRecordId: id },
      orderBy: { sentAt: 'desc' },
      include: { sentBy: { select: { name: true } } },
    });

    // Mark as read
    await prisma.fellowshipCommunication.updateMany({
      where: { fellowshipRecordId: id, isReadByApplicant: false },
      data: { isReadByApplicant: true },
    });

    res.json({ communications });
  } catch (error) {
    console.error('Get communications error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// GET /api/applicant/my-fellowship
const getMyFellowship = async (req, res) => {
  try {
    const fellowship = await prisma.fellowshipRecord.findFirst({
      where: { applicantId: req.user.userId },
      include: {
        scheme: { select: { id: true, name: true } },
        application: { select: { id: true, status: true } },
        disbursements: { orderBy: { installmentNumber: 'asc' } },
        documentRequirements: { orderBy: { dueDate: 'asc' } },
        communications: {
          orderBy: { sentAt: 'desc' },
          include: { sentBy: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!fellowship) return res.json({ fellowship: null });

    // Mark communications as read
    await prisma.fellowshipCommunication.updateMany({
      where: { fellowshipRecordId: fellowship.id, isReadByApplicant: false },
      data: { isReadByApplicant: true },
    });

    res.json({ fellowship });
  } catch (error) {
    console.error('Get my fellowship error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

module.exports = {
  createFellowshipRecord,
  getAllFellowships, getFellowshipById, updateFellowshipStatus,
  getDisbursements, processDisbursement, holdDisbursement, checkOverdue,
  addDocumentRequirement, getDocumentRequirements, submitPostDocument, reviewPostDocument,
  sendCommunication, getCommunications, getMyFellowship,
};
