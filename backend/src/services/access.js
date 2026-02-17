const prisma = require('../config/prisma');

function isConfiguredSuperAdmin(user) {
  return user && user.role === 'ADMIN' && user.email && user.email === process.env.SUPER_ADMIN_EMAIL;
}

async function getConfiguredSuperAdmin() {
  if (!process.env.SUPER_ADMIN_EMAIL) return null;
  return prisma.student.findUnique({ where: { email: process.env.SUPER_ADMIN_EMAIL } });
}

module.exports = {
  isConfiguredSuperAdmin,
  getConfiguredSuperAdmin
};
