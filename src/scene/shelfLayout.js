import { ALL_HARDWARE_ITEMS } from '../data/hardware.js';

/**
 * Single source of truth for the long white wooden parts bench.
 *
 * Geometry is consumed by Room (the bench itself), ShelfHardware (item
 * placement) and PlayerControls (collision). The bench automatically grows along
 * its length and adds rows across its depth when more hardware needs room, so
 * nobody has to hand-tune a second set of numbers.
 *
 * Every part sits on the bench top (0.82m) - there is no under-bench storage,
 * because anything on a lower shelf is a part the player cannot reach or see.
 * Long inventories are therefore wrapped into several rows laid out across a
 * deeper bench rather than spread down a rack.
 *
 * `length` in a footprint runs along the bench, `depth` across it.
 */
const TABLE_BASE = {
  x: 3.3,
  z: 0,
  minWidth: 0.72,      // across the bench
  minLength: 2.1,      // along the bench
  maxWidth: 1.3,       // never deeper than this, however many parts there are
  height: 0.86,
  topHeight: 0.82,     // work surface the parts sit on
  topThickness: 0.045,
  legSize: 0.07,
  shelfHeight: 0.3,
  shelfThickness: 0.03,
  // one surface only: the bench top
  tierHeights: [0.82],
  tierSurfaces: [0.82],
  edgeMargin: 0.14,
  sideMargin: 0.12,
  maxGap: 0.05,        // along a row
  rowGap: 0.05         // between rows
};

/** How many rows fit across the bench without exceeding maxWidth. */
function rowCount(maxDepth) {
  const usable = TABLE_BASE.maxWidth - TABLE_BASE.sideMargin * 2;
  const pitch = maxDepth + TABLE_BASE.rowGap;
  return Math.max(1, Math.min(3, Math.floor((usable + TABLE_BASE.rowGap) / pitch)));
}

/**
 * Packs the parts into rows and writes each part's final position.
 *
 * Longest parts first, each into whichever row is currently shortest, which
 * keeps the rows close to equal and stops one long board from stretching the
 * bench. Row bands are laid out symmetrically about the bench centre.
 */
function layoutRows(entries, maxDepth, rows, length) {
  const rowsFilled = Array.from({ length: rows }, () => []);
  const sorted = [...entries].sort((a, b) => b.footprint.length - a.footprint.length);

  sorted.forEach(entry => {
    let target = 0;
    for (let i = 1; i < rows; i++) {
      if (rowsFilled[i].reduce((s, e) => s + e.footprint.length, 0) <
          rowsFilled[target].reduce((s, e) => s + e.footprint.length, 0)) {
        target = i;
      }
    }
    rowsFilled[target].push(entry);
  });

  const pitch = maxDepth + TABLE_BASE.rowGap;
  const usable = length - TABLE_BASE.edgeMargin * 2;

  rowsFilled.forEach((row, index) => {
    // band centre across the bench; each row is centred on its own band so
    // parts of differing depth still read as a tidy grid
    const bandX = TABLE_BASE.x + (index - (rows - 1) / 2) * pitch;

    row.sort((a, b) => b.footprint.length - a.footprint.length);
    const total = row.reduce((sum, e) => sum + e.footprint.length, 0);
    const gap = row.length > 1
      ? Math.min(TABLE_BASE.maxGap, Math.max(0, (usable - total) / (row.length - 1)))
      : 0;
    const rowLength = total + gap * (row.length - 1);
    let cursor = -rowLength / 2;

    row.forEach(entry => {
      entry.position = {
        x: bandX,
        y: TABLE_BASE.tierSurfaces[0],
        z: TABLE_BASE.z + cursor + entry.footprint.length / 2
      };
      entry.row = index;
      cursor += entry.footprint.length + gap;
    });
    row.totalLength = rowLength;
  });

  return rowsFilled;
}

function computeLayout() {
  // Wrapped rather than used directly: the placement is layout state and must
  // not be written onto the shared catalogue objects.
  const entries = ALL_HARDWARE_ITEMS
    .filter(item => item.footprint)
    .map(item => ({ item, footprint: item.footprint }));
  const maxDepth = entries.reduce(
    (max, entry) => Math.max(max, entry.footprint.depth),
    0
  );
  const rows = rowCount(maxDepth);
  const totalLength = entries.reduce((sum, entry) => sum + entry.footprint.length, 0);

  // the longest row decides how long the bench has to be
  const perRow = totalLength / rows;
  const perRowGap = TABLE_BASE.maxGap * (entries.length / rows - 1);
  const length = Math.max(
    TABLE_BASE.minLength,
    perRow + perRowGap + TABLE_BASE.edgeMargin * 2
  );
  const width = Math.max(
    TABLE_BASE.minWidth,
    rows * (maxDepth + TABLE_BASE.rowGap) - TABLE_BASE.rowGap + TABLE_BASE.sideMargin * 2
  );

  const rowEntries = layoutRows(entries, maxDepth, rows, length);

  return {
    table: {
      ...TABLE_BASE,
      width,
      length,
      rows,
      rowPitch: maxDepth + TABLE_BASE.rowGap,
      maxPartDepth: maxDepth
    },
    // one tier, so consumers that walk tiers keep working
    tiers: [
      {
        index: 0,
        height: TABLE_BASE.tierHeights[0],
        surface: TABLE_BASE.tierSurfaces[0],
        rows: rowEntries,
        entries
      }
    ]
  };
}

let cached = null;

export function getShelfLayout() {
  if (!cached) cached = computeLayout();
  return cached;
}

/** Footprint the player cannot walk through. */
export function getTableObstacle() {
  const { table } = getShelfLayout();
  const margin = 0.15;
  return {
    minX: table.x - table.width / 2 - margin,
    maxX: table.x + table.width / 2 + margin,
    minZ: table.z - table.length / 2 - margin,
    maxZ: table.z + table.length / 2 + margin
  };
}
