const jwt = require('jsonwebtoken');

function generateSchoolToken(admin) {
  return jwt.sign(
    {
      sub: admin.id,
      role: admin.role,
      schoolId: admin.schoolId || null,
      scope: 'school-management'
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '12h' }
  );
}

module.exports = { generateSchoolToken };
