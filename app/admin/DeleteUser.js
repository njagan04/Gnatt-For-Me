'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteUserData } from '../actions';
import { Trash } from '../board/CategoryDelete';

// Per-row "Delete data": confirms in a small card over a blurred screen, then removes everything the person stored.
export default function DeleteUser({ email, tasks }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const router = useRouter();

  async function confirm() {
    setBusy(true);
    try {
      await deleteUserData(email);
      ref.current.close();
      router.refresh();
    } catch (e) {
      setErr(e.message || 'Could not delete');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        className="admin-del"
        onClick={() => ref.current.showModal()}
        title={`Delete ${email}'s data`}
        aria-label={`Delete ${email}'s data`}
      >
        <Trash size={15} />
      </button>
      <dialog ref={ref} className="confirm" onPointerDown={e => e.target === ref.current && ref.current.close()}>
        <div className="confirm-body">
          <span className="confirm-icon" aria-hidden="true">
            <Trash size={22} />
          </span>
          <h2>Delete {email}?</h2>
          <p className="muted">
            Removes their {tasks} task{tasks === 1 ? '' : 's'}, every logged day, their categories and their user record. This can&apos;t be
            undone. If they sign in again they start with an empty board.
          </p>
          {err && <p className="err">{err}</p>}
          <div className="actions">
            <button className="quiet" onClick={() => ref.current.close()} autoFocus>
              Cancel
            </button>
            <button className="danger solid" onClick={confirm} disabled={busy}>
              {busy ? 'Deleting…' : 'Delete everything'}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
