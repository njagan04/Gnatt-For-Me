// The site renders at 90% on larger screens (`zoom` on <html>, see globals.css). Pointer coordinates and
// getBoundingClientRect are in screen px; lengths set in CSS are not, so screen px are divided by this.
export const zoom = () => parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
