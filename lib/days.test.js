// node lib/days.test.js
import assert from 'node:assert/strict';
import { addDays, addMonths, addWork, diff, isoWeek, monday, pack, range, toBars, wdiff, workRange } from './days.js';

assert.equal(diff('2026-10-30', '2026-11-02'), 3);
assert.equal(diff('2026-11-02', '2026-10-30'), -3);
assert.equal(diff('2026-03-28', '2026-03-30'), 2); // across a DST switch

assert.equal(monday('2026-10-01'), '2026-09-28'); // Thu -> Mon
assert.equal(monday('2026-10-04'), '2026-09-28'); // Sun -> Mon
assert.equal(monday('2026-09-28'), '2026-09-28');
assert.equal(isoWeek('2026-10-05'), 41);
assert.equal(isoWeek('2026-10-11'), 41); // Sunday, same week
assert.equal(isoWeek('2027-01-01'), 53); // 2026 has 53 ISO weeks
assert.equal(isoWeek('2025-12-29'), 1); // belongs to 2026's week 1
assert.equal(addMonths('2026-12-01', 1), '2027-01-01');
assert.equal(addMonths('2026-01-01', -1), '2025-12-01');

assert.equal(addDays('2026-02-28', 1), '2026-03-01');
assert.equal(addDays('2026-01-01', -1), '2025-12-31');
assert.deepEqual(range('2026-10-30', '2026-11-01'), ['2026-10-30', '2026-10-31', '2026-11-01']);

// Workdays: Fri 2 Oct -> Mon 5 Oct skips the weekend.
assert.equal(addWork('2026-10-02', 1), '2026-10-05');
assert.equal(addWork('2026-10-05', -1), '2026-10-02');
assert.equal(addWork('2026-10-05', 5), '2026-10-12');
assert.deepEqual(workRange('2026-10-02', '2026-10-05'), ['2026-10-02', '2026-10-05']);
assert.equal(wdiff('2026-10-02', '2026-10-05'), 1);
assert.equal(wdiff('2026-10-09', '2026-10-05'), -4);
assert.equal(wdiff('2026-10-05', '2026-10-05'), 0);

const log = (id, day, label = '') => ({ id, name: 'T' + id, label, day, hours: 1 });
const bars = toBars([
  log(1, '2026-10-01', 'b'),
  log(2, '2026-10-01', 'a'),
  log(1, '2026-10-02', 'b'),
  log(2, '2026-10-02', 'a'),
  log(1, '2026-10-05', 'b'), // Fri -> Mon is still one bar
  log(3, '2026-10-01'),
  log(1, '2026-10-08', 'b'), // task 1 again after a gap
  log(4, '2026-10-03'), // Saturday: hidden
]);
const lanes = pack(bars, ['a', 'b']);
assert.deepEqual(
  bars.map(b => [b.taskId, b.from, b.to, b.lane, b.group]),
  [
    [2, '2026-10-01', '2026-10-02', 0, 0], // category a first
    [1, '2026-10-01', '2026-10-05', 1, 1], // then category b, right under it
    [1, '2026-10-08', '2026-10-08', 1, 1], // same task later reuses its lane
    [3, '2026-10-01', '2026-10-01', 2, 2], // uncategorised last
  ],
);
assert.equal(lanes, 3);

console.log('days ok');
