import { readFileSync } from 'fs';
import { join } from 'path';

function loadPrices() {
  try {
    return JSON.parse(readFileSync(join(process.cwd(), '_data/prices.json'), 'utf8'));
  } catch {
    return { individual: 245, family: 245, parent: 245, consultation: 225, esa: 125 };
  }
}

function fmt(n) {
  return '$' + Number(n).toLocaleString('en-US');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { firstName, lastName, email, phone, service, format, referral, message } = req.body;

  if (!firstName || !lastName || !email || !service || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const prices = loadPrices();
  const serviceLabels = {
    'individual': `Individual counseling (${fmt(prices.individual)})`,
    'family': `Family counseling (${fmt(prices.family)})`,
    'parent': `Parent counseling (${fmt(prices.parent)})`,
    'consultation': `Case consultation - professionals (${fmt(prices.consultation)})`,
    'esa': `ESA letter (${fmt(prices.esa)})`,
  };

  const timestamp = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });

  // Send email via Resend
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'website@billreichle.com',
        to: 'Bill@BillReichle.com',
        reply_to: email,
        subject: `New appointment request from ${firstName} ${lastName}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
            <div style="background: #2C5F4A; padding: 20px 24px; border-radius: 8px 8px 0 0;">
              <h1 style="color: #fff; font-size: 18px; margin: 0;">New appointment request</h1>
            </div>
            <div style="border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px; padding: 24px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; font-size: 13px; color: #888; width: 140px;">Name</td>
                  <td style="padding: 8px 0; font-size: 14px; font-weight: 500;">${firstName} ${lastName}</td>
                </tr>
                <tr style="border-top: 1px solid #f0f0f0;">
                  <td style="padding: 8px 0; font-size: 13px; color: #888;">Email</td>
                  <td style="padding: 8px 0; font-size: 14px;"><a href="mailto:${email}" style="color: #2C5F4A;">${email}</a></td>
                </tr>
                <tr style="border-top: 1px solid #f0f0f0;">
                  <td style="padding: 8px 0; font-size: 13px; color: #888;">Phone</td>
                  <td style="padding: 8px 0; font-size: 14px;">${phone || 'Not provided'}</td>
                </tr>
                <tr style="border-top: 1px solid #f0f0f0;">
                  <td style="padding: 8px 0; font-size: 13px; color: #888;">Service</td>
                  <td style="padding: 8px 0; font-size: 14px;">${serviceLabels[service] || service}</td>
                </tr>
                <tr style="border-top: 1px solid #f0f0f0;">
                  <td style="padding: 8px 0; font-size: 13px; color: #888;">Format</td>
                  <td style="padding: 8px 0; font-size: 14px;">${format || 'Not specified'}</td>
                </tr>
                <tr style="border-top: 1px solid #f0f0f0;">
                  <td style="padding: 8px 0; font-size: 13px; color: #888;">Referral source</td>
                  <td style="padding: 8px 0; font-size: 14px;">${referral || 'Not specified'}</td>
                </tr>
                <tr style="border-top: 1px solid #f0f0f0;">
                  <td style="padding: 8px 0; font-size: 13px; color: #888; vertical-align: top;">Message</td>
                  <td style="padding: 8px 0; font-size: 14px; line-height: 1.6;">${message.replace(/\n/g, '<br>')}</td>
                </tr>
              </table>
              <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #f0f0f0; font-size: 12px; color: #888;">
                Sent from billreichle.com contact form
              </div>
            </div>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Resend error:', JSON.stringify(error));
      return res.status(500).json({ error: 'Failed to send email', detail: error.message || error.name });
    }
  } catch (err) {
    console.error('Resend exception:', err.message);
    return res.status(500).json({ error: 'Server error sending email', detail: err.message });
  }

  // Log to Google Sheets
  try {
    const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
    const SHEET_ID = '1jc9DPjmaLeSkrSDtwBWUQmxnMipC0MiOTZfoUF_iV44';

    // Get access token using JWT
    const header = { alg: 'RS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const claim = {
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    };

    const encode = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
    const headerB64 = encode(header);
    const claimB64 = encode(claim);
    const signingInput = `${headerB64}.${claimB64}`;

    // Sign with private key using crypto
    const { createSign } = await import('crypto');
    const sign = createSign('RSA-SHA256');
    sign.update(signingInput);
    const signature = sign.sign(serviceAccount.private_key, 'base64url');
    const jwt = `${signingInput}.${signature}`;

    // Exchange JWT for access token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });
    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // Append row to sheet
    const row = [
      timestamp,
      `${firstName} ${lastName}`,
      email,
      phone || '',
      serviceLabels[service] || service,
      format || '',
      referral || '',
      message,
    ];

    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Sheet1!A:H:append?valueInputOption=USER_ENTERED`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: [row] }),
    });

  } catch (err) {
    // Don't fail the request if sheets logging fails — email already sent
    console.error('Google Sheets error:', err);
  }

  return res.status(200).json({ success: true });
}