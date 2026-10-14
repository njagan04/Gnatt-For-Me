'use client';
import { useEffect, useRef } from 'react';
import { fmt } from '../../lib/days';
import { STATUS_LABEL } from './Timeline';

// "Ending soon": shown on opening the board when to-do / in-progress tasks end on the next workday.
// due = { day, tasks }; clicking a task opens its bar in the editor.
export default function DueSoon({ due, colorOf, onClose, onOpen }) {
  const ref = useRef(null);
  useEffect(() => {
    if (due && !ref.current.open) ref.current.showModal();
  }, [due]);

  return (
    <dialog ref={ref} className="confirm" onClose={onClose} onPointerDown={e => e.target === ref.current && ref.current.close()}>
      {due && (
        <div className="confirm-body">
          <span className="confirm-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="13" r="8" />
              <path d="M12 9v4l2.5 2.5M9 2h6" />
            </svg>
          </span>
          <h2>Take a look at these</h2>
          <p className="muted">
            {due.tasks.length === 1 ? 'This task ends' : `${due.tasks.length} tasks end`}{' '}
            {fmt(due.day, { weekday: 'long', day: 'numeric', month: 'short' })} and {due.tasks.length === 1 ? "isn't" : "aren't"} finished
            yet.
          </p>
          <ul className="today-list recent due-list">
            {due.tasks.map(t => (
              <li key={t.name}>
                <button
                  onClick={() => {
                    ref.current.close();
                    onOpen(t.name, due.day);
                  }}
                  title="Open it"
                >
                  <i className="dot-s" style={{ '--c': colorOf(t.label) }} />
                  <span>{t.name}</span>
                  <small>{STATUS_LABEL[t.status]}</small>
                </button>
              </li>
            ))}
          </ul>
          <div className="actions">
            <button className="primary" onClick={() => ref.current.close()} autoFocus>
              Got it
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
