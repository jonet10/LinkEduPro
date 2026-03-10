function securityHeaders(req, res, next) {
  const path = String(req.path || '');
  const isPublicMedia =
    path.startsWith('/storage/') ||
    path === '/storage' ||
    path.startsWith('/api/storage/') ||
    path === '/api/storage' ||
    path.startsWith('/api/public/exam-pdfs/') ||
    path.startsWith('/public/exam-pdfs/');

  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (!isPublicMedia) {
    // Allow same-origin iframe usage (needed for in-app PDF viewer) while still blocking third-party framing.
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  }
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', isPublicMedia ? 'cross-origin' : 'same-site');
  if (req.secure || String(req.headers['x-forwarded-proto'] || '').toLowerCase() === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  next();
}

module.exports = securityHeaders;
