export default function handler(req, res) {
  const { host } = req.headers;
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const redirectUri = `${protocol}://${host}/api/callback`;

  // Client ID typed manually: capital O, v, 2, 3, l, i, m, v, r, S, g, y, h, D, h, U, h, C, t, k
  const clientId = ['O','v','2','3','l','i','m','v','r','S','g','y','h','D','h','U','h','C','t','k'].join('');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'repo,user',
    state: Math.random().toString(36).substring(7),
  });

  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
}
