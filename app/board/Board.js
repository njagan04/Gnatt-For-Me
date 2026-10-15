'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteCategory, load, pinTask, removeBar, saveBar, saveCategory } from '../actions';
import { addDays, addWork, diff, isWork, monday, pack, toBars, today as todayStr, wdiff, workRange } from '../../lib/days';
import { catColor, freeHue, MAX_CATS, striped } from '../../lib/palette';
import { zoom } from '../../lib/zoom';
import CategoryDelete from './CategoryDelete';
import DueSoon from './DueSoon';
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
export default function Board({ user, picture }) {
  const router = useRouter();
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
  const [due, setDue] = useState(null); // unfinished tasks ending on the next workday, shown once per visit
  const [ci, setCi] = useState(0); // whole days the view is scrolled from the anchor week's Wednesday
  const boardRef = useRef(null);
  const drumRef = useRef(null);
  const trackRef = useRef(null);
  const headRef = useRef(null); // header strip track
  const bodyRef = useRef(null); // vertically scrolling body
  const colW = useRef(0);
  const shift = useRef(0); // px: centres the 7-day strip when the board is too narrow to show all 7
  const [span, setSpan] = useState([1, 5]); // which of the 7 columns count as "in view" (the middle five, or fewer when narrow)
  const [sideOpen, setSideOpen] = useState(false); // narrow windows: the sidebar is a slide-in panel
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

  const MIN_COL = 130; // px: narrowest a day column gets before the board shows fewer days

  // Move both tracks (one transform each) and pin each week label to the left edge while its week is on screen.
  // Offsets snap to whole device pixels: a fractional translate on a will-change layer renders the text blurry.
  // A CSS px is devicePixelRatio × page zoom device pixels (the site renders at 90%, globals.css).
  function place(v) {
    const w = colW.current,
      track = trackRef.current,
      head = headRef.current;
    if (!track || !head) return;
    const dp = devicePixelRatio * zoom();
    const px = x => Math.round(x * dp) / dp;
    track.style.transform = head.style.transform = `translate3d(${px(-v * w + shift.current)}px, 0, 0)`;
    for (const el of head.querySelectorAll('.wk')) {
      const left = (Number(el.dataset.i) - v + 3) * w + SEAM + shift.current; // week rows start after the weekend seam
      el.firstChild.style.translate = `${px(Math.max(0, Math.min(-left, 5 * w - SEAM - 150)))}px 0`;
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
    if (!raf.current) boardRef.current?.classList.remove('moving'); // at rest: drop the layer so text is crisp
    if (Math.abs(n) >= 5 - 1e-6 && !anchoring.current && !goal.current) reanchor(Math.sign(n)); // a pending jump owns the next load
  }
  const kick = () => {
    boardRef.current?.classList.add('moving');
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

  // Column width follows the board width: 7 columns, but never narrower than MIN_COL. In a narrower window fewer
  // days show (the strip stays centred on the middle day) instead of every day getting squeezed.
  useLayoutEffect(() => {
    const el = drumRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      colW.current = Math.max(MIN_COL, el.clientWidth / 7);
      shift.current = Math.min(0, el.clientWidth / 2 - 3.5 * colW.current);
      // columns entirely on screen (at rest), kept within the middle five
      const k0 = Math.max(1, Math.ceil((-shift.current - 1) / colW.current));
      const k1 = Math.max(k0, Math.min(5, Math.floor((el.clientWidth - shift.current + 1) / colW.current) - 1));
      setSpan(s => (s[0] === k0 && s[1] === k1 ? s : [k0, k1]));
      boardRef.current.style.setProperty('--w', colW.current + 'px');
      // the dimmed preview column at each edge: only the part of it still on screen
      boardRef.current.style.setProperty('--edge', Math.max(0, colW.current + shift.current) + 'px');
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
      target.current = clamp(target.current + px / colW.current, -lim, lim);
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
      else if (e.key === 'Escape') (setFocus(null), setSideOpen(false));
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  });

  // On opening the site (first load, once per browser session): to-do / in-progress tasks whose last day is the next workday.
  useEffect(() => {
    if (version !== 1) return;
    const t = todayStr();
    try {
      if (sessionStorage.getItem('due-seen') === t) return;
      sessionStorage.setItem('due-seen', t);
    } catch {}
    const next = addWork(t, 1);
    const last = {};
    for (const l of data.logs) if (!(l.day <= last[l.name])) last[l.name] = l.day; // logs come sorted, but don't rely on it
    const open = new Set(data.tasks.filter(x => x.status === 'todo' || x.status === 'doing').map(x => x.name));
    const list = Object.keys(last).filter(n => last[n] === next && open.has(n));
    if (list.length) setDue({ day: next, tasks: data.tasks.filter(x => list.includes(x.name)) });
  }, [version]);

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
  const statusOf = Object.fromEntries(data.tasks.map(t => [t.name, t.status]));
  const catBy = Object.fromEntries(data.cats.map(c => [c.name, c]));
  const colorOf = label => catColor(catBy[label]);
  const stripeOf = label => label in catBy && striped(catBy[label].hue);

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
    if (drag?.key === b.key && !drag.move) {
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
      status: b.key === 'draft' ? null : statusOf[b.name],
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
    if (bar && !edge) press.current = { bar, key: bar.key, move: true, origin: d, cur: d, x0: e.clientX };
    else if (bar) press.current = { bar, key: bar.key, fixed: edge === 'l' ? bar.to : bar.from, cur: d };
    else press.current = { fixed: d, cur: d, y: Math.max(PAD, (e.clientY - drumRef.current.getBoundingClientRect().top) / zoom() - 20) };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  // A bar being moved follows the pointer pixel for pixel (styles set directly, no re-render per frame);
  // on release it snaps to the day under the pointer, or glides back if it didn't change day.
  function slide(key, dx) {
    for (const el of drumRef.current.querySelectorAll(`[data-bar="${key}"], [data-label="${key}"]`)) {
      el.style.transition = dx === null ? '' : 'none';
      el.style.translate = dx === null ? '' : `${dx}px -4px`; // lifted like a hovered bar
      el.style.zIndex = dx === null ? '' : el.dataset.label ? 7 : 6;
    }
  }
  function move(e) {
    const cur = drag ?? press.current;
    if (!cur) {
      const k = e.target.closest?.('[data-bar]')?.dataset.bar ?? null;
      if (k !== hover) setHover(k);
      return;
    }
    if (cur.move && (drag || Math.abs(e.clientX - cur.x0) > 3)) slide(cur.key, (e.clientX - cur.x0) / zoom());
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
    if (d.move) slide(d.key, null);
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
    for (const d of workRange(from, to))
      hours[d] = data.logs.find(l => l.id === bar?.taskId && l.day === d)?.hours ?? preset.hours?.[d] ?? '';
    const name = bar?.name ?? preset.name ?? '';
    const label = bar?.label ?? preset.label ?? (focus || '');
    const known = data.tasks.find(t => t.name === name);
    const notes = known?.notes ?? '';
    const status = preset.status ?? known?.status ?? 'doing'; // logging hours on something new means you're on it
    const pinned = known?.pinned ?? false;
    const priority = known?.priority ?? 'medium';
    setEd({ bar, from, to, name, label, hours, notes, status, pinned, priority, y: preset.y ?? PAD, autofill: !!preset.autofill });
  }
  // "Pick up again": jump to this week and open today's entry for that task, filled in (its usual hours),
  // or its existing bar if today is already logged.
  function pickUp(name, label) {
    thisWeek();
    const t = todayStr();
    const d = isWork(t) ? t : addWork(t, 1);
    const bar = bars.find(b => b.name === name && b.from <= d && b.to >= d);
    if (bar) return openEditor(bar, bar.from, bar.to);
    const hs = data.logs.filter(l => l.name === name && l.hours > 0).map(l => l.hours);
    const usual = hs.length ? hs.sort((a, b) => a - b)[Math.floor(hs.length / 2)] : ''; // median day
    openEditor(null, d, d, { name, label, hours: { [d]: usual }, status: 'doing', autofill: true }); // picked up = back in progress
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
    run(
      () =>
        saveBar({
          name,
          label: ed.label,
          days: list,
          old: bar && oldOf(bar),
          notes: ed.notes,
          status: ed.status,
          pinned: ed.pinned,
          priority: ed.priority,
        }),
      'Saved',
    );
  };
  const del = () => {
    setEd({ ...ed, busy: true });
    run(() => removeBar(oldOf(ed.bar)), 'Deleted');
  };

  // Colours come from the palette card in the sidebar (each category has its own; the server double-checks).
  const addCat = (name, hue, color) => {
    if (data.cats.length >= MAX_CATS) return say(`Up to ${MAX_CATS} categories`, true);
    run(() => saveCategory(name, hue ?? freeHue(data.cats.map(c => c.hue)), color), 'Category added');
  };
  const unpin = name => run(() => pinTask(name, false), 'Removed from Pick up again');
  // From the due-soon card: open the bar that ends on that day.
  const openDue = (name, day) => {
    const b = bars.find(x => x.name === name && x.to === day);
    if (b) openEditor(b, b.from, b.to);
  };
  // "+ New category" in the editor's dropdown: create it and select it, keeping the editor open.
  const addCatFromEditor = async (name, hue, color) => {
    try {
      await saveCategory(name, hue, color);
      await refresh();
      setEd(e => e && { ...e, label: name });
      say('Category added');
    } catch (err) {
      say(err.message || 'Could not add the category', true);
    }
  };
  const recolor = (c, hue, color) => run(() => saveCategory(c.name, hue, color), 'Colour changed');
  const dropCat = name => {
    if (focus === name) setFocus(null);
    run(() => deleteCategory(name), 'Category removed');
  };

  const dayTotal = d => sum(data.logs.filter(l => l.day === d).map(l => l.hours));
  const [midFrom, midTo] = [vis[span[0]], vis[span[1]]]; // the days fully on screen (the middle five when wide)
  const catTotal = c => sum(data.logs.filter(l => l.label === c && inVis(l.day)).map(l => l.hours));

  return (
    <main className="app">
      <TopBar
        user={user}
        picture={picture}
        loading={loading}
        from={midFrom}
        to={midTo}
        total={sum(data.logs.filter(l => l.day >= midFrom && l.day <= midTo).map(l => l.hours))}
        onPrev={() => nudge(-5)}
        onToday={thisWeek}
        onNext={() => nudge(5)}
        onNew={() => newForToday()}
        onSide={() => setSideOpen(o => !o)}
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
          onOpenDay={d => router.push('/insights?tab=journal&day=' + d)}
          handlers={{
            onPointerDown: down,
            onPointerMove: move,
            onPointerUp: up,
            onPointerLeave: () => !drag && setHover(null),
            onPointerCancel: () => {
              const d = drag ?? press.current;
              if (d?.move) slide(d.key, null);
              press.current = null;
              setDrag(null);
            },
          }}
        />
        <Sidebar
          open={sideOpen}
          today={today}
          calendar={{
            month: month ?? addDays(shown, 3).slice(0, 8) + '01',
            setMonth,
            from: midFrom,
            to: midTo,
            onPick: w => (go(w), setSideOpen(false)),
            version,
          }}
          tasks={data.tasks}
          colorOf={colorOf}
          onLog={pickUp}
          onUnpin={unpin}
          categories={{ cats, total: catTotal, focus, setFocus, onAdd: addCat, onRecolor: recolor, onAskDelete: setSureCat }}
        />
      </div>

      <div className={'side-shade' + (sideOpen ? ' open' : '')} onClick={() => setSideOpen(false)} aria-hidden="true" />
      <CategoryDelete
        name={sureCat}
        count={sureCat ? data.tasks.filter(t => t.label === sureCat).length : 0}
        onClose={() => setSureCat(null)}
        onDelete={dropCat}
      />
      <DueSoon due={due} colorOf={colorOf} onClose={() => setDue(null)} onOpen={openDue} />
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
        onNewCat={addCatFromEditor}
        say={say}
      />
      {toastEl}
    </main>
  );
}
