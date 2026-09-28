const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const upload = require('../config/multer');
const {
  getAllFellowships, getFellowshipById, updateFellowshipStatus,
  getDisbursements, processDisbursement, holdDisbursement, checkOverdue,
  addDocumentRequirement, getDocumentRequirements, reviewPostDocument,
  sendCommunication, getCommunications, submitPostDocument, getMyFellowship,
} = require('../controllers/fellowshipController');

// === Admin fellowship routes ===
router.get('/admin/fellowships', verifyToken, requireRole('ADMIN'), getAllFellowships);
router.get('/admin/fellowships/:id', verifyToken, requireRole('ADMIN'), getFellowshipById);
router.patch('/admin/fellowships/:id/status', verifyToken, requireRole('ADMIN'), updateFellowshipStatus);
router.get('/admin/fellowships/:id/disbursements', verifyToken, requireRole('ADMIN'), getDisbursements);
router.patch('/admin/disbursements/:id/process', verifyToken, requireRole('ADMIN'), processDisbursement);
router.patch('/admin/disbursements/:id/hold', verifyToken, requireRole('ADMIN'), holdDisbursement);
router.post('/admin/check-overdue', verifyToken, requireRole('ADMIN'), checkOverdue);
router.post('/admin/fellowships/:id/document-requirements', verifyToken, requireRole('ADMIN'), addDocumentRequirement);
router.get('/admin/fellowships/:id/document-requirements', verifyToken, requireRole('ADMIN'), getDocumentRequirements);
router.patch('/admin/fellowship-documents/:id/review', verifyToken, requireRole('ADMIN'), reviewPostDocument);
router.post('/admin/fellowships/:id/communicate', verifyToken, requireRole('ADMIN'), sendCommunication);

// === Applicant fellowship routes ===
router.get('/applicant/my-fellowship', verifyToken, requireRole('APPLICANT'), getMyFellowship);
router.get('/applicant/fellowships/:id/document-requirements', verifyToken, requireRole('APPLICANT'), getDocumentRequirements);
router.post('/applicant/fellowships/:id/documents/:reqId/submit', verifyToken, requireRole('APPLICANT'), upload.single('file'), submitPostDocument);
router.get('/applicant/fellowships/:id/communications', verifyToken, requireRole('APPLICANT'), getCommunications);

module.exports = router;
