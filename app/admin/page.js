import { notFound } from 'next/navigation';
import { getUser, isAdmin } from '../../lib/auth';
import { sql } from '../../lib/db';
import AdminSearch from './AdminSearch';
import DeleteUser from './DeleteUser';
import '../board/editor.css';
import './admin.css';

export const metadata = { title: 'Admin · GnattForMe' };
export const dynamic = 'force-dynamic'; // always fresh numbers

const n = v => +Number(v).toFixed(1);
const ago = d => {
  const s = (Date.now() - new Date(d)) / 1000;
  const [v, u] = s < 3600 ? [s / 60, 'minute'] : s < 86400 ? [s / 3600, 'hour'] : [s / 86400, 'day'];
  return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(-Math.max(0, Math.round(v)), u);
};
const date = d => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

// Admins only (ADMIN_EMAILS); anyone else gets a plain 404.
export default async function Admin() {
  const me = await getUser();
  if (!me || !isAdmin(me)) notFound();

  const [users, [totals]] = await Promise.all([
    sql`with t as (select owner, count(*)::int as tasks from tasks group by owner),
             c as (select owner, count(*)::int as cats from categories group by owner),
             l as (select t.owner, count(*)::int as entries, coalesce(sum(l.hours), 0)::float as hours,
                          coalesce(sum(l.hours) filter (where l.day >= current_date - 30), 0)::float as hours30,
                          max(l.day)::text as last_day
                   from logs l join tasks t on t.id = l.task_id group by t.owner)
        select u.email, u.name, u.picture, u.username, u.password_hash is not null as pw, u.first_seen, u.last_seen, u.sign_ins,
               coalesce(t.tasks, 0) as tasks, coalesce(c.cats, 0) as cats,
               coalesce(l.entries, 0) as entries, coalesce(l.hours, 0) as hours, coalesce(l.hours30, 0) as hours30, l.last_day
        from users u left join t on t.owner = u.email left join c on c.owner = u.email left join l on l.owner = u.email
        order by u.last_seen desc`,
    sql`select (select count(*) from users)::int as users,
               (select count(*) from users where last_seen > now() - interval '7 days')::int as active7,
               (select count(*) from users where first_seen > now() - interval '7 days')::int as new7,
               (select count(*) from users where password_hash is not null)::int as pw,
               (select count(*) from tasks)::int as tasks,
               (select coalesce(sum(hours), 0) from logs)::float as hours`,
  ]);

  return (
    <main className="admin">
      <header className="top">
        <a href="/" className="brand" title="GnattForMe">
          <span className="logo" />
        </a>
        <a href="/" className="back">
          ← Board
        </a>
        <span className="spacer" />
        <span className="admin-badge">Admin</span>
      </header>

      <div className="admin-body">
        <div className="admin-title">
          <h1>Users</h1>
          <AdminSearch />
        </div>
        <section className="admin-tiles">
          <Tile label="Users" value={totals.users} sub="signed in at least once" />
          <Tile label="Active" value={totals.active7} sub="signed in, last 7 days" />
          <Tile label="New" value={totals.new7} sub="first sign-in, last 7 days" />
          <Tile label="Password" value={totals.pw} sub="can sign in with a username" />
          <Tile label="Tasks" value={totals.tasks} sub="across everyone" />
          <Tile label="Hours" value={`${n(totals.hours)}h`} sub="logged in total" />
        </section>

        <section className="admin-card">
          {users.length ? (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Sign-in</th>
                  <th>Last seen</th>
                  <th className="num">Sign-ins</th>
                  <th className="num">Tasks</th>
                  <th className="num">Categories</th>
                  <th className="num">Hours</th>
                  <th>Last logged</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.email} data-q={[u.name, u.email, u.username].filter(Boolean).join(' ').toLowerCase()}>
                    <td>
                      <div className="who">
                        {u.picture ? (
                          <img src={u.picture} alt="" referrerPolicy="no-referrer" />
                        ) : (
                          <span className="avatar">{u.email[0].toUpperCase()}</span>
                        )}
                        <div>
                          <b>
                            {u.name || u.email.split('@')[0]}
                            {isAdmin(u.email) && <span className="admin-badge sm">Admin</span>}
                          </b>
                          <span className="muted">
                            {u.email}
                            {u.username && <> · @{u.username}</>}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="method">Google</span>
                      {u.pw && <span className="method pw">Password</span>}
                    </td>
                    <td title={new Date(u.last_seen).toISOString()}>
                      <div className="two">
                        {ago(u.last_seen)}
                        <small className="muted">joined {date(u.first_seen)}</small>
                      </div>
                    </td>
                    <td className="num">{u.sign_ins}</td>
                    <td className="num">{u.tasks}</td>
                    <td className="num">{u.cats}</td>
                    <td className="num">
                      <div className="two">
                        {n(u.hours)}h<small className="muted">{n(u.hours30)}h in 30 days</small>
                      </div>
                    </td>
                    <td>{u.last_day ? date(u.last_day) : <span className="muted">—</span>}</td>
                    <td className="num">{u.email !== me && <DeleteUser email={u.email} tasks={u.tasks} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="muted admin-empty">Nobody has signed in yet.</p>
          )}
        </section>
      </div>
    </main>
  );
}

function Tile({ label, value, sub }) {
  return (
    <div className="admin-tile">
      <span>{label}</span>
      <b>{value}</b>
      <small>{sub}</small>
    </div>
  );
}
