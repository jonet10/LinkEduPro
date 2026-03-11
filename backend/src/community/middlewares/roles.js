function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Accès réservé admin.' });
  }
  return next();
}

function requireTeacherOrAdmin(req, res, next) {
  if (!req.user || !['TEACHER', 'ADMIN'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Accès réservé professeur/admin.' });
  }
  return next();
}

function requireSuperAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Accès réservé super admin.' });
  }

  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
  if (!superAdminEmail || req.user.email !== superAdminEmail) {
    return res.status(403).json({ message: 'Privilèges super admin requis.' });
  }

  return next();
}

module.exports = { requireAdmin, requireTeacherOrAdmin, requireSuperAdmin };
