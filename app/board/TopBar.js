import { fmt } from '../../lib/days';
import AccountMenu from './AccountMenu';

// Logo, week navigation, the visible range, "New", the in-view total and the account menu.
export default function TopBar({ user, loading, from, to, total, onPrev, onToday, onNext, onNew }) {
  return (
    <header className="top" data-loading={loading || undefined}>
      <div className="brand" title="GnattForMe">
        <span className="logo" />
      </div>
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
        {fmt(from, { day: 'numeric', month: 'short' })} – {fmt(to, { day: 'numeric', month: 'short', year: 'numeric' })}
      </span>
      <span className="spacer" />
      <button className="quick-btn" onClick={onNew} title="Log work for today (N)">
        ＋ New <kbd>N</kbd>
      </button>
      <span className="sum">
        In view <b>{total}h</b>
      </span>
      <AccountMenu user={user} />
    </header>
  );
}
