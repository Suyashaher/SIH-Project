const express = require('express');
const router = express.Router();
const prisma = require('../config/db');

// GET /api/schemes — list all active schemes (public)
router.get('/', async (req, res) => {
  try {
    const schemes = await prisma.scheme.findMany({
      where: { isActive: true },
      select: { id: true, name: true, description: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ schemes });
  } catch (error) {
    console.error('Get schemes error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// GET /api/schemes/:id/details — public scheme details for applicant
router.get('/:id/details', async (req, res) => {
  try {
    const { id } = req.params;
    const scheme = await prisma.scheme.findUnique({
      where: { id, isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        eligibilityRules: {
          select: { id: true, fieldName: true, operator: true, value: true },
          orderBy: { createdAt: 'asc' },
        },
        documentRequirements: {
          select: { id: true, documentName: true, isMandatory: true },
          orderBy: { createdAt: 'asc' },
        },
        applicationFields: {
          select: { id: true, fieldLabel: true, fieldType: true, isRequired: true, options: true, displayOrder: true },
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    if (!scheme) {
      return res.status(404).json({ message: 'Scheme not found or inactive.' });
    }

    res.json({ scheme });
  } catch (error) {
    console.error('Get scheme details error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// POST /api/schemes/:id/check-eligibility — preliminary eligibility check
router.post('/:id/check-eligibility', async (req, res) => {
  try {
    const { id } = req.params;
    const answers = req.body; // { income: "200000", category: "ST", marks: "60", age: "25" }

    const scheme = await prisma.scheme.findUnique({
      where: { id, isActive: true },
      include: { eligibilityRules: true },
    });

    if (!scheme) {
      return res.status(404).json({ message: 'Scheme not found or inactive.' });
    }

    const failedRules = [];

    for (const rule of scheme.eligibilityRules) {
      const answer = answers[rule.fieldName];
      if (answer === undefined || answer === null || answer === '') {
        failedRules.push({
          fieldName: rule.fieldName,
          operator: rule.operator,
          expectedValue: rule.value,
          reason: `No answer provided for "${rule.fieldName}".`,
        });
        continue;
      }

      let passed = false;
      const numAnswer = parseFloat(answer);
      const numExpected = parseFloat(rule.value);

      switch (rule.operator) {
        case 'EQUALS':
          passed = String(answer).toLowerCase() === String(rule.value).toLowerCase();
          break;
        case 'NOT_EQUALS':
          passed = String(answer).toLowerCase() !== String(rule.value).toLowerCase();
          break;
        case 'LESS_THAN':
          passed = !isNaN(numAnswer) && !isNaN(numExpected) && numAnswer < numExpected;
          break;
        case 'GREATER_THAN':
          passed = !isNaN(numAnswer) && !isNaN(numExpected) && numAnswer > numExpected;
          break;
        case 'LESS_THAN_OR_EQUAL':
          passed = !isNaN(numAnswer) && !isNaN(numExpected) && numAnswer <= numExpected;
          break;
        case 'GREATER_THAN_OR_EQUAL':
          passed = !isNaN(numAnswer) && !isNaN(numExpected) && numAnswer >= numExpected;
          break;
        case 'IN': {
          const allowedValues = rule.value.split(',').map(v => v.trim().toLowerCase());
          passed = allowedValues.includes(String(answer).toLowerCase());
          break;
        }
        default:
          passed = false;
      }

      if (!passed) {
        failedRules.push({
          fieldName: rule.fieldName,
          operator: rule.operator,
          expectedValue: rule.value,
          yourValue: answer,
          reason: `Criteria not met for "${rule.fieldName}".`,
        });
      }
    }

    res.json({
      eligible: failedRules.length === 0,
      failedRules,
      totalRules: scheme.eligibilityRules.length,
      passedRules: scheme.eligibilityRules.length - failedRules.length,
    });
  } catch (error) {
    console.error('Eligibility check error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

module.exports = router;
