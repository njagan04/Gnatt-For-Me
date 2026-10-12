'use client';

// Filters the users table in place (rows carry data-q); no round trip for a list this small.
export default function AdminSearch() {
  return (
    <input
      type="search"
      className="admin-search"
      placeholder="Search name, email or username"
      onInput={e => {
        const q = e.target.value.trim().toLowerCase();
        for (const tr of document.querySelectorAll('.admin-table tr[data-q]')) tr.hidden = !!q && !tr.dataset.q.includes(q);
      }}
    />
  );
}
