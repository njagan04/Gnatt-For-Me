'use client';
import { useState } from 'react';
import { catVar, MAX_CATS, striped } from '../../lib/palette';
import { Trash } from './CategoryDelete';
import MiniCal from './MiniCal';

// Right column: mini calendar, the tasks you work on most, and categories (with built-in Others).
export default function Sidebar({ calendar, logs, today, colorOf, onLog, categories }) {
  return (
    <aside className="side">
      <section className="card">
        <MiniCal {...calendar} today={today} />
      </section>
      <PickUpCard logs={logs} today={today} colorOf={colorOf} onLog={onLog} />
      <Categories {...categories} />
    </aside>
  );
}

// The tasks you've put the most into lately; one click logs them again for today.
function PickUpCard({ logs, today, colorOf, onLog }) {
  const by = new Map();
  for (const l of logs) {
    if (l.day > today) continue;
    const t = by.get(l.name) ?? { name: l.name, label: l.label, hours: 0, days: 0, last: l.day };
    t.hours += l.hours || 0;
    t.days += 1;
    if (l.day > t.last) t.last = l.day;
    by.set(l.name, t);
  }
  // most hours first, then most days, then most recent
  const top = [...by.values()].sort((a, b) => b.hours - a.hours || b.days - a.days || b.last.localeCompare(a.last)).slice(0, 6);
  if (!top.length) return null;
  return (
    <section className="card today-card">
      <div className="card-head">
        <b>Pick up again</b>
        <span className="muted tiny">most worked on</span>
      </div>
      <ul className="today-list recent">
        {top.map(t => (
          <li key={t.name}>
            <button onClick={() => onLog(t.name, t.label)} title={`Log “${t.name}” for today`}>
              <i className="dot-s" style={{ '--c': colorOf(t.label) }} />
              <span>{t.name}</span>
              <small>
                {+t.hours.toFixed(1)}h · {t.days}d
              </small>
              <em>＋</em>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Categories({ cats, total, focus, setFocus, onAdd, onRecolor, onAskDelete }) {
  const [name, setName] = useState('');
  const hours = c => (total(c) > 0 ? total(c) + 'h' : '');
  const toggle = c => setFocus(f => (f === c ? null : c));
  const add = e => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd(name);
    setName('');
  };
  return (
    <section className="card">
      <div className="card-head">
        <b>Categories</b>
        {focus !== null && (
          <button className="link" onClick={() => setFocus(null)}>
            show all
          </button>
        )}
      </div>
      <ul className="cats">
        {cats.map(c => (
          <li key={c.name} className={(focus === c.name ? 'on' : '') + (striped(c.hue) ? ' striped' : '')} style={{ '--c': catVar(c.hue) }}>
            <button className="dot" onClick={() => onRecolor(c)} title="Change colour" aria-label={`Change colour of ${c.name}`} />
            <button className="cat-name" onClick={() => toggle(c.name)} title="Highlight its bars">
              {c.name}
            </button>
            <span className="count">{hours(c.name)}</span>
            <button className="x" onClick={() => onAskDelete(c.name)} aria-label={`Delete ${c.name}`} title="Delete category">
              <Trash size={14} />
            </button>
          </li>
        ))}
        {/* built-in: everything without a category lives in Others */}
        <li className={'others' + (focus === '' ? ' on' : '')} style={{ '--c': 'var(--cat-none)' }}>
          <span className="dot" aria-hidden="true" />
          <button className="cat-name" onClick={() => toggle('')} title="Highlight tasks without a category">
            Others
          </button>
          <span className="count">{hours('')}</span>
          <span className="x-space" aria-hidden="true" />
        </li>
      </ul>
      {cats.length < MAX_CATS ? (
        <form onSubmit={add} className="add-cat">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="+ New category" maxLength={40} />
        </form>
      ) : (
        <p className="muted tiny">All {MAX_CATS} category colours are in use.</p>
      )}
    </section>
  );
}
