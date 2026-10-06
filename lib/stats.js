import { addDays, addWork, diff, isWork, monday } from './days.js';

// days: [{ day, hours, entries }] (only days with logs) -> numbers for the profile card and Insights page.
export function summarize(days, today) {
  const by = Object.fromEntries(days.map(d => [d.day, d]));
  const thisMon = monday(today);
  const weeks = Array.from({ length: 12 }, (_, i) => {
    const mon = addDays(thisMon, -7 * (11 - i));
    let hours = 0;
    for (let k = 0; k < 7; k++) hours += by[addDays(mon, k)]?.hours || 0;
    return { week: mon, hours };
  });

  // Streak: consecutive workdays with anything logged, counting back from today.
  // An empty today (or a weekend) doesn't break it; the count starts from the last workday instead.
  let d = isWork(today) && by[today]?.entries ? today : addWork(today, -1);
  let streak = 0;
  while (by[d]?.entries) {
    streak++;
    d = addWork(d, -1);
  }

  const recent = days.filter(x => diff(x.day, today) < 30 && x.day <= today);
  const hours30 = recent.reduce((s, x) => s + x.hours, 0);
  const withHours = recent.filter(x => x.hours > 0).length;
  return {
    weeks,
    thisWeek: weeks[11].hours,
    lastWeek: weeks[10].hours,
    streak,
    days30: recent.length,
    hours30,
    avg30: withHours ? hours30 / withHours : 0,
  };
}

// Longest run of consecutive logged workdays anywhere in `days`.
export function longestStreak(days) {
  const logged = new Set(days.filter(d => d.entries).map(d => d.day));
  let best = 0;
  for (const d of logged) {
    if (logged.has(addWork(d, -1))) continue; // only count from the start of a run
    let n = 0, x = d;
    while (logged.has(x)) { n++; x = addWork(x, 1); }
    best = Math.max(best, n);
  }
  return best;
}

// 0 / 1–4 intensity step for a day's hours (heatmap); logged-without-hours is step 0.5.
export const step = d => (!d ? 0 : !d.hours ? 0.5 : d.hours <= 2 ? 1 : d.hours <= 4 ? 2 : d.hours <= 6 ? 3 : 4);
