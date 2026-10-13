'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { deleteCategory, load, removeBar, saveBar, saveCategory } from '../actions';
import { addDays, addWork, diff, isWork, monday, pack, toBars, today as todayStr, wdiff, workRange } from '../../lib/days';
import { ALL_HUES, catVar, freeHue, MAX_CATS, striped } from '../../lib/palette';
import CategoryDelete from './CategoryDelete';
import EditorDialog from './EditorDialog';
import Sidebar from './Sidebar';
import Timeline, { C, GAP, PAD, ROW, SEAM, stripOf } from './Timeline';
import TopBar from './TopBar';
import './board.css';
import './editor.css';
import './sidebar.css';

const keyOf = b => `b${b.taskId}-${b.from}`;
const oldOf = b => ({ taskId: b.taskId, from: b.from, to: b.to });
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const sum = list => list.reduce((s, h) => s + (h || 0), 0);
const typing = e => e.target.closest?.('input, textarea, select');

// The board page: owns the data, the continuous week scroll, drag/click handling and every save.
// Drawing lives in TopBar / Timeline / Sidebar / EditorDialog / CategoryDelete.
export default function Board({ user }) {
  const [week, setWeek] = useState(null); // Monday of the anchor week; set on mount so server/client "today" can't mismatch
  const [month, setMonth] = useState(null);
  const [data, setData] = useState({ logs: [], tasks: [], cats: [] });
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(false);
  const [drag, setDrag] = useState(null);
  const [ed, setEd] = useState(null);
  const [toast, setToast] = useState(null);
  const [focus, setFocus] = useState(null); // category whose bars stay bright ('' = Others)
  const [hover, setHover] = useState(null);
  const [arrive, setArrive] = useState(null);
  const [sureCat, setSureCat] = useState(null);
  const [ci, setCi] = useState(0); // whole days the view is scrolled from the anchor week's Wednesday
  const boardRef = useRef(null);
  const drumRef = useRef(null);
  const trackRef = useRef(null);
  const headRef = useRef(null); // header strip track
  const bodyRef = useRef(null); // vertically scrolling body
  const colW = useRef(0);
  const dlg = useRef(null);
  const req = useRef(0);
  const lastClick = useRef(null);
  const press = useRef(null); // pointer is down but hasn't moved to another day yet
  // Scroll position, in day columns from the anchor week's Wednesday. Lives outside React for smooth 60fps.
  const off = useRef(0);
  const target = useRef(0);
  const raf = useRef(null);
  const snapTimer = useRef(null);
  const pending = useRef(null); // position change to apply together with a new anchor week
  const anchoring = useRef(false);
  const goal = useRef(null); // week that rapid 'next/previous' presses are heading for
  const weekRef = useRef(null);
  weekRef.current = week;

  const say = (msg, bad) => {
    const id = Date.now();
    setToast({ id, msg, bad });
    setTimeout(() => setToast(t => (t?.id === id ? null : t)), 2600);
  };

  // ---------- continuous week scroll ----------

  // Move both tracks (one transform each) and pin each week label to the left edge while its week is on screen.
  function place(v) {
    const w = colW.current,
      track = trackRef.current,
      head = headRef.current;
    if (!track || !head) return;
    track.style.transform = head.style.transform = `translate3d(${-v * w}px, 0, 0)`;
    for (const el of head.querySelectorAll('.wk')) {
      const left = (Number(el.dataset.i) - v + 3) * w + SEAM; // week rows start after the weekend seam
      el.firstChild.style.translate = `${Math.max(0, Math.min(-left, 5 * w - SEAM - 150))}px 0`;
    }
  }
  function applyOff(v) {
    off.current = v;
    place(v);
    const r = Math.round(v);
    setCi(c => (c === r ? c : r));
  }
  // Ease toward `target`; re-anchor a week over once we've scrolled a full week.
  function tick() {
    const o = off.current,
      t = target.current;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const n = reduced || Math.abs(t - o) < 0.002 ? t : o + (t - o) * 0.16;
    applyOff(n);
    raf.current = n === t ? null : requestAnimationFrame(tick);
    if (Math.abs(n) >= 5 - 1e-6 && !anchoring.current && !goal.current) reanchor(Math.sign(n)); // a pending jump owns the next load
  }
  const kick = () => {
    raf.current ??= requestAnimationFrame(tick);
  };

  async function reanchor(dir) {
    anchoring.current = true;
    const n = req.current;
    const w = addDays(weekRef.current, 7 * dir);
    try {
      const d = await load(addDays(w, -14), addDays(w, 20));
      if (n !== req.current) return void (anchoring.current = false); // a jump started meanwhile; it wins
      pending.current = { shift: -5 * dir };
      setWeek(w);
      setData(d);
    } catch (err) {
      anchoring.current = false;
      say(err.message || 'Could not load', true);
    }
  }

  // Show week w (its Mon–Fri centred): nearby weeks glide there, far ones load and slide in from that side.
  async function go(w) {
    const cur = weekRef.current;
    const weeks = cur ? diff(cur, w) / 7 : 0;
    if (cur && Math.abs(weeks) <= 1) {
      target.current = 5 * weeks;
      return kick();
    }
    const n = ++req.current; // ignore responses from older clicks
    setLoading(true);
    try {
      const d = await load(addDays(w, -14), addDays(w, 20));
      if (n !== req.current) return;
      if (w === goal.current) goal.current = null;
      if (cur) pending.current = { set: weeks > 0 ? -5 : 5 };
      setWeek(w);
      setData(d);
      setVersion(v => v + 1);
    } catch (err) {
      say(err.message || 'Could not load', true);
    } finally {
      if (n === req.current) setLoading(false);
    }
  }
  // Reload data without moving.
  async function refresh() {
    const w = weekRef.current;
    const n = ++req.current;
    const d = await load(addDays(w, -14), addDays(w, 20));
    if (n === req.current && w === weekRef.current) {
      setData(d);
      setVersion(v => v + 1);
    }
  }
  // ‹ › and arrow keys: glide when the next week is already loaded; otherwise (or when pressed rapidly)
  // aim at a target week that each press moves by one, and load-and-slide there.
  const nudge = days => {
    const t = Math.round(target.current) + days;
    if (!goal.current && Math.abs(t) <= 7 && !anchoring.current) {
      target.current = t;
      return kick();
    }
    goal.current = addDays(goal.current ?? addDays(weekRef.current, 7 * Math.round(target.current / 5)), 7 * Math.sign(days));
    go(goal.current);
  };
  const thisWeek = () => go(monday(todayStr()));

  useEffect(() => {
    thisWeek();
  }, []);

  // Column width follows the board width (7 columns on screen).
  useLayoutEffect(() => {
    const el = drumRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      colW.current = el.clientWidth / 7;
      boardRef.current.style.setProperty('--w', colW.current + 'px');
      place(off.current);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [!!week]);

  useLayoutEffect(() => place(off.current)); // re-pin week labels after React re-renders the strip

  // New anchor week: shift the position in the same frame so nothing jumps.
  useLayoutEffect(() => {
    const p = pending.current;
    pending.current = null;
    if (!p) return;
    if ('set' in p) {
      off.current = p.set;
      target.current = 0;
    } else {
      off.current += p.shift;
      target.current += p.shift;
    }
    applyOff(off.current);
    anchoring.current = false;
    kick();
  }, [week]);

  // Mouse wheel / trackpad: days; Shift + wheel: up and down through the rows.
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const onWheel = e => {
      if (e.ctrlKey) return; // pinch-zoom
      e.preventDefault();
      if (e.shiftKey) return void (bodyRef.current.scrollTop += e.deltaY || e.deltaX);
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      const px = e.deltaMode === 1 ? d * 40 : d;
      const lim = anchoring.current ? 7.5 : 9;
      target.current = clamp(target.current + px / (el.clientWidth / 7), -lim, lim);
      kick();
      clearTimeout(snapTimer.current);
      snapTimer.current = setTimeout(() => {
        target.current = Math.round(target.current);
        kick();
      }, 140);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [!!week]);

  useEffect(() => {
    const onKey = e => {
      if (!week || dlg.current?.open || typing(e)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'ArrowLeft') nudge(-5);
      else if (e.key === 'ArrowRight') nudge(5);
      else if (e.key === 't') thisWeek();
      else if (e.key === 'n') (e.preventDefault(), newForToday());
      else if (e.key === 'Escape') setFocus(null);
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  });

  // The week in the middle of the screen drives the mini calendar's month.
  const shown = week && monday(stripOf(week)[C + ci]);
  useEffect(() => {
    if (shown) setMonth(addDays(shown, 3).slice(0, 8) + '01');
  }, [shown]);

  const toastEl = toast && (
    <div key={toast.id} className={'toast' + (toast.bad ? ' bad' : '')}>
      {toast.msg}
    </div>
  );
  if (!week)
    return (
      <div className="splash">
        <span className="logo big" />
        {toastEl}
      </div>
    );

  // ---------- what's on screen ----------

  const today = todayStr();
  const strip = stripOf(week);
  const vis = strip.slice(C + ci - 3, C + ci + 4); // the 7 days on screen
  const inVis = d => d >= vis[0] && d <= vis[6];
  // One category order for the board groups and the sidebar: most hours on screen first (the number the sidebar shows), then A–Z.
  const shownHours = {};
  for (const l of data.logs) if (inVis(l.day)) shownHours[l.label] = (shownHours[l.label] || 0) + (l.hours || 0);
  const cats = [...data.cats].sort((a, b) => (shownHours[b.name] || 0) - (shownHours[a.name] || 0) || a.name.localeCompare(b.name));
  const noted = new Set(data.tasks.filter(t => t.notes).map(t => t.name));
  const catHue = Object.fromEntries(data.cats.map(c => [c.name, c.hue]));
  const colorOf = label => (label in catHue ? catVar(catHue[label]) : 'var(--cat-none)');
  const stripeOf = label => label in catHue && striped(catHue[label]);

  // Bars; the one open in the editor takes the editor's dates/category so it regroups live.
  const bars = toBars(data.logs).map(b => {
    const k = keyOf(b);
    return ed?.bar && keyOf(ed.bar) === k ? { ...b, key: k, from: ed.from, to: ed.to, label: ed.label } : { ...b, key: k };
  });
  const range0 = drag && !drag.move ? [drag.fixed, drag.cur].sort() : null;
  const draft =
    ed && !ed.bar
      ? { key: 'draft', name: ed.name, label: ed.label, from: ed.from, to: ed.to, days: [], y: ed.y }
      : drag && !drag.bar
        ? { key: 'draft', name: '', label: '', from: range0[0], to: range0[1], days: [], y: drag.y }
        : null;

  // Pack what's on screen (grouped by category); off-screen bars get their own packing.
  const front = bars.filter(b => b.to >= vis[0] && b.from <= vis[6]);
  const back = bars.filter(b => !front.includes(b));
  const order = cats.map(c => c.name);
  const lanes = pack(draft?.label ? [...front, draft] : front, order);
  pack(back, order);
  const groups = Math.max(0, ...front.map(b => b.group + 1), draft?.label ? draft.group + 1 : 0);
  const topOf = b => PAD + b.lane * ROW + b.group * GAP;
  const height = PAD + lanes * ROW + groups * GAP + 140;

  // How far a dragged bar moves (in workdays), kept on screen.
  const moveBy = d => clamp(wdiff(d.origin, d.cur), Math.min(0, -wdiff(vis[0], d.bar.from)), Math.max(0, wdiff(d.bar.to, vis[6])));

  // Everything drawn: per bar, which days it covers right now and the hours per day.
  const drawn = [...bars, ...(draft ? [draft] : [])].map(b => {
    let from = b.from,
      to = b.to,
      hourAt;
    const byDay = Object.fromEntries(b.days.map(l => [l.day, l.hours]));
    if (drag?.key === b.key && drag.move) {
      const s = moveBy(drag);
      from = addWork(b.from, s);
      to = addWork(b.to, s);
      hourAt = d => byDay[addWork(d, -s)];
    } else if (drag?.key === b.key) {
      [from, to] = [drag.fixed, drag.cur].sort();
      hourAt = d => byDay[d];
    } else if (ed && (ed.bar ? keyOf(ed.bar) === b.key : b.key === 'draft')) {
      hourAt = d => (ed.hours[d] === '' || ed.hours[d] === undefined ? byDay[d] : Number(ed.hours[d]));
    } else {
      hourAt = d => byDay[d];
    }
    return {
      ...b,
      from,
      to,
      hourAt,
      days: workRange(from, to),
      top: b.key === 'draft' && !b.label ? b.y : topOf(b), // an uncategorised draft stays where it was drawn
      color: colorOf(b.label),
      striped: stripeOf(b.label),
      live: drag?.key === b.key || (ed?.bar && keyOf(ed.bar) === b.key),
      dim: focus !== null && b.label !== focus && b.key !== 'draft',
      arrive: arrive && b.name === arrive.name && b.from === arrive.from,
    };
  });

  // ---------- pointer: drag to create / move / resize, click to highlight, double-click to edit ----------

  const dayAt = e => document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-day]')?.dataset.day;

  function down(e) {
    if (e.button !== 0) return;
    const d = dayAt(e);
    if (!d) return;
    const el = e.target.closest('[data-bar]');
    const bar = el && bars.find(b => b.key === el.dataset.bar);
    const edge = e.target.dataset.edge;
    if (bar && !edge) press.current = { bar, key: bar.key, move: true, origin: d, cur: d };
    else if (bar) press.current = { bar, key: bar.key, fixed: edge === 'l' ? bar.to : bar.from, cur: d };
    else press.current = { fixed: d, cur: d, y: Math.max(PAD, e.clientY - drumRef.current.getBoundingClientRect().top - 20) };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function move(e) {
    const cur = drag ?? press.current;
    if (!cur) {
      const k = e.target.closest?.('[data-bar]')?.dataset.bar ?? null;
      if (k !== hover) setHover(k);
      return;
    }
    const d = dayAt(e);
    if (d && d !== cur.cur && inVis(d)) {
      press.current = null;
      setDrag({ ...cur, cur: d });
    }
  }
  function up(e) {
    const d = drag ?? press.current;
    press.current = null;
    if (!d) return;
    if (drag) setDrag(null);
    if (d.move) {
      const s = moveBy(d);
      return s ? moveBar(d.bar, s) : clickBar(d.bar, e.timeStamp);
    }
    if (!d.bar && d.fixed === d.cur && focus !== null) return setFocus(null); // click on empty space clears the highlight
    const [a, z] = [d.fixed, d.cur].sort();
    openEditor(d.bar, a, z, { y: d.y });
  }

  // One click highlights the bar's category; a second click within 400ms opens the editor.
  // The highlight waits 260ms so a double-click usually never shows it; if it already did, it's undone.
  function clickBar(b, now) {
    const last = lastClick.current;
    clearTimeout(last?.timer);
    if (last?.key === b.key && now - last.t < 400) {
      lastClick.current = null;
      if (last.applied) setFocus(last.prev);
      return openEditor(b, b.from, b.to);
    }
    const entry = { key: b.key, t: now, prev: focus };
    entry.timer = setTimeout(() => {
      entry.applied = true;
      setFocus(f => (f === b.label ? null : b.label));
    }, 260);
    lastClick.current = entry;
  }

  // ---------- actions ----------

  async function run(fn, msg) {
    try {
      await fn();
      await refresh();
      if (dlg.current.open) dlg.current.close();
      say(msg);
    } catch (err) {
      setEd(e => e && { ...e, busy: false });
      say(err.message || 'Something went wrong', true);
      refresh();
    }
  }

  function moveBar(b, s) {
    const days = b.days.map(l => ({ day: addWork(l.day, s), hours: l.hours }));
    // Optimistic: leave the bar where it was dropped, then sync.
    setData(d => ({
      ...d,
      logs: d.logs
        .map(l => (l.id === b.taskId && l.day >= b.from && l.day <= b.to && isWork(l.day) ? { ...l, day: addWork(l.day, s) } : l))
        .sort((x, y) => x.day.localeCompare(y.day)),
    }));
    run(() => saveBar({ name: b.name, label: b.label, days, old: oldOf(b) }), 'Moved');
  }

  function openEditor(bar, from, to, preset = {}) {
    const hours = {};
    for (const d of workRange(from, to)) hours[d] = data.logs.find(l => l.id === bar?.taskId && l.day === d)?.hours ?? '';
    const name = bar?.name ?? preset.name ?? '';
    const label = bar?.label ?? preset.label ?? (focus || '');
    const notes = data.tasks.find(t => t.name === name)?.notes ?? '';
    setEd({ bar, from, to, name, label, hours, notes, tab: 'details', y: preset.y ?? PAD });
  }
  // N / "New": the same editor, for today (or the next weekday on a weekend).
  function newForToday(preset) {
    const t = todayStr();
    const d = isWork(t) ? t : addWork(t, 1);
    openEditor(null, d, d, preset);
  }

  const save = e => {
    e.preventDefault();
    const list = workRange(ed.from, ed.to).map(day => ({ day, hours: ed.hours[day] === '' ? null : Number(ed.hours[day]) }));
    if (!list.length) return say('Pick at least one weekday', true);
    const { bar, name } = ed;
    setEd({ ...ed, busy: true });
    if (!bar && !ed.label) setArrive({ name: name.trim(), from: list[0].day, y: ed.y });
    setTimeout(() => setArrive(null), 1500);
    run(() => saveBar({ name, label: ed.label, days: list, old: bar && oldOf(bar), notes: ed.notes }), 'Saved');
  };
  const del = () => {
    setEd({ ...ed, busy: true });
    run(() => removeBar(oldOf(ed.bar)), 'Deleted');
  };

  const addCat = name => {
    const hue = freeHue(data.cats.map(c => c.hue));
    if (hue === null) return say(`Up to ${MAX_CATS} categories`, true);
    run(() => saveCategory(name, hue), 'Category added');
  };
  const recolor = c => {
    const hue = freeHue(
      data.cats.filter(x => x !== c).map(x => x.hue),
      ALL_HUES.indexOf(c.hue),
    );
    if (hue === null || hue === c.hue) return say('Every colour is in use', true);
    run(() => saveCategory(c.name, hue), 'Colour changed');
  };
  const dropCat = name => {
    if (focus === name) setFocus(null);
    run(() => deleteCategory(name), 'Category removed');
  };

  const dayTotal = d => sum(data.logs.filter(l => l.day === d).map(l => l.hours));
  const [midFrom, midTo] = [vis[1], vis[5]]; // the five full-brightness days in the middle
  const catTotal = c => sum(data.logs.filter(l => l.label === c && inVis(l.day)).map(l => l.hours));

  return (
    <main className="app">
      <TopBar
        user={user}
        loading={loading}
        from={midFrom}
        to={midTo}
        total={sum(data.logs.filter(l => l.day >= midFrom && l.day <= midTo).map(l => l.hours))}
        onPrev={() => nudge(-5)}
        onToday={thisWeek}
        onNext={() => nudge(5)}
        onNew={() => newForToday()}
      />

      <div className="layout">
        <Timeline
          refs={{ board: boardRef, head: headRef, body: bodyRef, drum: drumRef, track: trackRef }}
          strip={strip}
          today={today}
          vis={vis}
          drawn={drawn}
          height={height}
          hover={hover}
          arrive={arrive}
          noted={noted}
          dayTotal={dayTotal}
          dragging={!!drag}
          handlers={{
            onPointerDown: down,
            onPointerMove: move,
            onPointerUp: up,
            onPointerLeave: () => !drag && setHover(null),
            onPointerCancel: () => {
              press.current = null;
              setDrag(null);
            },
          }}
        />
        <Sidebar
          calendar={{ month: month ?? addDays(shown, 3).slice(0, 8) + '01', setMonth, from: midFrom, to: midTo, onPick: go, version }}
          logs={data.logs}
          today={today}
          colorOf={colorOf}
          onLog={(name, label) => newForToday({ name, label })}
          categories={{ cats, total: catTotal, focus, setFocus, onAdd: addCat, onRecolor: recolor, onAskDelete: setSureCat }}
        />
      </div>

      <CategoryDelete
        name={sureCat}
        count={sureCat ? data.tasks.filter(t => t.label === sureCat).length : 0}
        onClose={() => setSureCat(null)}
        onDelete={dropCat}
      />
      <EditorDialog
        dlgRef={dlg}
        ed={ed}
        setEd={setEd}
        tasks={data.tasks}
        cats={data.cats}
        logs={data.logs}
        colorOf={colorOf}
        onSave={save}
        onDelete={del}
        say={say}
      />
      {toastEl}
    </main>
  );
}
