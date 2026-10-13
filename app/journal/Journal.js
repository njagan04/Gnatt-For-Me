'use client';
import { useEffect, useRef, useState } from 'react';
import { addDays, fmt, today as todayStr } from '../../lib/days';
import { catColor } from '../../lib/palette';
import { cleanHtml } from '../../lib/journal';
import { STATUS_LABEL } from '../board/Timeline';
import MiniCal from '../board/MiniCal';
import { getDay, notesByCategory, pageDays, saveDay } from './actions';
import '../board/sidebar.css';
import './journal.css';

// A starting point for an empty page.
const TEMPLATE =
  '<h2>Done today</h2><ul><li><br></li></ul><h2>Blockers</h2><ul><li><br></li></ul><h2>Tomorrow</h2><ul class="todo"><li><br></li></ul>';
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));
const textOf = html =>
  new DOMParser()
    .parseFromString(html || '', 'text/html')
    .body.textContent.replace(/\s+/g, ' ')
    .trim();
const blank = html => !textOf(html) && !/<(li|hr)\b/i.test(html || '');

// Daily log, OneNote-style: a canvas per day where you click anywhere to write. Each note can be dragged by its
// bar, resized from its right edge and tagged with a category (right-click). The rail on the right has the
// calendar and the notes by category. Saves itself a moment after you stop.
export default function Journal({ initialDay }) {
  const [day, setDay] = useState(null); // set on mount: "today" must be the browser's day, not the server's
  const [page, setPage] = useState(null); // { logs, cats } for the open day
  const [notes, setNotes] = useState([]);
  const [fresh, setFresh] = useState(null); // id of a note to focus once it mounts
  const [flash, setFlash] = useState(null); // id of a note to highlight (from "find by category")
  const [menu, setMenu] = useState(null); // { x, y, id?, at? }
  const [state, setState] = useState('idle');
  const [savedAt, setSavedAt] = useState(null);
  const [month, setMonth] = useState(null);
  const [marks, setMarks] = useState({ days: [], counts: {} });
  const [findCat, setFindCat] = useState(null);
  const [found, setFound] = useState(null);
  const canvas = useRef(null);
  const live = useRef([]); // the notes as typed (the DOM is the source of truth for text while editing)
  const timer = useRef(null);
  const dirty = useRef(null);

  useEffect(() => {
    const d = /^\d{4}-\d{2}-\d{2}$/.test(initialDay || '') ? initialDay : todayStr();
    setDay(d);
    setMonth(d.slice(0, 8) + '01');
  }, []);

  useEffect(() => {
    if (!day) return;
    let on = true;
    setPage(null);
    getDay(day).then(
      r => {
        if (!on) return;
        const list = r.notes.map(n => ({ ...n, html: cleanHtml(n.html) }));
        live.current = list;
        setNotes(list);
        setPage(r);
        setSavedAt(r.updatedAt);
        setState('idle');
      },
      () => on && setState('error'),
    );
    history.replaceState(null, '', `/insights?tab=journal&day=${day}`);
    return () => (on = false);
  }, [day]);

  const refreshMarks = () => {
    if (!month) return;
    pageDays(addDays(month, -7), addDays(month, 45)).then(setMarks, () => {}); // covers the calendar's 6 weeks
  };
  useEffect(refreshMarks, [month]);
  useEffect(() => {
    if (findCat === null) return setFound(null);
    notesByCategory(findCat).then(setFound, () => setFound([]));
  }, [findCat]);

  // ---------- saving ----------
  async function flush() {
    clearTimeout(timer.current);
    const d = dirty.current;
    if (!d) return;
    dirty.current = null;
    const list = live.current.filter(n => !blank(n.html)).map(n => ({ ...n, html: cleanHtml(n.html) }));
    setState('saving');
    try {
      const r = await saveDay(d, list);
      setSavedAt(r.updatedAt);
      setState('saved');
      refreshMarks();
      if (findCat !== null) notesByCategory(findCat).then(setFound, () => {});
    } catch {
      dirty.current = d;
      setState('error');
    }
  }
  function touch() {
    dirty.current = day;
    setState('typing');
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, 800);
  }
  useEffect(() => {
    const out = () => flush();
    addEventListener('pagehide', out);
    return () => removeEventListener('pagehide', out);
  });

  // ---------- notes ----------
  function update(id, patch, rerender = true) {
    live.current = live.current.map(n => (n.id === id ? { ...n, ...patch } : n));
    if (rerender) setNotes(live.current);
    touch();
  }
  function add(x, y, html = '', cat = '') {
    const n = { id: uid(), x: Math.max(0, Math.round(x)), y: Math.max(0, Math.round(y)), w: 380, html, cat };
    live.current = [...live.current, n];
    setNotes(live.current);
    setFresh(n.id);
    if (html) touch();
  }
  function remove(id) {
    live.current = live.current.filter(n => n.id !== id);
    setNotes(live.current);
    touch();
  }
  // An empty note disappears when you leave it (like clicking away in OneNote).
  function left(id, html) {
    if (blank(html)) {
      live.current = live.current.filter(n => n.id !== id);
      setNotes(live.current);
      if (dirty.current) flush();
    } else flush();
  }
  const at = e => {
    const r = canvas.current.getBoundingClientRect();
    return [e.clientX - r.left - 10, e.clientY - r.top - 14];
  };
  function canvasDown(e) {
    if (e.target !== canvas.current || e.button !== 0) return;
    e.preventDefault(); // keep focus logic simple: the new note takes it
    add(...at(e));
  }
  function canvasMenu(e) {
    if (e.target !== canvas.current) return;
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY, at: at(e) });
  }

  async function go(d, flashId = null) {
    if (d === day) return setFlash(flashId);
    await flush();
    setFlash(flashId);
    setDay(d);
    if (d.slice(0, 7) !== month.slice(0, 7)) setMonth(d.slice(0, 8) + '01');
  }

  // ---------- formatting (acts on the note being edited; buttons don't steal focus) ----------
  function cmd(name, arg) {
    document.execCommand(name, false, arg);
  }
  function heading(tag) {
    const cur = document.queryCommandValue('formatBlock').toLowerCase();
    cmd('formatBlock', cur === tag ? 'p' : tag);
  }
  function checklist() {
    cmd('insertUnorderedList');
    const ul = window.getSelection()?.anchorNode?.parentElement?.closest('.jn-text ul');
    if (ul) {
      ul.classList.toggle('todo');
      ul.closest('.jn-text').dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  const today = day && todayStr();
  const cats = page?.cats ?? [];
  const catOf = name => (name ? cats.find(c => c.name === name) : null);
  const colorOf = name => catColor(catOf(name));
  const total = page ? page.logs.reduce((s, l) => s + (l.hours || 0), 0) : 0;
  const below = Math.max(0, ...notes.map(n => n.y + 420)); // the canvas fills the view and grows past the lowest note
  const status =
    state === 'saving' || state === 'typing'
      ? 'Saving…'
      : state === 'error'
        ? 'Not saved, retrying when you type'
        : savedAt
          ? 'Saved ' + new Date(savedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
          : 'Nothing written yet';

  return (
    <div className="jr">
      <section className="jr-main">
        <header className="jr-head">
          <div className="jr-title">
            <h1>{day ? fmt(day, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : ' '}</h1>
            <div className="jr-nav">
              <button className="icon sm" onClick={() => go(addDays(day, -1))} aria-label="Previous day" disabled={!day}>
                ‹
              </button>
              <button className="icon sm" onClick={() => go(addDays(day, 1))} aria-label="Next day" disabled={!day}>
                ›
              </button>
              {day && day !== today && (
                <button className="link" onClick={() => go(today)}>
                  Today
                </button>
              )}
            </div>
            <span className="spacer" />
            <span className={'jr-state ' + state}>{status}</span>
          </div>
          <div className="jr-worked">
            {!page ? (
              <span className="skel jr-skel" />
            ) : page.logs.length ? (
              <>
                <span className="muted tiny">On the board · {+total.toFixed(1)}h</span>
                {page.logs.map(l => (
                  <span key={l.name} className="jr-chip" style={{ '--c': colorOf(l.label) }} title={STATUS_LABEL[l.status]}>
                    <i className={'st ' + l.status} />
                    {l.name}
                    {l.hours ? <b>{l.hours}h</b> : null}
                  </span>
                ))}
              </>
            ) : (
              <span className="muted tiny">Nothing logged on the board this day.</span>
            )}
          </div>
        </header>

        <div className="jr-tools" role="toolbar" aria-label="Formatting" onMouseDown={e => e.preventDefault()}>
          <button onClick={() => cmd('bold')} title="Bold (Ctrl+B)">
            <b>B</b>
          </button>
          <button onClick={() => cmd('italic')} title="Italic (Ctrl+I)">
            <i>I</i>
          </button>
          <button onClick={() => cmd('underline')} title="Underline (Ctrl+U)">
            <u>U</u>
          </button>
          <button onClick={() => cmd('strikeThrough')} title="Strikethrough">
            <s>S</s>
          </button>
          <span className="jr-sep" />
          <button onClick={() => heading('h2')} title="Heading">
            H1
          </button>
          <button onClick={() => heading('h3')} title="Subheading">
            H2
          </button>
          <span className="jr-sep" />
          <button onClick={() => cmd('insertUnorderedList')} title="Bulleted list">
            •&nbsp;List
          </button>
          <button onClick={() => cmd('insertOrderedList')} title="Numbered list">
            1.&nbsp;List
          </button>
          <button onClick={checklist} title="Checklist">
            ☐&nbsp;To-do
          </button>
          <button onClick={() => cmd('formatBlock', 'blockquote')} title="Quote">
            ❝
          </button>
          <span className="spacer" />
          <span className="muted tiny jr-hint">Click anywhere to write · right-click a note to tag it</span>
        </div>

        <div className="jr-scroll">
          <div
            ref={canvas}
            className={'jr-canvas' + (page ? '' : ' loading')}
            style={{ height: `max(100%, ${below}px)` }}
            onPointerDown={canvasDown}
            onContextMenu={canvasMenu}
          >
            {page && !notes.length && (
              <div className="jr-empty">
                <b>Click anywhere to start writing</b>
                <span className="muted">Each note can be moved, resized and tagged with a category.</span>
                <button className="link" onPointerDown={e => (e.stopPropagation(), e.preventDefault(), add(40, 30, TEMPLATE))}>
                  ✦ Start from the daily template
                </button>
              </div>
            )}
            {page &&
              notes.map(n => (
                <Note
                  key={day + n.id}
                  n={n}
                  cat={catOf(n.cat)}
                  color={colorOf(n.cat)}
                  focus={fresh === n.id}
                  flash={flash === n.id}
                  dim={findCat !== null && (n.cat || '') !== findCat}
                  onText={html => update(n.id, { html }, false)}
                  onMove={patch => update(n.id, patch)}
                  onLeave={html => left(n.id, html)}
                  onMenu={e => setMenu({ x: e.clientX, y: e.clientY, id: n.id })}
                />
              ))}
          </div>
        </div>
      </section>

      <aside className="side jr-rail">
        <section className="card">
          {month && <MiniCal month={month} setMonth={setMonth} today={today} day={day} marks={marks.days} onPick={go} />}
        </section>

        {/* notes by category: pick one to highlight its notes here and list them on other days */}
        <section className="card">
          <div className="card-head">
            <b>Notes by category</b>
            {findCat !== null && (
              <button className="link" onClick={() => setFindCat(null)}>
                show all
              </button>
            )}
          </div>
          <ul className="jr-catlist">
            {[...cats, ...(marks.counts[''] ? [{ name: '', hue: null }] : [])].map(c => {
              const on = findCat === c.name;
              return (
                <li key={c.name || '—'} className={on ? 'on' : ''} style={{ '--c': catColor(c.name ? c : null) }}>
                  <button onClick={() => setFindCat(on ? null : c.name)}>
                    <i className="dot-s" />
                    <span>{c.name || 'Untagged'}</span>
                    <small>{marks.counts[c.name] || 0}</small>
                  </button>
                  {on && found && (
                    <ul className="jr-hits">
                      {found.length ? (
                        found.map(f => (
                          <li key={f.day + f.id}>
                            <button className={f.day === day ? 'here' : ''} onClick={() => go(f.day, f.id)}>
                              <b>{fmt(f.day, { weekday: 'short', day: 'numeric', month: 'short' })}</b>
                              <span>{textOf(f.html) || 'Checklist'}</span>
                            </button>
                          </li>
                        ))
                      ) : (
                        <li className="muted tiny">No notes yet. Right-click a note to tag it.</li>
                      )}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </aside>

      {menu && (
        <Menu menu={menu} onClose={() => setMenu(null)}>
          {menu.id ? (
            <>
              <p className="jr-menu-label">Category</p>
              {[...cats, { name: '', hue: null }].map(c => {
                const on = (live.current.find(n => n.id === menu.id)?.cat || '') === c.name;
                return (
                  <button
                    key={c.name || '—'}
                    className={on ? 'on' : ''}
                    style={{ '--c': catColor(c.name ? c : null) }}
                    onClick={() => {
                      update(menu.id, { cat: c.name });
                      setMenu(null);
                    }}
                  >
                    <i className="dot-s" />
                    {c.name || 'No category'}
                    {on && <span className="jr-tick">✓</span>}
                  </button>
                );
              })}
              <hr />
              <button
                className="danger"
                onClick={() => {
                  remove(menu.id);
                  setMenu(null);
                }}
              >
                Delete note
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  add(...menu.at);
                  setMenu(null);
                }}
              >
                New note here
              </button>
              <button
                onClick={() => {
                  add(...menu.at, TEMPLATE);
                  setMenu(null);
                }}
              >
                Daily template here
              </button>
            </>
          )}
        </Menu>
      )}
    </div>
  );
}

// One free-placed note. Its text lives in the DOM while you type (React only sets it when the note mounts).
function Note({ n, cat, color, focus, flash, dim, onText, onMove, onLeave, onMenu }) {
  const ref = useRef(null);
  const box = useRef(null);
  useEffect(() => {
    ref.current.innerHTML = n.html; // already cleaned
    if (flash) box.current.scrollIntoView({ block: 'center', behavior: 'smooth' });
    if (focus) {
      ref.current.focus({ preventScroll: true }); // a note appears where you clicked; the page must not move
      const end = document.createRange();
      end.selectNodeContents(ref.current);
      end.collapse(false);
      getSelection().removeAllRanges();
      getSelection().addRange(end);
    }
  }, []);

  // Drag by the bar, resize from the right edge.
  function grab(e, mode) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const s = { x: e.clientX, y: e.clientY, nx: n.x, ny: n.y, w: n.w };
    const mv = ev =>
      onMove(
        mode === 'move'
          ? { x: Math.max(0, s.nx + ev.clientX - s.x), y: Math.max(0, s.ny + ev.clientY - s.y) }
          : { w: Math.min(1400, Math.max(160, s.w + ev.clientX - s.x)) },
      );
    const up = () => {
      removeEventListener('pointermove', mv);
      removeEventListener('pointerup', up);
    };
    addEventListener('pointermove', mv);
    addEventListener('pointerup', up);
  }
  // Clicking a checklist item's box ticks it.
  function click(e) {
    const li = e.target.closest?.('ul.todo > li');
    if (!li || e.clientX - li.getBoundingClientRect().left > 22) return;
    li.toggleAttribute('data-done');
    onText(ref.current.innerHTML);
  }
  function paste(e) {
    e.preventDefault();
    document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
  }

  return (
    <div
      ref={box}
      className={'jn' + (cat ? ' tagged' : '') + (flash ? ' flash' : '') + (dim ? ' dim' : '')}
      style={{ left: n.x, top: n.y, width: n.w, '--c': color }}
      onContextMenu={e => {
        e.preventDefault();
        onMenu(e);
      }}
    >
      <div className="jn-bar" onPointerDown={e => grab(e, 'move')} title="Drag to move · right-click for category">
        {cat && <span className="jn-cat">{cat.name}</span>}
      </div>
      <div
        ref={ref}
        className="jn-text"
        contentEditable
        suppressContentEditableWarning
        spellCheck
        onInput={() => onText(ref.current.innerHTML)}
        onBlur={() => onLeave(ref.current.innerHTML)}
        onClick={click}
        onPaste={paste}
      />
      <span className="jn-size" onPointerDown={e => grab(e, 'size')} title="Drag to resize" />
    </div>
  );
}

// Right-click menu, kept on screen; closes on outside click, Escape or scroll.
function Menu({ menu, onClose, children }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ left: menu.x, top: menu.y });
  useEffect(() => {
    const r = ref.current.getBoundingClientRect();
    setPos({ left: Math.min(menu.x, innerWidth - r.width - 8), top: Math.min(menu.y, innerHeight - r.height - 8) });
    const close = e =>
      (e.type !== 'pointerdown' || !ref.current.contains(e.target)) && (e.type !== 'keydown' || e.key === 'Escape') && onClose();
    addEventListener('pointerdown', close);
    addEventListener('keydown', close);
    addEventListener('scroll', close, true);
    return () => {
      removeEventListener('pointerdown', close);
      removeEventListener('keydown', close);
      removeEventListener('scroll', close, true);
    };
  }, [menu]);
  return (
    <div ref={ref} className="jr-menu" style={pos} role="menu">
      {children}
    </div>
  );
}
