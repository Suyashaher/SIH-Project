require('dotenv').config();
const express = require('express');
const cors = require('cors');

const healthRoute = require('./routes/health');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const selectionRoutes = require('./routes/selection');
const officerRoutes = require('./routes/officer');
const schemeRoutes = require('./routes/schemes');
const applicationRoutes = require('./routes/applications');
const verificationRoutes = require('./routes/verification');
const fellowshipRoutes = require('./routes/fellowship');
const notificationRoutes = require('./routes/notifications');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/health', healthRoute);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/selection', selectionRoutes);
app.use('/api/officer', officerRoutes);
app.use('/api/schemes', schemeRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/applications', verificationRoutes);
app.use('/api', fellowshipRoutes);
app.use('/api/notifications', notificationRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'ShikshaSaarthi API Server' });
});

// Start server
app.listen(PORT, () => {
  console.log(`\u{1F680} ShikshaSaarthi server running on http://localhost:${PORT}`);
  console.log(`\u{1F4CB} Health check: http://localhost:${PORT}/api/health`);
});
