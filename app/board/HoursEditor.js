'use client';
import { fmt } from '../../lib/days';
import { useRef, useState } from 'react';

const SCALE = 12; // hours at the top of a bar
const num = v => (v === '' || v == null ? 0 : Number(v));
const half = v => Math.round(v * 2) / 2;

// One bar per day, centred. Drag a bar's knob (or anywhere on it) up/down in ½h steps; wheel or ↑↓ nudges.
// "Copy to all days" spreads the most recent value. hours: { day: number | '' } ('' = no hours).
export default function HoursEditor({ days, hours, onChange }) {
  const [active, setActive] = useState(null); // day being dragged
  const last = useRef(null);
  const put = (d, v) => {
    const val = v > 0 ? Math.min(24, half(v)) : '';
    if (val !== '') last.current = val;
    onChange({ ...hours, [d]: val });
  };
  const total = days.reduce((s, d) => s + num(hours[d]), 0);
  const source = last.current ?? days.map(d => num(hours[d])).find(v => v > 0);

  function setFrom(e, d) {
    const r = e.currentTarget.querySelector('.eq-track').getBoundingClientRect();
    put(d, Math.max(0, Math.min(SCALE, ((r.bottom - e.clientY) / r.height) * SCALE)));
  }
  function key(e, d) {
    const step = { ArrowUp: 0.5, ArrowDown: -0.5, PageUp: 2, PageDown: -2 }[e.key];
    if (step) {
      e.preventDefault();
      put(d, num(hours[d]) + step);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      put(d, 0);
    }
  }

  return (
    <div className="eq">
      <div className="eq-head">
        <span>
          Hours <span className="muted">· optional</span>
        </span>
        <b key={total} className="eq-total">
          {total ? `${total}h total` : '—'}
        </b>
      </div>
      <div className="eq-bars">
        {days.map((d, i) => {
          const v = num(hours[d]);
          return (
            <div
              key={d}
              className={'eq-day' + (v ? '' : ' zero') + (active === d ? ' active' : '')}
              style={{ animationDelay: `${i * 25}ms` }}
              tabIndex={0}
              role="slider"
              aria-label={`Hours on ${fmt(d, { weekday: 'long', day: 'numeric', month: 'long' })}`}
              aria-valuemin={0}
              aria-valuemax={24}
              aria-valuenow={v}
              onKeyDown={e => key(e, d)}
              onWheel={e => put(d, v + (e.deltaY < 0 ? 0.5 : -0.5))}
              onPointerDown={e => {
                setActive(d);
                e.currentTarget.setPointerCapture(e.pointerId);
                setFrom(e, d);
              }}
              onPointerMove={e => active === d && setFrom(e, d)}
              onPointerUp={() => setActive(null)}
              onPointerCancel={() => setActive(null)}
            >
              <span className="eq-val">{v ? `${v}h` : '–'}</span>
              <span className="eq-track">
                <i style={{ height: `${Math.min(1, v / SCALE) * 100}%` }}>
                  <span className="eq-knob" />
                </i>
              </span>
              <span className="eq-wd">{fmt(d, { weekday: 'short' })}</span>
              <span className="eq-dn">{Number(d.slice(8))}</span>
            </div>
          );
        })}
      </div>
      <div className="eq-foot">
        {days.length > 1 && source > 0 ? (
          <button type="button" className="quiet" onClick={() => onChange(Object.fromEntries(days.map(d => [d, source])))}>
            Copy {source}h to all days
          </button>
        ) : (
          <span className="muted tiny">Drag a bar up or down · ↑↓ to nudge</span>
        )}
        <button
          type="button"
          className="quiet"
          onClick={() => {
            last.current = null;
            onChange(Object.fromEntries(days.map(d => [d, ''])));
          }}
          disabled={!total}
        >
          Clear
        </button>
      </div>
    </div>
  );
}
