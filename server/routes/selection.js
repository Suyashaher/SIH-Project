const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const {
  triggerRankings, getSelectionList, decideApplication, bulkDecide,
} = require('../controllers/selectionController');

// Both Admin and Officer can manage selection decisions
router.use(verifyToken, requireRole('ADMIN', 'OFFICER'));

router.post('/schemes/:id/calculate-rankings', triggerRankings);
router.get('/schemes/:id/selection-list', getSelectionList);
router.post('/applications/:id/decide', decideApplication);
router.post('/schemes/:id/bulk-decide', bulkDecide);

module.exports = router;
