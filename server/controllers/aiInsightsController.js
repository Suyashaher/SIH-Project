const prisma = require('../config/db');
const { recalculateThresholds } = require('../services/thresholdRecalibrationService');

// GET /api/admin/ai-insights
const getAiInsights = async (req, res) => {
  try {
    const thresholds = await prisma.documentTypeThreshold.findMany({
      orderBy: { documentType: 'asc' },
    });

    // Add trend indicator
    const insights = thresholds.map(t => {
      let trend = 'unchanged';
      if (t.currentConfidenceThreshold > t.previousThreshold) trend = 'up';
      else if (t.currentConfidenceThreshold < t.previousThreshold) trend = 'down';

      return {
        ...t,
        trend,
      };
    });

    res.json({ insights });
  } catch (error) {
    console.error('AI insights error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// POST /api/admin/ai-recalibrate
const triggerRecalibration = async (req, res) => {
  try {
    const results = await recalculateThresholds();
    res.json({ message: 'Recalibration complete.', results });
  } catch (error) {
    console.error('Recalibration error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

module.exports = { getAiInsights, triggerRecalibration };
