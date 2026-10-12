import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { sql } from './db';

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

// Cookie value: "<email>|<expiry ms>|<method>[|<password stamp>].<signature over all of it>". The expiry is signed, so a
// copied cookie stops working after SESSION_DAYS even though logout can only delete it from this browser. The method
// ("google" or "password") decides whether changing your password needs the current one. Password sessions also carry
// when that password was set (microseconds), so changing or removing it signs out every session made with the old one.
export function sessionValue(user, method = 'google', stamp = '') {
  const payload = `${user}|${Date.now() + SESSION_DAYS * 864e5}|${method}${method === 'password' ? '|' + stamp : ''}`;
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
  const [user, exp, method = 'google', stamp] = payload.split('|');
  if (!user || !(Number(exp) > Date.now()) || !isAllowed(user)) return null;
  if (method === 'password') {
    const [row] = await sql`select floor(extract(epoch from password_set_at) * 1000000)::text as stamp from users where email = ${user}`;
    if (!stamp || row?.stamp !== stamp) return null; // password changed or turned off since this sign-in
  }
  return { user, method };
}

export async function getUser() {
  return (await getSession())?.user ?? null;
}
