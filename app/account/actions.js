'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cookieOpts, getSession, isAllowed, SESSION_DAYS, sessionValue } from '../../lib/auth';
import { checkUsername, MAX_PASSWORD, passwordStrength } from '../../lib/credentials';
import { sql } from '../../lib/db';
import { hashPassword, verifyPassword } from '../../lib/password';

const MAX_FAILS = 5;
const LOCK_MINUTES = 15;

async function account() {
  const s = await getSession();
  if (!s) throw new Error('Not signed in');
  const [row] = await sql`select email, username, password_hash from users where email = ${s.user}`;
  return { ...s, row: row ?? { email: s.user, username: null, password_hash: null } };
}

// After a password sign-in, changes need the current password. After a Google sign-in they don't: Google already
// proved who you are, which is also how you recover a forgotten password.
async function confirmIdentity(a, current) {
  if (!a.row.password_hash || a.method === 'google') return;
  if (!(await verifyPassword(String(current || ''), a.row.password_hash))) throw new Error('Your current password is wrong');
}

// Live check while typing: is this username valid and free?
export async function usernameStatus(raw) {
  const a = await account();
  const c = checkUsername(raw);
  if (!c.ok) return c;
  const [taken] = await sql`select 1 from users where lower(username) = ${c.username} and email <> ${a.user}`;
  return taken ? { ok: false, username: c.username, reason: 'Already taken' } : c;
}

// Set or change the username, and set or change the password (password optional once one exists).
export async function saveCredentials({ username, password, current }) {
  const a = await account();
  await confirmIdentity(a, current);
  const c = checkUsername(username);
  if (!c.ok) throw new Error(c.reason);
  const pw = String(password || '');
  if (!pw && !a.row.password_hash) throw new Error('Choose a password');
  if (pw) {
    if (pw.length > MAX_PASSWORD) throw new Error('Password is too long');
    const s = passwordStrength(pw, { username: c.username, email: a.user });
    if (!s.ok) throw new Error(s.checks.find(x => !x.ok)?.text || 'Choose a stronger password');
  }
  const hash = pw ? await hashPassword(pw) : null;
  let row;
  try {
    [row] = await sql`insert into users (email, username, password_hash, password_set_at)
              values (${a.user}, ${c.username}, ${hash}, case when ${hash}::text is null then null else now() end)
              on conflict (email) do update set
                username = excluded.username,
                password_hash = coalesce(excluded.password_hash, users.password_hash),
                password_set_at = coalesce(excluded.password_set_at, users.password_set_at),
                failed_logins = 0, locked_until = null
              returning floor(extract(epoch from password_set_at) * 1000000)::text as stamp`;
  } catch (e) {
    if (e.code === '23505') throw new Error('That username was just taken. Try another.');
    throw e;
  }
  // A new password signs out other password sessions; keep this one signed in if it was one.
  if (pw && a.method === 'password')
    (await cookies()).set('session', sessionValue(a.user, 'password', row.stamp), cookieOpts(SESSION_DAYS * 86400));
  return { ok: true, username: c.username };
}

// Turn password sign-in off (the username is kept so nobody else can grab it). Password sessions end with it.
export async function removePassword({ current }) {
  const a = await account();
  await confirmIdentity(a, current);
  await sql`update users set password_hash = null, password_set_at = null where email = ${a.user}`;
  return { ok: true };
}

// Username + password sign-in from the landing page (the typed username comes back so the form keeps it). One message
// for every wrong guess so it never reveals which usernames exist. Each attempt first claims one of MAX_FAILS tries in a
// single atomic update, so a burst of parallel requests can't slip past the lock; the try that reaches the limit locks
// the username for LOCK_MINUTES.
export async function loginWithPassword(_, form) {
  const name = String(form.get('username') || '')
    .trim()
    .toLowerCase();
  const password = String(form.get('password') || '');
  const fail = 'Wrong username or password';
  if (!name || !password || password.length > MAX_PASSWORD) return { error: fail, username: name };

  // Claim a try: allowed while under the limit, or once an old lock has run out (which starts a fresh count).
  const [u] = await sql`update users set
                          failed_logins = case when locked_until <= now() then 1 else failed_logins + 1 end,
                          locked_until = case when locked_until <= now() then null else locked_until end
                        where lower(username) = ${name} and password_hash is not null
                          and (locked_until <= now() or (locked_until is null and failed_logins < ${MAX_FAILS}))
                        returning email, password_hash, floor(extract(epoch from password_set_at) * 1000000)::text as stamp`;
  if (!u) {
    const [l] = await sql`select locked_until from users where lower(username) = ${name} and password_hash is not null
                           and (locked_until > now() or failed_logins >= ${MAX_FAILS})`;
    if (l) {
      const until = l.locked_until ? new Date(l.locked_until) : Date.now() + LOCK_MINUTES * 60000;
      const mins = Math.max(1, Math.ceil((until - Date.now()) / 60000));
      return { error: `Too many attempts. Try again in ${mins} minute${mins === 1 ? '' : 's'}, or sign in with Google.`, username: name };
    }
    await verifyPassword(password, null); // unknown username: spend the same time as a real check
    return { error: fail, username: name };
  }
  if (!(await verifyPassword(password, u.password_hash))) {
    await sql`update users set locked_until = now() + make_interval(mins => ${LOCK_MINUTES})
              where email = ${u.email} and failed_logins >= ${MAX_FAILS} and locked_until is null`;
    return { error: fail, username: name };
  }
  if (!isAllowed(u.email)) return { error: 'This account is not allowed to sign in', username: name };
  await sql`update users set failed_logins = 0, locked_until = null, last_seen = now(), sign_ins = sign_ins + 1 where email = ${u.email}`;
  (await cookies()).set('session', sessionValue(u.email, 'password', u.stamp), cookieOpts(SESSION_DAYS * 86400));
  redirect('/');
}
