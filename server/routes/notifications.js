const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { getMyNotifications, markAsRead, markAllAsRead, getPreferences, updatePreferences } = require('../controllers/notificationController');

router.use(verifyToken);
router.get('/', getMyNotifications);
router.get('/preferences', getPreferences);
router.put('/preferences', updatePreferences);
router.patch('/read-all', markAllAsRead); // Changed from mark-all-read for REST consistency, but ensure it works
router.patch('/:id/read', markAsRead);

module.exports = router;
