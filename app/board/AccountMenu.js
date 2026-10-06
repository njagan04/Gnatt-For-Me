'use client';
import { useEffect, useState } from 'react';
import { logout, stats } from '../actions';
import { today as todayStr } from '../../lib/days';
import { summarize } from '../../lib/stats';
import ThemeSwitch from './ThemeSwitch';

// Avatar button + profile card: this week vs last, streak, average per day, 12-week trend, theme, log out.
export default function AccountMenu({ user }) {
  const [open, setOpen] = useState(false);
  const [a, setA] = useState(null);

  useEffect(() => {
    if (!open) return;
    const t = todayStr();
    stats(t).then(
      r => setA(summarize(r.days, t)),
      () => {},
    );
    const close = e => (e.key === 'Escape' || (e.type === 'pointerdown' && !e.target.closest('.acct'))) && setOpen(false);
    addEventListener('pointerdown', close);
    addEventListener('keydown', close);
    return () => {
      removeEventListener('pointerdown', close);
      removeEventListener('keydown', close);
    };
  }, [open]);

  const initial = user[0].toUpperCase();
  return (
    <div className="acct">
      <button className={'avatar' + (open ? ' on' : '')} onClick={() => setOpen(!open)} aria-label="Account" aria-expanded={open}>
        {initial}
      </button>
      {open && (
        <div className="acct-menu" role="menu">
          <div className="acct-who">
            <span className="avatar big">{initial}</span>
            <div>
              <b>{user.split('@')[0]}</b>
              <span className="muted tiny">{user}</span>
            </div>
          </div>
          <Stats a={a} />
          <a href="/insights" className="acct-link">
            Open insights <span>→</span>
          </a>
          <div className="acct-row">
            <span className="muted tiny">Theme</span>
            <ThemeSwitch />
          </div>
          <form action={logout}>
            <button className="acct-out">Log out</button>
          </form>
        </div>
      )}
    </div>
  );
}

function Stats({ a }) {
  if (!a)
    return (
      <div className="acct-stats loading">
        <i />
        <i />
        <i />
      </div>
    );
  const n = v => +v.toFixed(1);
  const delta = n(a.thisWeek - a.lastWeek);
  const max = Math.max(1, ...a.weeks.map(w => w.hours));
  return (
    <>
      <div className="acct-stats">
        <div>
          <span>This week</span>
          <b>{n(a.thisWeek)}h</b>
          <small className={delta > 0 ? 'up' : delta < 0 ? 'down' : ''}>
            {delta === 0 ? '= last week' : `${delta > 0 ? '▲' : '▼'} ${Math.abs(delta)}h`}
          </small>
        </div>
        <div>
          <span>Streak</span>
          <b>
            {a.streak}
            <em> {a.streak === 1 ? 'day' : 'days'}</em>
          </b>
          <small>in a row</small>
        </div>
        <div>
          <span>Avg / day</span>
          <b>{n(a.avg30)}h</b>
          <small>30 days</small>
        </div>
      </div>
      <div className="acct-trend">
        <div className="acct-spark" aria-label="Hours per week, last 12 weeks">
          {a.weeks.map((w, i) => (
            <i
              key={w.week}
              className={i === 11 ? 'now' : ''}
              style={{ height: `${Math.max(6, (w.hours / max) * 100)}%` }}
              title={`Week of ${w.week}: ${n(w.hours)}h`}
            />
          ))}
        </div>
        <small className="muted">Last 12 weeks</small>
      </div>
    </>
  );
}
