const jwt = require('jsonwebtoken');

function generateToken(student) {
  return jwt.sign(
    { sub: student.id, role: (student.role || 'STUDENT').toLowerCase() },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '30m' }
  );
}

module.exports = { generateToken };
