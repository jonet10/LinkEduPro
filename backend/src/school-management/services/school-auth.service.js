const bcrypt = require('bcryptjs');
const prisma = require('../../config/prisma');

async function ensureSuperAdminExists() {
  const email = process.env.SCHOOL_SUPER_ADMIN_EMAIL;
  const password = process.env.SCHOOL_SUPER_ADMIN_PASSWORD;

  if (!email || !password) {
    return;
  }

  const existing = await prisma.schoolAdmin.findUnique({ where: { email } });
  if (existing) {
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.schoolAdmin.create({
    data: {
      firstName: 'Super',
      lastName: 'Admin',
      email,
      passwordHash,
      role: 'SUPER_ADMIN',
      mustChangePassword: false,
      isActive: true,
      schoolId: null
    }
  });
}

module.exports = { ensureSuperAdminExists };
