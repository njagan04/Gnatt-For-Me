import { logout } from '../actions';
import AccountForm from '../account/AccountForm';
import ThemeSwitch from '../board/ThemeSwitch';
import '../board/editor.css';
import '../account/account.css';

const date = d => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

// Settings tab: who you are, appearance, how you sign in, admin, log out.
export default function Settings({ session, row, admin, welcome }) {
  const email = session.user;
  return (
    <div className="set">
      {welcome && (
        <div className="acc-welcome">
          <div>
            <h1>Welcome to GnattForMe 👋</h1>
            <p className="muted">Your account is ready. Pick a username and password so you can also sign in on devices without Google.</p>
          </div>
          <a href="/" className="back">
            Skip for now →
          </a>
        </div>
      )}

      <section className="set-card set-profile">
        {row?.picture ? (
          <img src={row.picture} alt="" referrerPolicy="no-referrer" className="set-pic" />
        ) : (
          <span className="avatar big">{email[0].toUpperCase()}</span>
        )}
        <div>
          <h2>{row?.name || email.split('@')[0]}</h2>
          <p className="muted">
            {email}
            {row?.username && <> · @{row.username}</>}
          </p>
          {row?.first_seen && <p className="muted tiny">Member since {date(row.first_seen)}</p>}
        </div>
        {admin && <span className="admin-pill">Admin</span>}
      </section>

      <section className="set-card set-row">
        <div>
          <h2>Appearance</h2>
          <p className="muted">Light, dark, or follow your system.</p>
        </div>
        <ThemeSwitch />
      </section>

      <h2 className="set-title">Sign-in</h2>
      <AccountForm
        welcome={welcome}
        email={email}
        method={session.method}
        username={row?.username || ''}
        hasPassword={!!row?.password_hash}
        passwordSetAt={row?.password_set_at ? new Date(row.password_set_at).toISOString() : null}
      />

      {admin && (
        <a href="/admin" className="set-card set-row set-link">
          <div>
            <h2>Admin · users</h2>
            <p className="muted">Everyone who has signed in, their activity, and account removal.</p>
          </div>
          <span>→</span>
        </a>
      )}

      <form action={logout} className="set-card set-row">
        <div>
          <h2>Log out</h2>
          <p className="muted">Sign out of this browser.</p>
        </div>
        <button className="danger">Log out</button>
      </form>
    </div>
  );
}
