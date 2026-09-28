const prisma = require('../config/db');

// Simple in-memory trained model coefficients
let trainedModel = null;
let trainingDataSize = 0;
const MIN_TRAINING_DATA = 30;

/**
 * Train a simple linear regression model from completed application data.
 * Features: stageEncoded, deficiencyCount, flaggedDocCount
 * Target: totalDaysFromSubmitToCompletion
 */
const trainModel = async () => {
  // Find completed applications (SELECTED, REJECTED, WAITLISTED)
  const completedApps = await prisma.application.findMany({
    where: { status: { in: ['SELECTED', 'REJECTED', 'WAITLISTED'] } },
    include: {
      statusHistory: { orderBy: { changedAt: 'asc' } },
      deficiencies: true,
      documents: true,
    },
  });

  if (completedApps.length < MIN_TRAINING_DATA) {
    trainedModel = null;
    trainingDataSize = completedApps.length;
    return { trained: false, reason: `Only ${completedApps.length} completed apps (need ${MIN_TRAINING_DATA})`, dataSize: completedApps.length };
  }

  // Build training data
  const features = [];
  const targets = [];

  for (const app of completedApps) {
    if (!app.submittedAt) continue;

    // Calculate total processing time
    const lastHistory = app.statusHistory[app.statusHistory.length - 1];
    if (!lastHistory) continue;

    const totalDays = (new Date(lastHistory.changedAt) - new Date(app.submittedAt)) / (1000 * 60 * 60 * 24);
    if (totalDays <= 0) continue;

    // Features
    const deficiencyCount = app.deficiencies?.length || 0;
    const flaggedDocCount = app.documents?.filter(d => d.aiStatus === 'FLAGGED').length || 0;
    const totalDocs = app.documents?.length || 1;

    features.push([deficiencyCount, flaggedDocCount, totalDocs]);
    targets.push(totalDays);
  }

  if (features.length < MIN_TRAINING_DATA) {
    trainedModel = null;
    trainingDataSize = features.length;
    return { trained: false, reason: `Only ${features.length} usable samples`, dataSize: features.length };
  }

  // Simple multivariate linear regression using normal equation
  // y = b0 + b1*x1 + b2*x2 + b3*x3
  try {
    const n = features.length;
    const numFeatures = features[0].length;

    // Add bias term (column of 1s)
    const X = features.map(f => [1, ...f]);

    // Normal equation: coefficients = (X^T * X)^-1 * X^T * y
    // Simple implementation for small feature count
    const Xt = transpose(X);
    const XtX = matMul(Xt, X);
    const XtXinv = invertMatrix(XtX);
    const Xty = matVecMul(Xt, targets);
    const coefficients = matVecMul2(XtXinv, Xty);

    trainedModel = { coefficients, numFeatures };
    trainingDataSize = n;

    // Calculate R-squared
    const meanY = targets.reduce((a, b) => a + b, 0) / n;
    let ssRes = 0, ssTot = 0;
    for (let i = 0; i < n; i++) {
      const predicted = coefficients[0] + features[i].reduce((sum, f, j) => sum + f * coefficients[j + 1], 0);
      ssRes += (targets[i] - predicted) ** 2;
      ssTot += (targets[i] - meanY) ** 2;
    }
    const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0;

    return { trained: true, dataSize: n, rSquared: parseFloat(rSquared.toFixed(4)), coefficients };
  } catch (err) {
    console.error('ML training error:', err);
    trainedModel = null;
    return { trained: false, reason: 'Training failed: ' + err.message };
  }
};

/**
 * Predict ETA for an application using the trained model.
 */
const predictMLEta = async (applicationId) => {
  if (!trainedModel) return null;

  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      deficiencies: true,
      documents: true,
    },
  });

  if (!app || !app.submittedAt) return null;

  const deficiencyCount = app.deficiencies?.length || 0;
  const flaggedDocCount = app.documents?.filter(d => d.aiStatus === 'FLAGGED').length || 0;
  const totalDocs = app.documents?.length || 1;

  const features = [deficiencyCount, flaggedDocCount, totalDocs];
  const { coefficients } = trainedModel;

  let predictedTotalDays = coefficients[0];
  for (let i = 0; i < features.length; i++) {
    predictedTotalDays += features[i] * coefficients[i + 1];
  }
  predictedTotalDays = Math.max(1, predictedTotalDays);

  // Subtract days already elapsed
  const daysElapsed = (Date.now() - new Date(app.submittedAt)) / (1000 * 60 * 60 * 24);
  const predictedDaysRemaining = Math.max(0.5, predictedTotalDays - daysElapsed);

  const predictedCompletionDate = new Date();
  predictedCompletionDate.setDate(predictedCompletionDate.getDate() + Math.ceil(predictedDaysRemaining));

  return {
    predictedDaysRemaining: parseFloat(predictedDaysRemaining.toFixed(2)),
    predictedCompletionDate,
    predictedTotalDays: parseFloat(predictedTotalDays.toFixed(2)),
  };
};

const isModelTrained = () => !!trainedModel;
const getTrainingDataSize = () => trainingDataSize;

// === Matrix helpers ===
function transpose(M) {
  return M[0].map((_, i) => M.map(row => row[i]));
}
function matMul(A, B) {
  return A.map(rowA => B[0].map((_, j) => rowA.reduce((sum, a, k) => sum + a * B[k][j], 0)));
}
function matVecMul(M, v) {
  return M.map(row => row.reduce((sum, val, j) => sum + val * v[j], 0));
}
function matVecMul2(M, v) {
  return M.map(row => row.reduce((sum, val, j) => sum + val * v[j], 0));
}
function invertMatrix(M) {
  const n = M.length;
  const aug = M.map((row, i) => [...row, ...Array(n).fill(0).map((_, j) => i === j ? 1 : 0)]);
  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) maxRow = k;
    }
    [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];
    const pivot = aug[i][i];
    if (Math.abs(pivot) < 1e-10) throw new Error('Singular matrix');
    for (let j = 0; j < 2 * n; j++) aug[i][j] /= pivot;
    for (let k = 0; k < n; k++) {
      if (k === i) continue;
      const factor = aug[k][i];
      for (let j = 0; j < 2 * n; j++) aug[k][j] -= factor * aug[i][j];
    }
  }
  return aug.map(row => row.slice(n));
}

module.exports = { trainModel, predictMLEta, isModelTrained, getTrainingDataSize, MIN_TRAINING_DATA };
