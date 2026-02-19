const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

async function optionalAuth(req, _res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return next();
    }

    const token = header.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const student = await prisma.student.findUnique({ where: { id: payload.sub } });
    if (!student) return next();

    req.user = { id: student.id, role: student.role, email: student.email };
    return next();
  } catch (_) {
    return next();
  }
}

module.exports = optionalAuth;
