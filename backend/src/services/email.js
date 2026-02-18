async function sendViaBrevo({ to, subject, html, text }) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.EMAIL_FROM || 'no-reply@linkedupro.com';
  const senderName = process.env.EMAIL_FROM_NAME || 'LinkEduPro';

  if (!apiKey) {
    throw new Error('Configuration Brevo manquante: BREVO_API_KEY.');
  }

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sender: {
        email: senderEmail,
        name: senderName
      },
      to: (Array.isArray(to) ? to : [to]).map((email) => ({ email })),
      subject,
      htmlContent: html,
      textContent: text
    })
  });

  if (!res.ok) {
    const payload = await res.text();
    throw new Error(`Echec envoi email Brevo: ${payload}`);
  }
}

async function sendEmail({ to, subject, html, text }) {
  const provider = (process.env.EMAIL_PROVIDER || 'brevo').toLowerCase();

  if (provider === 'mock') {
    console.log(`[EMAIL MOCK] to=${to} subject=${subject} text=${text || ''}`);
    return;
  }

  if (provider !== 'brevo') {
    throw new Error(`EMAIL_PROVIDER non supporte: ${provider}`);
  }

  await sendViaBrevo({ to, subject, html, text });
}

module.exports = { sendEmail };
