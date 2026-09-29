const prisma = require('../config/db');

/**
 * Officer Leaderboard Service
 * 
 * Calculates real officer performance metrics from existing data:
 * - Application.scrutinyCompletedAt → completed applications count
 * - ApplicationStatusHistory (UNDER_SCRUTINY timestamp) → processing time
 * - AIFeedbackLog → override counts & accuracy rate
 * - DeficiencyRequest → deficiencies raised count
 * 
 * Score formula (transparent & explainable):
 *   score = (applicationsCompleted * 10) - (avgProcessingHours * 0.5) + (accuracyRate * 2)
 */

/**
 * Get the start date for a given period
 */
const getDateRange = (period) => {
  const now = new Date();
  let startDate;

  switch (period) {
    case 'WEEKLY': {
      // Start of current ISO week (Monday)
      const day = now.getDay();
      const diff = day === 0 ? 6 : day - 1; // Monday = 0 offset
      startDate = new Date(now);
      startDate.setDate(now.getDate() - diff);
      startDate.setHours(0, 0, 0, 0);
      break;
    }
    case 'MONTHLY': {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    }
    case 'ALL_TIME':
    default:
      startDate = new Date(0); // epoch
      break;
  }

  return { startDate, endDate: now };
};

/**
 * Get the current period label for seed data matching
 */
