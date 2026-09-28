const prisma = require('../config/db');

/**
 * Calculate a selection score for a single application.
 * Uses the scheme's configured selection criteria.
 * Returns the score record.
 */
const calculateScore = async (applicationId) => {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      fieldValues: { include: { field: true } },
      scheme: {
        include: { selectionCriteria: true },
      },
    },
  });

  if (!application) throw new Error('Application not found');

  const criteria = application.scheme.selectionCriteria;
  if (!criteria || criteria.length === 0) {
    throw new Error('No selection criteria configured for this scheme.');
  }

  // Build a map of fieldLabel (lowercase) -> value
  const fieldMap = {};
  application.fieldValues.forEach(fv => {
    fieldMap[fv.field.fieldLabel.toLowerCase()] = fv.value;
  });

  const breakdown = {};
  let totalScore = 0;

  for (const criterion of criteria) {
    const rawValue = fieldMap[criterion.fieldSource.toLowerCase()];
    if (rawValue === undefined || rawValue === null || rawValue === '') {
      breakdown[criterion.criteriaName] = { rawValue: null, normalizedValue: 0, weightedScore: 0, note: 'Field not found' };
      continue;
    }

    const numericValue = parseFloat(rawValue);
    if (isNaN(numericValue)) {
      breakdown[criterion.criteriaName] = { rawValue, normalizedValue: 0, weightedScore: 0, note: 'Non-numeric value' };
      continue;
    }

    // Normalize to 0-100 scale
    // For HIGHER_IS_BETTER: assume marks are out of 100 (or percentage)
    // For LOWER_IS_BETTER: invert — lower values score higher
    let normalizedValue;
    if (criterion.scoreDirection === 'HIGHER_IS_BETTER') {
      // Assume input is a percentage or out of 100
      normalizedValue = Math.min(100, Math.max(0, numericValue));
    } else {
      // LOWER_IS_BETTER: e.g., income. Lower income = higher score.
      // Use inverse scaling: score = max(0, 100 - (value / 10000))
      // This maps 0 income -> 100, 1000000 income -> 0
      normalizedValue = Math.max(0, 100 - (numericValue / 10000));
    }

    const weightedScore = parseFloat((normalizedValue * criterion.weightage).toFixed(2));
    totalScore += weightedScore;

    breakdown[criterion.criteriaName] = {
      rawValue: numericValue,
      normalizedValue: parseFloat(normalizedValue.toFixed(2)),
      weightage: criterion.weightage,
      weightedScore,
      direction: criterion.scoreDirection,
    };
  }

  totalScore = parseFloat(totalScore.toFixed(2));

  // Upsert the score record
  const scoreRecord = await prisma.applicationSelectionScore.upsert({
    where: { applicationId },
    create: {
      applicationId,
      calculatedScore: totalScore,
      scoreBreakdown: JSON.stringify(breakdown),
      calculatedAt: new Date(),
    },
    update: {
      calculatedScore: totalScore,
      scoreBreakdown: JSON.stringify(breakdown),
      calculatedAt: new Date(),
      rank: null, // Reset rank when recalculating
    },
  });

  return scoreRecord;
};

/**
 * Calculate scores for ALL eligible applications in a scheme,
 * then assign ranks (1 = highest score).
 */
const calculateSchemeRankings = async (schemeId) => {
  // Find all applications in READY_FOR_SELECTION status for this scheme
  const applications = await prisma.application.findMany({
    where: { schemeId, status: 'READY_FOR_SELECTION' },
    select: { id: true },
  });

  if (applications.length === 0) {
    return { message: 'No applications in READY_FOR_SELECTION status.', count: 0, rankings: [] };
  }

  // Calculate score for each application
  const scores = [];
  for (const app of applications) {
    try {
      const score = await calculateScore(app.id);
      scores.push(score);
    } catch (err) {
      console.error(`Score calculation failed for ${app.id}:`, err.message);
    }
  }

  // Sort by calculatedScore descending and assign ranks
  scores.sort((a, b) => b.calculatedScore - a.calculatedScore);

  for (let i = 0; i < scores.length; i++) {
    await prisma.applicationSelectionScore.update({
      where: { id: scores[i].id },
      data: { rank: i + 1 },
    });
    scores[i].rank = i + 1;
  }

  return { message: 'Rankings calculated.', count: scores.length, rankings: scores };
};

module.exports = { calculateScore, calculateSchemeRankings };
