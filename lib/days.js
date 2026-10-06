// Days are 'YYYY-MM-DD' strings; math in UTC so timezones never shift a day.
export function addDays(day, n) {
  const d = new Date(day + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export const diff = (from, to) => Math.round((new Date(to + 'T00:00:00Z') - new Date(from + 'T00:00:00Z')) / 864e5);

export function range(from, to) {
  const out = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

export const monday = day => addDays(day, -((new Date(day + 'T00:00:00Z').getUTCDay() + 6) % 7));

// ISO week number (weeks start Monday; week 1 holds the year's first Thursday).
export function isoWeek(day) {
  const thu = addDays(monday(day), 3);
  return Math.floor(diff(thu.slice(0, 4) + '-01-01', thu) / 7) + 1;
}

// First of the month n months from `month` (a 'YYYY-MM-01' string).
export function addMonths(month, n) {
  const d = new Date(month + 'T00:00:00Z');
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 10);
}

// Format a day string with cached Intl formatters (creating one per call is slow when the board renders hundreds).
const formatters = new Map();
export function fmt(day, opts) {
  const key = JSON.stringify(opts);
  let f = formatters.get(key);
  if (!f) formatters.set(key, (f = new Intl.DateTimeFormat(undefined, { timeZone: 'UTC', ...opts })));
  return f.format(new Date(day + 'T00:00:00Z'));
}

export const today = () => new Date().toLocaleDateString('en-CA'); // local date

// Workdays only (Mon–Fri); weekends are skipped everywhere on the board.
export const isWork = d => new Date(d + 'T00:00:00Z').getUTCDay() % 6 !== 0;
export const workRange = (from, to) => range(from, to).filter(isWork);

export function addWork(day, n) {
  const step = Math.sign(n);
  while (n) {
    day = addDays(day, step);
    if (isWork(day)) n -= step;
  }
  return day;
}

// Signed number of workdays from a to b.
export const wdiff = (a, b) => (b >= a ? workRange(addDays(a, 1), b).length : -workRange(addDays(b, 1), a).length);

// logs (sorted by day) -> bars: consecutive workdays of one task form one bar.
export function toBars(logs) {
  const byTask = {};
  for (const l of logs) if (isWork(l.day)) (byTask[l.id] ??= []).push(l);
  const bars = [];
  for (const list of Object.values(byTask)) {
    let cur = null;
    for (const l of list) {
      if (cur && addWork(cur.to, 1) === l.day) {
        cur.to = l.day;
        cur.days.push(l);
      } else {
        bars.push(cur = { taskId: l.id, name: l.name, label: l.label, from: l.day, to: l.day, days: [l] });
      }
    }
  }
  return bars;
}

// Stack bars into lanes, grouped by category in `order` (uncategorised last).
// Sets b.lane and b.group (index among groups present); returns lane count.
export function pack(bars, order) {
  const rank = l => (order.includes(l) ? order.indexOf(l) : order.length);
  bars.sort((a, b) => rank(a.label) - rank(b.label) || a.from.localeCompare(b.from) || b.to.localeCompare(a.to));
  let base = 0, ends = [], cur = null, group = -1;
  for (const b of bars) {
    if (rank(b.label) !== cur) {
      cur = rank(b.label);
      base += ends.length;
      ends = [];
      group++;
    }
    let lane = ends.findIndex(e => e < b.from);
    if (lane < 0) lane = ends.length;
    ends[lane] = b.to;
    b.lane = base + lane;
    b.group = group;
  }
  return base + ends.length;
}
