'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { checkUsername, generatePassword, passwordStrength } from '../../lib/credentials';
import { removePassword, saveCredentials, usernameStatus } from './actions';

// Uniform random integer in [0, n) from the browser's crypto source (no modulo bias).
function rand(n) {
  const max = Math.floor(0xffffffff / n) * n;
  const buf = new Uint32Array(1);
  do crypto.getRandomValues(buf);
  while (buf[0] >= max);
  return buf[0] % n;
}

const fmtDate = iso => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });

export default function AccountForm({ welcome, email, method, username: savedName, hasPassword, passwordSetAt }) {
  const router = useRouter();
  const [username, setUsername] = useState(savedName);
  const [status, setStatus] = useState(savedName ? { state: 'ok', reason: 'This is your username' } : { state: 'idle' });
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [current, setCurrent] = useState('');
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { ok, text }
  const offDlg = useRef(null);
  const needsCurrent = hasPassword && method === 'password';

  // Live username check (format instantly, availability after a short pause).
  useEffect(() => {
    if (!username) return setStatus({ state: 'idle' });
    const c = checkUsername(username);
    if (!c.ok) return setStatus({ state: 'bad', reason: c.reason });
    if (c.username === savedName) return setStatus({ state: 'ok', reason: 'This is your username' });
    setStatus({ state: 'checking', reason: 'Checking…' });
    const t = setTimeout(async () => {
      try {
        const r = await usernameStatus(username);
        setStatus(r.ok ? { state: 'ok', reason: 'Available' } : { state: 'bad', reason: r.reason });
      } catch {
        setStatus({ state: 'bad', reason: 'Could not check right now' });
      }
    }, 350);
    return () => clearTimeout(t);
  }, [username]);

  const strength = passwordStrength(password, { username, email });
  const changingPassword = password.length > 0;
  const mismatch = changingPassword && confirm.length > 0 && confirm !== password;
  const canSave =
    status.state === 'ok' &&
    (changingPassword ? strength.ok && confirm === password : hasPassword && checkUsername(username).username !== savedName) &&
    (!needsCurrent || current.length > 0) &&
    !busy;

  function generate() {
    const p = generatePassword(rand);
    setPassword(p);
    setConfirm(p);
    setShow(true);
    setCopied(false);
  }
  async function copy() {
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const r = await saveCredentials({ username, password: changingPassword ? password : '', current });
      if (welcome) return router.push('/'); // first-time setup done, on to the board
      setMsg({
        ok: true,
        text: changingPassword ? `Saved. You can now sign in as “${r.username}” with your password.` : 'Username updated.',
      });
      setPassword('');
      setConfirm('');
      setCurrent('');
      router.refresh();
    } catch (err) {
      setMsg({ ok: false, text: err.message || 'Could not save' });
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    setBusy(true);
    try {
      await removePassword({ current });
      offDlg.current.close();
      setMsg({ ok: true, text: 'Password sign-in is off. Sign in with Google from now on.' });
      setCurrent('');
      router.refresh();
    } catch (err) {
      offDlg.current.close();
      setMsg({ ok: false, text: err.message || 'Could not turn it off' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="acc-grid">
      <section className="acc-card">
        <div className="acc-head">
          <span className="acc-icon google" aria-hidden="true">
            G
          </span>
          <div>
            <h2>Google</h2>
            <p className="muted">{email}</p>
          </div>
          <span className="acc-pill on">Connected</span>
        </div>
        <p className="muted tiny">Always on. It created your account, and it&apos;s how you get back in if you forget your password.</p>
      </section>

      <form className="acc-card" onSubmit={save}>
        <div className="acc-head">
          <span className="acc-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="4" y="10" width="16" height="10" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
          </span>
          <div>
            <h2>Username &amp; password</h2>
            <p className="muted">
              {hasPassword ? `Password set ${passwordSetAt ? 'on ' + fmtDate(passwordSetAt) : ''}` : 'Not set up yet'}
            </p>
          </div>
          <span className={'acc-pill' + (hasPassword ? ' on' : '')}>{hasPassword ? 'On' : 'Off'}</span>
        </div>

        <label className="acc-field">
          <span>Username</span>
          <input
            value={username}
            onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
            placeholder="e.g. jagan.n"
            autoComplete="username"
            maxLength={24}
            spellCheck={false}
          />
          {status.state !== 'idle' && <small className={'acc-status ' + status.state}>{status.reason}</small>}
          <small className="muted">3–24 characters: letters, numbers, . _ or -, starting with a letter. Unique to you.</small>
        </label>

        <label className="acc-field">
          <span>{hasPassword ? 'New password' : 'Password'}</span>
          <div className="acc-pass">
            <input
              type={show ? 'text' : 'password'}
              value={password}
              onChange={e => {
                setPassword(e.target.value);
                setCopied(false);
              }}
              placeholder={hasPassword ? 'Leave empty to keep your current password' : 'At least 10 characters'}
              autoComplete="new-password"
              maxLength={128}
            />
            <button type="button" className="quiet" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}>
              {show ? 'Hide' : 'Show'}
            </button>
          </div>
          <div className="acc-gen">
            <button type="button" className="link" onClick={generate}>
              ✦ Generate a strong password
            </button>
            {password && show && (
              <button type="button" className="link" onClick={copy}>
                {copied ? 'Copied ✓' : 'Copy'}
              </button>
            )}
          </div>
        </label>

        {changingPassword && (
          <div className="acc-strength" aria-live="polite">
            <div className={'acc-meter s' + strength.score}>
              {[0, 1, 2, 3].map(i => (
                <i key={i} className={i < Math.max(1, strength.score) ? 'on' : ''} />
              ))}
            </div>
            <b>{strength.label}</b>
            <ul>
              {strength.checks.map(c => (
                <li key={c.id} className={c.ok ? 'ok' : ''}>
                  {c.ok ? '✓' : '○'} {c.text}
                </li>
              ))}
            </ul>
          </div>
        )}

        {changingPassword && (
          <label className="acc-field">
            <span>Confirm password</span>
            <input
              type={show ? 'text' : 'password'}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              autoComplete="new-password"
              maxLength={128}
            />
            {mismatch && <small className="acc-status bad">Doesn&apos;t match</small>}
          </label>
        )}

        {needsCurrent && (
          <label className="acc-field">
            <span>Current password</span>
            <input type="password" value={current} onChange={e => setCurrent(e.target.value)} autoComplete="current-password" />
            <small className="muted">
              You signed in with your password, so we need it to make changes. Forgot it? Sign in with Google instead.
            </small>
          </label>
        )}

        {msg && <p className={'acc-msg ' + (msg.ok ? 'ok' : 'bad')}>{msg.text}</p>}

        <div className="actions">
          {hasPassword && (
            <button type="button" className="danger" onClick={() => offDlg.current.showModal()}>
              Turn off password sign-in
            </button>
          )}
          <span className="spacer" />
          <button className="primary" disabled={!canSave}>
            {busy ? <span className="spin" /> : hasPassword ? 'Save changes' : 'Set username & password'}
          </button>
        </div>
      </form>

      <aside className="acc-card acc-tips">
        <h2>Strong passwords, quickly</h2>
        <ul>
          <li>
            <b>Go long.</b> Length beats complexity: four random words are easier to remember and harder to guess than{' '}
            <code>P@ssw0rd!</code>.
          </li>
          <li>
            <b>Use it only here.</b> If another site leaks your password, a reused one opens this account too.
          </li>
          <li>
            <b>Let a password manager remember it.</b> Your browser can save the generated password for you.
          </li>
          <li>
            <b>Locked out?</b> After 5 wrong tries the username pauses for 15 minutes. Google sign-in always works.
          </li>
        </ul>
      </aside>

      <dialog ref={offDlg} className="confirm" onPointerDown={e => e.target === offDlg.current && offDlg.current.close()}>
        <div className="confirm-body">
          <h2>Turn off password sign-in?</h2>
          <p className="muted">
            You&apos;ll sign in with Google only. Your username stays reserved for you, so you can turn this back on any time.
          </p>
          {needsCurrent && !current && <p className="err">Enter your current password in the form first.</p>}
          <div className="actions">
            <button className="quiet" onClick={() => offDlg.current.close()} autoFocus>
              Cancel
            </button>
            <button className="danger solid" onClick={turnOff} disabled={busy || (needsCurrent && !current)}>
              Turn off
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
