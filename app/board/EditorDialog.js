'use client';
import { useEffect, useRef, useState } from 'react';
import { fmt, workRange } from '../../lib/days';
import CatPicker from './CatPicker';
import CategoryDialog from './CategoryDialog';
import HoursEditor from './HoursEditor';
import { PRIORITY_LABEL, STATUS_LABEL } from './Timeline';

const MAX_DAYS = 45; // workdays per bar

// Log / edit work: task, description, category, status, dates and hours.
// `ed` is the editor state owned by Board; this component only edits it.
// deleteLabel: set where Delete removes the whole task (Settings → Categories); the button then always shows.
export default function EditorDialog({ dlgRef, ed, setEd, tasks, cats, logs, colorOf, onSave, onDelete, onNewCat, say, deleteLabel }) {
  const [newCat, setNewCat] = useState(null); // { name }: the colour card for a category made from the dropdown
  useEffect(() => {
    if (ed && !dlgRef.current.open) dlgRef.current.showModal();
  }, [ed]);

  // Typing a known task's name brings in its category and description.
  function setName(name) {
    const known = tasks.find(t => t.name === name);
    setEd({
      ...ed,
      name,
      label: known && !ed.label ? known.label : ed.label,
      notes: known && !ed.notes ? known.notes : ed.notes,
      status: known ? known.status : ed.status,
      priority: known ? known.priority : ed.priority,
      pinned: known ? known.pinned : ed.pinned,
    });
  }
  function setRange(from, to) {
    if (workRange(from, to).length > MAX_DAYS) return say(`A bar can span at most ${MAX_DAYS} weekdays`, true);
    const hours = {};
    for (const d of workRange(from, to)) {
      hours[d] = ed.hours[d] ?? logs.find(l => l.id === ed.bar?.taskId && l.day === d)?.hours ?? '';
    }
    setEd({ ...ed, from, to, hours });
  }
  // Clicking outside closes the card only if nothing has been filled in; otherwise it shakes.
  function backdrop(e) {
    const dlg = dlgRef.current;
    if (e.target !== dlg || !ed) return;
    const r = dlg.getBoundingClientRect();
    if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) return;
    const filled = ed.name.trim() || ed.label || ed.notes.trim() || Object.values(ed.hours).some(v => v !== '');
    if (!filled) return dlg.close();
    dlg.classList.remove('nudge');
    void dlg.offsetWidth; // restart the shake
    dlg.classList.add('nudge');
  }

  return (
    <>
      <dialog ref={dlgRef} onClose={() => setEd(null)} onPointerDown={backdrop}>
        {ed && (
          <form onSubmit={onSave} style={{ '--c': colorOf(ed.label) }}>
            <div className="dlg-head">
              <span className="swatch" />
              <div>
                <h2>{ed.bar ? 'Edit work' : 'Log work'}</h2>
                <p className="muted">
                  {ed.from === ed.to
                    ? fmt(ed.from, { weekday: 'long', day: 'numeric', month: 'long' })
                    : `${fmt(ed.from, { day: 'numeric', month: 'short' })} → ${fmt(ed.to, { day: 'numeric', month: 'short' })}`}
                </p>
              </div>
              <span className="spacer" />
              <button type="button" className="icon-btn" onClick={() => dlgRef.current.close()} title="Close (Esc)" aria-label="Close">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <div className="tab-body">
              {ed.autofill && (
                <p className="autofill-note" role="status">
                  Everything here is filled in from your earlier work on this task (category, status, description and your usual hours).
                  Check it and update anything that&apos;s changed.
                </p>
              )}
              <label>
                Task
                <input
                  value={ed.name}
                  onChange={e => setName(e.target.value)}
                  placeholder="What did you work on?"
                  autoComplete="off"
                  required
                  autoFocus
                />
              </label>
              <label className="pin-check" title="Keep this task in the sidebar's “Pick up again” list, one click to log it again">
                <input type="checkbox" checked={ed.pinned} onChange={e => setEd({ ...ed, pinned: e.target.checked })} />
                Pick up again
              </label>
              <label>
                Description
                <textarea
                  className="desc"
                  rows={2}
                  value={ed.notes}
                  onChange={e => setEd({ ...ed, notes: e.target.value })}
                  maxLength={20000}
                  placeholder="Links, decisions, what's left to do…"
                />
              </label>
              <div className="dates three">
                <div className="field">
                  <span>Category</span>
                  <CatPicker cats={cats} value={ed.label} onChange={label => setEd({ ...ed, label })} onNew={name => setNewCat({ name })} />
                </div>
                <div className="field">
                  <span>Status</span>
                  <OptionPicker options={STATUS_LABEL} value={ed.status} onChange={status => setEd({ ...ed, status })} />
                </div>
                <div className="field">
                  <span>Priority</span>
                  <OptionPicker options={PRIORITY_LABEL} value={ed.priority} onChange={priority => setEd({ ...ed, priority })} dot />
                </div>
              </div>
              <div className="dates">
                <label>
                  From
                  <input
                    type="date"
                    value={ed.from}
                    required
                    onChange={e => e.target.value && setRange(e.target.value, e.target.value > ed.to ? e.target.value : ed.to)}
                  />
                </label>
                <label>
                  To
                  <input
                    type="date"
                    value={ed.to}
                    min={ed.from}
                    required
                    onChange={e => e.target.value >= ed.from && setRange(ed.from, e.target.value)}
                  />
                </label>
              </div>
              <HoursEditor days={workRange(ed.from, ed.to)} hours={ed.hours} onChange={hours => setEd({ ...ed, hours })} />
            </div>

            <div className="actions">
              {(ed.bar || (deleteLabel && ed.orig)) && (
                <button type="button" className="danger" onClick={onDelete} disabled={ed.busy}>
                  {deleteLabel || 'Delete'}
                </button>
              )}
              <span className="spacer" />
              <button className="primary" disabled={ed.busy}>
                {ed.busy ? <span className="spin" /> : 'Save'}
              </button>
            </div>
          </form>
        )}
      </dialog>
      {/* outside the editor's form: a form can't sit inside another */}
      <CategoryDialog edit={newCat} cats={cats} onClose={() => setNewCat(null)} onSave={onNewCat} />
    </>
  );
}

