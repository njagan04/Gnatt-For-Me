'use client';
import { useActionState, useEffect, useState } from 'react';
import { checkUsername, generatePassword, passwordStrength } from '../../lib/credentials';
import { loginWithPassword, saveCredentials, usernameStatus } from '../account/actions';

// Google sign-in in a popup. Google's pages cut window.opener, so the popup reports back over a BroadcastChannel
// (see auth/callback). Popup blocked → plain redirect.
function googlePopup() {
  const w = 480,
    h = 620;
  const pop = window.open(
    '/auth/google?popup=1',
    'gauth',
    `width=${w},height=${h},left=${screenX + (outerWidth - w) / 2},top=${screenY + (outerHeight - h) / 2}`,
  );
  if (!pop) location.href = '/auth/google';
}

const GoogleButton = ({ label }) => (
  <button type="button" className="lp-google" onClick={googlePopup}>
    <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
    {label}
  </button>
);

// Hero "Sign in": an eased, medium-speed glide down to the panel (native smooth scroll rushes long distances).
export function SignInLink() {
  function glide(e) {
    const el = document.getElementById('signin');
    if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    e.preventDefault();
    // Sections below lazy-render (content-visibility), so the page grows while we glide: re-aim every frame.
    const target = () => el.getBoundingClientRect().top + scrollY - Math.max(0, (innerHeight - el.offsetHeight) / 2);
    const from = scrollY;
    const ms = Math.min(2000, Math.max(1200, Math.abs(target() - from) / 4));
    const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
    const t0 = performance.now();
    const step = now => {
      const t = Math.min(1, (now - t0) / ms);
      scrollTo({ top: from + (target() - from) * ease(t), behavior: 'instant' });
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  return (
    <a href="#signin" className="lp-cta" onClick={glide}>
      Sign in <span aria-hidden="true">↓</span>
    </a>
  );
}

// The card the hero's "Sign in" glides to. Tabs: Sign in (Google or username) and Sign up (Google, then pick a
// username and password right here). All panels share one grid cell, so the card never changes height.
export default function SignInPanel({ error }) {
  const [tab, setTab] = useState('in');
  const [googleErr, setGoogleErr] = useState(error);
  const [setup, setSetup] = useState(null); // { email, name } once Google created a new account

  useEffect(() => {
    if (error) document.getElementById('signin').scrollIntoView(); // came back from a failed Google redirect
    const ch = new BroadcastChannel('gantt-auth');
    ch.onmessage = ({ data }) => {
      if (data.error) return setGoogleErr(data.error);
      if (data.setup) {
        setTab('up');
        return setSetup({ email: data.email, name: data.name });
      }
      location.assign('/home');
    };
    return () => ch.close();
  }, []);

  const panel = (key, body) => (
    <div className={'lp-si-panel' + (tab === key ? ' on' : '')} inert={tab !== key}>
      {body}
    </div>
  );

  return (
    <section className="lp-signin" id="signin">
      <div className="lp-si-card">
        <div className="lp-tabs" role="tablist">
          {[
            ['in', 'Sign in'],
            ['up', 'Sign up'],
          ].map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
              {label}
            </button>
          ))}
        </div>
        <div className="lp-si-stack">
          {panel('in', <SignInForm googleErr={googleErr} />)}
          {panel('up', setup ? <SetupForm {...setup} /> : <SignUpStart googleErr={googleErr} />)}
        </div>
      </div>
    </section>
  );
}

function SignInForm({ googleErr }) {
  const [state, action, pending] = useActionState(loginWithPassword, null);
  return (
    <>
      <div className="lp-si-head">
        <h3>Welcome back</h3>
        <p>Sign in to pick up where you left off.</p>
      </div>
      <GoogleButton label="Sign in with Google" />
      {googleErr && <p className="lp-err">{googleErr}</p>}
      <div className="lp-si-or" aria-hidden="true">
        <span>or</span>
      </div>
      <form action={action} className="lp-si-form">
        <input name="username" defaultValue={state?.username} placeholder="Username" autoComplete="username" spellCheck={false} required />
        <input name="password" type="password" placeholder="Password" autoComplete="current-password" required />
        <button className="lp-si-go" disabled={pending}>
          {pending ? 'Signing in…' : 'Sign in'}
        </button>
        {state?.error && <p className="lp-err">{state.error}</p>}
      </form>
    </>
  );
}

function SignUpStart({ googleErr }) {
  return (
    <>
      <div className="lp-si-head">
        <h3>Create your account</h3>
        <p>Start with Google, then pick a username and password.</p>
      </div>
      <GoogleButton label="Sign up with Google" />
      {googleErr && <p className="lp-err">{googleErr}</p>}
      <p className="lp-si-foot">Free · Private to you · No card</p>
    </>
  );
}

// Step 2 of sign-up, shown in the card after Google: choose a username and a strong password.
function SetupForm({ email, name }) {
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState(null); // { ok, text, pending }
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const strength = passwordStrength(password, { username, email });
  const failing = strength.checks.find(c => !c.ok);

  useEffect(() => {
    if (!username) return setStatus(null);
    const c = checkUsername(username);
    if (!c.ok) return setStatus({ ok: false, text: c.reason });
    setStatus({ ok: false, text: 'Checking…', pending: true });
    const t = setTimeout(async () => {
      const r = await usernameStatus(username).catch(() => ({ ok: false, reason: 'Could not check right now' }));
      setStatus(r.ok ? { ok: true, text: 'Available' } : { ok: false, text: r.reason });
    }, 350);
    return () => clearTimeout(t);
  }, [username]);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      await saveCredentials({ username, password });
      location.assign('/home');
    } catch (x) {
      setErr(x.message || 'Could not save');
      setBusy(false);
    }
  }

  return (
    <form className="lp-si-form" onSubmit={save}>
      <div className="lp-si-head">
        <h3>Hi{name ? ' ' + name.split(' ')[0] : ''}, one last step</h3>
        <p>Choose how you&apos;ll sign in without Google.</p>
      </div>
      <input
        value={username}
        onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
        placeholder="Username"
        autoComplete="username"
        maxLength={24}
        spellCheck={false}
        autoFocus
      />
      <small className={'lp-hint' + (status && !status.pending ? (status.ok ? ' ok' : ' bad') : '')}>
        {status?.text || 'Letters, numbers, . _ or -. Unique to you.'}
      </small>
      <div className="lp-pass">
        <input
          type={show ? 'text' : 'password'}
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Password (10+ characters)"
          autoComplete="new-password"
          maxLength={128}
        />
        <button type="button" onClick={() => setShow(!show)}>
          {show ? 'Hide' : 'Show'}
        </button>
      </div>
      <div className={'lp-meter s' + (password ? strength.score : 0)}>
        {[0, 1, 2, 3].map(i => (
          <i key={i} className={password && i < Math.max(1, strength.score) ? 'on' : ''} />
        ))}
      </div>
      <small className="lp-hint lp-hint-row">
        <span>
          {password ? (
            <>
              <b>{strength.label}</b>
              {failing ? ' · ' + failing.text : ''}
            </>
          ) : (
            'Long beats complex.'
          )}
        </span>
        <button
          type="button"
          className="lp-gen"
          onClick={() => {
            setPassword(generatePassword());
            setShow(true);
          }}
        >
          ✦ Suggest one
        </button>
      </small>
      <button className="lp-si-go" disabled={busy || !status?.ok || !strength.ok}>
        {busy ? 'Saving…' : 'Finish & open my board'}
      </button>
      {err && <p className="lp-err">{err}</p>}
      <a href="/home" className="lp-skip">
        Skip for now
      </a>
    </form>
  );
}
