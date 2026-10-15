'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { addWork, fmt, isWork, today, toBars, workRange } from '../../../lib/days';
import { catColor, MAX_CATS } from '../../../lib/palette';
import { deleteCategory, deleteTask, renameCategory, saveBar, saveCategory, setStatus, taskLogs } from '../../actions';
import CategoryDelete, { Trash } from '../../board/CategoryDelete';
import CategoryDialog from '../../board/CategoryDialog';
import EditorDialog from '../../board/EditorDialog';
import { STATUS_LABEL } from '../../board/Timeline';

const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const short = d => fmt(d, { day: 'numeric', month: 'short' });
const span = t => (!t.first ? 'No days logged' : t.first === t.last ? short(t.first) : `${short(t.first)} – ${short(t.last)}`);

// Settings → Categories, full width: one card per category (recolour via the swatch, rename by editing the name, delete),
// with a progress bar, opening (one at a time) onto its tasks in five columns: To do · In progress · On hold · Completed · Cancelled.
// Drag a task to another column to change its status; click it to open its latest stint in the board's editor.
export default function CategorySettings({ cats, tasks }) {
  const router = useRouter();
  const [edit, setEdit] = useState(null); // { cat? }: the category card that's open (new, or recolouring cat)
  const [sure, setSure] = useState(null); // category asked to delete
  const [err, setErr] = useState('');
  const [openCat, setOpenCat] = useState(() => cats[0]?.name ?? ''); // the one category showing its tasks ('' = Others)
  const toggle = name => setOpenCat(o => (o === name ? null : name));
  const [over, setOver] = useState({}); // name → status dropped just now, shown until the refreshed list arrives
  useEffect(() => setOver({}), [tasks]);
  const [ed, setEd] = useState(null); // the board's editor, open on a task
  const [logs, setLogs] = useState([]); // that task's logged days
  const dlg = useRef(null);
  const run = async fn => {
    setErr('');
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setErr(e.message || 'Something went wrong');
    }
  };
  const shown = tasks.map(t => (over[t.name] ? { ...t, status: over[t.name] } : t));
  const others = shown.filter(t => !cats.some(c => c.name === t.label));
  const colorOf = label => catColor(cats.find(c => c.name === label));

  const drop = (name, status) => {
    if (!name || shown.find(t => t.name === name)?.status === status) return;
    setOver(o => ({ ...o, [name]: status }));
    run(() => setStatus(name, status));
  };
  // Same editor as the board: the task's latest stint, or (never logged, or a new task) an entry for today.
  async function openTask(t) {
    setErr('');
    try {
      const list = t.first ? await taskLogs(t.name) : [];
      const bar = toBars(list).at(-1);
      const d = isWork(today()) ? today() : addWork(today(), 1);
      const [from, to] = bar ? [bar.from, bar.to] : [d, d];
      const hours = Object.fromEntries(workRange(from, to).map(x => [x, list.find(l => l.day === x)?.hours ?? '']));
      setLogs(list);
      setEd({ bar, from, to, orig: t.name, name: t.name, label: t.label, hours, notes: t.notes, status: t.status, pinned: t.pinned, y: 0 });
    } catch (e) {
      setErr(e.message || 'Could not open the task');
    }
  }
  const closeAndRefresh = async fn => {
    setEd(e => ({ ...e, busy: true }));
    try {
      await fn();
      dlg.current.close();
      router.refresh();
    } catch (e) {
      setEd(x => x && { ...x, busy: false });
      setErr(e.message || 'Something went wrong');
    }
  };
  const oldOf = b => b && { taskId: b.taskId, from: b.from, to: b.to };
  const save = e => {
    e.preventDefault();
    const days = workRange(ed.from, ed.to).map(day => ({ day, hours: ed.hours[day] === '' ? null : Number(ed.hours[day]) }));
    if (!days.length) return setErr('Pick at least one weekday');
    const { name, label, notes, status, pinned, bar } = ed;
    closeAndRefresh(() => saveBar({ name, label, days, old: oldOf(bar), notes, status, pinned }));
  };

  return (
    <div className="cs">
      <header className="cs-top">
        <div>
          <h2>Categories</h2>
          <p className="muted">
            Group your tasks and journal notes · {cats.length} of {MAX_CATS} colours used · tasks without a category live in Others
          </p>
        </div>
        {cats.length < MAX_CATS && (
          <button className="primary" onClick={() => setEdit({})}>
            + New category
          </button>
        )}
      </header>
      {err && <p className="err">{err}</p>}
      {!cats.length && <p className="muted cs-empty">No categories yet. Add one to group your tasks and notes.</p>}

      {cats.map(c => (
        <Card
          key={c.name}
          color={catColor(c)}
          name={c.name}
          tasks={shown.filter(t => t.label === c.name)}
          meta={`${+c.hours.toFixed(1)}h · ${plural(c.notes, 'note')}`}
          onTask={openTask}
          onNew={() => openTask({ name: '', label: c.name, status: 'todo', notes: '', pinned: false })}
          onDrop={drop}
          open={openCat === c.name}
          onToggle={() => toggle(c.name)}
          swatch={
            <button
              className="cs-swatch"
              title="Change colour"
              aria-label={`Change colour of ${c.name}`}
              onClick={() => setEdit({ cat: c })}
            />
          }
          title={
            <input
              key={c.name}
              className="cs-name"
              defaultValue={c.name}
              maxLength={40}
              aria-label="Category name"
              title="Rename"
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
          }
          action={
            <button className="cs-del" onClick={() => setSure(c.name)} title="Delete category" aria-label={`Delete ${c.name}`}>
              <Trash size={15} />
            </button>
          }
        />
      ))}
      {others.length > 0 && (
        <Card
          color="var(--cat-none)"
          name="Others"
          tasks={others}
          onTask={openTask}
          onNew={() => openTask({ name: '', label: '', status: 'todo', notes: '', pinned: false })}
          onDrop={drop}
          open={openCat === ''}
          onToggle={() => toggle('')}
          swatch={<span className="cs-swatch" aria-hidden="true" />}
          title={<span className="cs-name">Others</span>}
        />
      )}

      <CategoryDialog
        edit={edit}
        cats={cats}
        onClose={() => setEdit(null)}
        onSave={(name, hue, color) => run(() => saveCategory(edit.cat ? edit.cat.name : name, hue, color))}
      />
      <EditorDialog
        dlgRef={dlg}
        ed={ed}
        setEd={setEd}
        tasks={tasks}
        cats={cats}
        logs={logs}
        colorOf={colorOf}
        onSave={save}
        onDelete={() => confirm(`Delete “${ed.orig}” and every day logged on it?`) && closeAndRefresh(() => deleteTask(ed.orig))}
        deleteLabel="Delete task"
        onNewCat={(name, hue, color) => run(() => saveCategory(name, hue, color)).then(() => setEd(e => e && { ...e, label: name }))}
        say={setErr}
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

// One category: a header (fold arrow, swatch, name, how many tasks sit in each status), a progress bar, and its tasks by status.
// The bar is shaded by status, solid (completed) to faint (to do); cancelled tasks don't count towards done.
const SHADE = { todo: 16, doing: 62, hold: 36, done: 100, cancelled: 0 };
function Card({ color, name, tasks, meta, open, onToggle, onTask, onNew, onDrop, swatch, title, action }) {
  const [hot, setHot] = useState(null); // column a task is being dragged over
  const by = Object.fromEntries(Object.keys(STATUS_LABEL).map(k => [k, tasks.filter(t => t.status === k)]));
  const live = tasks.length - by.cancelled.length;
  const pct = live ? Math.round((by.done.length / live) * 100) : 0;
  return (
    <section className={'cs-cat' + (open ? ' open' : '')} style={{ '--c': color }}>
      <div className="cs-head">
        <button
          className="cs-open"
          onClick={onToggle}
          aria-expanded={open}
          aria-label={`Show tasks in ${name}`}
          title={open ? 'Fold' : 'Show its tasks'}
        >
          ›
        </button>
        {swatch}
        {title}
        <div
          className="cs-progress"
          title={`${by.done.length} of ${live} tasks completed${by.cancelled.length ? ` · ${by.cancelled.length} cancelled not counted` : ''}`}
        >
          <div
            className="cs-track"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${name}: ${pct}% completed`}
          >
            {['done', 'doing', 'hold', 'todo', 'cancelled'].map(k =>
              by[k].length ? <span key={k} className={'cs-seg ' + k} style={{ flexGrow: by[k].length, '--p': SHADE[k] + '%' }} /> : null,
            )}
          </div>
          <b>{pct}%</b>
          <span className="muted">completed</span>
        </div>
        <span className="cs-tally">
          {Object.entries(by).map(([k, list]) => (
            <span key={k} className={list.length ? '' : 'zero'}>
              <i className={'cs-key ' + k} style={{ '--p': SHADE[k] + '%' }} />
              {STATUS_LABEL[k]} <b>{list.length}</b>
            </span>
          ))}
        </span>
        <span className="cs-meta">
          {plural(tasks.length, 'task')}
          {meta && ` · ${meta}`}
        </span>
        {action ?? <span className="cs-del" aria-hidden="true" />}
      </div>
      {open && (
        <div className="cs-board">
          {Object.entries(by).map(([k, list]) => (
            <div
              key={k}
              className={'cs-col ' + k + (hot === k ? ' hot' : '')}
              onDragOver={e => {
                e.preventDefault();
                if (hot !== k) setHot(k);
              }}
              onDragLeave={e => !e.currentTarget.contains(e.relatedTarget) && setHot(null)}
              onDrop={e => {
                e.preventDefault();
                setHot(null);
                onDrop(e.dataTransfer.getData('text/plain'), k);
              }}
            >
              <div className="cs-col-head">
                {STATUS_LABEL[k]}
                <span className="cs-count">{list.length}</span>
              </div>
              {list.length ? (
                list.map(t => (
                  <button
                    key={t.name}
                    className="cs-task"
                    draggable
                    onDragStart={e => {
                      e.dataTransfer.setData('text/plain', t.name);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onClick={() => onTask(t)}
                    title="Click to open · drag to another column to change its status"
                  >
                    <b title={t.name}>{t.name}</b>
                    {t.notes && <p>{t.notes}</p>}
                    <small>{span(t)}</small>
                  </button>
                ))
              ) : (
                <span className="cs-none">None</span>
              )}
              {k === 'todo' && (
                <button className="cs-add" onClick={onNew}>
                  ＋ New task
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
