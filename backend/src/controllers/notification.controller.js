const prisma = require('../config/prisma');

async function listNotifications(req, res, next) {
  try {
    const notifications = await prisma.userNotification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    const unreadCount = await prisma.userNotification.count({
      where: { userId: req.user.id, isRead: false }
    });

    return res.json({ notifications, unreadCount });
  } catch (error) {
    return next(error);
  }
}

async function markNotificationRead(req, res, next) {
  try {
    const id = Number(req.params.id);

    const updated = await prisma.userNotification.updateMany({
      where: { id, userId: req.user.id },
      data: { isRead: true }
    });

    if (updated.count === 0) {
      return res.status(404).json({ message: 'Notification introuvable.' });
    }

    return res.json({ message: 'Notification marquee comme lue.' });
  } catch (error) {
    return next(error);
  }
}

async function markAllNotificationsRead(req, res, next) {
  try {
    await prisma.userNotification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true }
    });

    return res.json({ message: 'Toutes les notifications sont lues.' });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead
};
