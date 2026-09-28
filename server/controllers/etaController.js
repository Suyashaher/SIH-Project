const prisma = require('../config/db');
const { recalculateStageBenchmarks } = require('../services/stageBenchmarkService');
const { calculateRuleBasedETA } = require('../services/etaCalculationService');
const { trainModel, predictMLEta, isModelTrained, getTrainingDataSize, MIN_TRAINING_DATA } = require('../services/mlEtaService');

/**
 * POST /api/applications/:id/predict-eta
 * Calculate both rule-based and ML-based ETA, store the best one.
 */
const predictEta = async (req, res) => {
  try {
    const { id } = req.params;

    const application = await prisma.application.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!application) return res.status(404).json({ message: 'Application not found.' });

    // Terminal states don't need predictions
    const terminalStates = ['SELECTED', 'REJECTED', 'WAITLISTED', 'DRAFT'];
    if (terminalStates.includes(application.status)) {
      return res.json({
        message: 'Application is in a terminal state.',
        predictedDaysRemaining: 0,
        predictionMethod: null,
      });
    }

    // Calculate rule-based ETA
    const ruleBased = await calculateRuleBasedETA(id);

    // Try ML-based ETA
    let mlBased = null;
    let usedMethod = 'RULE_BASED';
    let finalPrediction = ruleBased;

    if (isModelTrained()) {
      mlBased = await predictMLEta(id);
      if (mlBased) {
        usedMethod = 'ML_MODEL';
        finalPrediction = mlBased;
      }
    }

    // Store prediction on the application
    await prisma.application.update({
      where: { id },
      data: {
        predictedDaysRemaining: finalPrediction.predictedDaysRemaining,
        predictedCompletionDate: finalPrediction.predictedCompletionDate,
        predictionMethod: usedMethod,
        predictionLastUpdatedAt: new Date(),
      },
    });

    res.json({
      applicationId: id,
      predictedDaysRemaining: finalPrediction.predictedDaysRemaining,
      predictedCompletionDate: finalPrediction.predictedCompletionDate,
      predictionMethod: usedMethod,
      ruleBased,
      mlBased,
      mlModelActive: isModelTrained(),
      mlTrainingDataSize: getTrainingDataSize(),
    });
  } catch (error) {
    console.error('Predict ETA error:', error);
    res.status(500).json({ message: error.message || 'Internal server error.' });
  }
};

/**
 * POST /api/admin/recalculate-benchmarks
 * Recalculates stage benchmarks AND retrains ML model.
 */
const recalculateBenchmarks = async (req, res) => {
  try {
    const benchmarkResults = await recalculateStageBenchmarks();
    const mlResults = await trainModel();

    res.json({
      message: 'Benchmarks recalculated and ML model retrained.',
      benchmarks: benchmarkResults,
      mlModel: mlResults,
    });
  } catch (error) {
    console.error('Recalculate benchmarks error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * GET /api/admin/processing-analytics
 * Returns stage benchmarks + ML model status for the admin dashboard.
 */
const getProcessingAnalytics = async (req, res) => {
  try {
    const benchmarks = await prisma.stageDurationBenchmark.findMany({
      include: { scheme: { select: { name: true } } },
      orderBy: [{ schemeId: 'asc' }, { stage: 'asc' }],
    });

    const formatted = benchmarks.map(b => ({
      id: b.id,
      scheme: b.scheme.name,
      schemeId: b.schemeId,
      stage: b.stage,
      averageDurationDays: b.averageDurationDays,
      sampleSize: b.sampleSize,
      lastUpdatedAt: b.lastUpdatedAt,
      usingDefault: b.sampleSize < 5,
    }));

    res.json({
      benchmarks: formatted,
      mlModelStatus: {
        active: isModelTrained(),
        trainingDataSize: getTrainingDataSize(),
        minRequired: MIN_TRAINING_DATA,
      },
    });
  } catch (error) {
    console.error('Processing analytics error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

module.exports = { predictEta, recalculateBenchmarks, getProcessingAnalytics };
