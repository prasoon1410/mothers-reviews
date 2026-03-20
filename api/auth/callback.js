export default async function handler(req, res) {
  const { code } = req.query;
  if (!code) return res.status(400).send('No code provided');

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: 'https://mothers-reviews.vercel.app/auth/callback',
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenRes.json();
    if (!tokenRes.ok) {
      console.error('Token error:', tokens);
      return res.redirect('/?error=auth_failed');
    }

    // Store tokens in a secure cookie and redirect back to app
    const { access_token, refresh_token } = tokens;
    res.setHeader('Set-Cookie', [
      `access_token=${access_token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=3600`,
      `refresh_token=${refresh_token || ''}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`,
    ]);
    return res.redirect('/?auth=success');
  } catch (e) {
    console.error('Auth error:', e);
    return res.redirect('/?error=auth_failed');
  }
}
