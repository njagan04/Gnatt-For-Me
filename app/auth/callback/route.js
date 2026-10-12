import { NextResponse } from 'next/server';
import { cookieOpts, isAllowed, SESSION_DAYS, sessionValue } from '../../../lib/auth';
import { sql } from '../../../lib/db';

// Popup sign-in: tell the landing tab over a BroadcastChannel (Google's pages cut window.opener), then close.
// If the popup can't close itself, it just goes to the destination.
function finish(req, to, error) {
  const popup = req.cookies.get('oauth_popup')?.value;
  const target = error ? '/?error=' + encodeURIComponent(error) : to;
  const res = popup
    ? new NextResponse(
        `<!doctype html><meta charset="utf-8"><title>Signing in…</title><script>
          try { new BroadcastChannel('gnatt-auth').postMessage(${JSON.stringify(error ? { error } : { to })}); } catch {}
          window.close(); setTimeout(() => location.replace(${JSON.stringify(target)}), 300);
        </script>`,
        { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } },
      )
    : NextResponse.redirect(new URL(target, req.url));
  res.cookies.delete('oauth_popup');
  res.cookies.delete('oauth_state');
  return res;
}

export async function GET(req) {
  const p = req.nextUrl.searchParams;
  const fail = msg => finish(req, '/', msg);

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

  // Record the sign-in (first time creates the row).
  const name = String(claims.name || '').slice(0, 200),
    picture = String(claims.picture || '').slice(0, 500);
  const [u] = await sql`insert into users (email, name, picture) values (${email}, ${name}, ${picture})
            on conflict (email) do update set name = excluded.name, picture = excluded.picture,
              last_seen = now(), sign_ins = users.sign_ins + 1
            returning username, sign_ins`;

  // First sign-in: offer to set a username and password (skippable, asked only once).
  const res = finish(req, u.sign_ins === 1 && !u.username ? '/account?welcome=1' : '/');
  res.cookies.set('session', sessionValue(email), cookieOpts(SESSION_DAYS * 86400));
  return res;
}
