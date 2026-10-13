import SignInPanel, { SignInButton } from './SignInPanel';
import './landing.css';

// Logged-out home. Sign-in sits in the hero (no hunting for it); the rest scrolls normally with light,
// one-shot reveals (CSS view timelines); browsers without them just show everything.
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
// Demo bars on the mini board: hours per day, like the real app.
const BARS = [
  { cls: 'b1', name: 'API integration', h: 285, hrs: [3, 2, 4, 3, 2] },
  { cls: 'b2', name: 'Design review', h: 285, hrs: [2, 1.5, 2] },
  { cls: 'b3', name: 'Bug fixes', h: 20, hrs: [4, 3] },
  { cls: 'b4', name: 'Onboarding docs', h: 160, hrs: [2, 3, 1] },
];
// Demo activity for the Insights showcase: 20 weeks × Mon–Fri, busier towards recent weeks (deterministic).
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
const FEATURES = [
  ['Drag to log', 'Drag across the days you worked. Name it, done. No tickets, no forms.', 'M4 12h16M14 6l6 6-6 6'],
  ['Grouped by project', 'Categories gather their tasks together, so a busy week still reads at a glance.', 'M4 6h10M4 12h16M4 18h7'],
  [
    'Daily log',
    'A OneNote-style page for every day: click anywhere, write, tag notes by category.',
    'M6 3h11a2 2 0 0 1 2 2v16H7a2 2 0 0 1-2-2V4a1 1 0 0 1 1-1zM9 7h6M9 10h4',
  ],
  ['To do · Doing · Done', 'Every task carries its status right on the bar, so the week tells you what is still open.', 'M5 12l4 4 10-10'],
  ['Scroll through weeks', 'Roll the board with your mouse wheel; weekends fold into a thin seam.', 'M4 12h16M8 8l-4 4 4 4M16 8l4 4-4 4'],
  ['Just yours', 'Google or your own username. Each person sees only their own board.', 'M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z'],
];

// A small static board for the preview.
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

// The three steps, each with a tiny picture of that step.
function Step({ n, title, text, children }) {
  return (
    <div className="lp-step" style={{ '--i': n }}>
      <div className="lp-step-art" aria-hidden="true">
        {children}
      </div>
      <span className="lp-num">0{n}</span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

export default function Landing({ error }) {
  return (
    <div className="lp" id="top">
      <div className="lp-aurora" aria-hidden="true" />
      <div className="lp-grid" aria-hidden="true" />

      <nav className="lp-nav">
        <a href="#top" className="lp-brand">
          <span className="logo" />
          GanttForMe
        </a>
        <div className="lp-links">
          <a href="#how">How it works</a>
          <a href="#insights">Insights</a>
          <a href="#features">Features</a>
        </div>
        <SignInButton className="lp-nav-cta" />
      </nav>

      <header className="lp-hero">
        <div className="lp-hero-copy">
          <p className="lp-kicker">A Gantt chart for your own week</p>
          <h1>
            Remember what <span className="lp-shine">you actually worked on.</span>
          </h1>
          <p className="lp-sub">
            Drag across days, name the task, pull up the hours. GanttForMe keeps the week you would otherwise forget, grouped by project and
            ready for standup.
          </p>
          <ul className="lp-ticks">
            <li>Free, no card, no setup</li>
            <li>Private to your account</li>
            <li>Google or your own username</li>
          </ul>
        </div>
        <SignInPanel error={error} />
      </header>

      <section className="lp-preview" aria-label="The board">
        <Board />
      </section>

      <section className="lp-how" id="how">
        <h2>
          Three moves. <span className="lp-shine">That&apos;s the whole app.</span>
        </h2>
        <div className="lp-steps">
          <Step n={1} title="Drag across days" text="Press on Wednesday, let go on Friday, name it. That is the whole form.">
            <div className="art-days">
              {DAYS.map(d => (
                <span key={d}>{d[0]}</span>
              ))}
              <i className="art-draft" />
            </div>
          </Step>
          <Step n={2} title="Pull up the hours" text="Each day gets a bar you drag up to what it took. Totals add themselves up.">
            <div className="art-eq">
              {[3, 5.5, 8, 2, 6].map((h, i) => (
                <span key={i}>
                  <i style={{ '--v': h / 8, '--d': i }} />
                </span>
              ))}
            </div>
          </Step>
          <Step n={3} title="See where it went" text="Bars group by project; the daily log and insights fill themselves in from the board.">
            <div className="art-groups">
              <i style={{ '--c': 'var(--cat-0)', '--w': '80%' }} />
              <i style={{ '--c': 'var(--cat-0)', '--w': '55%', '--x': '30%' }} />
              <i style={{ '--c': 'var(--cat-2)', '--w': '45%' }} />
              <i style={{ '--c': 'var(--cat-1)', '--w': '60%', '--x': '25%' }} />
            </div>
          </Step>
        </div>
      </section>

      <section className="lp-insights" id="insights" aria-label="Insights">
        <div className="lp-ins-copy">
          <span className="lp-num">Insights</span>
          <h2>
            Your month, <span className="lp-shine">at a glance.</span>
          </h2>
          <p>
            Every logged day lights up the timeline. Streaks, your busiest weekday and where the hours really went, without filling in a
            single report.
          </p>
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
            <b className="lp-shine">164h</b> across 21 days, mostly <u>Platform</u>.
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

      <section className="lp-features" id="features">
        <h2>
          Small tool. <span className="lp-shine">No ceremony.</span>
        </h2>
        <div className="lp-cards">
          {FEATURES.map(([t, s, d], i) => (
            <div key={t} className="lp-card" style={{ '--i': i % 3 }}>
              <svg
                viewBox="0 0 24 24"
                width="22"
                height="22"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={d} />
              </svg>
              <h3>{t}</h3>
              <p>{s}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-end">
        <h2>
          Start this week <span className="lp-shine">before you forget it.</span>
        </h2>
        <p>Log a task in two seconds. Friday-you will thank you.</p>
        <SignInButton className="lp-cta" label="Get started — it's free" />
      </section>

      <footer className="lp-foot">
        <span className="logo" /> GanttForMe
        <span className="lp-foot-links">
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
        </span>
      </footer>
    </div>
  );
}
