const WINDOW_MS = Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
const MAX_ATTEMPTS = Number(process.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS || 8);
const MAX_ATTEMPTS_PER_IP = Number(process.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS_PER_IP || 40);

const IP_ONLY_SUFFIX = '__ip_only__';

const attempts = new Map();

function getClientIp(req) {
  return (req.headers['x-forwarded-for'] || req.ip || '').toString().split(',')[0].trim() || 'unknown-ip';
}

function getClientKey(req) {
  const ip = getClientIp(req);
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
  const ipKey = `${getClientIp(req)}::${IP_ONLY_SUFFIX}`;
  const entry = attempts.get(key);
  const ipEntry = attempts.get(ipKey);

  if (ipEntry && now - ipEntry.firstAttemptAt <= WINDOW_MS && ipEntry.count >= MAX_ATTEMPTS_PER_IP) {
    return res.status(429).json({
      message: 'Trop de tentatives de connexion. Reessayez plus tard.'
    });
  }

  if (!entry) {
    attempts.set(key, { count: 1, firstAttemptAt: now });
    if (!ipEntry || now - ipEntry.firstAttemptAt > WINDOW_MS) {
      attempts.set(ipKey, { count: 1, firstAttemptAt: now });
    } else {
      ipEntry.count += 1;
      attempts.set(ipKey, ipEntry);
    }
    return next();
  }

  if (now - entry.firstAttemptAt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAttemptAt: now });
    if (!ipEntry || now - ipEntry.firstAttemptAt > WINDOW_MS) {
      attempts.set(ipKey, { count: 1, firstAttemptAt: now });
    } else {
      ipEntry.count += 1;
      attempts.set(ipKey, ipEntry);
    }
    return next();
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return res.status(429).json({
      message: 'Trop de tentatives de connexion. Reessayez plus tard.'
    });
  }

  entry.count += 1;
  attempts.set(key, entry);

  if (!ipEntry || now - ipEntry.firstAttemptAt > WINDOW_MS) {
    attempts.set(ipKey, { count: 1, firstAttemptAt: now });
  } else {
    ipEntry.count += 1;
    attempts.set(ipKey, ipEntry);
  }

  return next();
}

function clearLoginRateLimit(identifier, req) {
  const normalizedIdentifier = String(identifier || '').trim().toLowerCase();
  if (!normalizedIdentifier) return;
  const ip = getClientIp(req);
  attempts.delete(`${ip}::${normalizedIdentifier}`);
}

module.exports = {
  loginRateLimit,
  clearLoginRateLimit
};
