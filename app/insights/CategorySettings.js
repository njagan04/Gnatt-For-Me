'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { catColor, MAX_CATS } from '../../lib/palette';
import { deleteCategory, renameCategory, saveCategory } from '../actions';
import CategoryDelete, { Trash } from '../board/CategoryDelete';
import CategoryDialog from '../board/CategoryDialog';

// Settings → Categories: recolour (click the swatch), rename (edit the name), delete, or add one (name + colour).
export default function CategorySettings({ cats }) {
  const router = useRouter();
  const [edit, setEdit] = useState(null); // { cat? }: the category card that's open (new, or recolouring cat)
  const [sure, setSure] = useState(null); // category asked to delete
  const [err, setErr] = useState('');
  const run = async fn => {
    setErr('');
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setErr(e.message || 'Something went wrong');
    }
  };
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

  return (
    <div className="set-card cs">
      {cats.length ? (
        <ul className="cs-list">
          {cats.map(c => (
            <li key={c.name} style={{ '--c': catColor(c) }}>
              <div className="cs-row">
                <button
                  className="cs-swatch"
                  title="Change colour"
                  aria-label={`Change colour of ${c.name}`}
                  onClick={() => setEdit({ cat: c })}
                />
                <input
                  key={c.name}
                  className="cs-name"
                  defaultValue={c.name}
                  maxLength={40}
                  aria-label="Category name"
                  onBlur={e => {
                    const to = e.target.value.trim();
                    if (to && to !== c.name) run(() => renameCategory(c.name, to));
                    else e.target.value = c.name;
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') e.target.blur();
                    if (e.key === 'Escape') ((e.target.value = c.name), e.target.blur());
                  }}
                />
                <span className="cs-meta">
                  {plural(c.tasks, 'task')} · {+c.hours.toFixed(1)}h · {plural(c.notes, 'note')}
                </span>
                <button className="cs-del" onClick={() => setSure(c.name)} title="Delete category" aria-label={`Delete ${c.name}`}>
                  <Trash size={15} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted cs-empty">No categories yet. Add one to group your tasks and notes.</p>
      )}
      {err && <p className="err">{err}</p>}

      <div className="cs-foot">
        <span className="muted tiny">
          {cats.length} of {MAX_CATS} · tasks without a category live in Others
        </span>
        {cats.length < MAX_CATS && (
          <button className="primary" onClick={() => setEdit({})}>
            + New category
          </button>
        )}
      </div>

      <CategoryDialog
        edit={edit}
        cats={cats}
        onClose={() => setEdit(null)}
        onSave={(name, hue, color) => run(() => saveCategory(edit.cat ? edit.cat.name : name, hue, color))}
      />
      <CategoryDelete
        name={sure}
        count={cats.find(c => c.name === sure)?.tasks ?? 0}
        onClose={() => setSure(null)}
        onDelete={name => run(() => deleteCategory(name))}
      />
    </div>
  );
}
