const bcrypt = require('bcryptjs');
const prisma = require('../config/db');

// POST /api/admin/create-officer
const createOfficer = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'Name, email, and password are required.' });
    if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters.' });

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(409).json({ message: 'An account with this email already exists.' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const officer = await prisma.user.create({
      data: { name, email, password: hashedPassword, role: 'OFFICER' },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });

    res.status(201).json({ message: 'Officer account created successfully.', user: officer });
  } catch (error) {
    console.error('Create officer error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// GET /api/admin/officers
const getAllOfficers = async (req, res) => {
  try {
    const officers = await prisma.user.findMany({
      where: { role: 'OFFICER' },
      select: {
        id: true, name: true, email: true, isActive: true, createdAt: true,
        assignedSchemes: {
          include: { scheme: { select: { id: true, name: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ officers });
  } catch (error) {
    console.error('Get officers error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// PUT /api/admin/officers/:id
const updateOfficer = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email } = req.body;

    if (!name || !email) return res.status(400).json({ message: 'Name and email are required.' });

    // Check email uniqueness if email changed
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.id !== id) {
      return res.status(409).json({ message: 'Email is already in use.' });
    }

    const officer = await prisma.user.update({
      where: { id },
      data: { name, email },
      select: { id: true, name: true, email: true, isActive: true }
    });

    res.json({ message: 'Officer updated successfully.', officer });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// PATCH /api/admin/officers/:id/toggle-status
const toggleOfficerStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const officer = await prisma.user.findUnique({ where: { id, role: 'OFFICER' } });
    
    if (!officer) return res.status(404).json({ message: 'Officer not found.' });

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: !officer.isActive },
      select: { id: true, isActive: true }
    });

    res.json({ message: `Officer ${updated.isActive ? 'activated' : 'deactivated'}.`, officer: updated });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// PUT /api/admin/officers/:id/schemes (Bulk assign/unassign)
const updateOfficerSchemes = async (req, res) => {
  try {
    const { id } = req.params;
    const { schemeIds } = req.body; // Array of scheme IDs

    if (!Array.isArray(schemeIds)) return res.status(400).json({ message: 'schemeIds must be an array.' });

    const officer = await prisma.user.findUnique({ where: { id, role: 'OFFICER' } });
    if (!officer) return res.status(404).json({ message: 'Officer not found.' });

    // Transaction: remove all existing, then insert new ones
    await prisma.$transaction([
      prisma.officerSchemeAssignment.deleteMany({ where: { officerId: id } }),
      prisma.officerSchemeAssignment.createMany({
        data: schemeIds.map(schemeId => ({ officerId: id, schemeId }))
      })
    ]);

    res.json({ message: 'Schemes assigned successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// GET /api/admin/applications
const getApplications = async (req, res) => {
  try {
    const { schemeId, status } = req.query;
    const where = {
      applicant: {
        role: { not: 'ADMIN' }
      }
    };
    if (schemeId) where.schemeId = schemeId;
    if (status) where.status = status;

    const applications = await prisma.application.findMany({
      where,
      include: {
        scheme: { select: { id: true, name: true } },
        applicant: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ applications });
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

module.exports = { createOfficer, getAllOfficers, updateOfficer, toggleOfficerStatus, updateOfficerSchemes, getApplications };
