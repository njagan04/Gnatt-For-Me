import assert from 'node:assert/strict';
import { FAMILY, SHADES, isColor, catColor } from './palette.js';

// Each family's column: its base first, then valid colour codes that get lighter, then darker.
const lum = h => [1, 3, 5].reduce((s, i) => s + parseInt(h.slice(i, i + 2), 16), 0);
for (const [i, col] of SHADES.entries()) {
  assert.equal(col[0], FAMILY[i]);
  assert.ok(col.every(isColor), col.join());
  assert.ok(lum(col[1]) > lum(col[2]) && lum(col[2]) > lum(col[3]) && lum(col[3]) > lum(col[0]), 'tints get lighter');
  assert.ok(lum(col[0]) > lum(col[4]) && lum(col[4]) > lum(col[5]), 'shades get darker');
}
assert.equal(SHADES[0][1], '#d4e4f7'); // 80% toward white from #2a78d6
assert.equal(catColor({ hue: 213, color: '#123456' }), '#123456');
assert.equal(catColor({ hue: 17, color: '' }), 'var(--cat-1)');
assert.equal(catColor(undefined), 'var(--cat-none)');
console.log('palette ok');
