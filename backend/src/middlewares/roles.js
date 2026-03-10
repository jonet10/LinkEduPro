function requireRoles(roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentification requise.' });
    }

    const normalizedRoles = Array.isArray(roles) ? roles : [];
    const userRole = String(req.user.role || '').trim();
    if (normalizedRoles.includes(userRole)) {
      return next();
    }

    // Support pseudo role SUPER_ADMIN (ADMIN + email match SUPER_ADMIN_EMAIL).
    if (normalizedRoles.includes('SUPER_ADMIN')) {
      const superAdminEmail = String(process.env.SUPER_ADMIN_EMAIL || '').trim();
      if (userRole === 'ADMIN' && superAdminEmail && String(req.user.email || '').trim() === superAdminEmail) {
        return next();
      }
    }

    return res.status(403).json({ message: 'Permissions insuffisantes.' });

  };
}

module.exports = { requireRoles };
