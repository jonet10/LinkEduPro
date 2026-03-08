const jwt = require('jsonwebtoken');

const NODE_ENV = String(process.env.NODE_ENV || 'development').toLowerCase();
const JWT_SECRET = String(process.env.JWT_SECRET || '').trim();
const JWT_ISSUER = String(process.env.JWT_ISSUER || 'linkedupro-api').trim();
const JWT_AUDIENCE = String(process.env.JWT_AUDIENCE || 'linkedupro-clients').trim();
const DEFAULT_ALGORITHM = 'HS256';

if (NODE_ENV === 'production') {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is required in production.');
  }
  if (JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production.');
  }
}

function getJwtSecret() {
  if (JWT_SECRET) return JWT_SECRET;
  return 'dev-only-insecure-jwt-secret-change-me';
}

function signJwt(payload, options = {}) {
  const signOptions = {
    algorithm: DEFAULT_ALGORITHM,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
    expiresIn: options.expiresIn || process.env.JWT_EXPIRES_IN || '30m'
  };

  return jwt.sign(payload, getJwtSecret(), signOptions);
}

function verifyJwt(token) {
  return jwt.verify(token, getJwtSecret(), {
    algorithms: [DEFAULT_ALGORITHM],
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE
  });
}

module.exports = {
  signJwt,
  verifyJwt,
  JWT_ISSUER,
  JWT_AUDIENCE
};
