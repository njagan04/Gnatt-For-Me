'use client';
import { useRef } from 'react';

// Leans its child a few degrees toward the pointer (and settles back when it leaves).
export default function Tilt({ children, max = 6 }) {
  const ref = useRef(null);
  const raf = useRef(0);
  function move(e) {
    if (e.pointerType !== 'mouse') return;
    const r = ref.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5,
      py = (e.clientY - r.top) / r.height - 0.5;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      ref.current.style.setProperty('--ry', (px * max * 2).toFixed(2) + 'deg');
      ref.current.style.setProperty('--rx', (-py * max).toFixed(2) + 'deg');
    });
  }
  function leave() {
    cancelAnimationFrame(raf.current);
    ref.current.style.setProperty('--ry', '0deg');
    ref.current.style.setProperty('--rx', '0deg');
  }
  return (
    <div ref={ref} className="lp-tilt" onPointerMove={move} onPointerLeave={leave}>
      {children}
    </div>
  );
}
