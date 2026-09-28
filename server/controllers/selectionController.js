const prisma = require('../config/db');
const { calculateSchemeRankings } = require('../services/selectionScoringService');
const { changeApplicationStatus } = require('../utils/statusHelper');
const { createFellowshipRecord } = require('./fellowshipController');

// === Selection Criteria CRUD ===

// POST /api/admin/schemes/:id/selection-criteria
const addCriteria = async (req, res) => {
  try {
    const { id } = req.params;
    const { criteriaName, fieldSource, weightage, scoreDirection } = req.body;

    if (!criteriaName || !fieldSource || weightage === undefined) {
      return res.status(400).json({ message: 'criteriaName, fieldSource, and weightage are required.' });
    }

    const criteria = await prisma.schemeSelectionCriteria.create({
      data: {
        schemeId: id,
        criteriaName,
        fieldSource,
        weightage: parseFloat(weightage),
        scoreDirection: scoreDirection || 'HIGHER_IS_BETTER',
      },
    });

    // Check total weightage and warn
    const allCriteria = await prisma.schemeSelectionCriteria.findMany({ where: { schemeId: id } });
    const totalWeightage = allCriteria.reduce((sum, c) => sum + c.weightage, 0);
    const warning = Math.abs(totalWeightage - 1.0) > 0.01
      ? `Warning: Total weightage is ${(totalWeightage * 100).toFixed(1)}% (should be 100%).`
      : null;

    res.status(201).json({ criteria, warning });
  } catch (error) {
    console.error('Add criteria error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// GET /api/admin/schemes/:id/selection-criteria
const getCriteria = async (req, res) => {
  try {
    const { id } = req.params;
    const criteria = await prisma.schemeSelectionCriteria.findMany({
      where: { schemeId: id },
      orderBy: { createdAt: 'asc' },
    });

    const totalWeightage = criteria.reduce((sum, c) => sum + c.weightage, 0);

    res.json({ criteria, totalWeightage });
  } catch (error) {
    console.error('Get criteria error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// PUT /api/admin/selection-criteria/:id
const updateCriteria = async (req, res) => {
  try {
    const { id } = req.params;
    const { criteriaName, fieldSource, weightage, scoreDirection } = req.body;

    const updated = await prisma.schemeSelectionCriteria.update({
      where: { id },
      data: {
        ...(criteriaName && { criteriaName }),
        ...(fieldSource && { fieldSource }),
        ...(weightage !== undefined && { weightage: parseFloat(weightage) }),
        ...(scoreDirection && { scoreDirection }),
      },
    });

    res.json({ criteria: updated });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Criteria not found.' });
    console.error('Update criteria error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// DELETE /api/admin/selection-criteria/:id
const deleteCriteria = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.schemeSelectionCriteria.delete({ where: { id } });
    res.json({ message: 'Criteria deleted.' });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Criteria not found.' });
    console.error('Delete criteria error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// === Ranking ===

// POST /api/admin/schemes/:id/calculate-rankings
const triggerRankings = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await calculateSchemeRankings(id);
    res.json(result);
  } catch (error) {
    console.error('Calculate rankings error:', error);
    res.status(500).json({ message: error.message || 'Internal server error.' });
  }
};

// === Selection List ===

// GET /api/admin/schemes/:id/selection-list
const getSelectionList = async (req, res) => {
  try {
    const { id } = req.params;

    const scheme = await prisma.scheme.findUnique({
      where: { id },
      select: { id: true, name: true, totalSeats: true },
    });

    if (!scheme) return res.status(404).json({ message: 'Scheme not found.' });

    const applications = await prisma.application.findMany({
      where: {
        schemeId: id,
        status: { in: ['READY_FOR_SELECTION', 'SELECTED', 'WAITLISTED', 'REJECTED'] },
        applicant: { role: { not: 'ADMIN' } },
      },
      include: {
        applicant: { select: { id: true, name: true, email: true } },
        selectionScore: true,
        selectionDecisions: {
          orderBy: { decidedAt: 'desc' },
          take: 1,
          include: { decidedBy: { select: { name: true } } },
        },
      },
      orderBy: { selectionScore: { calculatedScore: 'desc' } },
    });

    // Parse score breakdowns
    const list = applications.map(app => ({
      ...app,
      selectionScore: app.selectionScore
        ? {
            ...app.selectionScore,
            scoreBreakdown: app.selectionScore.scoreBreakdown
              ? JSON.parse(app.selectionScore.scoreBreakdown)
              : null,
          }
        : null,
      withinSeatLimit: scheme.totalSeats && app.selectionScore?.rank
        ? app.selectionScore.rank <= scheme.totalSeats
        : null,
    }));

    res.json({ scheme, applications: list });
  } catch (error) {
    console.error('Get selection list error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// === Decisions ===

// POST /api/admin/applications/:id/decide
const decideApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, remarks } = req.body;
    const decidedById = req.user.userId;

    if (!decision || !['SELECTED', 'REJECTED', 'WAITLISTED'].includes(decision)) {
      return res.status(400).json({ message: 'decision must be SELECTED, REJECTED, or WAITLISTED.' });
    }

    if (!remarks) {
      return res.status(400).json({ message: 'remarks are required for audit purposes.' });
    }

    const application = await prisma.application.findUnique({ where: { id } });
    if (!application) return res.status(404).json({ message: 'Application not found.' });

    // Record the decision
    await prisma.selectionDecision.create({
      data: { applicationId: id, decidedById, decision, remarks },
    });

    // Update application status
    await changeApplicationStatus(id, decision, decidedById, remarks);

    // Auto-create fellowship record when SELECTED
    if (decision === 'SELECTED') {
      try {
        await createFellowshipRecord(id, application.applicantId, application.schemeId);
      } catch (fellowshipErr) {
        console.error('Fellowship creation error (non-critical):', fellowshipErr.message);
      }
    }

    res.json({ message: `Application ${decision}.` });
  } catch (error) {
    console.error('Decide application error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// POST /api/admin/schemes/:id/bulk-decide
const bulkDecide = async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, remarks } = req.body;
    const decidedById = req.user.userId;

    if (!decision || !['SELECTED', 'REJECTED', 'WAITLISTED'].includes(decision)) {
      return res.status(400).json({ message: 'decision must be SELECTED, REJECTED, or WAITLISTED.' });
    }
    if (!remarks) {
      return res.status(400).json({ message: 'remarks are required.' });
    }

    const scheme = await prisma.scheme.findUnique({
      where: { id },
      select: { totalSeats: true },
    });

    if (!scheme || !scheme.totalSeats) {
      return res.status(400).json({ message: 'Scheme totalSeats must be set before bulk decisions.' });
    }

    // Get all scored applications in READY_FOR_SELECTION, ordered by rank
    const applications = await prisma.application.findMany({
      where: { 
        schemeId: id, 
        status: 'READY_FOR_SELECTION',
        applicant: { role: { not: 'ADMIN' } },
      },
      include: { selectionScore: true },
      orderBy: { selectionScore: { rank: 'asc' } },
    });

    let selectedCount = 0;
    let waitlistedCount = 0;

    for (const app of applications) {
      if (!app.selectionScore) continue;

      const isWithinSeats = app.selectionScore.rank <= scheme.totalSeats;
      const appDecision = isWithinSeats ? 'SELECTED' : 'WAITLISTED';

      await prisma.selectionDecision.create({
        data: {
          applicationId: app.id,
          decidedById,
          decision: appDecision,
          remarks: isWithinSeats
            ? `${remarks} (Rank ${app.selectionScore.rank} within ${scheme.totalSeats} seats)`
            : `${remarks} (Rank ${app.selectionScore.rank} exceeds ${scheme.totalSeats} seats — waitlisted)`,
        },
      });

      await changeApplicationStatus(app.id, appDecision, decidedById,
        isWithinSeats
          ? `Selected: Rank ${app.selectionScore.rank}/${scheme.totalSeats}`
          : `Waitlisted: Rank ${app.selectionScore.rank}/${scheme.totalSeats}`
      );

      // Auto-create fellowship record when selected
      if (isWithinSeats) {
        try {
          await createFellowshipRecord(app.id, app.applicantId, app.schemeId);
        } catch (fellowshipErr) {
          console.error('Fellowship creation error (non-critical):', fellowshipErr.message);
        }
        selectedCount++;
      } else {
        waitlistedCount++;
      }
    }

    res.json({
      message: `Bulk decision completed. ${selectedCount} selected, ${waitlistedCount} waitlisted.`,
      selectedCount,
      waitlistedCount,
    });
  } catch (error) {
    console.error('Bulk decide error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// PUT /api/admin/schemes/:id/total-seats
const updateTotalSeats = async (req, res) => {
  try {
    const { id } = req.params;
    const { totalSeats } = req.body;

    await prisma.scheme.update({
      where: { id },
      data: { totalSeats: totalSeats ? parseInt(totalSeats) : null },
    });

    res.json({ message: 'Total seats updated.' });
  } catch (error) {
    console.error('Update total seats error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

module.exports = {
  addCriteria, getCriteria, updateCriteria, deleteCriteria,
  triggerRankings, getSelectionList, decideApplication, bulkDecide,
  updateTotalSeats,
};
