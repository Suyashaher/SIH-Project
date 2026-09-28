const prisma = require('../config/db');

/**
 * Creates a system notification for a user
 */
const createNotification = async (userId, title, message, type = 'INFO', link = null) => {
  try {
    return await prisma.notification.create({
      data: { userId, title, message, type, link }
    });
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
};

module.exports = { createNotification };
