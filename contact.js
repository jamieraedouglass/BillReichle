export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { firstName, lastName, email, phone, service, format, referral, message } = req.body;

  // Basic validation
  if (!firstName || !lastName || !email || !service || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const serviceLabels = {
    'individual': 'Individual counseling ($245)',
    'family': 'Family counseling ($245)',
    'parent': 'Parent counseling ($245)',
    'consultation': 'Case consultation - professionals ($225)',
    'esa': 'ESA letter ($125)',
  };

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
      console.error('Resend error:', error);
      return res.status(500).json({ error: 'Failed to send email' });
    }

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
