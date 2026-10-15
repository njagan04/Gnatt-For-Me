'use client';
import { useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import NavRail from './NavRail';

// The rail beside every signed-in page. On the board it's a slim column of icons that expands over the calendar
// while the mouse is on it (a short wait so passing by doesn't open it, a moment's grace on leaving); everywhere
// else it's fixed at full width.
export default function Shell({ me, admin, children }) {
  const path = usePathname();
  const q = useSearchParams();
  const board = path === '/home';
  const tab = q.get('tab');
  const active = board
    ? 'board'
    : tab === 'settings'
      ? q.get('section') || (q.get('welcome') ? 'sign-in' : 'appearance')
      : tab || 'insights';
  const [open, setOpen] = useState(false);
  const timer = useRef(null);
  const hover = board && {
    onPointerEnter: e => {
      if (e.pointerType !== 'mouse') return;
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setOpen(true), open ? 0 : 120);
    },
    onPointerLeave: () => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setOpen(false), 250);
    },
  };
  return (
    <div className={'shell' + (board ? ' slim' : '') + (board && open ? ' open' : '')}>
      <div className="shell-rail" {...hover}>
        <NavRail me={me} admin={admin} active={active} />
      </div>
      <div className="shell-main">{children}</div>
    </div>
  );
}
