const prisma = require('../config/prisma');
const { payForSession } = require('../services/remedial.service');
const { isMoncashEnabled, parseOrderReference, retrieveMoncashPayment } = require('../services/moncash.service');

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
  const fallbackPath = '/rattrapage';
  const query = new URLSearchParams();

  const transactionId = String(req.query.transactionId || '').trim();
  const orderRef = String(req.query.orderId || req.query.reference || '').trim();

  let status = 'success';
  let sessionId = null;

  if ((transactionId || orderRef) && isMoncashEnabled()) {
    try {
      let payment = null;
      if (orderRef) {
        payment = await retrieveMoncashPayment({ reference: orderRef });
      }
      if ((!payment || !payment.reference) && transactionId) {
        payment = await retrieveMoncashPayment({ reference: transactionId });
      }

      if (!payment || !payment.isSuccessful) {
        status = 'failed';
      } else {
        const parsed = parseOrderReference(payment.reference);
        if (!parsed || !parsed.sessionId || !parsed.studentId) {
          status = 'failed';
        } else {
          sessionId = parsed.sessionId;
          const student = await prisma.student.findUnique({
            where: { id: parsed.studentId },
            select: { id: true, role: true }
          });

          if (!student) {
            status = 'failed';
          } else {
            const result = await payForSession({
              student,
              sessionId: parsed.sessionId,
              paymentMethod: 'MONCASH',
              amount: payment.amount
            });
            if (!result.ok) status = 'failed';
          }
        }
      }
    } catch (error) {
      status = 'failed';
    }
  }

  query.set('payment', status);
  query.set('provider', 'moncash');
  if (sessionId) query.set('session', String(sessionId));

  const fallback = `${fallbackPath}?${query.toString()}`;
  if (!frontendBase) return res.redirect(fallback);
  return res.redirect(`${frontendBase.replace(/\/+$/, '')}${fallback}`);
}

async function paymentWebhook(req, res, next) {
  try {
    if (!isWebhookAuthorized(req)) {
      return res.status(401).json({ message: 'Webhook non autorisé.' });
    }

    const payload = req.body || {};

    const moncashTx = String(
      payload.transactionId
      || payload.transaction_id
      || payload?.data?.transactionId
      || ''
    ).trim();
    const moncashRef = String(
      payload.orderId
      || payload.order_id
      || payload.reference
      || payload?.payment?.reference
      || ''
    ).trim();

    if ((moncashTx || moncashRef) && isMoncashEnabled()) {
      let payment = null;
      if (moncashRef) {
        payment = await retrieveMoncashPayment({ reference: moncashRef });
      }
      if ((!payment || !payment.reference) && moncashTx) {
        payment = await retrieveMoncashPayment({ reference: moncashTx });
      }

      if (!payment || !payment.isSuccessful) {
        return res.json({
          message: 'Notification MonCash reçue (statut non final).',
          ignored: true
        });
      }

      const parsedRef = parseOrderReference(payment.reference);
      if (!parsedRef || !parsedRef.sessionId || !parsedRef.studentId) {
        return res.status(400).json({
          message: 'Référence MonCash invalide.',
          accepted: false
        });
      }

      const student = await prisma.student.findUnique({
        where: { id: parsedRef.studentId },
        select: { id: true, role: true }
      });
      if (!student) {
        return res.status(404).json({ message: 'Étudiant introuvable.', accepted: false });
      }

      const result = await payForSession({
        student,
        sessionId: parsedRef.sessionId,
        paymentMethod: 'MONCASH',
        amount: payment.amount
      });

      if (!result.ok) {
        return res.status(result.status || 400).json({
          message: result.message,
          accepted: false
        });
      }

      return res.json({
        message: 'Paiement MonCash validé via webhook.',
        accepted: true
      });
    }

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
