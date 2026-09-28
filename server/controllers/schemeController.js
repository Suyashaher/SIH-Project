const { body, param, validationResult } = require('express-validator');
const prisma = require('../config/db');

// Validation helpers
const handleValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  return null;
};

// === SCHEME CRUD ===

const createScheme = async (req, res) => {
  try {
    const validationError = handleValidationErrors(req, res);
    if (validationError) return;

    const { name, description } = req.body;

    const scheme = await prisma.scheme.create({
      data: { name, description },
    });

    res.status(201).json({ message: 'Scheme created successfully.', scheme });
  } catch (error) {
    console.error('Create scheme error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const getAllSchemes = async (req, res) => {
  try {
    const schemes = await prisma.scheme.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            eligibilityRules: true,
            documentRequirements: true,
            applicationFields: true,
          },
        },
      },
    });

    res.json({ schemes });
  } catch (error) {
    console.error('Get schemes error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const getSchemeById = async (req, res) => {
  try {
    const { id } = req.params;

    const scheme = await prisma.scheme.findUnique({
      where: { id },
      include: {
        eligibilityRules: { orderBy: { createdAt: 'asc' } },
        documentRequirements: { orderBy: { createdAt: 'asc' } },
        applicationFields: { orderBy: { displayOrder: 'asc' } },
      },
    });

    if (!scheme) {
      return res.status(404).json({ message: 'Scheme not found.' });
    }

    res.json({ scheme });
  } catch (error) {
    console.error('Get scheme error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const updateScheme = async (req, res) => {
  try {
    const validationError = handleValidationErrors(req, res);
    if (validationError) return;

    const { id } = req.params;
    const { name, description } = req.body;

    const scheme = await prisma.scheme.update({
      where: { id },
      data: { name, description },
    });

    res.json({ message: 'Scheme updated successfully.', scheme });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Scheme not found.' });
    }
    console.error('Update scheme error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const toggleSchemeStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const scheme = await prisma.scheme.findUnique({ where: { id } });
    if (!scheme) {
      return res.status(404).json({ message: 'Scheme not found.' });
    }

    const updated = await prisma.scheme.update({
      where: { id },
      data: { isActive: !scheme.isActive },
    });

    res.json({
      message: `Scheme ${updated.isActive ? 'activated' : 'deactivated'} successfully.`,
      scheme: updated,
    });
  } catch (error) {
    console.error('Toggle scheme error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// === ELIGIBILITY RULES ===

const addRule = async (req, res) => {
  try {
    const validationError = handleValidationErrors(req, res);
    if (validationError) return;

    const { id } = req.params;
    const { fieldName, operator, value } = req.body;

    // Verify scheme exists
    const scheme = await prisma.scheme.findUnique({ where: { id } });
    if (!scheme) {
      return res.status(404).json({ message: 'Scheme not found.' });
    }

    const rule = await prisma.schemeEligibilityRule.create({
      data: { schemeId: id, fieldName, operator, value },
    });

    res.status(201).json({ message: 'Rule added successfully.', rule });
  } catch (error) {
    console.error('Add rule error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const getRules = async (req, res) => {
  try {
    const { id } = req.params;
    const rules = await prisma.schemeEligibilityRule.findMany({
      where: { schemeId: id },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ rules });
  } catch (error) {
    console.error('Get rules error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const updateRule = async (req, res) => {
  try {
    const validationError = handleValidationErrors(req, res);
    if (validationError) return;

    const { ruleId } = req.params;
    const { fieldName, operator, value } = req.body;

    const rule = await prisma.schemeEligibilityRule.update({
      where: { id: ruleId },
      data: { fieldName, operator, value },
    });

    res.json({ message: 'Rule updated successfully.', rule });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Rule not found.' });
    }
    console.error('Update rule error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const deleteRule = async (req, res) => {
  try {
    const { ruleId } = req.params;
    await prisma.schemeEligibilityRule.delete({ where: { id: ruleId } });
    res.json({ message: 'Rule deleted successfully.' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Rule not found.' });
    }
    console.error('Delete rule error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// === DOCUMENT REQUIREMENTS ===

const addDocument = async (req, res) => {
  try {
    const validationError = handleValidationErrors(req, res);
    if (validationError) return;

    const { id } = req.params;
    const { documentName, isMandatory } = req.body;

    const scheme = await prisma.scheme.findUnique({ where: { id } });
    if (!scheme) {
      return res.status(404).json({ message: 'Scheme not found.' });
    }

    const doc = await prisma.schemeDocumentRequirement.create({
      data: { schemeId: id, documentName, isMandatory: isMandatory !== false },
    });

    res.status(201).json({ message: 'Document requirement added successfully.', document: doc });
  } catch (error) {
    console.error('Add document error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const getDocuments = async (req, res) => {
  try {
    const { id } = req.params;
    const documents = await prisma.schemeDocumentRequirement.findMany({
      where: { schemeId: id },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ documents });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const updateDocument = async (req, res) => {
  try {
    const validationError = handleValidationErrors(req, res);
    if (validationError) return;

    const { docId } = req.params;
    const { documentName, isMandatory } = req.body;

    const doc = await prisma.schemeDocumentRequirement.update({
      where: { id: docId },
      data: { documentName, isMandatory },
    });

    res.json({ message: 'Document requirement updated successfully.', document: doc });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Document requirement not found.' });
    }
    console.error('Update document error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const deleteDocument = async (req, res) => {
  try {
    const { docId } = req.params;
    await prisma.schemeDocumentRequirement.delete({ where: { id: docId } });
    res.json({ message: 'Document requirement deleted successfully.' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Document requirement not found.' });
    }
    console.error('Delete document error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// === APPLICATION FIELDS ===

const addField = async (req, res) => {
  try {
    const validationError = handleValidationErrors(req, res);
    if (validationError) return;

    const { id } = req.params;
    const { fieldLabel, fieldType, isRequired, options, displayOrder } = req.body;

    const scheme = await prisma.scheme.findUnique({ where: { id } });
    if (!scheme) {
      return res.status(404).json({ message: 'Scheme not found.' });
    }

    // Auto-calculate displayOrder if not provided
    let order = displayOrder;
    if (order === undefined || order === null) {
      const maxField = await prisma.schemeApplicationField.findFirst({
        where: { schemeId: id },
        orderBy: { displayOrder: 'desc' },
      });
      order = maxField ? maxField.displayOrder + 1 : 0;
    }

    const field = await prisma.schemeApplicationField.create({
      data: {
        schemeId: id,
        fieldLabel,
        fieldType: fieldType || 'TEXT',
        isRequired: isRequired !== false,
        options: options || null,
        displayOrder: order,
      },
    });

    res.status(201).json({ message: 'Field added successfully.', field });
  } catch (error) {
    console.error('Add field error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const getFields = async (req, res) => {
  try {
    const { id } = req.params;
    const fields = await prisma.schemeApplicationField.findMany({
      where: { schemeId: id },
      orderBy: { displayOrder: 'asc' },
    });
    res.json({ fields });
  } catch (error) {
    console.error('Get fields error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const updateField = async (req, res) => {
  try {
    const validationError = handleValidationErrors(req, res);
    if (validationError) return;

    const { fieldId } = req.params;
    const { fieldLabel, fieldType, isRequired, options, displayOrder } = req.body;

    const field = await prisma.schemeApplicationField.update({
      where: { id: fieldId },
      data: { fieldLabel, fieldType, isRequired, options, displayOrder },
    });

    res.json({ message: 'Field updated successfully.', field });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Field not found.' });
    }
    console.error('Update field error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const deleteField = async (req, res) => {
  try {
    const { fieldId } = req.params;
    await prisma.schemeApplicationField.delete({ where: { id: fieldId } });
    res.json({ message: 'Field deleted successfully.' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Field not found.' });
    }
    console.error('Delete field error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const reorderFields = async (req, res) => {
  try {
    const { id } = req.params;
    const { fieldOrders } = req.body; // Array of { id, displayOrder }

    if (!Array.isArray(fieldOrders)) {
      return res.status(400).json({ message: 'fieldOrders must be an array.' });
    }

    const updates = fieldOrders.map((item) =>
      prisma.schemeApplicationField.update({
        where: { id: item.id },
        data: { displayOrder: item.displayOrder },
      })
    );

    await prisma.$transaction(updates);

    const fields = await prisma.schemeApplicationField.findMany({
      where: { schemeId: id },
      orderBy: { displayOrder: 'asc' },
    });

    res.json({ message: 'Fields reordered successfully.', fields });
  } catch (error) {
    console.error('Reorder fields error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// Validation middleware arrays
const validateScheme = [
  body('name').notEmpty().withMessage('Scheme name is required.').trim(),
  body('description').optional().trim(),
];

const validateRule = [
  body('fieldName').notEmpty().withMessage('Field name is required.').trim(),
  body('operator')
    .notEmpty()
    .withMessage('Operator is required.')
    .isIn(['LESS_THAN', 'GREATER_THAN', 'EQUALS', 'NOT_EQUALS', 'IN', 'LESS_THAN_OR_EQUAL', 'GREATER_THAN_OR_EQUAL'])
    .withMessage('Invalid operator.'),
  body('value').notEmpty().withMessage('Value is required.').trim(),
];

const validateDocument = [
  body('documentName').notEmpty().withMessage('Document name is required.').trim(),
  body('isMandatory').optional().isBoolean().withMessage('isMandatory must be boolean.'),
];

const validateField = [
  body('fieldLabel').notEmpty().withMessage('Field label is required.').trim(),
  body('fieldType')
    .optional()
    .isIn(['TEXT', 'NUMBER', 'DATE', 'DROPDOWN', 'FILE'])
    .withMessage('Invalid field type.'),
  body('isRequired').optional().isBoolean().withMessage('isRequired must be boolean.'),
  body('options').optional().trim(),
  body('displayOrder').optional().isInt().withMessage('Display order must be an integer.'),
];

module.exports = {
  createScheme, getAllSchemes, getSchemeById, updateScheme, toggleSchemeStatus,
  addRule, getRules, updateRule, deleteRule,
  addDocument, getDocuments, updateDocument, deleteDocument,
  addField, getFields, updateField, deleteField, reorderFields,
  validateScheme, validateRule, validateDocument, validateField,
};
