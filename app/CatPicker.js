'use client';
import { useEffect, useRef, useState } from 'react';
import { catVar } from '../lib/palette';

// Searchable dropdown over the categories made in the sidebar. No free typing.
export default function CatPicker({ cats, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [hi, setHi] = useState(0);
  const box = useRef(null);

  const opts = [...(q ? [] : [{ name: '' }]), ...cats.filter(c => c.name.toLowerCase().includes(q.toLowerCase()))];
  const current = cats.find(c => c.name === value);

  useEffect(() => {
    if (!open) return;
    const off = e => !box.current.contains(e.target) && setOpen(false);
    document.addEventListener('pointerdown', off);
    return () => document.removeEventListener('pointerdown', off);
  }, [open]);

  function pick(c) {
    onChange(c.name);
    setOpen(false);
    setQ('');
  }
  function key(e) {
    if (e.key === 'ArrowDown') setHi(Math.min(hi + 1, opts.length - 1));
    else if (e.key === 'ArrowUp') setHi(Math.max(hi - 1, 0));
    else if (e.key === 'Enter') opts[hi] && pick(opts[hi]);
    else if (e.key === 'Escape') setOpen(false); // close the list, not the dialog
    else return;
    e.preventDefault();
  }

  const label = c => (c?.name ? <><span className="dot-s" style={{ '--c': catVar(c.hue) }} />{c.name}</> : <span className="muted">Others</span>);

  return (
    <div className="picker" ref={box}>
      <button type="button" className={'picker-btn' + (open ? ' open' : '')} onClick={() => { setOpen(!open); setHi(0); }}>
        {label(current ?? (value ? { name: value } : null))}
        <span className="caret">▾</span>
      </button>
      {open && (
        <div className="picker-pop">
          <input autoFocus value={q} onChange={e => { setQ(e.target.value); setHi(0); }} onKeyDown={key} placeholder="Search categories…" />
          <ul>
            {opts.map((c, i) => (
              <li key={c.name || '-'} className={(i === hi ? 'hi' : '') + (c.name === value ? ' sel' : '')} onPointerEnter={() => setHi(i)} onClick={() => pick(c)}>
                {label(c)}
                {c.name === value && <span className="tick">✓</span>}
              </li>
            ))}
            {!opts.length && <li className="none muted">No match. Create it in the sidebar.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
