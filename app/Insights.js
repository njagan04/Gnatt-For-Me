'use client';
import { useEffect, useState } from 'react';
import { stats } from './actions';
import { addDays, monday, range, today as todayStr, fmt } from '../lib/days';
import { catVar } from '../lib/palette';
import { longestStreak, step, summarize } from '../lib/stats';

const n = v => +v.toFixed(1);
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
// A clean axis maximum so ticks land on round numbers.
const niceMax = v => { for (const m of [4, 8, 10, 20, 40, 60, 80, 100]) if (v <= m) return m; return Math.ceil(v / 50) * 50; };

export default function Insights({ user }) {
  const [r, setR] = useState(null);
  const [err, setErr] = useState(null);
  const [tip, setTip] = useState(null); // { x, y, text }

  useEffect(() => {
    const t = todayStr();
    stats(t).then(d => setR({ ...d, t, s: summarize(d.days, t) }), e => setErr(e.message || 'Could not load'));
  }, []);

  // Tooltip on hover and on keyboard focus.
  const tipFor = text => ({
    tabIndex: 0,
    'aria-label': text,
    onPointerEnter: e => setTip({ x: e.clientX, y: e.clientY, text }),
    onPointerMove: e => setTip({ x: e.clientX, y: e.clientY, text }),
    onPointerLeave: () => setTip(null),
    onFocus: e => { const b = e.currentTarget.getBoundingClientRect(); setTip({ x: b.left + b.width / 2, y: b.top, text }); },
    onBlur: () => setTip(null),
  });

  return (
    <main className="insights">
      <header className="top">
        <a href="/" className="brand" title="GnattForMe"><span className="logo" /></a>
        <a href="/" className="back">← Board</a>
        <span className="spacer" />
        <span className="avatar" title={user}>{user[0].toUpperCase()}</span>
      </header>
      <div className="ins-body">
        {err && <p className="err">{err}</p>}
        {!r && !err && <>
          <div className="skel a-focus" style={{ height: 330 }} />
          <div className="skel a-act" style={{ height: 330 }} />
          <div className="skel a-top" style={{ height: 380 }} />
          <div className="a-bottom"><div className="skel" style={{ height: 300 }} /><div className="skel" style={{ height: 300 }} /></div>
        </>}
        {r && <Content r={r} tipFor={tipFor} />}
      </div>
      {tip && <div className="ins-tip" style={{ left: tip.x, top: tip.y }}>{tip.text}</div>}
    </main>
  );
}

