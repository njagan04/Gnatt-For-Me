import { NextResponse } from 'next/server';
import { cookieOpts, isAllowed, sessionValue } from '../../../lib/auth';

export async function GET(req) {
  const p = req.nextUrl.searchParams;
  const fail = msg => NextResponse.redirect(new URL('/?error=' + encodeURIComponent(msg), req.url));

  const state = req.cookies.get('oauth_state')?.value;
  if (!state || state !== p.get('state') || !p.get('code')) return fail('Login expired, try again');

  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({
      code: p.get('code'),
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: req.nextUrl.origin + '/auth/callback',
      grant_type: 'authorization_code',
    }),
  });
  if (!r.ok) return fail('Google login failed');

  // The id_token came straight from Google's token endpoint over TLS, so no signature check is needed.
  const claims = JSON.parse(Buffer.from((await r.json()).id_token.split('.')[1], 'base64url'));
  const email = String(claims.email || '').toLowerCase();
  if (!claims.email_verified || !isAllowed(email)) return fail(`${email || 'This account'} is not allowed`);

  const res = NextResponse.redirect(new URL('/', req.url));
  res.cookies.set('session', sessionValue(email), cookieOpts(60 * 60 * 24 * 30));
  res.cookies.delete('oauth_state');
  return res;
}
