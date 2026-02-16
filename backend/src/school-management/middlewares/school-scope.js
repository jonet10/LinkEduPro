function enforceSchoolScope(getSchoolId) {
  return (req, res, next) => {
    const user = req.schoolUser;
    if (!user) {
      return res.status(401).json({ message: 'Authentification requise.' });
    }

    if (user.role === 'SUPER_ADMIN') {
      return next();
    }

    const targetSchoolId = Number(getSchoolId(req));
    if (!targetSchoolId || targetSchoolId !== user.schoolId) {
      return res.status(403).json({ message: 'Acces refuse hors ecole.' });
    }

    return next();
  };
}

module.exports = enforceSchoolScope;
