import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

// ALLOWED_EMAILS="me@gmail.com,friend@gmail.com" — only these Google accounts can log in.
export function isAllowed(email) {
  return (process.env.ALLOWED_EMAILS || '')
    .toLowerCase()
    .split(',')
    .map(s => s.trim())
    .includes(email);
}

const sign = user => createHmac('sha256', process.env.SESSION_SECRET).update(user).digest('hex');

function same(a, b) {
  a = Buffer.from(a);
  b = Buffer.from(b);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const SESSION_DAYS = 30;

// Cookie value: "<email>|<expiry ms>.<signature over both>". The expiry is signed, so a copied cookie
// stops working after SESSION_DAYS even though logout can only delete it from this browser.
export function sessionValue(user) {
  const payload = `${user}|${Date.now() + SESSION_DAYS * 864e5}`;
  return `${payload}.${sign(payload)}`;
}

export const cookieOpts = maxAge => ({
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
  maxAge,
  secure: process.env.NODE_ENV === 'production',
});

export async function getUser() {
  // Dev only: skip Google login. Never honoured in production.
  if (process.env.NODE_ENV !== 'production' && process.env.DEV_USER) return process.env.DEV_USER;
  const v = (await cookies()).get('session')?.value || '';
  const i = v.lastIndexOf('.');
  const payload = v.slice(0, i);
  if (i <= 0 || !same(v.slice(i + 1), sign(payload))) return null;
  const bar = payload.lastIndexOf('|');
  const user = payload.slice(0, bar),
    exp = Number(payload.slice(bar + 1));
  return bar > 0 && exp > Date.now() && isAllowed(user) ? user : null;
}
