const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const upload = require('../config/multer');
const {
  createApplication, getMyApplications, getApplicationById,
  updateFieldValues, submitApplication, uploadDocument, deleteDocument,
} = require('../controllers/applicationController');

// All application routes require authenticated APPLICANT
router.use(verifyToken, requireRole('APPLICANT'));

router.post('/', createApplication);
router.get('/', getMyApplications);
router.get('/:id', getApplicationById);
router.put('/:id/fields', updateFieldValues);
router.post('/:id/submit', submitApplication);
router.post('/:id/documents', upload.single('file'), uploadDocument);
router.delete('/:id/documents/:docId', deleteDocument);

const { predictEta } = require('../controllers/etaController');
router.post('/:id/predict-eta', predictEta);

module.exports = router;
