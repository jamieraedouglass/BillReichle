export default async function handler(req, res) {
  const { code } = req.query;
  if (!code) return res.status(400).send('Missing code parameter');
  try {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });
    const data = await response.json();
    if (data.error) return res.status(400).send(`OAuth error: ${data.error_description}`);
    const script = `<!DOCTYPE html><html><body><script>
      window.opener.postMessage(
        'authorization:github:success:${JSON.stringify({ token: data.access_token, provider: 'github' })}',
        '*'
      );
      window.close();
    <\/script></body></html>`;
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(script);
  } catch (err) {
    return res.status(500).send('Authentication failed');
  }
}
