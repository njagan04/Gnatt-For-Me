'use client';
import { useEffect, useState } from 'react';

// Theme choice lives in localStorage; lib/theme.js applies it before first paint.

function apply(t) {
  const root = document.documentElement;
  if (t === 'system') delete root.dataset.theme;
  else root.dataset.theme = t;
  try { t === 'system' ? localStorage.removeItem('theme') : localStorage.setItem('theme', t); } catch {}
}

// Switch theme with a corner-to-corner sweep: light comes in from the top-right,
// dark goes back from the bottom-left (System uses whichever the OS resolves to).
function setTheme(t) {
  if (!document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) return apply(t);
  const dark = t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  const [x, y] = dark ? [0, innerHeight] : [innerWidth, 0];
  const r = Math.hypot(innerWidth, innerHeight);
  document.startViewTransition(() => apply(t)).ready.then(() => {
    document.documentElement.animate(
      { clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
      { duration: 650, easing: 'cubic-bezier(.2, .8, .2, 1)', pseudoElement: '::view-transition-new(root)' },
    );
  });
}

export default function ThemeSwitch() {
  const [t, setT] = useState('system');
  useEffect(() => { try { setT(localStorage.getItem('theme') || 'system'); } catch {} }, []);
  return (
    <div className="theme-switch" role="radiogroup" aria-label="Theme">
      {[['system', 'System'], ['light', 'Light'], ['dark', 'Dark']].map(([k, label]) => (
        <button key={k} role="radio" aria-checked={t === k} className={t === k ? 'on' : ''}
          onClick={() => { setT(k); setTheme(k); }}>{label}</button>
      ))}
    </div>
  );
}
