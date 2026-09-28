const prisma = require('../config/db');
const { sendEmail } = require('../config/mailer');
const { buildEmailHtml } = require('../templates/notificationEmail');

const createNotification = async ({ userId, title, message, type = 'GENERAL', relatedEntityType, relatedEntityId, actionUrl }) => {
  try {
    // 1. Fetch user & preferences
    let user = await prisma.user.findUnique({
      where: { id: userId },
      include: { preference: true }
    });
    if (!user) return null;

    let prefs = user.preference;
    if (!prefs) {
      prefs = await prisma.notificationPreference.create({ data: { userId } });
    }

    // 2. Send Email if enabled
    let emailSent = false;
    if (prefs.emailEnabled) {
      const html = buildEmailHtml({ title, message, actionUrl });
      emailSent = await sendEmail({ to: user.email, subject: title, html });
    }

    // 3. Create DB Record (even if inApp is false, we store it for history)
    const notification = await prisma.notification.create({
      data: {
        userId, title, message, type, relatedEntityType, relatedEntityId, emailSent
      }
    });

    return notification;
  } catch (error) {
    console.error('Notification Service Error:', error);
  }
};

module.exports = { createNotification };
