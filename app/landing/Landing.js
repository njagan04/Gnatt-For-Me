import HeroField from './HeroField';
import SignInPanel, { SignInButton } from './SignInPanel';
import Tilt from './Tilt';
import './landing.css';

// Logged-out home, built like a week on the board: the headline is three task bars drawn onto a timeline (the
// mouse is its "now" cursor), sign-in is docked on the right like the app's sidebar, and the page below reads
// Monday → Friday with weekend seams between. Reveals use CSS view timelines; without them everything just shows.
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
// Demo bars on the mini board: hours per day, like the real app.
const BARS = [
  { cls: 'b1', name: 'API integration', h: 285, hrs: [3, 2, 4, 3, 2] },
  { cls: 'b2', name: 'Design review', h: 285, hrs: [2, 1.5, 2] },
  { cls: 'b3', name: 'Bug fixes', h: 20, hrs: [4, 3] },
  { cls: 'b4', name: 'Onboarding docs', h: 160, hrs: [2, 3, 1] },
];
// Demo activity for the Insights card: 20 weeks × Mon–Fri, busier towards recent weeks (deterministic).
const HEAT = Array.from({ length: 20 }, (_, w) =>
  Array.from({ length: 5 }, (_, d) => {
    const r = Math.abs(Math.sin(w * 12.9898 + d * 78.233) * 43758.5453) % 1;
    return r < 0.2 - w * 0.006 ? 0 : Math.min(4, Math.ceil(r * (1.6 + w * 0.13)));
  }),
);
const FOCUS = [
  ['Platform', 0, 34],
  ['Mobile app', 1, 24],
  ['Data', 2, 18],
  ['Design', 4, 14],
  ['Meetings', 3, 10],
];
// The headline, as three bars on the timeline: [text, first column, columns, colour slot, status, hours]
const HEADLINE = [
  ['Remember what', 0, 7, 0, 'todo', '3h'],
  ['you actually', 2, 7, 1, 'doing', '5h'],
  ['worked on.', 4, 5, 2, 'done', '2h'],
];

