const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const { sendSseEvent, subscribeUser } = require('../services/realtime');

function resolveToken(req) {
  const queryToken = String(req.query.token || '').trim();
  if (queryToken) return queryToken;

  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    return header.split(' ')[1];
  }

  return '';
}

async function streamRealtime(req, res) {
  try {
    const token = resolveToken(req);
    if (!token) {
      return res.status(401).json({ message: 'Token manquant.' });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const userId = Number(payload?.sub);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({ message: 'Token invalide ou expiré.' });
    }

    const student = await prisma.student.findUnique({
      where: { id: userId },
      select: { id: true }
    });
    if (!student) {
      return res.status(401).json({ message: 'Utilisateur introuvable.' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }

    const unsubscribe = subscribeUser(userId, res);
    sendSseEvent(res, 'connected', { ok: true, at: new Date().toISOString() });

    const heartbeat = setInterval(() => {
      res.write(': ping\n\n');
    }, 25000);

    req.on('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  } catch (_) {
    return res.status(401).json({ message: 'Token invalide ou expiré.' });
  }
}

module.exports = {
  streamRealtime
};

