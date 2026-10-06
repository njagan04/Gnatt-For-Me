'use client';
import { useEffect } from 'react';
import { fmt, workRange } from '../../lib/days';
import CatPicker from './CatPicker';
import HoursEditor from './HoursEditor';

const MAX_DAYS = 45; // workdays per bar

// Log / edit work: task, category, dates and hours (Details tab) plus a notepad (Notes tab).
// `ed` is the editor state owned by Board; this component only edits it.
export default function EditorDialog({ dlgRef, ed, setEd, tasks, cats, logs, colorOf, onSave, onDelete, say }) {
  useEffect(() => {
    if (ed && !dlgRef.current.open) dlgRef.current.showModal();
  }, [ed]);

  // Typing a known task's name brings in its category and notes.
  function setName(name) {
    const known = tasks.find(t => t.name === name);
    setEd({ ...ed, name, label: known && !ed.label ? known.label : ed.label, notes: known && !ed.notes ? known.notes : ed.notes });
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

          <div className="tabs" role="tablist">
            {[
              ['details', 'Details'],
              ['notes', ed.notes ? 'Notes ✎' : 'Notes'],
            ].map(([k, t]) => (
              <button
                type="button"
                role="tab"
                key={k}
                aria-selected={ed.tab === k}
                className={ed.tab === k ? 'on' : ''}
                onClick={() => setEd({ ...ed, tab: k })}
              >
                {t}
              </button>
            ))}
          </div>

          <div className={'tab-body' + (ed.tab === 'details' ? '' : ' hidden')}>
            <label>
              Task
              <input
                list="task-names"
                value={ed.name}
                onChange={e => setName(e.target.value)}
                placeholder="What did you work on?"
                required
                autoFocus
              />
            </label>
            <div className="field">
              <span>Category</span>
              <CatPicker cats={cats} value={ed.label} onChange={label => setEd({ ...ed, label })} />
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

          {ed.tab === 'notes' && (
            <div className="tab-body notes">
              <textarea
                autoFocus
                value={ed.notes}
                onChange={e => setEd({ ...ed, notes: e.target.value })}
                maxLength={20000}
                placeholder={`Anything about ${ed.name || 'this task'}… links, decisions, what's left to do.`}
              />
              <span className="muted tiny">Shared by every stint of this task · saved with Save</span>
            </div>
          )}

          <div className="actions">
            {ed.bar && (
              <button type="button" className="danger" onClick={onDelete} disabled={ed.busy}>
                Delete
              </button>
            )}
            <span className="spacer" />
            <button className="primary" disabled={ed.busy}>
              {ed.busy ? <span className="spin" /> : 'Save'}
            </button>
          </div>
        </form>
      )}
      <datalist id="task-names">
        {tasks.map(t => (
          <option key={t.name} value={t.name} />
        ))}
      </datalist>
    </dialog>
  );
}
