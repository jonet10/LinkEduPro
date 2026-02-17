const { isConfiguredSuperAdmin } = require('../services/access');

function requireSuperAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentification requise.' });
  }

  if (!isConfiguredSuperAdmin(req.user)) {
    return res.status(403).json({ message: 'Acces reserve au super admin.' });
  }

  return next();
}

module.exports = { requireSuperAdmin };

