const { signJwt } = require('../../utils/jwt');

function generateSchoolToken(admin) {
  return signJwt(
    {
      sub: admin.id,
      role: admin.role,
      schoolId: admin.schoolId || null,
      scope: 'school-management'
    },
    { expiresIn: process.env.JWT_EXPIRES_IN || '12h' }
  );
}

module.exports = { generateSchoolToken };
