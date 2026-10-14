'use client';
import { useEffect, useRef } from 'react';
import { zoom } from '../../lib/zoom';

// The hero's background is a faint timeline: day columns and task bars that draw themselves in. The mouse is the
// "now" cursor: a playhead glides to the column under it (with that day's name) and a soft light around the
// pointer shows the bars beneath at full colour. Off on touch screens and with reduced motion.
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const COLS = 15; // three working weeks
const TODAY = 7; // the middle week's Wednesday
// top (px), first column, length, colour slot — kept clear of the headline bars (deterministic: same on server and browser)
const BARS = [
  [56, 1, 3, 0],
  [56, 6, 4, 2],
  [56, 11, 3, 6],
  [690, 0, 4, 3],
  [690, 9, 5, 0],
  [736, 2, 3, 4],
  [736, 10, 3, 1],
];
const DOING = [714, 6, 3, 5]; // a bar through today, still in progress

function Bars({ lit }) {
  return (
    <div className={'hf-bars' + (lit ? ' lit' : '')}>
      {BARS.map(([t, c, n, k], i) => (
        <i key={i} style={{ '--top': t + 'px', '--c0': c, '--n': n, '--k': `var(--cat-${k})`, '--d': i }} />
      ))}
      <i
        className="doing"
        style={{ '--top': DOING[0] + 'px', '--c0': DOING[1], '--n': DOING[2], '--k': `var(--cat-${DOING[3]})`, '--d': BARS.length }}
      />
    </div>
  );
}

export default function HeroField() {
  const ref = useRef(null);
  const label = useRef(null);

  useEffect(() => {
    if (matchMedia('(pointer: coarse), (prefers-reduced-motion: reduce)').matches) return;
    const el = ref.current;
    let x = 0,
      tx = 0,
      raf = 0,
      col = -1;
    // The playhead eases toward its column; the light follows the pointer exactly.
    const tick = () => {
      x += (tx - x) * 0.12;
      el.style.setProperty('--px', x.toFixed(1) + 'px');
      raf = Math.abs(tx - x) > 0.4 ? requestAnimationFrame(tick) : 0;
    };
    const move = e => {
      const r = el.getBoundingClientRect(),
        z = zoom();
      const inside = e.clientY >= r.top && e.clientY <= r.bottom && e.clientX >= r.left && e.clientX <= r.right;
      el.classList.toggle('live', inside);
      if (!inside) return;
      el.style.setProperty('--mx', (e.clientX - r.left) / z + 'px');
      el.style.setProperty('--my', (e.clientY - r.top) / z + 'px');
      const c = Math.min(COLS - 1, Math.floor(((e.clientX - r.left) / r.width) * COLS));
      if (c !== col) {
        if (col < 0) x = ((c + 0.5) / COLS) * (r.width / z); // first time: appear in place, don't fly in
        col = c;
        tx = ((c + 0.5) / COLS) * (r.width / z);
        label.current.textContent = DAYS[c % 5] + (c === TODAY ? ' · today' : '');
        raf ||= requestAnimationFrame(tick);
      }
    };
    addEventListener('pointermove', move, { passive: true });
    return () => {
      removeEventListener('pointermove', move);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="hf" ref={ref} aria-hidden="true">
      <div className="hf-cols">
        {Array.from({ length: COLS }, (_, i) => (
          <span key={i} className={(i % 5 === 0 ? 'mon' : '') + (i === TODAY ? ' now' : '')}>
            {DAYS[i % 5]}
          </span>
        ))}
      </div>
      <Bars />
      <Bars lit />
      <div className="hf-head">
        <b ref={label} />
      </div>
    </div>
  );
}
