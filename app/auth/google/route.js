import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { cookieOpts } from '../../../lib/auth';

export function GET(req) {
  const state = randomBytes(16).toString('hex');
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: req.nextUrl.origin + '/auth/callback',
    response_type: 'code',
    scope: 'openid email',
    prompt: 'select_account',
    state,
  });
  const res = NextResponse.redirect(url);
  res.cookies.set('oauth_state', state, cookieOpts(600));
  return res;
}
