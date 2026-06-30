import { randomBytes } from 'crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const CLIENT_ID = process.env.GITHUB_CLIENT_ID ?? 'Ov23limvrSgyhDhUhCtk';

// Start of the GitHub login flow for the /admin CMS.
export default function handler(req: VercelRequest, res: VercelResponse) {
  const host = req.headers.host ?? '';
  const protocol = host.startsWith('localhost') ? 'http' : 'https';

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: `${protocol}://${host}/api/callback`,
    scope: 'repo,user',
    state: randomBytes(16).toString('hex'),
  });

  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
}