function Board() {
  return (
    <div className="lp-board">
      <div className="lp-wk">
        <b>Week 41</b> 5 – 9 Oct
      </div>
      <div className="lp-days">
        {DAYS.map((d, i) => (
          <div key={d} className={'lp-day' + (i === 2 ? ' now' : '')}>
            <span>{d}</span>
            <b>{5 + i}</b>
          </div>
        ))}
      </div>
      <div className="lp-lanes">
        {BARS.map(b => (
          <div key={b.cls} className={'lp-bar ' + b.cls} style={{ '--h': b.h, gridTemplateColumns: `repeat(${b.hrs.length}, 1fr)` }}>
            {b.hrs.map((h, i) => (
              <span key={i} className="lp-cell">
                {i === 0 && <span className="lp-name">{b.name}</span>}
                <i>{h}h</i>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// A daily-log page in miniature: free-placed notes on a dotted page, two tagged with their project.
function NotesMock() {
  return (
    <div className="nm" aria-hidden="true">
      <div className="nm-head">
        <b>Wednesday, 7 October</b>
        <span className="nm-chip" style={{ '--c': 'var(--cat-0)' }}>
          API integration · 4h
        </span>
      </div>
      <div className="nm-page">
        <div className="nm-note tagged" style={{ '--c': 'var(--cat-0)', '--x': '6%', '--y': '14%', '--d': 0 }}>
          <span className="nm-tag">Platform</span>
          <b>Sync fix shipped</b>
          <p>Retries now back off. Ask Priya to re-run the nightly import.</p>
        </div>
        <div className="nm-note" style={{ '--x': '55%', '--y': '8%', '--d': 1 }}>
          <b>Tomorrow</b>
          <ul>
            <li className="done">Standup notes</li>
            <li>Review PR #42</li>
            <li>Book design review</li>
          </ul>
        </div>
        <div className="nm-note tagged" style={{ '--c': 'var(--cat-1)', '--x': '30%', '--y': '60%', '--d': 2 }}>
          <span className="nm-tag">Mobile app</span>
          <p>Crash on Android 12, only when offline. Repro steps in the ticket.</p>
        </div>
      </div>
    </div>
  );
}

// A board-style day header for each section.
const Day = ({ n, d, label }) => (
  <div className="lp-dayhead">
    <b>{n}</b>
    <span>{d}</span>
    <em>{label}</em>
  </div>
);
const Seam = () => (
  <div className="lp-seam" aria-hidden="true">
    <span>Sat · Sun</span>
  </div>
);

export default function Landing({ error }) {
  return (
    <div className="lp" id="top">
      <nav className="lp-nav">
        <a href="#top" className="lp-brand">
          <span className="logo" />
          Gantt For Me
        </a>
        <div className="lp-links">
          <a href="#log-it">Track it</a>
          <a href="#write-it">Note it</a>
          <a href="#see-it">Know it</a>
        </div>
        <SignInButton className="lp-nav-cta" autoHide />
      </nav>

      <header className="lp-hero">
        <HeroField />
        <h1 className="lp-hl">
          {HEADLINE.map(([t, c0, n, k, st, h], i) => (
            <span
              key={t}
              className={'hl-bar ' + st}
              style={{ '--c0': c0, '--n': n, '--k': `var(--cat-${k})`, '--row': i, '--dl': `${0.5 + i * 0.35}s` }}
            >
              <span className="hl-text">{t}</span>
              <b className="hl-hrs">{h}</b>
            </span>
          ))}
        </h1>
        <div className="lp-hero-foot">
          <p className="lp-sub">
            Drag across days, name the task, pull up the hours. A Gantt chart of your own week, grouped by project and ready for standup.
          </p>
          <div className="lp-legend">
            <span>
              <i className="lg todo" /> To do
            </span>
            <span>
              <i className="lg doing" /> Doing
            </span>
            <span>
              <i className="lg done" /> Done
            </span>
            <span className="lp-legend-note">Free · private to you · Google or a username</span>
          </div>
        </div>
        <SignInPanel error={error} />
      </header>

      <Seam />

      <section className="lp-week" id="log-it">
        <div className="lp-week-copy">
          <Day n="5" d="Mon" label="Track it" />
          <h2>Drag across the days you worked.</h2>
          <p>Press on Wednesday, let go on Friday, give it a name. Pull each day up to what it took. That is the whole form.</p>
        </div>
        <div className="lp-preview">
          <Tilt>
            <Board />
          </Tilt>
        </div>
      </section>

      <section className="lp-week flip" id="write-it">
        <div className="lp-week-copy">
          <Day n="7" d="Wed" label="Note it" />
          <h2>A page for every day.</h2>
          <p>Click anywhere to jot down what happened. Tag a note with its project and find it again from any day.</p>
        </div>
        <NotesMock />
      </section>

      <section className="lp-week" id="see-it">
        <div className="lp-week-copy">
          <Day n="9" d="Fri" label="Know it" />
          <h2>Friday, with receipts.</h2>
          <p>Streaks, your busiest weekday and where the hours really went, without filling in a single report.</p>
          <ul className="lp-ins-stats">
            <li>
              <b>12</b>
              <span>day streak</span>
            </li>
            <li>
              <b>Thu</b>
              <span>busiest weekday</span>
            </li>
            <li>
              <b>164h</b>
              <span>this month</span>
            </li>
          </ul>
        </div>
        <div className="lp-ins-card">
          <p className="lp-ins-kicker">Last 30 days</p>
          <p className="lp-ins-head">
            <b>164h</b> across 21 days, mostly <u>Platform</u>.
          </p>
          <div className="lp-heat">
            {HEAT.map((week, col) => (
              <div key={col} className="lp-heat-col" style={{ '--c': col }}>
                {week.map((v, r) => (
                  <i key={r} className={'s' + v} />
                ))}
              </div>
            ))}
          </div>
          <div className="lp-focus">
            {FOCUS.map(([name, slot, pct], i) => (
              <i key={name} style={{ flexGrow: pct, '--k': i, background: `var(--cat-${slot})` }} title={`${name} ${pct}%`} />
            ))}
          </div>
          <ul className="lp-focus-keys">
            {FOCUS.map(([name, slot, pct]) => (
              <li key={name}>
                <i style={{ background: `var(--cat-${slot})` }} />
                {name}
                <b>{pct}%</b>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Seam />

      <section className="lp-end">
        <p className="lp-rhyme">
          Track it. <span>Log it.</span> Note it. <span>Know it.</span>
        </p>
        <h2>Next week starts Monday.</h2>
        <p>Log a task in two seconds. Friday-you will thank you.</p>
        <SignInButton className="lp-cta" label="Start your board" />
      </section>

      <footer className="lp-foot">
        <span className="logo" /> Gantt For Me
        <span className="lp-foot-rhyme">Track it · Log it · Note it · Know it</span>
        <span className="lp-foot-links">
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
        </span>
      </footer>
    </div>
  );
}
