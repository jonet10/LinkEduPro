function requireSchoolRoles(roles) {
  return (req, res, next) => {
    if (!req.schoolUser) {
      return res.status(401).json({ message: 'Authentification requise.' });
    }

    if (!roles.includes(req.schoolUser.role)) {
      return res.status(403).json({ message: 'Permissions insuffisantes.' });
    }

    return next();
  };
}

module.exports = requireSchoolRoles;
