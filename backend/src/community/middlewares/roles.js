function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Acces reserve admin.' });
  }
  return next();
}

function requireTeacherOrAdmin(req, res, next) {
  if (!req.user || !['TEACHER', 'ADMIN'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Acces reserve professeur/admin.' });
  }
  return next();
}

function requireSuperAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Acces reserve super admin.' });
  }

  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
  if (!superAdminEmail || req.user.email !== superAdminEmail) {
    return res.status(403).json({ message: 'Privileges super admin requis.' });
  }

  return next();
}

module.exports = { requireAdmin, requireTeacherOrAdmin, requireSuperAdmin };
