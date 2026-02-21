const jwt = require('jsonwebtoken');
const prisma = require('../../config/prisma');

async function schoolAuthMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Token manquant.' });
    }

    const token = header.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    if (payload.scope !== 'school-management') {
      return res.status(401).json({ message: 'Token invalide pour ce module.' });
    }

    const admin = await prisma.schoolAdmin.findUnique({ where: { id: payload.sub } });
    if (!admin || !admin.isActive) {
      return res.status(401).json({ message: 'Compte non autorise.' });
    }

    let schoolActive = true;
    if (admin.schoolId) {
      const school = await prisma.school.findUnique({
        where: { id: admin.schoolId },
        select: { isActive: true }
      });
      schoolActive = Boolean(school?.isActive);
    }

    req.schoolUser = {
      id: admin.id,
      role: admin.role,
      schoolId: admin.schoolId,
      mustChangePassword: admin.mustChangePassword,
      schoolActive
    };

    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Token invalide ou expire.' });
  }
}

module.exports = schoolAuthMiddleware;
