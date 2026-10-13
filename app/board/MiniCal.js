'use client';
import { useEffect, useState } from 'react';
import { busyDays } from '../actions';
import { addDays, addMonths, fmt, isoWeek, range } from '../../lib/days';

const FULL = 8; // hours that fill a day's square

// Month calendar, Monday first, with the week number on the left. Each day is a square that fills from the
// bottom with the hours logged that day (8h = full).
// Board (no `day`): click a week's row to jump to it; the days on screen (from–to, may cross a weekend) are banded.
// Daily log (`day` given): click a day; `marks` (days with a page) get a dot.
export default function MiniCal({ month, setMonth, today, from, to, day, marks = [], onPick, version }) {
  const first = addDays(month, -((new Date(month + 'T00:00:00Z').getUTCDay() + 6) % 7)); // the Monday on/before the 1st
  const rows = Array.from({ length: 6 }, (_, w) => range(addDays(first, w * 7), addDays(first, w * 7 + 6)));
  const [hours, setHours] = useState({});

  useEffect(() => {
    busyDays(first, addDays(first, 41)).then(
      r => setHours(Object.fromEntries(r.map(x => [x.day, x.hours]))),
      () => {},
    );
  }, [month, version]);

  const byDay = !!day;
  const cell = (d, col) => {
    const h = hours[d];
    const band = !byDay && from && d >= from && d <= to;
    const f = h === undefined ? 0 : Math.max(0.12, Math.min(1, h / FULL)); // logged without hours still shows a sliver
    const cls = [
      'cd',
      d.slice(0, 7) !== month.slice(0, 7) && 'out',
      [5, 6].includes((new Date(d + 'T00:00:00Z').getUTCDay() + 6) % 7) && 'we',
      d === today && 'now',
      d === day && 'sel',
      marks.includes(d) && 'mark',
      band && 'band',
      band && (d === from || col === 0) && 'cap-l',
      band && (d === to || col === 6) && 'cap-r',
      band && (d === from || d === to) && 'end',
    ]
      .filter(Boolean)
      .join(' ');
    const title = `${fmt(d, { weekday: 'short', day: 'numeric', month: 'short' })}${h !== undefined ? ` · ${+h.toFixed(1)}h` : ''}`;
    const props = { key: d, className: cls, style: { '--f': f }, title };
    return byDay ? (
      <button {...props} onClick={() => onPick(d)}>
        {Number(d.slice(8))}
      </button>
    ) : (
      <span {...props}>{Number(d.slice(8))}</span>
    );
  };

  return (
    <div className="cal">
      <div className="cal-head">
        <b>{fmt(month, { month: 'long', year: 'numeric' })}</b>
        <span className="spacer" />
        <button className="icon sm" onClick={() => setMonth(addMonths(month, -1))} aria-label="Previous month">
          ‹
        </button>
        <button className="icon sm" onClick={() => setMonth(addMonths(month, 1))} aria-label="Next month">
          ›
        </button>
      </div>
      <div className="cal-grid">
        <div className="cal-row head" aria-hidden="true">
          <span>Wk</span>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((w, i) => (
            <span key={i} className={i > 4 ? 'we' : ''}>
              {w}
            </span>
          ))}
        </div>
        {rows.map(r => {
          const on = !byDay && from && r[0] <= to && r[6] >= from;
          const inner = (
            <>
              <span className="wk-n">{isoWeek(r[0])}</span>
              {r.map((d, col) => cell(d, col))}
            </>
          );
          return byDay ? (
            <div key={r[0]} className="cal-row">
              {inner}
            </div>
          ) : (
            <button key={r[0]} className={'cal-row' + (on ? ' on' : '')} onClick={() => onPick(r[0])} title={`Week ${isoWeek(r[0])}`}>
              {inner}
            </button>
          );
        })}
      </div>
    </div>
  );
}
