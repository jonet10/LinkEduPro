const { signJwt } = require('./jwt');

function generateToken(student, options = {}) {
  return signJwt(
    { sub: student.id, role: (student.role || 'STUDENT').toLowerCase() },
    { expiresIn: options.expiresIn }
  );
}

module.exports = { generateToken };
