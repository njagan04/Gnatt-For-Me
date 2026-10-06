'use client';
import { useEffect, useState } from 'react';
import { busyDays } from './actions';
import { addDays, addMonths, monday, range, fmt } from '../lib/days';


// Sunday-first grid. The days on screen (from–to, may cross a weekend) show as one soft band with strong ends.
// Click a day -> its work week. Dots mark logged days.
export default function MiniCal({ month, setMonth, from, to, today, onPick, version }) {
  const first = addDays(month, -new Date(month + 'T00:00:00Z').getUTCDay()); // the Sunday on/before the 1st
  const cells = range(first, addDays(first, 41));
  const [busy, setBusy] = useState([]);

  useEffect(() => {
    busyDays(cells[0], cells[41]).then(setBusy, () => {});
  }, [month, version]);

  const weekOf = d => (new Date(d + 'T00:00:00Z').getUTCDay() === 0 ? addDays(d, 1) : monday(d)); // Sunday opens its row's week
  return (
    <div className="cal">
      <div className="cal-head">
        <b>{fmt(month, { month: 'long', year: 'numeric' })}</b>
        <span className="spacer" />
        <button className="icon sm" onClick={() => setMonth(addMonths(month, -1))} aria-label="Previous month">‹</button>
        <button className="icon sm" onClick={() => setMonth(addMonths(month, 1))} aria-label="Next month">›</button>
      </div>
      <div className="cal-grid">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((w, i) => <span key={i} className={'wd' + (i % 6 ? '' : ' we')}>{w}</span>)}
        {cells.map((d, i) => {
          const band = d >= from && d <= to;
          const cls = [
            'cd',
            d.slice(0, 7) !== month.slice(0, 7) && 'out',
            d === today && 'now',
            busy.includes(d) && 'busy',
            i % 7 % 6 === 0 && 'we',
            band && 'band',
            band && (d === from || i % 7 === 0) && 'cap-l',
            band && (d === to || i % 7 === 6) && 'cap-r',
            (d === from || d === to) && 'end',
          ].filter(Boolean).join(' ');
          return <button key={d} className={cls} onClick={() => onPick(weekOf(d))}>{Number(d.slice(8))}</button>;
        })}
      </div>
    </div>
  );
}
