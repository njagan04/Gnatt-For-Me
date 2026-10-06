// node lib/stats.test.js
import assert from 'node:assert/strict';
import { longestStreak, step, summarize } from './stats.js';

const d = (day, hours, entries = 1) => ({ day, hours, entries });
// Today: Wed 14 Oct 2026. Logged Mon 12, Tue 13, Fri 9, Thu 8 (gap on Wed 7) -> streak 4 (today empty, weekend skipped).
const s = summarize([d('2026-10-07', 0, 0), d('2026-10-08', 2), d('2026-10-09', 3), d('2026-10-12', 4), d('2026-10-13', 1.5)], '2026-10-14');
assert.equal(s.streak, 4);
assert.equal(s.thisWeek, 5.5);  // Mon 12 + Tue 13
assert.equal(s.lastWeek, 5);    // Thu 8 + Fri 9
assert.equal(s.weeks.length, 12);
assert.equal(s.weeks[11].week, '2026-10-12');
assert.equal(s.avg30, 10.5 / 4);

// Logged today counts; a missing workday breaks the streak.
assert.equal(summarize([d('2026-10-14', 1), d('2026-10-12', 1)], '2026-10-14').streak, 1);
// On a Sunday, the streak counts back from Friday.
assert.equal(summarize([d('2026-10-09', 1), d('2026-10-08', 1)], '2026-10-11').streak, 2);
assert.equal(summarize([], '2026-10-14').streak, 0);

assert.deepEqual([undefined, d('x', 0), d('x', 2), d('x', 4), d('x', 6), d('x', 9)].map(step), [0, 0.5, 1, 2, 3, 4]);
// Thu 1, Fri 2, Mon 5, Tue 6 is one 4-day run across a weekend; 9 alone is 1.
assert.equal(longestStreak([d('2026-10-01', 1), d('2026-10-02', 1), d('2026-10-05', 1), d('2026-10-06', 0), d('2026-10-09', 2)]), 4);
assert.equal(longestStreak([]), 0);
console.log('stats ok');
