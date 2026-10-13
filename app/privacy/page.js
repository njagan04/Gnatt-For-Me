import Legal from '../legal/Legal';

export const metadata = { title: 'Privacy policy · GanttForMe' };

const summary = [
  'We store only what is needed to run your work log: your account details and what you enter.',
  'Passwords are never stored, only a one-way scrambled version of them.',
  'No ads, no analytics, no tracking cookies. Nothing is sold or shared.',
  'Email us and we delete your whole account.',
];

const sections = [
  [
    'What we collect',
    <ul key="c">
      <li>
        <b>Your Google email address, name and profile photo.</b> When you sign in with Google, the app receives these and stores them to
        identify your account (your name and photo are only shown to the app&apos;s administrator). It does not receive your Google
        password, contacts, files or anything else from your Google account.
      </li>
      <li>
        <b>A username and password, if you add them.</b> You can choose a username and password to sign in without Google. The username is
        stored in lowercase. The password itself is never stored: it is run through scrypt, a one-way hashing function, and only the result
        is kept, so nobody, including the administrator, can read it.
      </li>
      <li>
        <b>When you sign in.</b> The time of your first and most recent sign-in, how many times you have signed in, and a count of recent
        wrong password attempts (used to pause sign-in for 15 minutes after 5 wrong tries).
      </li>
      <li>
        <b>What you enter.</b> Task names, categories, the days and hours you log, and any notes you write.
      </li>
      <li>
        <b>A sign-in cookie.</b> A signed cookie keeps you signed in for up to 30 days. There are no advertising or tracking cookies and no
        analytics.
      </li>
    </ul>,
  ],
  [
    'How it is used',
    <p key="u">
      Your data is used only to show you your own board and insights and to sign you in. Each account sees only its own data. Nothing is
      sold, shared with advertisers or used for any other purpose.
    </p>,
  ],
  [
    'Who can see it',
    <p key="w">
      Only you see your tasks and notes in the app. The administrator can see the list of accounts (name, email, username, sign-in times and
      totals such as hours logged) to run the service, and can delete an account on request.
    </p>,
  ],
  [
    'Where it is stored',
    <p key="s">
      The app runs on Vercel and stores data in a Neon Postgres database. These providers host the service and do not use your data for
      their own purposes. Connections are encrypted (HTTPS).
    </p>,
  ],
  [
    'Deleting your data',
    <p key="d">
      You can delete any task or category inside the app at any time, and turn password sign-in off from Sign-in options. To have your whole
      account and everything in it removed, email the address below from your Google account&apos;s email and it will be deleted.
    </p>,
  ],
  ['Changes', <p key="x">If this policy changes, the date at the top of this page will be updated.</p>],
];

export default function Privacy() {
  return <Legal title="Privacy policy" summary={summary} sections={sections} />;
}
