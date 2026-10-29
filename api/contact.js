// Vercel serverless function: receives the contact form and emails it to Marcos through Resend.
// Needs one environment variable in Vercel: RESEND_API_KEY
// Optional: CONTACT_TO (who receives the messages)
// Optional: RESEND_FROM (e.g. "ELIPAN Website <hello@elipangroup.com>") once elipangroup.com is verified in Resend.
// Inbox that receives messages. Set CONTACT_TO in Vercel to change it without editing code.
const TO = process.env.CONTACT_TO || 'marcoscuellar@elipangroup.com';
const FROM = process.env.RESEND_FROM || 'ELIPAN Website <onboarding@resend.dev>';

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  let body = req.body || {};
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }

  // Hidden field that only bots fill in: pretend it worked, send nothing.
  if (body.company) return res.status(200).json({ ok: true });

  const name = String(body.name || '').replace(/[\r\n]+/g, ' ').trim().slice(0, 120);
  const email = String(body.email || '').trim().slice(0, 200);
  const message = String(body.message || '').trim().slice(0, 5000);

  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !message) {
    return res.status(400).json({ error: 'Please add your name, a valid email, and a message.' });
  }
  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not set');
    return res.status(500).json({ error: 'Email is not set up yet.' });
  }

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM,
        to: [TO],
        reply_to: email,
        subject: `New message from ${name} (elipangroup.com)`,
        text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
      }),
    });
    if (!r.ok) {
      console.error('Resend error', r.status, await r.text().catch(() => ''));
      return res.status(502).json({ error: 'That didn’t send. Please try again, or email marcoscuellar@elipangroup.com.' });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Contact send failed', e);
    return res.status(502).json({ error: 'That didn’t send. Please try again, or email marcoscuellar@elipangroup.com.' });
  }
};
