import { readFileSync } from 'fs';
import { join } from 'path';
import { createSign } from 'crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { esc, fmt, isValidEmail } from './_lib.ts';

function loadPrices() {
  try {
    return JSON.parse(readFileSync(join(process.cwd(), '_data/prices.json'), 'utf8'));
  } catch {
    return { individual: 245, family: 245, parent: 245, consultation: 225, esa: 125 };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body ?? {};
  const firstName = String(body.firstName ?? '').trim();
  const lastName  = String(body.lastName ?? '').trim();
  const email     = String(body.email ?? '').trim();
  const phone     = String(body.phone ?? '').trim();
  const service   = String(body.service ?? '').trim();
  const format    = String(body.format ?? '').trim();
  const referral  = String(body.referral ?? '').trim();
  const message   = String(body.message ?? '').trim().slice(0, 5000);

  if (!firstName || !lastName || !email || !service || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address' });
  }

  const prices = loadPrices();
  const serviceLabels: Record<string, string> = {
    individual: `Individual counseling (${fmt(prices.individual)})`,
    family: `Family counseling (${fmt(prices.family)})`,
    parent: `Parent counseling (${fmt(prices.parent)})`,
    consultation: `Case consultation - professionals (${fmt(prices.consultation)})`,
    esa: `ESA letter (${fmt(prices.esa)})`,
  };
  const serviceLabel = serviceLabels[service] || service;
  const timestamp = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });

  try {
    const resend = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev',
        to: 'bill@billreichle.com',
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
                  <td style="padding: 8px 0; font-size: 14px; font-weight: 500;">${esc(firstName)} ${esc(lastName)}</td>
                </tr>
                <tr style="border-top: 1px solid #f0f0f0;">
                  <td style="padding: 8px 0; font-size: 13px; color: #888;">Email</td>
                  <td style="padding: 8px 0; font-size: 14px;"><a href="mailto:${esc(email)}" style="color: #2C5F4A;">${esc(email)}</a></td>
                </tr>
                <tr style="border-top: 1px solid #f0f0f0;">
                  <td style="padding: 8px 0; font-size: 13px; color: #888;">Phone</td>
                  <td style="padding: 8px 0; font-size: 14px;">${esc(phone) || 'Not provided'}</td>
                </tr>
                <tr style="border-top: 1px solid #f0f0f0;">
                  <td style="padding: 8px 0; font-size: 13px; color: #888;">Service</td>
                  <td style="padding: 8px 0; font-size: 14px;">${esc(serviceLabel)}</td>
                </tr>
                <tr style="border-top: 1px solid #f0f0f0;">
                  <td style="padding: 8px 0; font-size: 13px; color: #888;">Format</td>
                  <td style="padding: 8px 0; font-size: 14px;">${esc(format) || 'Not specified'}</td>
                </tr>
                <tr style="border-top: 1px solid #f0f0f0;">
                  <td style="padding: 8px 0; font-size: 13px; color: #888;">Referral source</td>
                  <td style="padding: 8px 0; font-size: 14px;">${esc(referral) || 'Not specified'}</td>
                </tr>
                <tr style="border-top: 1px solid #f0f0f0;">
                  <td style="padding: 8px 0; font-size: 13px; color: #888; vertical-align: top;">Message</td>
                  <td style="padding: 8px 0; font-size: 14px; line-height: 1.6;">${esc(message).replace(/\n/g, '<br>')}</td>
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

    if (!resend.ok) {
      console.error('Resend error:', await resend.text());
      return res.status(502).json({ error: 'Failed to send email' });
    }
  } catch (err) {
    console.error('Resend exception:', err);
    return res.status(502).json({ error: 'Failed to send email' });
  }

  // log it to the sheet too. email already sent, so don't fail the request if this breaks
  try {
    const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT!);
    const SHEET_ID = '1jc9DPjmaLeSkrSDtwBWUQmxnMipC0MiOTZfoUF_iV44';

    const now = Math.floor(Date.now() / 1000);
    const claim = {
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    };

    const b64 = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64url');
    const signingInput = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64(claim)}`;
    const sign = createSign('RSA-SHA256');
    sign.update(signingInput);
    const jwt = `${signingInput}.${sign.sign(serviceAccount.private_key, 'base64url')}`;

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });
    const { access_token } = (await tokenRes.json()) as { access_token?: string };

    const row = [timestamp, `${firstName} ${lastName}`, email, phone, serviceLabel, format, referral, message];
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Sheet1!A:H:append?valueInputOption=USER_ENTERED`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [row] }),
    });
  } catch (err) {
    console.error('Google Sheets error:', err);
  }

  return res.status(200).json({ success: true });
}
