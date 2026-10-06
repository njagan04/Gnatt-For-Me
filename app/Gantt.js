'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { deleteCategory, load, logout, removeBar, saveBar, saveCategory, stats } from './actions';
import { addDays, addWork, diff, isWork, isoWeek, monday, pack, toBars, today as todayStr, wdiff, workRange, fmt } from '../lib/days';
import CatPicker from './CatPicker';
import MiniCal from './MiniCal';
import ThemeSwitch from './Theme';
import { ALL_HUES, catVar, freeHue, MAX_CATS, striped } from '../lib/palette';
import { summarize } from '../lib/stats';
import HoursEditor from './HoursEditor';

const MAX_DAYS = 45; // workdays per bar
const SEAM = 26; // px, weekend seam (matches --seam)
const PAD = 18, ROW = 48, GAP = 30; // px: top padding, lane height, gap between category groups (header sits above the body)
const C = 12; // strip index of the anchor week's Wednesday (strip = 5 weeks of workdays)
const stripOf = w => workRange(addDays(w, -14), addDays(w, 20)); // 25 workdays, anchor Mon at index 10

const keyOf = b => `b${b.taskId}-${b.from}`;
const oldOf = b => ({ taskId: b.taskId, from: b.from, to: b.to });
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const sum = list => list.reduce((s, h) => s + (h || 0), 0);
const typing = e => e.target.closest?.('input, textarea, select');

