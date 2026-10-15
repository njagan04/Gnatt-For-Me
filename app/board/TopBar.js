import Link from 'next/link';
import { fmt } from '../../lib/days';

// Week navigation, the visible range, "New", the in-view total and the account menu.
export default function TopBar({ user, picture, loading, from, to, total, onPrev, onToday, onNext, onNew, onSide }) {
  return (
    <header className="top" data-loading={loading || undefined}>
      <nav className="nav">
        <button className="icon" onClick={onPrev} aria-label="Previous week" title="Previous week (←)">
          ‹
        </button>
        <button onClick={onToday} title="This week (T)">
          Today
        </button>
        <button className="icon" onClick={onNext} aria-label="Next week" title="Next week (→)">
          ›
        </button>
      </nav>
      <span className="range">
        {fmt(from, { day: 'numeric', month: 'short' })}
        {from !== to && <> – {fmt(to, { day: 'numeric', month: 'short' })}</>}
        <span className="yr"> {fmt(to, { year: 'numeric' })}</span>
      </span>
      <span className="spacer" />
      <button className="quick-btn" onClick={onNew} title="Log work for today (N)">
        ＋ New <kbd>N</kbd>
      </button>
      <span className="sum">
        <span className="sum-label">In view</span> <b>{total}h</b>
      </span>
      <button className="icon side-btn" onClick={onSide} aria-label="Calendar and categories" title="Calendar and categories">
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <rect x="4" y="5" width="16" height="15" rx="2" />
          <path d="M4 10h16M9 3v4M15 3v4" />
        </svg>
      </button>
      <Link href="/insights" className="avatar" title="Insights & settings" aria-label="Insights and settings">
        {picture ? <img src={picture} alt="" referrerPolicy="no-referrer" /> : user[0].toUpperCase()}
      </Link>
    </header>
  );
}
