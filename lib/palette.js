// Category colours: the 8 validated categorical slots (see --cat-0..7 in globals.css), in fixed order.
// Categories 9–16 reuse those colours with a stripe pattern (stored as hue + 1000), so every category stays
// distinguishable without inventing new hues. Bars tint from the colour; charts use the exact slot colour.
export const CAT_HUES = [213, 17, 159, 41, 337, 120, 249, 0];
export const ALL_HUES = [...CAT_HUES, ...CAT_HUES.map(h => h + 1000)];
export const MAX_CATS = ALL_HUES.length;

export const catVar = hue => (CAT_HUES.includes(hue % 1000) ? `var(--cat-${CAT_HUES.indexOf(hue % 1000)})` : 'var(--cat-none)');
export const striped = hue => hue >= 1000;

// First colour no other category uses (after `from`, wrapping), or null when all are taken.
export function freeHue(used, from = -1) {
  for (let k = 1; k <= MAX_CATS; k++) {
    const h = ALL_HUES[(from + k) % MAX_CATS];
    if (!used.includes(h)) return h;
  }
  return null;
}
