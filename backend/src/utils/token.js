const jwt = require('jsonwebtoken');

function generateToken(student, options = {}) {
  const expiresIn = options.expiresIn || process.env.JWT_EXPIRES_IN || '30m';
  return jwt.sign(
    { sub: student.id, role: (student.role || 'STUDENT').toLowerCase() },
    process.env.JWT_SECRET,
    { expiresIn }
  );
}

module.exports = { generateToken };
