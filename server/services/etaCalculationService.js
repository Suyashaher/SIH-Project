const prisma = require('../config/db');
const { DEFAULT_DURATIONS, PROCESSING_STAGES } = require('./stageBenchmarkService');

// Ordered workflow stages (only the ones that take processing time)
const STAGE_ORDER = ['SUBMITTED', 'UNDER_VERIFICATION', 'UNDER_SCRUTINY', 'READY_FOR_SELECTION'];

/**
 * Rule-based ETA: sum remaining stage benchmarks.
 */
const calculateRuleBasedETA = async (applicationId) => {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: { id: true, status: true, schemeId: true, submittedAt: true },
  });

  if (!application) throw new Error('Application not found');

  const currentStageIndex = STAGE_ORDER.indexOf(application.status);
  if (currentStageIndex === -1) {
    // Application is in a terminal/non-processing state
    return { predictedDaysRemaining: 0, predictedCompletionDate: new Date() };
  }

  // Get benchmarks for this scheme
  const benchmarks = await prisma.stageDurationBenchmark.findMany({
    where: { schemeId: application.schemeId },
  });
  const benchmarkMap = {};
  benchmarks.forEach(b => { benchmarkMap[b.stage] = b.averageDurationDays; });

  // Sum remaining stages
  let totalDaysRemaining = 0;
  for (let i = currentStageIndex; i < STAGE_ORDER.length; i++) {
    const stage = STAGE_ORDER[i];
    if (PROCESSING_STAGES.includes(stage)) {
      totalDaysRemaining += benchmarkMap[stage] || DEFAULT_DURATIONS[stage] || 5;
    }
  }

  totalDaysRemaining = parseFloat(totalDaysRemaining.toFixed(2));
  const predictedCompletionDate = new Date();
  predictedCompletionDate.setDate(predictedCompletionDate.getDate() + Math.ceil(totalDaysRemaining));

  return { predictedDaysRemaining: totalDaysRemaining, predictedCompletionDate };
};

module.exports = { calculateRuleBasedETA };
