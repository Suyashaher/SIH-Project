const prisma = require('../config/db');

/**
 * Recalculate AI confidence thresholds based on accumulated officer feedback.
 * 
 * Logic:
 * - Groups AIFeedbackLog by documentType
 * - Calculates overrideRate = overridden / total
 * - If overrideRate > 30%: raise threshold by 5 (max 95) — AI becomes more conservative
 * - If overrideRate < 10%: lower threshold by 3 (min 60) — AI becomes more confident
 * - Only adjusts with >= 10 samples (avoids small-sample noise)
 * 
 * In production, this would run on a nightly cron. For demo: admin triggers manually.
 */
const recalculateThresholds = async () => {
  // Get all feedback grouped by documentType
  const docTypes = [...new Set((await prisma.aIFeedbackLog.findMany({ select: { documentType: true } })).map(f => f.documentType))];

  const results = [];

  for (const dt of docTypes) {
    const allEntries = await prisma.aIFeedbackLog.findMany({ where: { documentType: dt } });
    const total = allEntries.length;

    if (total < 10) {
      results.push({ documentType: dt, skipped: true, reason: `Only ${total} samples (need 10+)` });
      continue;
    }

    const overriddenCount = allEntries.filter(e => e.wasOverridden).length;
    const overrideRate = overriddenCount / total;

    // Get current threshold
    let thresholdRecord = await prisma.documentTypeThreshold.findUnique({ where: { documentType: dt } });
    if (!thresholdRecord) {
      thresholdRecord = await prisma.documentTypeThreshold.create({
        data: { documentType: dt, currentConfidenceThreshold: 80, previousThreshold: 80 },
      });
    }

    let newThreshold = thresholdRecord.currentConfidenceThreshold;
    const previousThreshold = thresholdRecord.currentConfidenceThreshold;

    if (overrideRate > 0.30) {
      // Officers frequently disagree — make AI more conservative (raise threshold)
      newThreshold = Math.min(95, newThreshold + 5);
    } else if (overrideRate < 0.10) {
      // AI is reliably correct — let AI auto-verify more confidently (lower threshold)
      newThreshold = Math.max(60, newThreshold - 3);
    }
    // If between 10% and 30%, keep the threshold unchanged (healthy range)

    await prisma.documentTypeThreshold.update({
      where: { documentType: dt },
      data: {
        currentConfidenceThreshold: newThreshold,
        previousThreshold,
        overrideRate: parseFloat((overrideRate * 100).toFixed(2)),
        lastRecalculatedAt: new Date(),
        sampleSize: total,
      },
    });

    results.push({
      documentType: dt,
      total,
      overriddenCount,
      overrideRate: `${(overrideRate * 100).toFixed(1)}%`,
      previousThreshold,
      newThreshold,
      direction: newThreshold > previousThreshold ? 'UP (more conservative)' : newThreshold < previousThreshold ? 'DOWN (more confident)' : 'UNCHANGED',
    });
  }

  return results;
};

module.exports = { recalculateThresholds };
