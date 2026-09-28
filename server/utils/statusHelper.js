const prisma = require('../config/db');
const { createNotification } = require('../services/notificationService');

/**
 * Log a status change and update the application status atomically.
 * Also triggers ETA prediction update in the background.
 */
const changeApplicationStatus = async (applicationId, newStatus, changedById, remarks = null) => {
  const application = await prisma.application.findUnique({ where: { id: applicationId } });
  if (!application) throw new Error('Application not found');

  const previousStatus = application.status;

  await prisma.$transaction([
    prisma.application.update({
      where: { id: applicationId },
      data: { status: newStatus },
    }),
    prisma.applicationStatusHistory.create({
      data: {
        applicationId,
        previousStatus,
        newStatus,
        changedById,
        remarks,
      },
    }),
  ]);

  // Send notification to applicant
  const statusTitles = {
    SUBMITTED: 'Application Submitted',
    UNDER_VERIFICATION: 'Verification Started',
    DEFICIENT: 'Action Required: Deficiencies Found',
    UNDER_SCRUTINY: 'Scrutiny Started',
    READY_FOR_SELECTION: 'Ready for Selection',
    SELECTED: 'Congratulations! You have been selected',
    REJECTED: 'Application Update',
    WAITLISTED: 'Application Waitlisted'
  };
  
  await createNotification({
    userId: application.applicantId,
    title: statusTitles[newStatus] || 'Application Status Updated',
    message: `Your application status has been updated to ${newStatus.replace(/_/g, ' ')}.${remarks ? ' Remarks: ' + remarks : ''}`,
    type: 'STATUS_CHANGE',
    relatedEntityType: 'Application',
    relatedEntityId: applicationId,
    actionUrl: `http://localhost:5173/applicant/applications/${applicationId}`
  });

  // Trigger ETA recalculation in background (don't await, don't block)
  try {
    const { calculateRuleBasedETA } = require('../services/etaCalculationService');
    const { predictMLEta, isModelTrained } = require('../services/mlEtaService');

    const terminalStates = ['SELECTED', 'REJECTED', 'WAITLISTED', 'DRAFT'];
    if (!terminalStates.includes(newStatus)) {
      const ruleBased = await calculateRuleBasedETA(applicationId);
      let finalPrediction = ruleBased;
      let method = 'RULE_BASED';

      if (isModelTrained()) {
        const mlBased = await predictMLEta(applicationId);
        if (mlBased) {
          finalPrediction = mlBased;
          method = 'ML_MODEL';
        }
      }

      await prisma.application.update({
        where: { id: applicationId },
        data: {
          predictedDaysRemaining: finalPrediction.predictedDaysRemaining,
          predictedCompletionDate: finalPrediction.predictedCompletionDate,
          predictionMethod: method,
          predictionLastUpdatedAt: new Date(),
        },
      });
    } else {
      // Clear prediction for terminal states
      await prisma.application.update({
        where: { id: applicationId },
        data: {
          predictedDaysRemaining: 0,
          predictionMethod: null,
          predictionLastUpdatedAt: new Date(),
        },
      });
    }
  } catch (etaErr) {
    console.error('ETA update failed (non-critical):', etaErr.message);
  }

  return { previousStatus, newStatus };
};

module.exports = { changeApplicationStatus };
