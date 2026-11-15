// Plain-node check for the pure drag-width maths: `npm run check`.
// Node 24 strips TypeScript types natively, so the source module is imported directly.
import assert from 'node:assert/strict';
import { dragWidth, MIN_WIDTH_PX } from './src/width.ts';

const centre = 1000;
const available = 1500;

// Symmetric: width is twice the distance from the centre, on either side.
assert.equal(dragWidth(1400, centre, available), '800px');
assert.equal(dragWidth(600, centre, available), '800px');

// Rounds to whole pixels.
assert.equal(dragWidth(1350.3, centre, available), '701px');

// Clamped to the minimum, including a pointer exactly on the centre.
assert.equal(dragWidth(1100, centre, available), `${MIN_WIDTH_PX}px`);
assert.equal(dragWidth(centre, centre, available), `${MIN_WIDTH_PX}px`);

// Reaching or exceeding the available width becomes "100%" (Max).
assert.equal(dragWidth(1750, centre, available), '100%');
assert.equal(dragWidth(5000, centre, available), '100%');
assert.equal(dragWidth(-5000, centre, available), '100%');

// A pane narrower than the minimum can only be filled.
assert.equal(dragWidth(1100, centre, 300), '100%');

console.log('page-width check: all assertions passed');
