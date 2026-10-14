'use client';
import { useEffect, useRef, useState } from 'react';
import { CAT_HUES, SHADES } from '../../lib/palette';

// "New category" / "Colour for …": a small card like the app's other dialogs. Name + an Excel-style colour grid
// (8 families across, base on top, lighter tints and darker shades below). A family another category uses is
// greyed out. The chosen colour's code is shown and saved. onSave(name, hue, color).
// edit = { cat } to recolour, {} for a new one, or { name } for a new one with its name filled in.
export default function CategoryDialog({ edit, cats, onSave, onClose }) {
  const ref = useRef(null);
  const [name, setName] = useState('');
  const [pick, setPick] = useState(null); // { col, color }
  const fresh = edit && !edit.cat;
  const owner = col => cats.find(c => c.hue % 1000 === CAT_HUES[col] && c !== edit?.cat);

  useEffect(() => {
    if (!edit) return;
    const col = edit.cat ? CAT_HUES.indexOf(edit.cat.hue % 1000) : CAT_HUES.findIndex((_, i) => !owner(i));
    setName(edit.cat?.name ?? edit.name ?? '');
    setPick(col < 0 ? null : { col, color: edit.cat?.color || SHADES[col][0] });
    if (!ref.current.open) ref.current.showModal();
  }, [edit]);

  const ok = name.trim() && pick;
  function save(e) {
    e.preventDefault();
    if (!ok) return;
    ref.current.close();
    onSave(name.trim(), CAT_HUES[pick.col], pick.color);
  }

  return (
    <dialog ref={ref} className="confirm cat-dlg" onClose={onClose} onPointerDown={e => e.target === ref.current && ref.current.close()}>
      {edit && (
        <form onSubmit={save} className="confirm-body">
          <h2>{fresh ? 'New category' : 'Category colour'}</h2>
          <input
            className="cat-dlg-name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Name, e.g. Client work"
            maxLength={40}
            readOnly={!fresh}
            autoFocus={fresh}
          />
          <div className="xl" role="grid" aria-label="Colours">
            {[0, 1, 2, 3, 4, 5].map(row => (
              <div key={row} className={'xl-row' + (row === 0 ? ' base' : '')} role="row">
                {SHADES.map((col, ci) => {
                  const c = col[row];
                  const taken = owner(ci);
                  const on = pick?.color === c;
                  return (
                    <button
                      type="button"
                      key={c}
                      role="gridcell"
                      className={'xl-sw' + (on ? ' on' : '')}
                      style={{ background: c }}
                      disabled={!!taken}
                      title={taken ? `Used by ${taken.name}` : c.toUpperCase()}
                      aria-label={taken ? `${c} (used by ${taken.name})` : c}
                      onClick={() => setPick({ col: ci, color: c })}
                    />
                  );
                })}
              </div>
            ))}
          </div>
          <div className="cat-dlg-preview">
            <span className="cat-dlg-chip" style={{ '--c': pick?.color || 'var(--cat-none)' }}>
              <i />
              {name.trim() || 'Category'}
            </span>
            <code>{pick ? pick.color.toUpperCase() : 'Pick a colour'}</code>
          </div>
          <div className="actions">
            <button type="button" className="quiet" onClick={() => ref.current.close()}>
              Cancel
            </button>
            <button className="primary" disabled={!ok}>
              {fresh ? 'Create' : 'Save'}
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}
