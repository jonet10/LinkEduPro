async function sendTwilioSms({ to, body }) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !from) {
    throw new Error('Configuration Twilio manquante.');
  }

  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const params = new URLSearchParams({
    To: to,
    From: from,
    Body: body
  });

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });

  if (!res.ok) {
    const payload = await res.text();
    throw new Error(`Echec envoi SMS Twilio: ${payload}`);
  }
}

async function sendSms({ to, body }) {
  const provider = (process.env.SMS_PROVIDER || 'mock').toLowerCase();

  if (provider === 'twilio') {
    await sendTwilioSms({ to, body });
    return;
  }

  // Dev fallback: log SMS content for local/testing.
  console.log(`[SMS MOCK] to=${to} body=${body}`);
}

module.exports = { sendSms };

