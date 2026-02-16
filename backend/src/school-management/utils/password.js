const crypto = require('crypto');

function generateTemporaryPassword() {
  return crypto.randomBytes(8).toString('base64url');
}

module.exports = { generateTemporaryPassword };
