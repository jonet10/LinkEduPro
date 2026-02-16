const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

async function authMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Token manquant.' });
    }

    const token = header.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const student = await prisma.student.findUnique({ where: { id: payload.sub } });

    if (!student) {
      return res.status(401).json({ message: 'Utilisateur introuvable.' });
    }

    req.user = { id: student.id, role: student.role };
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Token invalide ou expiré.' });
  }
}

module.exports = authMiddleware;
