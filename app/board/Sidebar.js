'use client';
import { useState } from 'react';
import Link from 'next/link';
import { catColor, MAX_CATS, striped } from '../../lib/palette';
import { Trash } from './CategoryDelete';
import MiniCal from './MiniCal';
import CategoryDialog from './CategoryDialog';

// Right column: mini calendar, categories (with built-in Others), then the tasks you chose to pick up again.
export default function Sidebar({ open, calendar, today, tasks, colorOf, onLog, onUnpin, categories }) {
  return (
    <aside className={'side' + (open ? ' open' : '')}>
      <section className="card">
        <MiniCal {...calendar} today={today} />
      </section>
      <Categories {...categories} />
      <PickUpCard tasks={tasks} colorOf={colorOf} onLog={onLog} onUnpin={onUnpin} />
    </aside>
  );
}

// Tasks ticked "Pick up again" in the editor; one click logs them again for today, × takes them off the list.
function PickUpCard({ tasks, colorOf, onLog, onUnpin }) {
  const [q, setQ] = useState('');
  const pinned = tasks.filter(t => t.pinned);
  const list = pinned.filter(t => (t.name + ' ' + t.label).toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <section className="card today-card">
      <div className="card-head">
        <b>Pick up again</b>
      </div>
      {pinned.length > 0 && (
        <input
          className="pick-search"
          type="search"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search tasks…"
          aria-label="Search Pick up again"
        />
      )}
      {pinned.length > 0 && !list.length && <p className="muted tiny">No task matches “{q.trim()}”.</p>}
      {list.length ? (
        <ul className="today-list recent">
          {list.map(t => (
            <li key={t.name}>
              <button onClick={() => onLog(t.name, t.label)} title={`Log “${t.name}” for today`}>
                <i className="dot-s" style={{ '--c': colorOf(t.label) }} />
                <span>{t.name}</span>
                <em>＋</em>
              </button>
              <button
                className="unpin"
                onClick={() => onUnpin(t.name)}
                title="Take off this list"
                aria-label={`Take ${t.name} off this list`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : (
        !pinned.length && <p className="muted tiny">Tick “Pick up again” when you log a task to keep it here.</p>
      )}
    </section>
  );
}

function Categories({ cats, total, focus, setFocus, onAdd, onRecolor, onAskDelete }) {
  const [edit, setEdit] = useState(null); // { cat? }: the category card is open (new, or recolouring cat)
  const hours = c => (total(c) > 0 ? total(c) + 'h' : '');
  const toggle = c => setFocus(f => (f === c ? null : c));
  return (
    <section className="card">
      <div className="card-head">
        <b>Categories</b>
        <span className="spacer" />
        <Link href="/insights?tab=settings&section=categories" className="link manage" title="Rename, recolour and delete categories">
          Manage
        </Link>
      </div>
      <ul className="cats">
        {cats.map(c => (
          <li key={c.name} className={(focus === c.name ? 'on' : '') + (striped(c.hue) ? ' striped' : '')} style={{ '--c': catColor(c) }}>
            <button className="dot" onClick={() => setEdit({ cat: c })} title="Change colour" aria-label={`Change colour of ${c.name}`} />
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
        <button className="add-cat-btn" onClick={() => setEdit({})}>
          ＋ New category
        </button>
      ) : (
        <p className="muted tiny">All {MAX_CATS} category colours are in use.</p>
      )}
      <CategoryDialog
        edit={edit}
        cats={cats}
        onClose={() => setEdit(null)}
        onSave={(name, hue, color) => (edit.cat ? onRecolor(edit.cat, hue, color) : onAdd(name, hue, color))}
      />
    </section>
  );
}
