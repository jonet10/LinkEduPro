const prisma = require('../config/prisma');
const { payForSession } = require('../services/remedial.service');

function resolveProviderStatus(payload) {
  const raw = String(
    payload?.status
      || payload?.transaction_status
      || payload?.transactionStatus
      || payload?.state
      || payload?.result
      || ''
  ).trim().toUpperCase();

  if (!raw) return '';
  return raw;
}

function extractPaymentPayload(payload = {}) {
  const sessionId = Number(
    payload.sessionId
      || payload.session_id
      || payload.metadata?.sessionId
      || payload.meta?.sessionId
      || payload.custom_data?.sessionId
      || 0
  );

  const studentId = Number(
    payload.studentId
      || payload.student_id
      || payload.userId
      || payload.user_id
      || payload.metadata?.studentId
      || payload.meta?.studentId
      || payload.custom_data?.studentId
      || 0
  );

  const amount = Number(
    payload.amount
      || payload.amount_paid
      || payload.amountPaid
      || payload.total_amount
      || payload.totalAmount
      || 0
  );

  const paymentMethodRaw = String(
    payload.paymentMethod
      || payload.payment_method
      || payload.method
      || payload.channel
      || payload.provider
      || 'MONCASH'
  ).trim().toUpperCase();

  const allowed = new Set(['MONCASH', 'NATCASH', 'CARD', 'BANK_TRANSFER', 'CASH']);
  const paymentMethod = allowed.has(paymentMethodRaw) ? paymentMethodRaw : 'MONCASH';

  return {
    sessionId,
    studentId,
    amount: Number.isFinite(amount) && amount > 0 ? amount : undefined,
    paymentMethod
  };
}

function isWebhookAuthorized(req) {
  const configuredSecret = String(process.env.PAYMENT_WEBHOOK_SECRET || '').trim();
  if (!configuredSecret) return true;

  const querySecret = String(req.query.secret || '').trim();
  const headerSecret = String(req.headers['x-webhook-secret'] || '').trim();
  const authHeader = String(req.headers.authorization || '').trim();
  const bearerSecret = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  return [querySecret, headerSecret, bearerSecret].some((value) => value && value === configuredSecret);
}

async function paymentReturn(req, res) {
  const frontendBase = String(process.env.FRONTEND_URL || '').trim();
  const fallback = '/rattrapage?payment=success';
  if (!frontendBase) {
    return res.redirect(fallback);
  }
  return res.redirect(`${frontendBase.replace(/\/+$/, '')}${fallback}`);
}

async function paymentWebhook(req, res, next) {
  try {
    if (!isWebhookAuthorized(req)) {
      return res.status(401).json({ message: 'Webhook non autorisé.' });
    }

    const payload = req.body || {};
    const status = resolveProviderStatus(payload);
    const isSuccess = ['SUCCESS', 'SUCCEEDED', 'COMPLETED', 'PAID', 'OK', 'ACCEPTED'].includes(status);

    if (!isSuccess) {
      return res.json({
        message: 'Notification reçue (statut non final).',
        ignored: true,
        status: status || null
      });
    }

    const parsed = extractPaymentPayload(payload);
    if (!parsed.sessionId || !parsed.studentId) {
      return res.status(400).json({
        message: 'sessionId et studentId requis dans la notification.',
        accepted: false
      });
    }

    const student = await prisma.student.findUnique({
      where: { id: parsed.studentId },
      select: { id: true, role: true }
    });
    if (!student) {
      return res.status(404).json({ message: 'Étudiant introuvable.', accepted: false });
    }

    const result = await payForSession({
      student,
      sessionId: parsed.sessionId,
      paymentMethod: parsed.paymentMethod,
      amount: parsed.amount
    });

    if (!result.ok) {
      return res.status(result.status || 400).json({
        message: result.message,
        accepted: false
      });
    }

    return res.json({
      message: 'Paiement validé via webhook.',
      accepted: true
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  paymentReturn,
  paymentWebhook
};