const getCurrentPeriodLabel = (period) => {
  const now = new Date();
  switch (period) {
    case 'WEEKLY': {
      // ISO week number
      const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
      return `${now.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
    }
    case 'MONTHLY':
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    case 'ALL_TIME':
    default:
      return 'ALL_TIME';
  }
};

/**
 * Calculate real leaderboard data from existing database records
 */
const calculateLeaderboard = async (period) => {
  const { startDate, endDate } = getDateRange(period);

  // Get all officers
  const officers = await prisma.user.findMany({
    where: { role: 'OFFICER', isActive: true },
    select: { id: true, name: true, email: true },
  });

  const results = [];

  for (const officer of officers) {
    // 1. Count completed applications (scrutinyCompletedAt in range)
    const completedApps = await prisma.application.findMany({
      where: {
        assignedOfficerId: officer.id,
        scrutinyCompletedAt: { gte: startDate, lte: endDate },
      },
      select: { id: true, scrutinyCompletedAt: true },
    });

    const applicationsCompleted = completedApps.length;

    // 2. Calculate avg processing time (from UNDER_SCRUTINY status to scrutinyCompletedAt)
    let totalProcessingHours = 0;
    let processingSamples = 0;

    for (const app of completedApps) {
      // Find when the officer started scrutiny (status changed to UNDER_SCRUTINY)
      const scrutinyStart = await prisma.applicationStatusHistory.findFirst({
        where: {
          applicationId: app.id,
          newStatus: 'UNDER_SCRUTINY',
        },
        orderBy: { changedAt: 'asc' },
        select: { changedAt: true },
      });

      if (scrutinyStart && app.scrutinyCompletedAt) {
        const hours = (app.scrutinyCompletedAt.getTime() - scrutinyStart.changedAt.getTime()) / (1000 * 60 * 60);
        totalProcessingHours += hours;
        processingSamples++;
      }
    }

    const avgProcessingHours = processingSamples > 0
      ? parseFloat((totalProcessingHours / processingSamples).toFixed(2))
      : 0;

    // 3. Count AI overrides & accuracy rate from AIFeedbackLog
    const feedbackLogs = await prisma.aIFeedbackLog.findMany({
      where: {
        officerId: officer.id,
        createdAt: { gte: startDate, lte: endDate },
      },
      select: { wasOverridden: true },
    });

    const totalFeedbacks = feedbackLogs.length;
    const overrideCount = feedbackLogs.filter(f => f.wasOverridden).length;
    const confirmedCount = feedbackLogs.filter(f => !f.wasOverridden).length;

    // Accuracy rate = percentage of AI decisions confirmed by the officer
    // Higher = officer agrees with AI more = AI is well-calibrated for this officer's area
    const accuracyRate = totalFeedbacks > 0
      ? parseFloat(((confirmedCount / totalFeedbacks) * 100).toFixed(1))
      : 0;

    // 4. Count deficiencies raised
    const deficienciesRaised = await prisma.deficiencyRequest.count({
      where: {
        raisedById: officer.id,
        raisedAt: { gte: startDate, lte: endDate },
      },
    });

    // 5. Compute composite score
    // score = (applicationsCompleted * 10) - (avgProcessingHours * 0.5) + (accuracyRate * 2)
    const score = parseFloat(
      ((applicationsCompleted * 10) - (avgProcessingHours * 0.5) + (accuracyRate * 2)).toFixed(2)
    );

    // Only include officers who have SOME activity
    if (applicationsCompleted > 0 || overrideCount > 0 || deficienciesRaised > 0) {
      results.push({
        officerId: officer.id,
        officerName: officer.name,
        officerEmail: officer.email,
        applicationsCompleted,
        avgProcessingHours,
        accuracyRate,
        overrideCount,
        deficienciesRaised,
        score,
        scoreBreakdown: {
          completionPoints: applicationsCompleted * 10,
          speedPenalty: parseFloat((avgProcessingHours * 0.5).toFixed(2)),
          accuracyBonus: parseFloat((accuracyRate * 2).toFixed(2)),
        },
        dataSource: 'real',
      });
    }
  }

  // Sort by score descending, assign ranks
  results.sort((a, b) => b.score - a.score);
  results.forEach((r, i) => { r.rank = i + 1; });

  return results;
};

/**
 * Get leaderboard with mock data fallback
 * Real data always takes priority; mock data supplements only when insufficient real data exists
 */
const getLeaderboard = async (period) => {
  const DEMO_THRESHOLD = 5; // minimum officers with real data before we supplement with mock

  // 1. Calculate real leaderboard
  const realData = await calculateLeaderboard(period);

  // 2. If sufficient real data, return it directly
  if (realData.length >= DEMO_THRESHOLD) {
    return realData;
  }

  // 3. Otherwise, supplement with mock data from OfficerLeaderboardSeed
  const periodLabel = getCurrentPeriodLabel(period);

  // Get mock data — try current period label first, fall back to any data for this period type
  let mockSeeds = await prisma.officerLeaderboardSeed.findMany({
    where: {
      period,
      periodLabel,
      isMockData: true,
    },
    include: { officer: { select: { id: true, name: true, email: true } } },
  });

  // If no seeds for current period label, try the most recent one
  if (mockSeeds.length === 0) {
    mockSeeds = await prisma.officerLeaderboardSeed.findMany({
      where: { period, isMockData: true },
      include: { officer: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // De-duplicate by officerId (keep the most recent)
    const seen = new Set();
    mockSeeds = mockSeeds.filter(s => {
      if (seen.has(s.officerId)) return false;
      seen.add(s.officerId);
      return true;
    });
  }

  // Officers who already have real data — NEVER overwrite with mock
  const realOfficerIds = new Set(realData.map(r => r.officerId));

  const mockEntries = mockSeeds
    .filter(s => !realOfficerIds.has(s.officerId))
    .map(s => {
      const score = parseFloat(
        ((s.applicationsCompleted * 10) - (s.avgProcessingHours * 0.5) + (s.accuracyRate * 2)).toFixed(2)
      );
      return {
        officerId: s.officerId,
        officerName: s.officer.name,
        officerEmail: s.officer.email,
        applicationsCompleted: s.applicationsCompleted,
        avgProcessingHours: s.avgProcessingHours,
        accuracyRate: s.accuracyRate,
        overrideCount: s.overrideCount,
        deficienciesRaised: s.deficienciesRaised,
        score,
        scoreBreakdown: {
          completionPoints: s.applicationsCompleted * 10,
          speedPenalty: parseFloat((s.avgProcessingHours * 0.5).toFixed(2)),
          accuracyBonus: parseFloat((s.accuracyRate * 2).toFixed(2)),
        },
        dataSource: 'mock',
      };
    });

  // Merge, re-sort, re-rank
  const combined = [...realData, ...mockEntries];
  combined.sort((a, b) => b.score - a.score);
  combined.forEach((r, i) => { r.rank = i + 1; });

  return combined;
};

module.exports = { calculateLeaderboard, getLeaderboard, getCurrentPeriodLabel };
