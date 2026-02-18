const WINDOW_MS = Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
const MAX_ATTEMPTS = Number(process.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS || 8);

const attempts = new Map();

function getClientKey(req) {
  const ip = (req.headers['x-forwarded-for'] || req.ip || '').toString().split(',')[0].trim();
  const identifier = (req.body?.identifier || '').toString().trim().toLowerCase();
  return `${ip}::${identifier}`;
}

function cleanup(now) {
  for (const [key, value] of attempts.entries()) {
    if (now - value.firstAttemptAt > WINDOW_MS) {
      attempts.delete(key);
    }
  }
}

function loginRateLimit(req, res, next) {
  const now = Date.now();
  cleanup(now);

  const key = getClientKey(req);
  const entry = attempts.get(key);

  if (!entry) {
    attempts.set(key, { count: 1, firstAttemptAt: now });
    return next();
  }

  if (now - entry.firstAttemptAt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAttemptAt: now });
    return next();
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return res.status(429).json({
      message: 'Trop de tentatives de connexion. Reessayez plus tard.'
    });
  }

  entry.count += 1;
  attempts.set(key, entry);
  return next();
}

module.exports = loginRateLimit;
