const prisma = require('../config/db');

// Default durations (days) if not enough real data exists
const DEFAULT_DURATIONS = {
  UNDER_VERIFICATION: 3,
  UNDER_SCRUTINY: 5,
  READY_FOR_SELECTION: 7,
  DEFICIENT: 4,
};

const PROCESSING_STAGES = ['UNDER_VERIFICATION', 'UNDER_SCRUTINY', 'READY_FOR_SELECTION'];
const MIN_SAMPLE_SIZE = 5;

/**
 * Recalculate average stage durations from ApplicationStatusHistory.
 * Groups by schemeId + stage, calculates avg time spent in each stage.
 */
const recalculateStageBenchmarks = async () => {
  const results = [];

  // Get all schemes
  const schemes = await prisma.scheme.findMany({ select: { id: true, name: true } });

  for (const scheme of schemes) {
    // Get all status history entries for this scheme's applications
    const histories = await prisma.applicationStatusHistory.findMany({
      where: { application: { schemeId: scheme.id } },
      orderBy: [{ applicationId: 'asc' }, { changedAt: 'asc' }],
      include: { application: { select: { id: true } } },
    });

    // Group by application
    const appHistories = {};
    for (const h of histories) {
      if (!appHistories[h.applicationId]) appHistories[h.applicationId] = [];
      appHistories[h.applicationId].push(h);
    }

    // Calculate time spent in each stage per application
    const stageDurations = {}; // { stage: [durationInDays, ...] }

    for (const [appId, entries] of Object.entries(appHistories)) {
      for (let i = 0; i < entries.length; i++) {
        const stage = entries[i].newStatus;
        if (!PROCESSING_STAGES.includes(stage)) continue;

        // Find when this stage ended (next entry's changedAt)
        const endTime = entries[i + 1] ? entries[i + 1].changedAt : null;
        if (!endTime) continue; // Still in this stage

        const durationDays = (new Date(endTime) - new Date(entries[i].changedAt)) / (1000 * 60 * 60 * 24);
        if (durationDays < 0) continue;

        if (!stageDurations[stage]) stageDurations[stage] = [];
        stageDurations[stage].push(durationDays);
      }
    }

    // Upsert benchmarks
    for (const stage of PROCESSING_STAGES) {
      const durations = stageDurations[stage] || [];
      const sampleSize = durations.length;
      const avgDuration = sampleSize >= MIN_SAMPLE_SIZE
        ? durations.reduce((a, b) => a + b, 0) / sampleSize
        : DEFAULT_DURATIONS[stage] || 5;

      await prisma.stageDurationBenchmark.upsert({
        where: { schemeId_stage: { schemeId: scheme.id, stage } },
        create: {
          schemeId: scheme.id,
          stage,
          averageDurationDays: parseFloat(avgDuration.toFixed(2)),
          sampleSize,
          lastUpdatedAt: new Date(),
        },
        update: {
          averageDurationDays: parseFloat(avgDuration.toFixed(2)),
          sampleSize,
          lastUpdatedAt: new Date(),
        },
      });

      results.push({
        scheme: scheme.name,
        stage,
        averageDurationDays: parseFloat(avgDuration.toFixed(2)),
        sampleSize,
        usingDefault: sampleSize < MIN_SAMPLE_SIZE,
      });
    }
  }

  return results;
};

module.exports = { recalculateStageBenchmarks, DEFAULT_DURATIONS, PROCESSING_STAGES };
