import './legal.css';

const CONTACT = 'adsfree1001@gmail.com';
const UPDATED = '12 October 2026';
const slug = s => s.toLowerCase().replace(/[^a-z]+/g, '-');

// Shared frame for the privacy policy and terms pages (Google's consent screen links to both).
// sections: [[heading, body], ...]; the contents list is built from the headings.
export default function Legal({ title, summary, sections }) {
  return (
    <main className="legal">
      <a href="/" className="legal-home">
        <span className="logo" /> GanttForMe
      </a>
      <h1>{title}</h1>
      <p className="muted">Last updated {UPDATED}</p>

      <aside className="legal-short">
        <b>In short</b>
        <ul>
          {summary.map(s => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </aside>

      <div className="legal-layout">
        <nav className="legal-toc" aria-label="Contents">
          <b>Contents</b>
          {sections.map(([h]) => (
            <a key={h} href={'#' + slug(h)}>
              {h}
            </a>
          ))}
        </nav>
        <div>
          {sections.map(([h, body]) => (
            <section key={h} id={slug(h)}>
              <h2>{h}</h2>
              {body}
            </section>
          ))}
          <p className="legal-contact">
            Questions or requests: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>
          </p>
        </div>
      </div>

      <nav className="legal-nav">
        <a href="/privacy">Privacy policy</a> · <a href="/terms">Terms of service</a> · <a href="/">Home</a>
      </nav>
    </main>
  );
}
