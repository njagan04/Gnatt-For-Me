// Username and password rules, shared by the browser (live feedback) and the server (the real check).

// ---------- usernames ----------
const RESERVED = new Set([
  'admin',
  'administrator',
  'root',
  'support',
  'help',
  'system',
  'gnatt',
  'gnattforme',
  'owner',
  'api',
  'login',
  'null',
]);

// 3–24 characters: a letter first, then letters, digits, dot, dash or underscore; no separator at the end or twice in a row.
export function checkUsername(raw) {
  const u = String(raw || '')
    .trim()
    .toLowerCase();
  if (u.length < 3) return { ok: false, username: u, reason: 'At least 3 characters' };
  if (u.length > 24) return { ok: false, username: u, reason: 'At most 24 characters' };
  if (!/^[a-z]/.test(u)) return { ok: false, username: u, reason: 'Start with a letter' };
  if (!/^[a-z0-9._-]+$/.test(u)) return { ok: false, username: u, reason: 'Only letters, numbers, . _ and -' };
  if (/[._-]{2}/.test(u) || /[._-]$/.test(u)) return { ok: false, username: u, reason: 'No separator twice in a row or at the end' };
  if (RESERVED.has(u)) return { ok: false, username: u, reason: 'That name is reserved' };
  return { ok: true, username: u, reason: '' };
}

// ---------- passwords ----------
const COMMON = new Set(
  (
    'password password1 password123 passw0rd 123456 1234567 12345678 123456789 1234567890 qwerty qwerty123 qwertyuiop abc123 ' +
    '111111 000000 iloveyou admin welcome welcome1 letmein monkey dragon football baseball sunshine princess master shadow ' +
    'superman batman trustno1 starwars whatever freedom computer michael charlie jordan hunter2 secret changeme login ' +
    'gnattforme gnatt timesheet worklog'
  ).split(' '),
);
const SEQUENCES = ['abcdefghijklmnopqrstuvwxyz', '0123456789', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
export const MIN_PASSWORD = 10;
export const MAX_PASSWORD = 128;
const LABELS = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'];

function hasSequence(p) {
  const s = p.toLowerCase();
  for (const seq of SEQUENCES) {
    for (let i = 0; i + 4 <= seq.length; i++) {
      const run = seq.slice(i, i + 4);
      if (s.includes(run) || s.includes([...run].reverse().join(''))) return true;
    }
  }
  return false;
}

// Strength from an entropy estimate with penalties for the patterns people (and attackers) reach for first.
// Returns { score 0–4, label, ok, checks: [{ id, ok, text }] }. A password is accepted at "Fair" (2) or better.
export function passwordStrength(raw, { username = '', email = '' } = {}) {
  const p = String(raw || '');
  const lower = p.toLowerCase();
  const local = String(email).split('@')[0].toLowerCase();
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter(r => r.test(p)).length;
  const personal = [String(username).toLowerCase(), local].some(x => x.length >= 3 && lower.includes(x));
  const common = COMMON.has(lower) || COMMON.has(lower.replace(/[\d!@#$%^&*.]+$/, ''));
  const repeats = /(.)\1{3,}/.test(p);
  const sequence = hasSequence(p);

  const pool = (/[a-z]/.test(p) ? 26 : 0) + (/[A-Z]/.test(p) ? 26 : 0) + (/\d/.test(p) ? 10 : 0) + (/[^A-Za-z0-9]/.test(p) ? 33 : 0);
  let bits = p.length * Math.log2(Math.max(pool, 1));
  if (repeats) bits -= 15;
  if (sequence) bits -= 15;
  if (personal) bits -= 20;
  if (common) bits = Math.min(bits, 10);
  const score = bits < 28 ? 0 : bits < 40 ? 1 : bits < 60 ? 2 : bits < 80 ? 3 : 4;

  const checks = [
    { id: 'length', ok: p.length >= MIN_PASSWORD && p.length <= MAX_PASSWORD, text: `At least ${MIN_PASSWORD} characters` },
    { id: 'variety', ok: classes >= 3 || p.length >= 16, text: 'Mix letters, numbers and symbols (or go 16+ characters)' },
    { id: 'personal', ok: !personal, text: 'Doesn’t contain your username or email' },
    { id: 'common', ok: !common && !repeats && !sequence, text: 'Not a common password or easy pattern' },
  ];
  const required = ['length', 'personal', 'common'];
  const ok = score >= 2 && checks.filter(c => required.includes(c.id)).every(c => c.ok);
  return { score, label: LABELS[score], ok, checks };
}

// ---------- generator ----------
const WORDS = (
  'amber anchor apple arrow atlas autumn badge bamboo banjo barley basin beacon berry birch biscuit blossom bramble breeze ' +
  'bridge brook bubble cabin cactus camel candle canyon carbon cedar cello chalk cherry cider cinder citrus clover cobalt ' +
  'comet copper coral cosmic cotton crater cricket crystal cupcake dahlia daisy delta denim desert dolphin dragon drizzle ' +
  'dune eagle ember emerald falcon fern fiddle firefly fjord flint forest fossil fox frost galaxy garnet geyser ginger ' +
  'glacier granite gravel harbor hazel heron hickory honey horizon indigo iris island ivory jasmine jungle juniper kayak ' +
  'kettle kiwi koala lagoon lantern lava lemon lilac linen lotus lunar maple marble meadow mellow melon meteor mint mocha ' +
  'monsoon mosaic moss nectar nebula nickel nutmeg oasis ocean olive onyx orbit orchid otter paddle pebble pepper pine ' +
  'pixel planet plum polar poppy prairie prism puffin quartz quill quince radish rain raven reef ripple river robin rocket ' +
  'saffron sage salmon sandal sapphire satin scarlet sequoia shadow shell sierra silver sketch sky slate snow solar sparrow ' +
  'spruce squash starling stone storm summit sunset swift tango thistle thunder tiger timber topaz tulip tundra turtle ' +
  'umber valley velvet violet volcano walnut willow winter wisp yarrow zephyr zinnia'
).split(' ');

// Four random words, one capitalised, plus a two-digit number and a symbol: e.g. "maple-Comet-river-42!quartz".
// `rand(n)` must return a uniformly random integer in [0, n) — the browser passes one built on crypto.getRandomValues.
export function generatePassword(rand) {
  const words = Array.from({ length: 4 }, () => WORDS[rand(WORDS.length)]);
  const cap = rand(4);
  words[cap] = words[cap][0].toUpperCase() + words[cap].slice(1);
  const symbols = '!#%+=?@';
  return `${words[0]}-${words[1]}-${words[2]}-${10 + rand(90)}${symbols[rand(symbols.length)]}${words[3]}`;
}
