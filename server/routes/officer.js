const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const {
  getApplicationQueue, getApplicationDetail, claimApplication,
  overrideDocumentStatus, checkEligibility,
  raiseDeficiency, getDeficiencies, resolveDeficiency,
  completeScrutiny, updateApplicationStatus, saveRemarks, getMySchemes
} = require('../controllers/officerController');

router.use(verifyToken, requireRole('OFFICER'));
router.get('/my-schemes', getMySchemes);

// Application queue
router.get('/applications', getApplicationQueue);
router.get('/applications/:id', getApplicationDetail);
router.post('/applications/:id/claim', claimApplication);
router.get('/applications/:id/eligibility-check', checkEligibility);
router.patch('/applications/:id/status', updateApplicationStatus);
router.patch('/applications/:id/remarks', saveRemarks);

// Document override
router.patch('/documents/:docId/override', overrideDocumentStatus);

// Deficiencies
router.post('/applications/:id/deficiencies', raiseDeficiency);
router.get('/applications/:id/deficiencies', getDeficiencies);
router.patch('/deficiencies/:id/resolve', resolveDeficiency);

// Scrutiny
router.post('/applications/:id/complete-scrutiny', completeScrutiny);

module.exports = router;
