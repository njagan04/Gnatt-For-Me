'use client';
import Link from 'next/link';
import { logout } from '../actions';
import './nav.css';

export function Avatar({ me, className = '' }) {
  return me.picture ? (
    <img src={me.picture} alt="" referrerPolicy="no-referrer" className={'avatar ' + className} />
  ) : (
    <span className={'avatar ' + className}>{me.email[0].toUpperCase()}</span>
  );
}

// Left rail: app navigation in two labelled groups (one active item at a time), you + log out pinned at the bottom.
const ICONS = {
  board: 'M3 4h18M3 4v16h18V4M8 9h8M8 13h5',
  insights: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  appearance: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 3v18M12 8h6M12 12h9M12 16h6',
  'sign-in': 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4M12 15v2',
  admin: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM9 12l2 2 4-4',
  categories: 'M3 12V4h8l10 10-8 8L3 12zM7.5 8h.01',
  journal: 'M6 3h11a2 2 0 0 1 2 2v16H7a2 2 0 0 1-2-2V4a1 1 0 0 1 1-1zM5 17a2 2 0 0 1 2-2h12M9 7h6M9 10h4',
  out: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
};

export default function NavRail({ me, admin, active }) {
  // Every section switches in place (client-side), the board included.
  const item = (id, href, label) => (
    <Link
      key={id}
      href={href}
      className={active === id ? 'on' : ''}
      aria-current={active === id ? 'page' : undefined}
      title={label}
      scroll={false}
    >
      <Icon d={ICONS[id]} />
      <span>{label}</span>
    </Link>
  );
  return (
    <aside className="me-side">
      <Link href="/home" className="rail-brand" title="GanttForMe · your board">
        <span className="logo" />
        <span>Gantt For Me</span>
      </Link>
      <nav className="me-nav" aria-label="Sections">
        <p className="me-label">Workspace</p>
        {item('board', '/home', 'Board')}
        {item('insights', '/insights', 'Insights')}
        {item('journal', '/insights?tab=journal', 'Daily log')}
        <p className="me-label">Settings</p>
        {item('appearance', '/insights?tab=settings&section=appearance', 'Appearance')}
        {item('categories', '/insights?tab=settings&section=categories', 'Categories')}
        {item('sign-in', '/insights?tab=settings&section=sign-in', 'Sign-in')}
        {admin && item('admin', '/insights?tab=settings&section=admin', 'Admin')}
      </nav>
      <div className="me-foot">
        <Avatar me={me} className="big" />
        <div className="me-who">
          <b>{me.name || me.email.split('@')[0]}</b>
          <span>{me.username ? '@' + me.username : me.email}</span>
        </div>
        <form action={logout}>
          <button className="me-out" title="Log out" aria-label="Log out">
            <Icon d={ICONS.out} />
          </button>
        </form>
      </div>
    </aside>
  );
}

const Icon = ({ d }) => (
  <svg
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={d} />
  </svg>
);
