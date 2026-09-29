const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const { 
  createOfficer, getAllOfficers, updateOfficer, toggleOfficerStatus, updateOfficerSchemes, getApplications
} = require('../controllers/adminController');
const {
  createScheme, getAllSchemes, getSchemeById, updateScheme, toggleSchemeStatus,
  addRule, getRules, updateRule, deleteRule,
  addDocument, getDocuments, updateDocument, deleteDocument,
  addField, getFields, updateField, deleteField, reorderFields,
  validateScheme, validateRule, validateDocument, validateField,
} = require('../controllers/schemeController');
const { getAiInsights, triggerRecalibration } = require('../controllers/aiInsightsController');
const { recalculateBenchmarks, getProcessingAnalytics } = require('../controllers/etaController');
const {
  getOverview, getByScheme, getVerificationStats, getDeficiencyStats,
  getSelectionStats, getOfficerStats, getFellowshipStats, exportData,
} = require('../controllers/dashboardController');
const {
  addCriteria, getCriteria, updateCriteria, deleteCriteria,
  updateTotalSeats,
} = require('../controllers/selectionController');
const { runReminders } = require('../controllers/notificationController');
const { getLeaderboard } = require('../services/leaderboardService');

router.use(verifyToken, requireRole('ADMIN'));

// === Officer Management ===
router.post('/create-officer', createOfficer);
router.get('/officers', getAllOfficers);
router.put('/officers/:id', updateOfficer);
router.patch('/officers/:id/toggle-status', toggleOfficerStatus);
router.put('/officers/:id/schemes', updateOfficerSchemes);

// === Applications ===
router.get('/applications', getApplications);

// === Officer Leaderboard ===
router.get('/leaderboard', async (req, res) => {
  try {
    const period = (req.query.period || 'WEEKLY').toUpperCase();
    if (!['WEEKLY', 'MONTHLY', 'ALL_TIME'].includes(period)) {
      return res.status(400).json({ message: 'period must be WEEKLY, MONTHLY, or ALL_TIME' });
    }
    const leaderboard = await getLeaderboard(period);
    res.json({ leaderboard, period });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// === Scheme CRUD ===
router.post('/schemes', validateScheme, createScheme);
router.get('/schemes', getAllSchemes);
router.get('/schemes/:id', getSchemeById);
router.put('/schemes/:id', validateScheme, updateScheme);
router.patch('/schemes/:id/toggle-status', toggleSchemeStatus);

// === Eligibility Rules ===
router.post('/schemes/:id/rules', validateRule, addRule);
router.get('/schemes/:id/rules', getRules);
router.put('/rules/:ruleId', validateRule, updateRule);
router.delete('/rules/:ruleId', deleteRule);

// === Document Requirements ===
router.post('/schemes/:id/documents', validateDocument, addDocument);
router.get('/schemes/:id/documents', getDocuments);
router.put('/documents/:docId', validateDocument, updateDocument);
router.delete('/documents/:docId', deleteDocument);

// === Application Fields ===
router.post('/schemes/:id/fields', validateField, addField);
router.get('/schemes/:id/fields', getFields);
router.put('/fields/:fieldId', validateField, updateField);
router.delete('/fields/:fieldId', deleteField);
router.put('/schemes/:id/fields/reorder', reorderFields);

// === AI Learning Insights ===
router.get('/ai-insights', getAiInsights);
router.post('/ai-recalibrate', triggerRecalibration);

// === Selection Management ===
router.post('/schemes/:id/selection-criteria', addCriteria);
router.get('/schemes/:id/selection-criteria', getCriteria);
router.put('/selection-criteria/:id', updateCriteria);
router.delete('/selection-criteria/:id', deleteCriteria);
router.put('/schemes/:id/total-seats', updateTotalSeats);

// === Processing Analytics / ETA ===
router.get('/processing-analytics', getProcessingAnalytics);
router.post('/recalculate-benchmarks', recalculateBenchmarks);

// === Dashboard & Analytics ===
router.get('/dashboard/overview', getOverview);
router.get('/dashboard/by-scheme', getByScheme);
router.get('/dashboard/verification-stats', getVerificationStats);
router.get('/dashboard/deficiency-stats', getDeficiencyStats);
router.get('/dashboard/selection-stats', getSelectionStats);
router.get('/dashboard/officer-stats', getOfficerStats);
router.get('/dashboard/fellowship-stats', getFellowshipStats);
router.get('/dashboard/export', exportData);

// === Notifications ===
router.post('/notifications/run-reminders', runReminders);

module.exports = router;
