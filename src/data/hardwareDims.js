/**
 * True real-world dimensions for each class of hardware, in metres.
 *
 * Why this exists: the models were downloaded from many different sites, and
 * they disagree about both orientation *and* proportion. Measured native bounds
 * of the shipped files range from a 133 x 3.5 x 31 mm DIMM to a
 * 2085 x 2017 x 5017 mm "DIMM" of the same part. Scaling only the longest edge
 * to a real size therefore produces a chunky brick for one variant and a
 * correct stick for the next, which is what made parts of the same type look
 * rotated relative to each other inside the case.
 *
 * Fixing the per-axis size makes every variant of a type normalise to the same
 * true shape, so a RAM stick is a DIMM whichever site it came from.
 *
 * Each entry is in the part's own terms and is applied to the aligned axes as
 *   length   -> the longest edge
 *   width    -> the middle edge
 *   height   -> the thinnest edge (i.e. the part's thickness)
 * so callers do not need to know how a given downloader oriented its file.
 *
 * `mount` names the direction each of those three edges should point once the
 * part is installed, in case-local space:
 *   +X = glass side   -X = steel side
 *   +Y = up           -Y = down
 *   +Z = front panel  -Z = rear panel
 */
export const HARDWARE_REAL_DIMS = {
  motherboard: {
    // ATX is 305 x 244 mm; a populated board with heatsinks is ~45 mm thick
    length: 0.305,
    width: 0.244,
    height: 0.045,
    mount: { length: [0, 1, 0], width: [0, 0, 1], height: [1, 0, 0] }
  },
  cpu: {
    // a heatspreader-topped IHS: 40 x 40 mm, a few mm proud of the package
    length: 0.040,
    width: 0.040,
    height: 0.005,
    mount: { length: [0, 0, 1], width: [0, 1, 0], height: [1, 0, 0] }
  },
  cooler: {
    // tower cooler: 155 mm tall, 120 mm fan across, ~110 mm deep incl. fan
    length: 0.155,
    width: 0.120,
    height: 0.110,
    mount: { length: [0, 1, 0], width: [0, 0, 1], height: [1, 0, 0] }
  },
  ram: {
    // a DDR4 DIMM is 133.35 x 31.25 mm with a ~7 mm PCB; the heat spreader and
    // light bar make it ~45 mm front-to-back
    length: 0.1334,
    width: 0.045,
    height: 0.007,
    // the stick stands in its slot: long edge along the slot, thin edge to the
    // glass, 45mm width upright
    mount: { length: [0, 0, 1], width: [0, 1, 0], height: [1, 0, 0] }
  },
  storage: {
    // 2.5" SATA SSD: 100 x 70 x 7 mm
    length: 0.100,
    width: 0.070,
    height: 0.007,
    // lies flat in the tray, label up
    mount: { length: [0, 0, 1], width: [1, 0, 0], height: [0, 1, 0] }
  },
  psu: {
    // ATX PSU: 150 x 150 x 86 mm
    length: 0.150,
    width: 0.150,
    height: 0.086,
    mount: { length: [0, 0, 1], width: [1, 0, 0], height: [0, 1, 0] }
  },
  gpu: {
    // a 313 mm triple-slot card: 313 long, 130 tall, 52 thick
    length: 0.313,
    width: 0.130,
    height: 0.052,
    // hangs from the rear slots: long edge into the case, fan face down,
    // backplate up towards the glass
    mount: { length: [0, 0, 1], width: [0, 1, 0], height: [1, 0, 0] }
  }
};

/** Per-item override, e.g. a card that is genuinely a different length. */
export const HARDWARE_REAL_DIMS_OVERRIDES = {
  gpu_rx_480: { length: 0.240, width: 0.115, height: 0.030 },
  gpu_gold_edition: { length: 0.280, width: 0.120, height: 0.040 },
  cooler_noctua_nh_c12: { length: 0.124, width: 0.120, height: 0.065 },
  ram_crucial_8gb: { width: 0.031 },
  ram_crucial_8gb_b: { width: 0.031 },
  ram_generic_ddr4: { width: 0.031 },
  ram_generic_ddr4_b: { width: 0.031 },
  ram_kingston_fury_black: { width: 0.034 },
  ram_kingston_fury_black_b: { width: 0.034 }
};

/** Real dimensions for an item: its override merged over its type's default. */
export function realDimsFor(item) {
  const base = HARDWARE_REAL_DIMS[item.categoryKey];
  if (!base) return null;
  const over = HARDWARE_REAL_DIMS_OVERRIDES[item.id];
  if (!over) return { ...base };
  const merged = { ...base, ...over };
  // the mount pose is per type and must survive an override
  merged.mount = base.mount;
  return merged;
}
