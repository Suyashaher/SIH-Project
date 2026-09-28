const prisma = require('../config/db');
const { Parser } = require('json2csv');

// GET /api/admin/dashboard/overview
const getOverview = async (req, res) => {
  try {
    const { schemeId } = req.query;
    const where = schemeId ? { schemeId } : {};

    const totalApplications = await prisma.application.count({ where });

    const statusCounts = await prisma.application.groupBy({
      by: ['status'],
      where,
      _count: true,
    });

    const byStatus = {};
    statusCounts.forEach(s => { byStatus[s.status] = s._count; });

    const fellowshipWhere = schemeId ? { schemeId } : {};
    const totalActiveFellowships = await prisma.fellowshipRecord.count({
      where: { ...fellowshipWhere, fellowshipStatus: 'ACTIVE' },
    });

    const disbWhere = schemeId ? { fellowshipRecord: { schemeId } } : {};
    const totalDisbursementsPending = await prisma.disbursementRecord.count({
      where: { ...disbWhere, status: 'PENDING' },
    });
    const totalDisbursementsProcessed = await prisma.disbursementRecord.count({
      where: { ...disbWhere, status: 'PROCESSED' },
    });

    // Recent activity
    const recentActivity = await prisma.applicationStatusHistory.findMany({
      where: schemeId ? { application: { schemeId } } : {},
      orderBy: { changedAt: 'desc' },
      take: 15,
      include: {
        application: {
          select: { applicant: { select: { name: true } }, scheme: { select: { name: true } } },
        },
      },
    });

    res.json({
      totalApplications,
      byStatus,
      totalActiveFellowships,
      totalDisbursementsPending,
      totalDisbursementsProcessed,
      recentActivity: recentActivity.map(a => ({
        id: a.id,
        applicantName: a.application?.applicant?.name || 'Unknown',
        schemeName: a.application?.scheme?.name || 'Unknown',
        previousStatus: a.previousStatus,
        newStatus: a.newStatus,
        remarks: a.remarks,
        changedAt: a.changedAt,
      })),
    });
  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// GET /api/admin/dashboard/by-scheme
const getByScheme = async (req, res) => {
  try {
    const schemes = await prisma.scheme.findMany({
      select: { id: true, name: true, totalSeats: true },
    });

    const result = [];
    for (const scheme of schemes) {
      const statusCounts = await prisma.application.groupBy({
        by: ['status'],
        where: { schemeId: scheme.id },
        _count: true,
      });
      const byStatus = {};
      let total = 0;
      statusCounts.forEach(s => { byStatus[s.status] = s._count; total += s._count; });

      const benchmarks = await prisma.stageDurationBenchmark.findMany({
        where: { schemeId: scheme.id },
        select: { stage: true, averageDurationDays: true },
      });
      const avgProcessingTime = benchmarks.reduce((sum, b) => sum + b.averageDurationDays, 0);

      const totalSelected = byStatus['SELECTED'] || 0;

      result.push({
        id: scheme.id,
        name: scheme.name,
        totalApplications: total,
        byStatus,
        avgProcessingTimeDays: parseFloat(avgProcessingTime.toFixed(1)),
        totalSeats: scheme.totalSeats || 0,
        totalSelected,
        remainingSeats: Math.max(0, (scheme.totalSeats || 0) - totalSelected),
      });
    }

    res.json({ schemes: result });
  } catch (error) {
    console.error('By-scheme error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// GET /api/admin/dashboard/verification-stats
const getVerificationStats = async (req, res) => {
  try {
    const totalDocs = await prisma.applicationDocument.count();

    const byAiStatus = await prisma.applicationDocument.groupBy({
      by: ['aiStatus'],
      _count: true,
    });
    const aiStatusCounts = {};
    byAiStatus.forEach(s => { aiStatusCounts[s.aiStatus] = s._count; });

    // Top flagged document types
    const flaggedDocs = await prisma.applicationDocument.findMany({
      where: { aiStatus: 'FLAGGED' },
      include: { documentRequirement: { select: { documentName: true } } },
    });

    const flagReasons = {};
    flaggedDocs.forEach(d => {
      const docType = d.documentRequirement?.documentName || 'Unknown';
      if (!flagReasons[docType]) flagReasons[docType] = { count: 0, reasons: {} };
      flagReasons[docType].count++;
      const reason = d.aiFlagReason || 'No reason';
      flagReasons[docType].reasons[reason] = (flagReasons[docType].reasons[reason] || 0) + 1;
    });

    const topFlagged = Object.entries(flagReasons)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([docType, data]) => ({
        documentType: docType,
        flagCount: data.count,
        topReasons: Object.entries(data.reasons)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([reason, count]) => ({ reason, count })),
      }));

    // Average confidence by document type
    const allDocs = await prisma.applicationDocument.findMany({
      where: { confidenceScore: { not: null } },
      include: { documentRequirement: { select: { documentName: true } } },
    });
    const confByType = {};
    allDocs.forEach(d => {
      const docType = d.documentRequirement?.documentName || 'Unknown';
      if (!confByType[docType]) confByType[docType] = { sum: 0, count: 0 };
      confByType[docType].sum += d.confidenceScore;
      confByType[docType].count++;
    });
    const avgConfidenceByType = Object.entries(confByType).map(([type, data]) => ({
      documentType: type,
      avgConfidence: parseFloat((data.sum / data.count).toFixed(1)),
      sampleSize: data.count,
    }));

    res.json({ totalDocs, aiStatusCounts, topFlagged, avgConfidenceByType });
  } catch (error) {
    console.error('Verification stats error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// GET /api/admin/dashboard/deficiency-stats
const getDeficiencyStats = async (req, res) => {
  try {
    const total = await prisma.deficiencyRequest.count();
    const open = await prisma.deficiencyRequest.count({ where: { status: 'OPEN' } });
    const resolved = await prisma.deficiencyRequest.count({ where: { status: 'RESOLVED' } });

    // Average resolve time
    const resolvedDefs = await prisma.deficiencyRequest.findMany({
      where: { status: 'RESOLVED', resolvedAt: { not: null } },
      select: { raisedAt: true, resolvedAt: true },
    });
    let avgResolveDays = 0;
    if (resolvedDefs.length > 0) {
      const totalDays = resolvedDefs.reduce((sum, d) => {
        return sum + (new Date(d.resolvedAt) - new Date(d.raisedAt)) / (1000 * 60 * 60 * 24);
      }, 0);
      avgResolveDays = parseFloat((totalDays / resolvedDefs.length).toFixed(1));
    }

    // Top reasons
    const allDefs = await prisma.deficiencyRequest.findMany({ select: { reason: true } });
    const reasonCounts = {};
    allDefs.forEach(d => {
      const r = d.reason.substring(0, 80);
      reasonCounts[r] = (reasonCounts[r] || 0) + 1;
    });
    const topReasons = Object.entries(reasonCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([reason, count]) => ({ reason, count }));

    res.json({ total, open, resolved, avgResolveDays, topReasons });
  } catch (error) {
    console.error('Deficiency stats error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// GET /api/admin/dashboard/selection-stats
const getSelectionStats = async (req, res) => {
  try {
    const schemes = await prisma.scheme.findMany({ select: { id: true, name: true, totalSeats: true } });
    const result = [];

    for (const scheme of schemes) {
      const scores = await prisma.applicationSelectionScore.findMany({
        where: { application: { schemeId: scheme.id } },
        select: { calculatedScore: true },
      });

      const statusCounts = await prisma.application.groupBy({
        by: ['status'],
        where: { schemeId: scheme.id, status: { in: ['SELECTED', 'REJECTED', 'WAITLISTED', 'READY_FOR_SELECTION'] } },
        _count: true,
      });
      const counts = {};
      statusCounts.forEach(s => { counts[s.status] = s._count; });

      // Score distribution buckets
      const buckets = { '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 };
      let totalScore = 0;
      scores.forEach(s => {
        totalScore += s.calculatedScore;
        if (s.calculatedScore <= 20) buckets['0-20']++;
        else if (s.calculatedScore <= 40) buckets['21-40']++;
        else if (s.calculatedScore <= 60) buckets['41-60']++;
        else if (s.calculatedScore <= 80) buckets['61-80']++;
        else buckets['81-100']++;
      });

      result.push({
        schemeId: scheme.id,
        schemeName: scheme.name,
        totalSeats: scheme.totalSeats || 0,
        totalRanked: scores.length,
        totalSelected: counts['SELECTED'] || 0,
        totalRejected: counts['REJECTED'] || 0,
        totalWaitlisted: counts['WAITLISTED'] || 0,
        avgScore: scores.length > 0 ? parseFloat((totalScore / scores.length).toFixed(1)) : 0,
        scoreDistribution: Object.entries(buckets).map(([range, count]) => ({ range, count })),
      });
    }

    res.json({ schemes: result });
  } catch (error) {
    console.error('Selection stats error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// GET /api/admin/dashboard/officer-stats
const getOfficerStats = async (req, res) => {
  try {
    const officers = await prisma.user.findMany({
      where: { role: 'OFFICER' },
      select: { id: true, name: true, email: true },
    });

    const result = [];
    for (const officer of officers) {
      const assignedCount = await prisma.application.count({
        where: { assignedOfficerId: officer.id },
      });

      const completedCount = await prisma.application.count({
        where: {
          assignedOfficerId: officer.id,
          scrutinyCompletedAt: { not: null },
        },
      });

      // Average processing time (claim to scrutiny completion)
      const completedApps = await prisma.application.findMany({
        where: {
          assignedOfficerId: officer.id,
          scrutinyCompletedAt: { not: null },
        },
        include: {
          statusHistory: {
            where: { newStatus: 'UNDER_SCRUTINY' },
            orderBy: { changedAt: 'asc' },
            take: 1,
          },
        },
      });

      let avgDays = 0;
      let processedCount = 0;
      for (const app of completedApps) {
        const claimDate = app.statusHistory[0]?.changedAt;
        if (claimDate && app.scrutinyCompletedAt) {
          avgDays += (new Date(app.scrutinyCompletedAt) - new Date(claimDate)) / (1000 * 60 * 60 * 24);
          processedCount++;
        }
      }
      if (processedCount > 0) avgDays = parseFloat((avgDays / processedCount).toFixed(1));

      const overrideCount = await prisma.aIFeedbackLog.count({
        where: { officerId: officer.id, wasOverridden: true },
      });

      result.push({
        id: officer.id,
        name: officer.name,
        email: officer.email,
        assignedCount,
        completedCount,
        avgProcessingDays: avgDays,
        overrideCount,
      });
    }

    res.json({ officers: result });
  } catch (error) {
    console.error('Officer stats error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// GET /api/admin/dashboard/fellowship-stats
const getFellowshipStats = async (req, res) => {
  try {
    const statusCounts = await prisma.fellowshipRecord.groupBy({
      by: ['fellowshipStatus'],
      _count: true,
    });
    const byStatus = {};
    statusCounts.forEach(s => { byStatus[s.fellowshipStatus] = s._count; });

    const disbStatusCounts = await prisma.disbursementRecord.groupBy({
      by: ['status'],
      _count: true,
      _sum: { amount: true },
    });
    const disbursements = {};
    disbStatusCounts.forEach(s => {
      disbursements[s.status] = { count: s._count, totalAmount: s._sum.amount || 0 };
    });

    const overdueDocCount = await prisma.postSelectionDocument.count({
      where: { status: 'OVERDUE' },
    });

    res.json({ fellowshipsByStatus: byStatus, disbursements, overdueDocCount });
  } catch (error) {
    console.error('Fellowship stats error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// GET /api/admin/dashboard/export
const exportData = async (req, res) => {
  try {
    const { type, schemeId } = req.query;
    let data = [];
    let fields = [];

    if (type === 'applications') {
      const where = schemeId ? { schemeId } : {};
      const apps = await prisma.application.findMany({
        where,
        include: {
          applicant: { select: { name: true, email: true } },
          scheme: { select: { name: true } },
          assignedOfficer: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      data = apps.map(a => ({
        'Application ID': a.id,
        'Applicant Name': a.applicant?.name,
        'Applicant Email': a.applicant?.email,
        'Scheme': a.scheme?.name,
        'Status': a.status,
        'Submitted At': a.submittedAt ? new Date(a.submittedAt).toISOString() : '',
        'Assigned Officer': a.assignedOfficer?.name || '',
        'Created At': new Date(a.createdAt).toISOString(),
      }));
      fields = ['Application ID', 'Applicant Name', 'Applicant Email', 'Scheme', 'Status', 'Submitted At', 'Assigned Officer', 'Created At'];
    } else if (type === 'fellowships') {
      const fellows = await prisma.fellowshipRecord.findMany({
        include: {
          applicant: { select: { name: true, email: true } },
          scheme: { select: { name: true } },
        },
      });
      data = fellows.map(f => ({
        'Fellowship ID': f.id,
        'Applicant': f.applicant?.name,
        'Email': f.applicant?.email,
        'Scheme': f.scheme?.name,
        'Status': f.fellowshipStatus,
        'Start Date': new Date(f.startDate).toISOString(),
        'Expected End': f.expectedEndDate ? new Date(f.expectedEndDate).toISOString() : '',
      }));
      fields = ['Fellowship ID', 'Applicant', 'Email', 'Scheme', 'Status', 'Start Date', 'Expected End'];
    } else if (type === 'disbursements') {
      const disbs = await prisma.disbursementRecord.findMany({
        include: {
          fellowshipRecord: {
            include: {
              applicant: { select: { name: true } },
              scheme: { select: { name: true } },
            },
          },
        },
        orderBy: { dueDate: 'asc' },
      });
      data = disbs.map(d => ({
        'Installment #': d.installmentNumber,
        'Applicant': d.fellowshipRecord?.applicant?.name,
        'Scheme': d.fellowshipRecord?.scheme?.name,
        'Amount': d.amount,
        'Status': d.status,
        'Due Date': new Date(d.dueDate).toISOString(),
        'Processed Date': d.processedDate ? new Date(d.processedDate).toISOString() : '',
        'Remarks': d.remarks || '',
      }));
      fields = ['Installment #', 'Applicant', 'Scheme', 'Amount', 'Status', 'Due Date', 'Processed Date', 'Remarks'];
    } else {
      return res.status(400).json({ message: 'Invalid export type. Use: applications, fellowships, disbursements.' });
    }

    if (data.length === 0) {
      return res.status(404).json({ message: 'No data found for export.' });
    }

    const parser = new Parser({ fields });
    const csv = parser.parse(data);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${type}_export_${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

module.exports = {
  getOverview, getByScheme, getVerificationStats, getDeficiencyStats,
  getSelectionStats, getOfficerStats, getFellowshipStats, exportData,
};
