// Category colours: 8 colour families (the validated categorical slots, --cat-0..7 in globals.css), so up to
// 8 categories each get their own family. Within its family a category can take any shade from the Excel-style
// grid (base + lighter tints + darker shades); the exact colour code is stored in categories.color.
// (Hues >= 1000 were an older striped second set; striped() still renders any that exist.)
export const CAT_HUES = [213, 17, 159, 41, 337, 120, 249, 0]; // family ids, stored as categories.hue
export const ALL_HUES = CAT_HUES;
export const MAX_CATS = ALL_HUES.length;

export const catVar = hue => (CAT_HUES.includes(hue % 1000) ? `var(--cat-${CAT_HUES.indexOf(hue % 1000)})` : 'var(--cat-none)');
export const striped = hue => hue >= 1000;
// The colour to draw a category with: its chosen code, else its family colour.
export const catColor = c => (c ? c.color || catVar(c.hue) : 'var(--cat-none)');

// The family base colours (light theme values of --cat-0..7) and, per family, the grid column:
// base, three lighter tints (80/60/40% toward white), two darker shades (25/50% toward black) — like Excel.
export const FAMILY = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'];
const mix = (hex, to, t) =>
  '#' +
  [1, 3, 5]
    .map(i => {
      const a = parseInt(hex.slice(i, i + 2), 16),
        b = parseInt(to.slice(i, i + 2), 16);
      return Math.round(a + (b - a) * t)
        .toString(16)
        .padStart(2, '0');
    })
    .join('');
export const SHADES = FAMILY.map(b => [
  b,
  mix(b, '#ffffff', 0.8),
  mix(b, '#ffffff', 0.6),
  mix(b, '#ffffff', 0.4),
  mix(b, '#000000', 0.25),
  mix(b, '#000000', 0.5),
]);
export const isColor = v => /^#[0-9a-f]{6}$/i.test(v || '');

// First colour family no other category uses (after `from`, wrapping), or null when all are taken.
export function freeHue(used, from = -1) {
  for (let k = 1; k <= MAX_CATS; k++) {
    const h = ALL_HUES[(from + k) % MAX_CATS];
    if (!used.includes(h)) return h;
  }
  return null;
}
