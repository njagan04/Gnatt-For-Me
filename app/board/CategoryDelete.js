'use client';
import { useEffect, useRef } from 'react';

const Trash = ({ size }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
  </svg>
);
export { Trash };

// "Delete category?" — a small card over a blurred screen. Its tasks move to Others.
export default function CategoryDelete({ name, count, onClose, onDelete }) {
  const ref = useRef(null);
  useEffect(() => {
    if (name && !ref.current.open) ref.current.showModal();
  }, [name]);

  const confirm = () => {
    ref.current.close();
    onDelete(name);
  };
  return (
    <dialog ref={ref} className="confirm" onClose={onClose} onPointerDown={e => e.target === ref.current && ref.current.close()}>
      {name && (
        <div className="confirm-body">
          <span className="confirm-icon" aria-hidden="true">
            <Trash size={22} />
          </span>
          <h2>Delete “{name}”?</h2>
          <p className="muted">
            {count ? (
              <>
                {count} task{count === 1 ? '' : 's'} will move to <b>Others</b>. Their days and hours stay as they are.
              </>
            ) : (
              <>No tasks use it. Nothing else changes.</>
            )}
          </p>
          <div className="actions">
            <button className="quiet" onClick={() => ref.current.close()} autoFocus>
              Cancel
            </button>
            <button className="danger solid" onClick={confirm}>
              Delete category
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
