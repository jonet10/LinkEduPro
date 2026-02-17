const prisma = require('../config/prisma');

async function createNotification({ userId, type, title, message, entityType = null, entityId = null }) {
  return prisma.userNotification.create({
    data: {
      userId: Number(userId),
      type,
      title,
      message,
      entityType,
      entityId
    }
  });
}

async function notifyRole(role, payload) {
  const users = await prisma.student.findMany({
    where: { role },
    select: { id: true }
  });

  if (!users.length) {
    return { count: 0 };
  }

  await prisma.userNotification.createMany({
    data: users.map((u) => ({
      userId: u.id,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      entityType: payload.entityType || null,
      entityId: payload.entityId || null
    }))
  });

  return { count: users.length };
}

async function notifyAdmins(payload) {
  return notifyRole('ADMIN', payload);
}

module.exports = {
  createNotification,
  notifyRole,
  notifyAdmins
};
