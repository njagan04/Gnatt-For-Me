import './landing.css';

// Logged-out home. All motion is CSS scroll-driven animation (no JS); browsers without it get the final frames.
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const FLOATERS = [
  { t: 'Sprint planning', h: 250, x: 6, y: 18, w: 190, z: 1 },
  { t: 'Code review', h: 320, x: 72, y: 12, w: 220, z: 2 },
  { t: 'Testing', h: 285, x: 82, y: 50, w: 150, z: 3 },
  { t: 'Bug bash', h: 20, x: 3, y: 58, w: 170, z: 2 },
  { t: 'Standup', h: 170, x: 14, y: 38, w: 130, z: 1 },
  { t: 'Research', h: 42, x: 86, y: 30, w: 160, z: 1 },
];
// Demo bars on the mini board: hours per day, like the real app.
const BARS = [
  { cls: 'b1', name: 'API integration', h: 285, hrs: [3, 2, 4, 3, 2] },
  { cls: 'b2', name: 'Design review', h: 285, hrs: [2, 1.5, 2] },
  { cls: 'b3', name: 'Bug fixes', h: 20, hrs: [4, 3] },
  { cls: 'b4', name: 'Onboarding docs', h: 160, hrs: [2, 3, 1] },
];
// Demo activity for the Insights showcase: 20 weeks × Mon–Fri, busier towards recent weeks (deterministic).
const HEAT = Array.from({ length: 20 }, (_, w) => Array.from({ length: 5 }, (_, d) => {
  const r = Math.abs(Math.sin(w * 12.9898 + d * 78.233) * 43758.5453) % 1;
  return r < 0.2 - w * 0.006 ? 0 : Math.min(4, Math.ceil(r * (1.6 + w * 0.13)));
}));
const FOCUS = [['Platform', 0, 34], ['Mobile app', 1, 24], ['Data', 2, 18], ['Design', 4, 14], ['Meetings', 3, 10]];
const FEATURES = [
  ['Drag to log', 'Drag across the days you worked. Name it, done. No tickets, no forms.', 'M4 12h16M14 6l6 6-6 6'],
  ['Grouped by project', 'Categories gather their tasks together, so a busy week still reads at a glance.', 'M4 6h10M4 12h16M4 18h7'],
  ['Hours, day by day', 'Pull up a bar for each day. The board shows what every day actually cost.', 'M6 20V10M12 20V4M18 20v-7'],
  ['Notes per task', 'A plain notepad on every task for links, decisions and what is left.', 'M6 4h9l3 3v13H6zM9 11h6M9 15h6'],
  ['Scroll through weeks', 'Roll the board with your mouse wheel; weekends fold into a thin seam.', 'M4 12h16M8 8l-4 4 4 4M16 8l4 4-4 4'],
  ['Just yours', 'Sign in with Google. Each person sees only their own board.', 'M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z'],
];

function Google() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

const SignIn = ({ big }) => (
  <a href="/auth/google" className={'lp-cta' + (big ? ' big' : '')}><Google />Sign in with Google</a>
);

