import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

// Optional allow-list: ALLOWED_EMAILS="me@gmail.com,friend@gmail.com" limits sign-in to those accounts.
// Unset or empty = any verified Google account can sign in (each person only ever sees their own board).
export function isAllowed(email) {
  if (!email) return false;
  const list = (process.env.ALLOWED_EMAILS || '')
    .toLowerCase()
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  return !list.length || list.includes(email);
}

// ADMIN_EMAILS="me@gmail.com" — these accounts can open /admin.
export function isAdmin(email) {
  return (process.env.ADMIN_EMAILS || '')
    .toLowerCase()
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .includes(email);
}

const sign = user => createHmac('sha256', process.env.SESSION_SECRET).update(user).digest('hex');

function same(a, b) {
  a = Buffer.from(a);
  b = Buffer.from(b);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const SESSION_DAYS = 30;

// Cookie value: "<email>|<expiry ms>|<method>.<signature over all of it>". The expiry is signed, so a copied cookie
// stops working after SESSION_DAYS even though logout can only delete it from this browser. The method ("google" or
// "password") decides whether changing your password needs the current one.
export function sessionValue(user, method = 'google') {
  const payload = `${user}|${Date.now() + SESSION_DAYS * 864e5}|${method}`;
  return `${payload}.${sign(payload)}`;
}

export const cookieOpts = maxAge => ({
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
  maxAge,
  secure: process.env.NODE_ENV === 'production',
});

// { user, method } for a valid session, else null.
export async function getSession() {
  // Dev only: skip Google login. Never honoured in production.
  if (process.env.NODE_ENV !== 'production' && process.env.DEV_USER) return { user: process.env.DEV_USER, method: 'google' };
  const v = (await cookies()).get('session')?.value || '';
  const i = v.lastIndexOf('.');
  const payload = v.slice(0, i);
  if (i <= 0 || !same(v.slice(i + 1), sign(payload))) return null;
  const [user, exp, method = 'google'] = payload.split('|');
  return user && Number(exp) > Date.now() && isAllowed(user) ? { user, method } : null;
}

export async function getUser() {
  return (await getSession())?.user ?? null;
}
