import Legal from '../legal/Legal';

export const metadata = { title: 'Terms of service · GanttForMe' };

const summary = [
  'A free, personal tool, provided as is.',
  'Your content stays yours.',
  'Keep your password to yourself and use the service fairly.',
  'Keep your own copy of anything important.',
];

const sections = [
  ['Agreement', <p key="a">By signing in to GanttForMe you agree to these terms.</p>],
  [
    'The service',
    <p key="s">
      GanttForMe is a free, personal tool for logging the work you do each day. It is provided as is, without warranties of any kind, and
      may change or stop at any time.
    </p>,
  ],
  [
    'Your account and content',
    <ul key="c">
      <li>You create your account with your own Google account and are responsible for what you enter.</li>
      <li>
        If you add a username and password, keep the password private and don&apos;t reuse one from another site. You are responsible for
        activity on your account.
      </li>
      <li>Usernames are first come, first served. Offensive or impersonating usernames may be removed.</li>
      <li>Your tasks, hours and notes remain yours. They are only used to run the app for you (see the privacy policy).</li>
      <li>Do not use the service for anything unlawful, try to access other accounts, or disrupt it for other people.</li>
    </ul>,
  ],
  [
    'Availability and data',
    <p key="d">
      We try to keep the service running and your data safe, but cannot guarantee it will always be available or that data can never be
      lost. Keep your own copy of anything important.
    </p>,
  ],
  [
    'Ending your account',
    <p key="e">You can ask for your account to be deleted at any time. Accounts that break these terms may be suspended or removed.</p>,
  ],
  ['Liability', <p key="l">To the extent the law allows, the service&apos;s maker is not liable for any loss arising from using it.</p>],
  ['Changes', <p key="x">These terms may be updated; the date at the top of this page shows when.</p>],
];

export default function Terms() {
  return <Legal title="Terms of service" summary={summary} sections={sections} />;
}
