const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { triggerVerification, getVerificationResults } = require('../controllers/verificationController');

// These routes need authentication but work for multiple roles
router.use(verifyToken);

router.post('/:id/verify-documents', triggerVerification);
router.get('/:id/verification-results', getVerificationResults);

module.exports = router;
