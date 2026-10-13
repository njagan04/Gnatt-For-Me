// Daily-log pages are rich text (HTML from a contenteditable). Only simple formatting survives: anything else is
// unwrapped to its text, and scripts / embeds are dropped. Runs in the browser before saving and before showing.
const KEEP = new Set([
  'P',
  'DIV',
  'BR',
  'B',
  'STRONG',
  'I',
  'EM',
  'U',
  'S',
  'STRIKE',
  'H1',
  'H2',
  'H3',
  'UL',
  'OL',
  'LI',
  'BLOCKQUOTE',
  'HR',
]);
const DROP = new Set([
  'SCRIPT',
  'STYLE',
  'IFRAME',
  'OBJECT',
  'EMBED',
  'TEMPLATE',
  'LINK',
  'META',
  'IMG',
  'VIDEO',
  'AUDIO',
  'FORM',
  'INPUT',
  'BUTTON',
]);

function walk(node) {
  for (const c of [...node.childNodes]) {
    if (c.nodeType === 3) continue; // text
    if (c.nodeType !== 1 || DROP.has(c.tagName.toUpperCase())) {
      c.remove();
      continue;
    }
    walk(c);
    if (!KEEP.has(c.tagName)) {
      c.replaceWith(...c.childNodes);
      continue;
    }
    for (const a of [...c.attributes]) {
      const keep = (c.tagName === 'UL' && a.name === 'class' && a.value === 'todo') || (c.tagName === 'LI' && a.name === 'data-done');
      if (!keep) c.removeAttribute(a.name);
    }
  }
}

export function cleanHtml(html) {
  const doc = new DOMParser().parseFromString(`<body>${html || ''}</body>`, 'text/html');
  walk(doc.body);
  return doc.body.innerHTML;
}
