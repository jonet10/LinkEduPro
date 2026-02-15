const jwt = require('jsonwebtoken');

function generateToken(student) {
  return jwt.sign(
    { sub: student.id, role: 'student' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

module.exports = { generateToken };
