const bcrypt = require('bcryptjs');
const prisma = require('../../config/prisma');
const { generateSchoolToken } = require('../utils/token');
const { ensureSuperAdminExists } = require('../services/school-auth.service');

function sanitizeAdmin(admin) {
  return {
    id: admin.id,
    schoolId: admin.schoolId,
    firstName: admin.firstName,
    lastName: admin.lastName,
    email: admin.email,
    role: admin.role,
    mustChangePassword: admin.mustChangePassword,
    schoolActive: admin.schoolId ? Boolean(admin.school?.isActive) : true
  };
}

async function login(req, res, next) {
  try {
    await ensureSuperAdminExists();
    const { email, password } = req.body;
    const admin = await prisma.schoolAdmin.findUnique({
      where: { email },
      include: {
        school: { select: { isActive: true } }
      }
    });

    if (!admin || !admin.isActive) {
      return res.status(401).json({ message: 'Identifiants invalides.' });
    }

    const ok = await bcrypt.compare(password, admin.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: 'Identifiants invalides.' });
    }

    await prisma.schoolAdmin.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });

    const token = generateSchoolToken(admin);
    return res.json({ token, admin: sanitizeAdmin(admin) });
  } catch (error) {
    return next(error);
  }
}

async function changePassword(req, res, next) {
  try {
    const user = req.schoolUser;
    const { currentPassword, newPassword } = req.body;

    const admin = await prisma.schoolAdmin.findUnique({ where: { id: user.id } });
    if (!admin) {
      return res.status(404).json({ message: 'Compte introuvable.' });
    }

    const ok = await bcrypt.compare(currentPassword, admin.passwordHash);
    if (!ok) {
      return res.status(400).json({ message: 'Mot de passe actuel invalide.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.schoolAdmin.update({
      where: { id: admin.id },
      data: { passwordHash, mustChangePassword: false }
    });

    return res.json({ message: 'Mot de passe mis a jour.' });
  } catch (error) {
    return next(error);
  }
}

module.exports = { login, changePassword };
