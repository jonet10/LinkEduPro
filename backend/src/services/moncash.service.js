const MONCASH_REST_API = {
  sandbox: 'https://sandbox.moncashbutton.digicelgroup.com/Api',
  production: 'https://moncashbutton.digicelgroup.com/Api'
};

const MONCASH_GATEWAY_BASE = {
  sandbox: 'https://sandbox.moncashbutton.digicelgroup.com/Moncash-middleware',
  production: 'https://moncashbutton.digicelgroup.com/Moncash-middleware'
};

function getMoncashMode() {
  const raw = String(process.env.MONCASH_MODE || 'sandbox').trim().toLowerCase();
  return raw === 'production' || raw === 'live' ? 'production' : 'sandbox';
}

function getMoncashConfig() {
  const mode = getMoncashMode();
  return {
    mode,
    clientId: String(process.env.MONCASH_CLIENT_ID || '').trim(),
    clientSecret: String(process.env.MONCASH_CLIENT_SECRET || '').trim(),
    businessKey: String(process.env.MONCASH_BUSINESS_KEY || '').trim(),
    restApi: MONCASH_REST_API[mode],
    gatewayBase: MONCASH_GATEWAY_BASE[mode]
  };
}

function isMoncashEnabled() {
  const forcedOff = String(process.env.MONCASH_ENABLED || '').trim().toLowerCase() === 'false';
  const config = getMoncashConfig();
  return !forcedOff && Boolean(config.clientId && config.clientSecret && config.businessKey);
}

function buildOrderReference({ sessionId, studentId }) {
  const now = Date.now();
  return `LEP-${Number(sessionId)}-${Number(studentId)}-${now}`;
}

function buildLibraryOrderReference({ bookId, buyerId }) {
  const now = Date.now();
  return `LIB-${Number(bookId)}-${Number(buyerId)}-${now}`;
}

function parseOrderReference(reference) {
  const raw = String(reference || '').trim();
  const match = /^LEP-(\d+)-(\d+)-\d+$/i.exec(raw);
  if (!match) return null;
  return {
    sessionId: Number(match[1]),
    studentId: Number(match[2])
  };
}

function parseLibraryOrderReference(reference) {
  const raw = String(reference || '').trim();
  const match = /^LIB-(\d+)-(\d+)-\d+$/i.exec(raw);
  if (!match) return null;
  return {
    bookId: Number(match[1]),
    buyerId: Number(match[2])
  };
}

async function requestToken() {
  const config = getMoncashConfig();
  const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
  const response = await fetch(`${config.restApi}/oauth/token`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${credentials}`
    },
    body: 'scope=read%2Cwrite&grant_type=client_credentials'
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok || !json.access_token) {
    const detail = json.error || json.message || `HTTP ${response.status}`;
    const error = new Error(`MonCash token error: ${detail}`);
    error.status = 502;
    throw error;
  }

  return json.access_token;
}

async function moncashPost(endpoint, payload) {
  const config = getMoncashConfig();
  const token = await requestToken();
  const response = await fetch(`${config.restApi}${endpoint}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload || {})
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = json.error || json.message || `HTTP ${response.status}`;
    const error = new Error(`MonCash API error: ${detail}`);
    error.status = 502;
    throw error;
  }

  return json;
}

async function createMoncashPayment({ amount, orderId }) {
  const config = getMoncashConfig();
  const created = await moncashPost('/v1/CreatePayment', { amount, orderId });
  const paymentToken = created?.payment_token?.token;
  if (!paymentToken) {
    const error = new Error('MonCash CreatePayment response invalide.');
    error.status = 502;
    throw error;
  }

  return {
    paymentToken,
    redirectUrl: `${config.gatewayBase}/Payment/Redirect?token=${encodeURIComponent(paymentToken)}`,
    raw: created
  };
}

async function retrieveMoncashPayment({ reference }) {
  const raw = await moncashPost('/v1/RetrieveOrderPayment', { orderId: reference });
  const payment = raw?.payment || {};
  const message = String(payment.message || '').trim().toLowerCase();
  return {
    reference: String(payment.reference || ''),
    transactionId: String(payment.transaction_id || ''),
    amount: Number(payment.cost || 0),
    message,
    payer: String(payment.payer || ''),
    isSuccessful: message === 'successful',
    raw
  };
}

module.exports = {
  getMoncashConfig,
  isMoncashEnabled,
  buildOrderReference,
  buildLibraryOrderReference,
  parseOrderReference,
  parseLibraryOrderReference,
  createMoncashPayment,
  retrieveMoncashPayment
};
