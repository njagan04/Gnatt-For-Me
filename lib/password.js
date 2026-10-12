import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

// Password hashing with scrypt (Node's built-in, memory-hard). Stored as "s1$N$r$p$salt$hash" (base64) so the
// cost can be raised later without breaking existing hashes. The password itself is never stored.
const N = 16384,
  R = 8,
  P = 1,
  KEYLEN = 64;

const derive = (password, salt, n, r, p) =>
  new Promise((ok, fail) =>
    scrypt(password.normalize('NFKC'), salt, KEYLEN, { N: n, r, p, maxmem: 64 * 1024 * 1024 }, (e, k) => (e ? fail(e) : ok(k))),
  );

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await derive(password, salt, N, R, P);
  return ['s1', N, R, P, salt.toString('base64'), key.toString('base64')].join('$');
}

// Constant-time compare. Unknown users are checked against a throwaway hash so timing doesn't reveal which usernames exist.
let dummy;
export async function verifyPassword(password, stored) {
  if (!stored) {
    dummy ??= await hashPassword('not-a-real-password');
    stored = dummy;
    password = password + '\0'; // never matches
  }
  const [v, n, r, p, salt, hash] = stored.split('$');
  if (v !== 's1') return false;
  const want = Buffer.from(hash, 'base64');
  const got = await derive(password, Buffer.from(salt, 'base64'), +n, +r, +p);
  return got.length === want.length && timingSafeEqual(got, want);
}
