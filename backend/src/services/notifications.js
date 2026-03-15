const prisma = require('../config/prisma');
const { emitRefresh } = require('./realtime');

async function createNotification({ userId, type, title, message, entityType = null, entityId = null }) {
  const created = await prisma.userNotification.create({
    data: {
      userId: Number(userId),
      type,
      title,
      message,
      entityType,
      entityId
    }
  });

  emitRefresh([Number(userId)], ['notifications']);
  return created;
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

  emitRefresh(users.map((u) => u.id), ['notifications']);
  return { count: users.length };
}

async function notifyAdmins(payload) {
  const roles = ['ADMIN', 'SUPER_ADMIN'];
  const users = await prisma.student.findMany({
    where: { role: { in: roles } },
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

  emitRefresh(users.map((u) => u.id), ['notifications']);
  return { count: users.length };
}

module.exports = {
  createNotification,
  notifyRole,
  notifyAdmins
};
