const prisma = require('../config/db');
const { createNotification } = require('../services/notificationService');

const getMyNotifications = async (req, res) => {
  try {
    const prefs = await prisma.notificationPreference.findUnique({ where: { userId: req.user.userId } });
    if (prefs && !prefs.inAppEnabled) {
      return res.json({ notifications: [], unreadCount: 0 }); // Hide if disabled
    }

    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: 'desc' },
      skip, take: limit
    });
    
    const unreadCount = await prisma.notification.count({
      where: { userId: req.user.userId, isRead: false }
    });
    
    res.json({ notifications, unreadCount, page });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching notifications' });
  }
};

const markAsRead = async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.user.userId },
      data: { isRead: true }
    });
    res.json({ message: 'Marked read' });
  } catch (error) {
    res.status(500).json({ message: 'Error marking read' });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.userId, isRead: false },
      data: { isRead: true }
    });
    res.json({ message: 'All marked read' });
  } catch (error) {
    res.status(500).json({ message: 'Error' });
  }
};

const getPreferences = async (req, res) => {
  try {
    let prefs = await prisma.notificationPreference.findUnique({ where: { userId: req.user.userId } });
    if (!prefs) {
      prefs = await prisma.notificationPreference.create({ data: { userId: req.user.userId } });
    }
    res.json(prefs);
  } catch (error) {
    res.status(500).json({ message: 'Error getting preferences' });
  }
};

const updatePreferences = async (req, res) => {
  try {
    const { emailEnabled, inAppEnabled } = req.body;
    const prefs = await prisma.notificationPreference.upsert({
      where: { userId: req.user.userId },
      update: { emailEnabled, inAppEnabled },
      create: { userId: req.user.userId, emailEnabled, inAppEnabled }
    });
    res.json(prefs);
  } catch (error) {
    res.status(500).json({ message: 'Error updating preferences' });
  }
};

const runReminders = async (req, res) => {
  try {
    // Find documents due within 3 days that haven't been reminded
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const docs = await prisma.postSelectionDocument.findMany({
      where: {
        status: 'PENDING',
        dueDate: { lte: threeDaysFromNow, not: null },
        reminderSentAt: null
      },
      include: {
        fellowshipRecord: { select: { applicantId: true, scheme: { select: { name: true } } } }
      }
    });

    let sent = 0;
    for (const doc of docs) {
      await createNotification({
        userId: doc.fellowshipRecord.applicantId,
        title: 'Document Due Soon',
        message: `Your document requirement "${doc.documentName}" for ${doc.fellowshipRecord.scheme.name} is due soon.`,
        type: 'DOCUMENT_REQUIREMENT_DUE',
        relatedEntityType: 'PostSelectionDocument',
        relatedEntityId: doc.id,
        actionUrl: `http://localhost:5173/applicant/fellowship`
      });

      await prisma.postSelectionDocument.update({
        where: { id: doc.id },
        data: { reminderSentAt: new Date() }
      });
      sent++;
    }

    res.json({ message: `Sent ${sent} reminders.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error running reminders' });
  }
};

module.exports = { getMyNotifications, markAsRead, markAllAsRead, getPreferences, updatePreferences, runReminders };
