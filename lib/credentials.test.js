// node lib/credentials.test.js
import assert from 'node:assert/strict';
import { randomInt } from 'node:crypto';
import { checkUsername, generatePassword, passwordStrength } from './credentials.js';

// usernames
assert.equal(checkUsername('  Jagan_04 ').username, 'jagan_04');
assert.equal(checkUsername('jagan.n').ok, true);
for (const bad of ['ab', '4jagan', 'ja gan', 'jagan..n', 'jagan-', 'admin', 'x'.repeat(25), 'jägan']) {
  assert.equal(checkUsername(bad).ok, false, bad);
}

// passwords
const weak = ['password123', 'qwerty123', '1234567890', 'aaaaaaaaaaaa', 'short1!', 'Jagan2026!!'];
for (const p of weak) assert.equal(passwordStrength(p, { username: 'jagan', email: 'jagan@x.com' }).ok, false, p);
const strong = ['Tr0ub4dour&Horse!', 'correct-horse-battery-staple', 'mX7#pQ2!vL9z'];
for (const p of strong) assert.equal(passwordStrength(p, { username: 'jagan' }).ok, true, p);
assert.equal(passwordStrength('correct-horse-battery-staple').checks.find(c => c.id === 'variety').ok, true); // long enough
assert.equal(passwordStrength('').score, 0);

// generated passwords are always accepted and differ
const a = generatePassword(randomInt),
  b = generatePassword(randomInt);
assert.notEqual(a, b);
for (let i = 0; i < 200; i++) {
  const g = generatePassword(randomInt);
  assert.equal(passwordStrength(g, { username: 'jagan' }).ok, true, g);
}
console.log('credentials ok');