// A short dropdown (status, priority), styled like the category one; no search. dot: a priority marker before each.
function OptionPicker({ options, value, onChange, dot }) {
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const box = useRef(null);
  const keys = Object.keys(options);

  useEffect(() => {
    if (!open) return;
    const off = e => !box.current.contains(e.target) && setOpen(false);
    document.addEventListener('pointerdown', off);
    return () => document.removeEventListener('pointerdown', off);
  }, [open]);

  const pick = k => {
    onChange(k);
    setOpen(false);
  };
  function key(e) {
    if (!open) return;
    if (e.key === 'ArrowDown') setHi(Math.min(hi + 1, keys.length - 1));
    else if (e.key === 'ArrowUp') setHi(Math.max(hi - 1, 0));
    else if (e.key === 'Enter') pick(keys[hi]);
    else if (e.key === 'Escape')
      setOpen(false); // close the list, not the dialog
    else return;
    e.preventDefault();
  }

  return (
    <div className="picker" ref={box} onKeyDown={key}>
      <button
        type="button"
        className={'picker-btn' + (open ? ' open' : '')}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          setOpen(!open);
          setHi(Math.max(0, keys.indexOf(value)));
        }}
      >
        {dot && <i className={'pri ' + value} />}
        {options[value]}
        <span className="caret">▾</span>
      </button>
      {open && (
        <div className="picker-pop">
          <ul role="listbox">
            {keys.map((k, i) => (
              <li
                key={k}
                role="option"
                aria-selected={k === value}
                className={(i === hi ? 'hi' : '') + (k === value ? ' sel' : '')}
                onPointerEnter={() => setHi(i)}
                onClick={() => pick(k)}
              >
                {dot && <i className={'pri ' + k} />}
                {options[k]}
                {k === value && <span className="tick">✓</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