export default function Gantt({ user }) {
  const [week, setWeek] = useState(null); // Monday of the selected week; set on mount so server/client "today" can't mismatch
  const [month, setMonth] = useState(null);
  const [data, setData] = useState({ logs: [], tasks: [], cats: [] });
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(false);
  const [drag, setDrag] = useState(null);
  const [ed, setEd] = useState(null);
  const [toast, setToast] = useState(null);
  const [focus, setFocus] = useState(null); // category whose bars stay bright ('' = uncategorised)
  const [hover, setHover] = useState(null);
  const [menu, setMenu] = useState(false); // account menu
  const [acct, setAcct] = useState(null); // account menu analytics
  const [arrive, setArrive] = useState(null);
  const [newCat, setNewCat] = useState('');
  const [sureCat, setSureCat] = useState(null);
  const [ci, setCi] = useState(0); // whole days the view is scrolled from the anchor week's Wednesday
  const boardRef = useRef(null);
  const drumRef = useRef(null);
  const trackRef = useRef(null);
  const headRef = useRef(null); // header strip track
  const bodyRef = useRef(null); // vertically scrolling body
  const colW = useRef(0);
  const dlg = useRef(null);
  const catDlg = useRef(null); // "delete category?" modal
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

  // Move the strip (one transform) and pin each week label to the left edge while its week is on screen.
  function place(v) {
    const w = colW.current, track = trackRef.current, head = headRef.current;
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
  // Ease the strip toward `target`; re-anchor a week over once we've scrolled a full week.
  function tick() {
    const o = off.current, t = target.current;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const n = reduced || Math.abs(t - o) < 0.002 ? t : o + (t - o) * 0.16;
    applyOff(n);
    raf.current = n === t ? null : requestAnimationFrame(tick);
    if (Math.abs(n) >= 5 - 1e-6 && !anchoring.current && !goal.current) reanchor(Math.sign(n)); // a pending jump owns the next load
  }
  const kick = () => { raf.current ??= requestAnimationFrame(tick); };

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
    if (!goal.current && Math.abs(t) <= 7 && !anchoring.current) { target.current = t; return kick(); }
    goal.current = addDays(goal.current ?? addDays(weekRef.current, 7 * Math.round(target.current / 5)), 7 * Math.sign(days));
    go(goal.current);
  };
  const thisWeek = () => go(monday(todayStr()));

  useEffect(() => { thisWeek(); }, []);
  useEffect(() => { if (ed && !dlg.current.open) dlg.current.showModal(); }, [ed]);
  useEffect(() => { if (sureCat && !catDlg.current.open) catDlg.current.showModal(); }, [sureCat]);
  useEffect(() => {
    if (!menu) return;
    const t = todayStr();
    stats(t).then(r => setAcct(summarize(r.days, t)), () => {});
    const close = e => (e.key === 'Escape' || (e.type === 'pointerdown' && !e.target.closest('.acct'))) && setMenu(false);
    addEventListener('pointerdown', close);
    addEventListener('keydown', close);
    return () => { removeEventListener('pointerdown', close); removeEventListener('keydown', close); };
  }, [menu]);

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

  // Mouse wheel / trackpad scrolls the days continuously, then settles on a whole day.
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    // Mouse wheel / trackpad: days; Shift + wheel: up and down through the rows.
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
      snapTimer.current = setTimeout(() => { target.current = Math.round(target.current); kick(); }, 140);
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
      else if (e.key === 'n') e.preventDefault(), newForToday();
      else if (e.key === 'Escape') setFocus(null);
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  });

  // The week in the middle of the screen drives the header, totals and mini calendar.
  const shown = week && monday(stripOf(week)[C + ci]);
  useEffect(() => { if (shown) setMonth(addDays(shown, 3).slice(0, 8) + '01'); }, [shown]);

  const toastEl = toast && (
    <div key={toast.id} className={'toast' + (toast.bad ? ' bad' : '')}>
      {toast.msg}
    </div>
  );
  if (!week) return <div className="splash"><span className="logo big" />{toastEl}</div>;

  const today = todayStr();
  const strip = stripOf(week);
  const vis = strip.slice(C + ci - 3, C + ci + 4); // the 7 days on screen
  const inVis = d => d >= vis[0] && d <= vis[6];
  // One category order for the board groups and the sidebar: most hours on screen first (the number the sidebar shows), then A–Z.
  const shownHours = {};
  for (const l of data.logs) if (inVis(l.day)) shownHours[l.label] = (shownHours[l.label] || 0) + (l.hours || 0);
  const cats = [...data.cats].sort((a, b) => (shownHours[b.name] || 0) - (shownHours[a.name] || 0) || a.name.localeCompare(b.name));
  const order = cats.map(c => c.name);
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
  const draft = ed && !ed.bar
    ? { key: 'draft', name: ed.name, label: ed.label, from: ed.from, to: ed.to, days: [], y: ed.y }
    : drag && !drag.bar ? { key: 'draft', name: '', label: '', from: range0[0], to: range0[1], days: [], y: drag.y } : null;

  // Pack what's on screen (grouped by category); off-screen bars get their own packing.
  const front = bars.filter(b => b.to >= vis[0] && b.from <= vis[6]);
  const back = bars.filter(b => !front.includes(b));
  const lanes = pack(draft?.label ? [...front, draft] : front, order);
  pack(back, order);
  const groups = Math.max(0, ...front.map(b => b.group + 1), draft?.label ? draft.group + 1 : 0);
  const topOf = b => PAD + b.lane * ROW + b.group * GAP;
  const height = PAD + lanes * ROW + groups * GAP + 140;

  // How far a dragged bar moves (in workdays), kept on screen.
  const moveBy = d => clamp(
    wdiff(d.origin, d.cur),
    Math.min(0, -wdiff(vis[0], d.bar.from)),
    Math.max(0, wdiff(d.bar.to, vis[6])),
  );

  // Everything drawn: per bar, which days it covers right now and the hours per day.
  const drawn = [...bars, ...(draft ? [draft] : [])].map(b => {
    let from = b.from, to = b.to, hourAt;
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
    const days = workRange(from, to);
    return {
      ...b, from, to, days, hourAt,
      top: b.key === 'draft' && !b.label ? b.y : topOf(b), // an uncategorised draft stays where it was drawn
      color: colorOf(b.label),
      striped: stripeOf(b.label),
      live: drag?.key === b.key || (ed?.bar && keyOf(ed.bar) === b.key),
      dim: focus !== null && b.label !== focus && b.key !== 'draft',
      arrive: arrive && b.name === arrive.name && b.from === arrive.from,
    };
  });

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
    entry.timer = setTimeout(() => { entry.applied = true; setFocus(f => (f === b.label ? null : b.label)); }, 260);
    lastClick.current = entry;
  }

  function moveBar(b, s) {
    const days = b.days.map(l => ({ day: addWork(l.day, s), hours: l.hours }));
    const from = days[0].day, to = days.at(-1).day;
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
    for (const d of workRange(from, to)) {
      hours[d] = data.logs.find(l => l.id === bar?.taskId && l.day === d)?.hours ?? '';
    }
    const name = bar?.name ?? preset.name ?? '';
    const label = bar?.label ?? preset.label ?? (focus || '');
    const notes = data.tasks.find(t => t.name === name)?.notes ?? '';
    setEd({ bar, from, to, name, label, hours, notes, tab: 'details', y: preset.y ?? PAD });
  }

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
  // Clicking outside the card closes it only if nothing has been filled in; otherwise the card shakes.
  function backdrop(e) {
    if (e.target !== dlg.current || !ed) return;
    const r = dlg.current.getBoundingClientRect();
    if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) return;
    const filled = ed.name.trim() || ed.label || ed.notes.trim() || Object.values(ed.hours).some(v => v !== '');
    if (!filled) return dlg.current.close();
    dlg.current.classList.remove('nudge');
    void dlg.current.offsetWidth; // restart the shake
    dlg.current.classList.add('nudge');
  }
  const del = () => {
    setEd({ ...ed, busy: true });
    run(() => removeBar(oldOf(ed.bar)), 'Deleted');
  };
  // N / "New": the same editor, for today (or the next weekday on a weekend).
  function newForToday(preset) {
    const t = todayStr();
    const d = isWork(t) ? t : addWork(t, 1);
    openEditor(null, d, d, preset);
  }

  function setName(name) {
    const known = data.tasks.find(t => t.name === name);
    setEd({ ...ed, name, label: known && !ed.label ? known.label : ed.label, notes: known && !ed.notes ? known.notes : ed.notes });
  }
  function setRange(from, to) {
    if (workRange(from, to).length > MAX_DAYS) return say(`A bar can span at most ${MAX_DAYS} weekdays`, true);
    const hours = {};
    for (const d of workRange(from, to)) {
      hours[d] = ed.hours[d] ?? data.logs.find(l => l.id === ed.bar?.taskId && l.day === d)?.hours ?? '';
    }
    setEd({ ...ed, from, to, hours });
  }

  const addCat = e => {
    e.preventDefault();
    if (!newCat.trim()) return;
    setNewCat('');
    const hue = freeHue(data.cats.map(c => c.hue));
    if (hue === null) return say(`Up to ${MAX_CATS} categories`, true);
    run(() => saveCategory(newCat, hue), 'Category added');
  };
  const recolor = c => {
    const hue = freeHue(data.cats.filter(x => x !== c).map(x => x.hue), ALL_HUES.indexOf(c.hue));
    if (hue === null || hue === c.hue) return say('Every colour is in use', true);
    run(() => saveCategory(c.name, hue), 'Colour changed');
  };
  const taskCount = name => data.tasks.filter(t => t.label === name).length;
  const dropCat = name => {
    catDlg.current.close();
    if (focus === name) setFocus(null);
    run(() => deleteCategory(name), 'Category removed');
  };

  const dayTotal = d => sum(data.logs.filter(l => l.day === d).map(l => l.hours));
  const [midFrom, midTo] = [vis[1], vis[5]]; // the five full-brightness days in the middle
  const viewTotal = sum(data.logs.filter(l => l.day >= midFrom && l.day <= midTo).map(l => l.hours));
  const catTotal = c => sum(data.logs.filter(l => l.label === c && inVis(l.day)).map(l => l.hours));

  return (
    <main className="app">
      <header className="top" data-loading={loading || undefined}>
        <div className="brand" title="GnattForMe"><span className="logo" /></div>
        <nav className="nav">
          <button className="icon" onClick={() => nudge(-5)} aria-label="Previous week" title="Previous week (←)">‹</button>
          <button onClick={thisWeek} title="This week (T)">Today</button>
          <button className="icon" onClick={() => nudge(5)} aria-label="Next week" title="Next week (→)">›</button>
        </nav>
        <span className="range">
          {fmt(midFrom, { day: 'numeric', month: 'short' })} – {fmt(midTo, { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
        <span className="spacer" />
        <button className="quick-btn" onClick={() => newForToday()} title="Log work for today (N)">＋ New <kbd>N</kbd></button>
        <span className="sum">In view <b>{viewTotal}h</b></span>
        <div className="acct">
          <button className={'avatar' + (menu ? ' on' : '')} onClick={() => setMenu(!menu)} aria-label="Account" aria-expanded={menu}>{user[0].toUpperCase()}</button>
          {menu && (
            <div className="acct-menu" role="menu">
              <div className="acct-who">
                <span className="avatar big">{user[0].toUpperCase()}</span>
                <div>
                  <b>{user.split('@')[0]}</b>
                  <span className="muted tiny">{user}</span>
                </div>
              </div>
              <AcctStats a={acct} />
              <a href="/insights" className="acct-link">Open insights <span>→</span></a>
              <div className="acct-row"><span className="muted tiny">Theme</span><ThemeSwitch /></div>
              <form action={logout}><button className="acct-out">Log out</button></form>
            </div>
          )}
        </div>
      </header>

      <div className="layout">
        <div className="board" ref={boardRef}>
          <div className="board-head">
            <div className="track" ref={headRef}>
              {[0, 5, 10, 15, 20].map(k => (
                <div key={'w' + strip[k]} data-i={k - C} className={'wk' + (strip[k] === monday(today) ? ' now' : '')} style={{ '--i': k - C }}>
                  <span className="wk-label">
                    <b>Week {isoWeek(strip[k])}</b>
                    {fmt(strip[k], { day: 'numeric', month: 'short' })} – {fmt(strip[k + 4], { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              ))}
              {strip.map((d, i) => {
                const t = dayTotal(d);
                return (
                  <div key={d} className={'head-cell' + (d === today ? ' today' : '') + (d === monday(d) ? ' mon' : '')} style={{ '--i': i - C }}>
                    <div className="day">
                      <span className="dn">{Number(d.slice(8))}</span>
                      <span className="dmeta"><b>{fmt(d, { weekday: 'short' })}</b><small>{fmt(d, { month: 'short' })}</small></span>
                      {t > 0 && <span key={t} className="tot">{t}h</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="board-body" ref={bodyRef}>
          <div
            ref={drumRef}
            className={'drum' + (drag ? ' dragging' : '')}
            style={{ height }}
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerLeave={() => !drag && setHover(null)}
            onPointerCancel={() => { press.current = null; setDrag(null); }}
          >
            <div className="track" ref={trackRef}>
            {strip.map((d, i) => {
              const cls = (d === today ? ' today' : '') + (d === monday(d) ? ' mon' : '');
              return (
                <div key={d} data-day={d} className={'panel' + cls} style={{ '--i': i - C }}>
                  {drawn.filter(x => x.days.includes(d)).map(x => {
                    const h = x.hourAt(d) || 0;
                    return (
                      <div
                        key={x.key}
                        data-bar={x.key}
                        className={'piece' + (d === x.from ? ' first' : '') + (d === x.to ? ' last' : '') + (x.striped ? ' striped' : '')
                          + (x.key === 'draft' ? ' draft' : '') + (x.live ? ' live' : '') + (x.dim ? ' dim' : '')
                          + (hover === x.key ? ' hov' : '') + (x.arrive ? ' arrive' : '')}
                        style={{ top: x.top, '--c': x.color, '--from': (x.arrive ? arrive.y : x.top) + 'px' }}
                        title={x.key === 'draft' ? undefined : `${x.name} · ${x.label || 'Others'}\n${fmt(d, { weekday: 'short', day: 'numeric', month: 'short' })}: ${h ? h + 'h' : 'no hours'}`}
                      >
                        {d === x.from && <span data-edge="l" className="edge l" />}
                        {h > 0 && <span className="hrs">{h}h</span>}
                        {d === x.to && <span data-edge="r" className="edge r" />}
                      </div>
                    );
                  })}
                </div>
              );
            })}
            {/* names run across the whole bar, above the day pieces */}
            {drawn.map(x => {
              const ds = x.days.filter(d => d >= vis[0] && strip.includes(d));
              if (!ds.length) return null;
              const i0 = strip.indexOf(ds[0]);
              return (
                <div key={'n' + x.key}
                  className={'bar-label' + (x.key === 'draft' ? ' draft' : '') + (x.dim ? ' dim' : '') + (hover === x.key || x.live ? ' hov' : '') + (x.arrive ? ' arrive' : '')}
                  style={{ '--i': i0 - C, '--n': strip.indexOf(ds.at(-1)) - i0 + 1, '--s': ds[0] === monday(ds[0]) ? SEAM + 'px' : '0px', top: x.top + 4, '--from': (x.arrive ? arrive.y : x.top) + 4 + 'px' }}>
                  {x.key === 'draft' ? x.name || `${x.days.length} day${x.days.length > 1 ? 's' : ''}` : x.name}
                  {noted.has(x.name) && <span className="noted" title="Has notes">✎</span>}
                </div>
              );
            })}
            </div>
          </div>
          </div>
        </div>

        <aside className="side">
          <section className="card">
            <MiniCal month={month ?? addDays(shown, 3).slice(0, 8) + '01'} setMonth={setMonth} from={midFrom} to={midTo} today={today} onPick={go} version={version} />
          </section>

          <PickUpCard logs={data.logs} today={today} colorOf={colorOf} onLog={(name, label) => newForToday({ name, label })} />

          <section className="card">
            <div className="card-head">
              <b>Categories</b>
              {focus !== null && <button className="link" onClick={() => setFocus(null)}>show all</button>}
            </div>
            <ul className="cats">
              {cats.map(c => (
                <li key={c.name} className={(focus === c.name ? 'on' : '') + (striped(c.hue) ? ' striped' : '')} style={{ '--c': catVar(c.hue) }}>
                  <button className="dot" onClick={() => recolor(c)} title="Change colour" aria-label={`Change colour of ${c.name}`} />
                  <button className="cat-name" onClick={() => setFocus(f => (f === c.name ? null : c.name))} title="Highlight its bars">{c.name}</button>
                  <span className="count">{catTotal(c.name) > 0 ? catTotal(c.name) + 'h' : ''}</span>
                  <button className="x" onClick={() => setSureCat(c.name)} aria-label={`Delete ${c.name}`} title="Delete category">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
                  </button>
                </li>
              ))}
              {/* built-in: everything without a category lives in Others */}
              <li className={'others' + (focus === '' ? ' on' : '')} style={{ '--c': 'var(--cat-none)' }}>
                <span className="dot" aria-hidden="true" />
                <button className="cat-name" onClick={() => setFocus(f => (f === '' ? null : ''))} title="Highlight tasks without a category">Others</button>
                <span className="count">{catTotal('') > 0 ? catTotal('') + 'h' : ''}</span>
                <span className="x-space" aria-hidden="true" />
              </li>
            </ul>
            {data.cats.length < MAX_CATS
              ? <form onSubmit={addCat} className="add-cat">
                  <input value={newCat} onChange={e => setNewCat(e.target.value)} placeholder="+ New category" maxLength={40} />
                </form>
              : <p className="muted tiny">All {MAX_CATS} category colours are in use.</p>}
          </section>
        </aside>
      </div>

      <dialog ref={catDlg} className="confirm" onClose={() => setSureCat(null)}
        onPointerDown={e => e.target === catDlg.current && catDlg.current.close()}>
        {sureCat && (
          <div className="confirm-body">
            <span className="confirm-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
            </span>
            <h2>Delete “{sureCat}”?</h2>
            <p className="muted">
              {taskCount(sureCat)
                ? <>{taskCount(sureCat)} task{taskCount(sureCat) === 1 ? '' : 's'} will move to <b>Others</b>. Their days and hours stay as they are.</>
                : <>No tasks use it. Nothing else changes.</>}
            </p>
            <div className="actions">
              <button className="quiet" onClick={() => catDlg.current.close()} autoFocus>Cancel</button>
              <button className="danger solid" onClick={() => dropCat(sureCat)}>Delete category</button>
            </div>
          </div>
        )}
      </dialog>

      <dialog ref={dlg} onClose={() => setEd(null)} onPointerDown={backdrop}>
        {ed && (
          <form onSubmit={save} style={{ '--c': colorOf(ed.label) }}>
            <div className="dlg-head">
              <span className="swatch" />
              <div>
                <h2>{ed.bar ? 'Edit work' : 'Log work'}</h2>
                <p className="muted">
                  {ed.from === ed.to
                    ? fmt(ed.from, { weekday: 'long', day: 'numeric', month: 'long' })
                    : `${fmt(ed.from, { day: 'numeric', month: 'short' })} → ${fmt(ed.to, { day: 'numeric', month: 'short' })}`}
                </p>
              </div>
              <span className="spacer" />
              <button type="button" className="icon-btn" onClick={() => dlg.current.close()} title="Close (Esc)" aria-label="Close">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </div>
            <div className="tabs" role="tablist">
              {[['details', 'Details'], ['notes', ed.notes ? 'Notes ✎' : 'Notes']].map(([k, t]) => (
                <button type="button" role="tab" key={k} aria-selected={ed.tab === k} className={ed.tab === k ? 'on' : ''} onClick={() => setEd({ ...ed, tab: k })}>{t}</button>
              ))}
            </div>
            <div className={'tab-body' + (ed.tab === 'details' ? '' : ' hidden')}>
            <label>Task
              <input list="task-names" value={ed.name} onChange={e => setName(e.target.value)} placeholder="What did you work on?" required autoFocus />
            </label>
            <div className="field">
              <span>Category</span>
              <CatPicker cats={data.cats} value={ed.label} onChange={label => setEd({ ...ed, label })} />
            </div>
            <div className="dates">
              <label>From
                <input type="date" value={ed.from} onChange={e => e.target.value && setRange(e.target.value, e.target.value > ed.to ? e.target.value : ed.to)} required />
              </label>
              <label>To
                <input type="date" value={ed.to} min={ed.from} onChange={e => e.target.value >= ed.from && setRange(ed.from, e.target.value)} required />
              </label>
            </div>
            <HoursEditor days={workRange(ed.from, ed.to)} hours={ed.hours} onChange={hours => setEd({ ...ed, hours })} />
            </div>
            {ed.tab === 'notes' && (
              <div className="tab-body notes">
                <textarea
                  autoFocus
                  value={ed.notes}
                  onChange={e => setEd({ ...ed, notes: e.target.value })}
                  maxLength={20000}
                  placeholder={`Anything about ${ed.name || 'this task'}… links, decisions, what's left to do.`}
                />
                <span className="muted tiny">Shared by every stint of this task · saved with Save</span>
              </div>
            )}
            <div className="actions">
              {ed.bar && (
                <button type="button" className="danger" onClick={del} disabled={ed.busy}>Delete</button>
              )}
              <span className="spacer" />
              <button className="primary" disabled={ed.busy}>{ed.busy ? <span className="spin" /> : 'Save'}</button>
            </div>
          </form>
        )}
      </dialog>

      <datalist id="task-names">{data.tasks.map(t => <option key={t.name} value={t.name} />)}</datalist>
      {toastEl}
    </main>
  );
}

// Profile card numbers: this week vs last, streak, average per day, 12-week trend.
function AcctStats({ a }) {
  if (!a) return <div className="acct-stats loading"><i /><i /><i /></div>;
  const n = v => +v.toFixed(1);
  const delta = n(a.thisWeek - a.lastWeek);
  const max = Math.max(1, ...a.weeks.map(w => w.hours));
  return (
    <>
      <div className="acct-stats">
        <div><span>This week</span><b>{n(a.thisWeek)}h</b>
          <small className={delta > 0 ? 'up' : delta < 0 ? 'down' : ''}>{delta === 0 ? '= last week' : `${delta > 0 ? '▲' : '▼'} ${Math.abs(delta)}h`}</small></div>
        <div><span>Streak</span><b>{a.streak}<em> {a.streak === 1 ? 'day' : 'days'}</em></b><small>in a row</small></div>
        <div><span>Avg / day</span><b>{n(a.avg30)}h</b><small>30 days</small></div>
      </div>
      <div className="acct-trend">
        <div className="acct-spark" aria-label="Hours per week, last 12 weeks">
          {a.weeks.map((w, i) => (
            <i key={w.week} className={i === 11 ? 'now' : ''} style={{ height: `${Math.max(6, (w.hours / max) * 100)}%` }} title={`Week of ${w.week}: ${n(w.hours)}h`} />
          ))}
        </div>
        <small className="muted">Last 12 weeks</small>
      </div>
    </>
  );
}

// Sidebar: the tasks you've put the most into lately, one click to log them again for today.
function PickUpCard({ logs, today, colorOf, onLog }) {
  const by = new Map();
  for (const l of logs) {
    if (l.day > today) continue;
    const t = by.get(l.name) ?? { name: l.name, label: l.label, hours: 0, days: 0, last: l.day };
    t.hours += l.hours || 0;
    t.days += 1;
    if (l.day > t.last) t.last = l.day;
    by.set(l.name, t);
  }
  // most hours first, then most days, then most recent
  const top = [...by.values()].sort((a, b) => b.hours - a.hours || b.days - a.days || b.last.localeCompare(a.last)).slice(0, 6);
  if (!top.length) return null;
  return (
    <section className="card today-card">
      <div className="card-head"><b>Pick up again</b><span className="muted tiny">most worked on</span></div>
      <ul className="today-list recent">{top.map(t => (
        <li key={t.name}>
          <button onClick={() => onLog(t.name, t.label)} title={`Log “${t.name}” for today`}>
            <i className="dot-s" style={{ '--c': colorOf(t.label) }} />
            <span>{t.name}</span>
            <small>{+t.hours.toFixed(1)}h · {t.days}d</small>
            <em>＋</em>
          </button>
        </li>
      ))}</ul>
    </section>
  );
}