function Content({ r, tipFor }) {
  const { s, t } = r;
  const colorOf = label => (label ? catVar(r.cats.find(c => c.name === label)?.hue) : 'var(--cat-none)');

  // 26-week activity grid (weekdays)
  const by = Object.fromEntries(r.days.map(d => [d.day, d]));
  const weeks = Array.from({ length: 26 }, (_, i) => addDays(monday(r.from), i * 7));
  const total26 = r.days.reduce((a, d) => a + d.hours, 0);
  // weekday rhythm (average over days with hours)
  const wd = WEEKDAYS.map((name, k) => {
    const ds = r.days.filter(d => d.hours > 0 && new Date(d.day + 'T00:00:00Z').getUTCDay() === k + 1);
    return { name, avg: ds.length ? ds.reduce((a, d) => a + d.hours, 0) / ds.length : 0, count: ds.length };
  });
  const busiest = wd.reduce((a, b) => (b.avg > a.avg ? b : a));
  const wdMax = Math.max(busiest.avg, 1);
  // focus: share of the last 30 days by category; past 6 slices fold into "Other"
  const catHours = r.byCat.reduce((a, c) => a + c.hours, 0);
  const named = r.byCat.filter(c => c.hours > 0);
  const slices = named.length > 6
    ? [...named.slice(0, 5), { label: 'Other', other: true, hours: named.slice(5).reduce((a, c) => a + c.hours, 0), days: 0 }]
    : named;
  const top = named.find(c => c.label);
  const wMax = niceMax(Math.max(...s.weeks.map(w => w.hours), 1));
  const tMax = Math.max(...r.top.map(x => x.hours), 1);
  const pct = h => Math.round((h / (catHours || 1)) * 100);

  return (
    <>
      <section className="ins-hero a-act">
        <p className="ins-kicker">Last 30 days</p>
        <h1 className="ins-headline">
          <span className="ins-big">{n(s.hours30)}h</span> across <b>{s.days30} {s.days30 === 1 ? 'day' : 'days'}</b>
          {top && <>, mostly <span className="ins-cat" style={{ '--c': colorOf(top.label) }}>{top.label}</span> <span className="muted">({pct(top.hours)}%)</span></>}.
          {!s.days30 && <span className="muted ins-hint"> Drag across days on the board and this fills in.</span>}
        </h1>

        <div className="act">
          <div className="act-rows">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((d, i) => <span key={d} style={{ gridRow: i + 2 }}>{d}</span>)}</div>
          <div className="act-grid">
            {weeks.map((w, i) => {
              const month = fmt(w, { month: 'short' });
              const showMonth = i === 0 || fmt(addDays(w, -7), { month: 'short' }) !== month;
              return (
                <div key={w} className="act-col" style={{ '--d': i }}>
                  <span className="act-m">{showMonth ? month : ''}</span>
                  {range(w, addDays(w, 4)).map(d => {
                    const x = by[d];
                    const future = d > t;
                    const label = `${fmt(d, { weekday: 'short', day: 'numeric', month: 'short' })} · ${x ? `${n(x.hours)}h, ${x.entries} task${x.entries === 1 ? '' : 's'}` : 'nothing logged'}`;
                    return <i key={d} className={'act-c s' + String(step(x)).replace('.', '_') + (future ? ' future' : '') + (d === t ? ' today' : '')} {...(future ? {} : tipFor(label))} />;
                  })}
                </div>
              );
            })}
          </div>
        </div>
        <div className="act-foot">
          <div className="hero-stats">
            <div><b>{s.streak}</b><span>current streak</span></div>
            <div><b>{longestStreak(r.days)}</b><span>longest streak</span></div>
            <div><b>{busiest.avg ? busiest.name : '—'}</b><span>busiest weekday</span></div>
            <div><b>{n(total26)}h</b><span>in 26 weeks</span></div>
          </div>
          <div className="act-legend">
            <span>Less</span>
            {['0', '1', '2', '3', '4'].map(k => <i key={k} className={'act-c s' + k} />)}
            <span>More</span>
          </div>
        </div>
      </section>

      <section className="ins-card a-focus">
        <h2>Focus <span className="muted">· 30 days</span></h2>
        {slices.length ? (
          <div className="focus">
            <div className="focus-bar">
              {slices.map(c => (
                <i key={c.label || '-'} style={{ flexGrow: c.hours, background: c.other ? 'var(--cat-none)' : colorOf(c.label) }}
                  {...tipFor(`${c.label || 'Others'}: ${n(c.hours)}h · ${pct(c.hours)}%`)} />
              ))}
            </div>
            <ul className="focus-keys">
              {slices.map(c => (
                <li key={c.label || '-'}>
                  <i className="dot-s" style={{ '--c': c.other ? 'var(--cat-none)' : colorOf(c.label) }} />
                  <span>{c.label || 'Others'}</span>
                  <b>{pct(c.hours)}%</b>
                  <small>{n(c.hours)}h</small>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="focus">
            <div className="focus-bar"><i style={{ flexGrow: 1, background: 'var(--panel-2)' }} /></div>
            <p className="muted tiny">No hours in the last 30 days yet. Categories show up here with their share of your time.</p>
          </div>
        )}
      </section>

      <div className="a-bottom">
      <section className="ins-card a-week">
        <h2>Hours per week <span className="muted">· last 12 weeks</span></h2>
        <div className="cols">
          <div className="cols-grid">
            {[1, 0.5, 0].map(f => <div key={f} style={{ bottom: `${f * 100}%` }}><span>{wMax * f}h</span></div>)}
          </div>
          {s.weeks.map((w, i) => (
            <div key={w.week} className={'col-slot' + (i === 11 ? ' now' : '')}>
              <div className="col-bar" style={{ height: `${(w.hours / wMax) * 100}%`, '--d': i }}
                {...tipFor(`Week of ${fmt(w.week, { day: 'numeric', month: 'short' })}: ${n(w.hours)}h`)}>
                {i === 11 && w.hours > 0 && <b>{n(w.hours)}h</b>}
              </div>
              <span className="col-x">{i % 2 === 1 || i === 11 ? fmt(w.week, { day: 'numeric', month: 'short' }) : ''}</span>
            </div>
          ))}
        </div>
        <details className="as-table">
          <summary>View as table</summary>
          <table>
            <thead><tr><th>Week of</th><th>Hours</th></tr></thead>
            <tbody>{s.weeks.map(w => <tr key={w.week}><td>{fmt(w.week, { day: 'numeric', month: 'short', year: 'numeric' })}</td><td>{n(w.hours)}</td></tr>)}</tbody>
          </table>
        </details>
      </section>

      <section className="ins-card a-rhythm">
        <h2>Rhythm <span className="muted">· avg / weekday</span></h2>
        <div className="rhythm">
          {wd.map(x => (
            <div key={x.name} className={'rh' + (x === busiest && x.avg ? ' best' : '')}>
              <b>{x.avg ? n(x.avg) + 'h' : '–'}</b>
              <span className="rh-track"><i style={{ height: `${(x.avg / wdMax) * 100}%` }} {...tipFor(`${x.name}: ${n(x.avg)}h on average over ${x.count} day${x.count === 1 ? '' : 's'}`)} /></span>
              <small>{x.name.slice(0, 3)}</small>
            </div>
          ))}
        </div>
      </section>
      </div>

      <section className="ins-card a-top">
        <h2>Top tasks <span className="muted">· 30 days</span></h2>
        {r.top.length ? (
          <ol className="ranks">
            {r.top.map((x, i) => (
              <li key={x.name}>
                <span className="rank">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <span className="rk-name" title={x.name}>{x.name}</span>
                  <span className="rk-meta"><i className="dot-s" style={{ '--c': colorOf(x.label) }} />{x.label || 'Others'} · {x.days} day{x.days === 1 ? '' : 's'}</span>
                  <span className="rk-bar"><i style={{ width: `${(x.hours / tMax) * 100}%`, background: colorOf(x.label) }} /></span>
                </div>
                <b>{n(x.hours)}h</b>
              </li>
            ))}
          </ol>
        ) : (
          <ol className="ranks empty" aria-label="No tasks in the last 30 days yet">
            {[1, 2, 3].map(i => (
              <li key={i}>
                <span className="rank">{String(i).padStart(2, '0')}</span>
                <div><span className="rk-name">{i === 1 ? 'Your most-worked task' : ' '}</span><span className="rk-bar" /></div>
                <b>0h</b>
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  );
}
