async function sendViaResend({ to, subject, html, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    throw new Error('Configuration email Resend manquante.');
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text
    })
  });

  if (!res.ok) {
    const payload = await res.text();
    throw new Error(`Echec envoi email Resend: ${payload}`);
  }
}

async function sendEmail({ to, subject, html, text }) {
  const provider = (process.env.EMAIL_PROVIDER || 'mock').toLowerCase();

  if (provider === 'resend') {
    await sendViaResend({ to, subject, html, text });
    return;
  }

  // Dev fallback: logs email content.
  console.log(`[EMAIL MOCK] to=${to} subject=${subject} text=${text || ''}`);
}

module.exports = { sendEmail };
