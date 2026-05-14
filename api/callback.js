export default async function handler(req, res) {
  const { code } = req.query;
  if (!code) return res.status(400).send('Missing code parameter');
  try {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        client_id: 'Ov23limvrSgyhDhUhCtk',
        client_secret: 'b482f3cc3cf92b0fe2499e50577e83beb9cbad14',
        code,
      }),
    });
    const data = await response.json();
    if (data.error) return res.status(400).send(`OAuth error: ${data.error_description}`);
    const token = data.access_token;
    const html = `<!DOCTYPE html>
<html>
<body>
<script>
(function() {
  function receiveMessage(e) {
    console.log("receiveMessage %o", e);
    window.opener.postMessage(
      'authorization:github:success:{"token":"${token}","provider":"github"}',
      e.origin
    );
  }
  window.addEventListener("message", receiveMessage, false);
  window.opener.postMessage("authorizing:github", "*");
})();
</script>
</body>
</html>`;
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(html);
  } catch (err) {
    return res.status(500).send('Authentication failed');
  }
}