// A small static board used by the hero and the story.
function Board({ story }) {
  return (
    <div className={'lp-board' + (story ? ' story' : '')}>
      <div className="lp-wk"><b>Week 41</b> 5 – 9 Oct</div>
      <div className="lp-days">
        {DAYS.map((d, i) => <div key={d} className={'lp-day' + (i === 2 ? ' now' : '')}><span>{d}</span><b>{5 + i}</b></div>)}
      </div>
      <div className="lp-lanes">
        {BARS.map(b => (
          <div key={b.cls} className={'lp-bar ' + b.cls} style={{ '--h': b.h, gridTemplateColumns: `repeat(${b.hrs.length}, 1fr)` }}>
            {b.hrs.map((h, i) => (
              <span key={i} className="lp-cell">{i === 0 && <span className="lp-name">{b.name}</span>}<i>{h}h</i></span>
            ))}
          </div>
        ))}
        {story && <div className="lp-bar draft"><span>3 days</span></div>}
        {story && <div className="lp-cursor" />}
      </div>
      {story && (
        <div className="lp-eq">
          {[3, 5.5, 8, 2, 6].map((h, i) => (
            <div key={i}><b>{h}h</b><span><i style={{ '--v': h / 8, '--d': i }} /></span><small>{DAYS[i][0]}</small></div>
          ))}
        </div>
      )}
      {story && <div className="lp-seam"><span>SAT · SUN</span></div>}
      {story && (
        <div className="lp-next">
          <div className="lp-wk"><b>Week 42</b> 12 – 16 Oct</div>
          <div className="lp-days">
            {['Mon', 'Tue', 'Wed'].map((d, i) => <div key={d} className="lp-day"><span>{d}</span><b>{12 + i}</b></div>)}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Landing({ error }) {
  return (
    <div className="lp">
      <div className="lp-aurora" aria-hidden="true" />
      <div className="lp-grid" aria-hidden="true" />
      {FLOATERS.map(f => (
        <div key={f.t} className={'lp-float z' + f.z} aria-hidden="true"
          style={{ '--h': f.h, left: f.x + '%', top: f.y + 'vh', width: f.w }}>{f.t}</div>
      ))}

      <nav className="lp-nav">
        <div className="lp-brand"><span className="logo" />GnattForMe</div>
      </nav>

      <header className="lp-hero">
        <p className="lp-kicker">A Gantt chart for your own week</p>
        <h1>Remember what<br /><span className="lp-shine">you actually worked on.</span></h1>
        <p className="lp-sub">Drag across days, name the task, pull up the hours. GnattForMe keeps the week you would otherwise forget, grouped by project and ready for standup.</p>
        <SignIn />
        {error && <p className="lp-err">{error}</p>}
        <div className="lp-stage"><Board /></div>
      </header>

      <section className="lp-story" aria-label="How it works">
        <div className="lp-sticky">
          <div className="lp-caps">
            {[
              ['01', 'Drag across days', 'Press on Wednesday, let go on Friday. That is the whole form.'],
              ['02', 'It finds its project', 'Bars gather with their category. Busy weeks stay readable.'],
              ['03', 'Hours, day by day', 'Pull each day up to what it took. Totals add themselves up.'],
              ['04', 'Roll through weeks', 'Scroll the board like a strip of film. Weekends fold away.'],
            ].map(([n, t, s], i) => (
              <div key={n} className={'lp-cap c' + (i + 1)}>
                <span className="lp-num">{n}</span>
                <h2>{t}</h2>
                <p>{s}</p>
              </div>
            ))}
            <div className="lp-progress"><i /></div>
          </div>
          <div className="lp-story-stage"><Board story /></div>
        </div>
      </section>

      <section className="lp-insights" aria-label="Insights">
        <div className="lp-ins-copy">
          <span className="lp-num">Insights</span>
          <h2>Your month, <span className="lp-shine">at a glance.</span></h2>
          <p>Every logged day lights up the timeline. Streaks, your busiest weekday and where the hours really went, without filling in a single report.</p>
          <ul className="lp-ins-stats">
            <li><b>12</b><span>day streak</span></li>
            <li><b>Thu</b><span>busiest weekday</span></li>
            <li><b>164h</b><span>this month</span></li>
          </ul>
        </div>
        <div className="lp-ins-card">
          <p className="lp-ins-kicker">Last 30 days</p>
          <p className="lp-ins-head"><b className="lp-shine">164h</b> across 21 days, mostly <u>Platform</u>.</p>
          <div className="lp-heat">
            {HEAT.map((week, col) => (
              <div key={col} className="lp-heat-col" style={{ '--c': col }}>
                {week.map((v, r) => <i key={r} className={'s' + v} />)}
              </div>
            ))}
          </div>
          <div className="lp-focus">
            {FOCUS.map(([name, slot, pct], i) => (
              <i key={name} style={{ flexGrow: pct, '--k': i, background: `var(--cat-${slot})` }} title={`${name} ${pct}%`} />
            ))}
          </div>
          <ul className="lp-focus-keys">
            {FOCUS.map(([name, slot, pct]) => <li key={name}><i style={{ background: `var(--cat-${slot})` }} />{name}<b>{pct}%</b></li>)}
          </ul>
        </div>
      </section>

      <section className="lp-features">
        <h2>Small tool. <span className="lp-shine">No ceremony.</span></h2>
        <div className="lp-cards">
          {FEATURES.map(([t, s, d], i) => (
            <div key={t} className="lp-card" style={{ '--i': i }}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
              <h3>{t}</h3>
              <p>{s}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-end">
        <h2>Start this week<br />before you forget it.</h2>
        <SignIn big />
        <p className="lp-small">Private to each Google account · Free</p>
      </section>

      <footer className="lp-foot">
        <span className="logo" /> GnattForMe
      </footer>
    </div>
  );
}
