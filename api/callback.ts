import type { VercelRequest, VercelResponse } from '@vercel/node';

const CLIENT_ID = process.env.GITHUB_CLIENT_ID ?? 'Ov23limvrSgyhDhUhCtk';
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET ?? '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { code } = req.query;
  if (typeof code !== 'string' || !code) {
    return res.status(400).send('Missing code parameter');
  }
  if (!CLIENT_SECRET) {
    return res.status(500).send('OAuth is not configured');
  }

  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, code }),
    });
    const data = (await tokenRes.json()) as { error?: string; access_token?: string };
    if (data.error || !data.access_token) {
      return res.status(400).send('OAuth error');
    }

    // Decap waits for this exact "authorization:github:success:{...}" string
    // on the opener window, so leave the shape alone.
    const message = 'authorization:github:success:' + JSON.stringify({
      token: data.access_token,
      provider: 'github',
    });

    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(`<!DOCTYPE html>
<html>
<body>
<script>
(function() {
  function receiveMessage(e) {
    window.opener.postMessage(${JSON.stringify(message)}, e.origin);
  }
  window.addEventListener('message', receiveMessage, false);
  window.opener.postMessage('authorizing:github', '*');
})();
</script>
</body>
</html>`);
  } catch (err) {
    console.error('Callback API error:', err);
    return res.status(500).send('Authentication failed');
  }
}
