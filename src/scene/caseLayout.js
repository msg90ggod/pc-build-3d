import * as THREE from 'three';
import { HARDWARE_REAL_DIMS } from '../data/hardwareDims.js';

/**
 * Single source of truth for the procedural ATX mid-tower.
 *
 * Every number here is a real chassis measurement, so the 3D placeholder in the
 * room and the interactive Build Zone stay in sync and a real part dropped into
 * a zone lands where it would land on a bench.
 *
 * Axes:  +X = tempered glass side   -X = plain steel side
 *        +Y = up                    -Y = down
 *        +Z = front panel           -Z = rear panel
 */

// ------------------------------------------------------------------ shell
export const CASE = {
  width: 0.21,   // X
  height: 0.46,  // Y (body only, feet excluded)
  depth: 0.45,   // Z
  feet: 0.018,
  sheet: 0.009,  // steel thickness
  glass: 0.004
};

const { width: W, height: H, depth: D, feet: FEET, sheet: T, glass: GT } = CASE;

export const CASE_REF = {
  yFloor: FEET + T,
  yTop: FEET + H,
  zRear: -D / 2,
  zFront: D / 2,
  xGlassOuter: W / 2,
  xGlassInner: W / 2 - GT,
  xPlainInner: -W / 2 + T
};

// ------------------------------------------------------- pose on the bench
// Where the closed machine stands on the desk, and how far it is turned.
//
// The turn is not a taste call, it is a consequence: the two faces mean something
// different. The tempered glass is the side the game is about - the parts go in
// through it - so it faces the player, standing at the front of the bench. The
// front panel goes the other way, at the monitor across the desk, the way a
// machine is actually parked when you want to see into it while you work.
//
//   glass normal after a turn of t:  (-cos t, sin t)   (glass is on the -X side)
//   front panel normal:             (sin t, cos t)
//
// Those two are perpendicular, so pointing the front panel at the monitor points
// the glass at the player for free, and that is the pose the case stands in: the
// fan panel across the desk at the monitor, the tempered glass open to whoever is
// standing there.
//
// The bearing is left as its own number rather than folded into a final angle,
// and `BENCH_CASE_SPIN` sits on top of it at zero - turning the case a further
// quarter circle from here is a one-number change, which is worth having given
// how often this angle has been argued about.
export const BENCH_CASE_AT = { x: -0.25, z: -0.05 };
export const BENCH_MONITOR_AT = { x: 0.75, z: -0.2 };

/** Bearing from the case to the monitor: the pose that faces the glass forward. */
export const BENCH_CASE_FACING_MONITOR = Math.atan2(
  BENCH_MONITOR_AT.x - BENCH_CASE_AT.x,
  BENCH_MONITOR_AT.z - BENCH_CASE_AT.z
);

/** Extra turn on top of that bearing. Zero: the bearing is the pose. */
export const BENCH_CASE_SPIN = 0;

export const BENCH_CASE_YAW = BENCH_CASE_FACING_MONITOR + BENCH_CASE_SPIN;

// ------------------------------------------------------------ motherboard
// ATX: 244mm across the case depth, 305mm tall, rear I/O at the top rear.
const boardZ0 = CASE_REF.zRear + 0.03;
const boardLength = 0.244;
const boardHeight = 0.305;
const boardTop = CASE_REF.yTop - 0.05;

export const BOARD = {
  z0: boardZ0,
  z1: boardZ0 + boardLength,
  top: boardTop,
  bottom: boardTop - boardHeight,
  get centreY() { return (this.top + this.bottom) / 2; },
  get centreZ() { return (this.z0 + this.z1) / 2; }
};

// -------------------------------------------------------------------- tray
// The tray is pushed well back against the plain steel side. A tower cooler
// stands OFF the board along that axis - its base on the CPU and the fin stack
// reaching out towards the glass - so the gap between the copper and the pane is
// what decides whether a 155 mm cooler fits at all. From here it clears it by
// about 4 mm, and what is left behind the board is the slim cable channel every
// real case has.
export const TRAY = {
  x: -0.075,
  thickness: 0.008,
  get face() { return this.x + this.thickness / 2; },   // board mounting face
  get back() { return this.x - this.thickness / 2; },
  z0: BOARD.z0 - 0.007,
  z1: BOARD.z1 + 0.012,
  y0: 0.122,
  y1: CASE_REF.yTop - 0.012,
  // top-rear notch that gives the 120mm rear exhaust fan its clearance
  rearTop: 0.36,
  rearTopStrip: 0.46,
  // CPU cooler cut-out, centred on the socket
  cutSize: 0.078,
  cutY: boardTop - 0.05,
  cutZ: boardZ0 + 0.115,
  get cutY0() { return this.cutY - this.cutSize / 2; },
  get cutY1() { return this.cutY + this.cutSize / 2; },
  get cutZ0() { return this.cutZ - this.cutSize / 2; },
  get cutZ1() { return this.cutZ + this.cutSize / 2; }
};

// -------------------------------------------- what the ATX board offers
// The build zone supports one motherboard - the MSI B550 Tomahawk, a full ATX
// board (305 x 244 mm). The zones are placed against the board's *own* printed
// features, measured off the shipped model rather than guessed, so a CPU really
// lands on the socket you can see on the board instead of hovering in front of
// it.
//
// Those measurements are in the fitted model's own frame: X runs 305 mm up the
// board, Y is the 45 mm stack that sits on the copper, Z is the 244 mm depth.
// Mounted (see the motherboard zone) X becomes case -Y, Y becomes case +X and
// Z becomes case +Z. Because the board is centred on its own stack and rests on
// the tray, all of that collapses to one rule: caseX = TRAY.face + the height
// above the copper.
const boardThickness = HARDWARE_REAL_DIMS.motherboard.height;
/** The board is balanced on its 45 mm stack, so its PCB lands on the tray. */
const boardCentreX = TRAY.face + boardThickness / 2;
const boardCentreY = (boardTop + (boardTop - boardHeight)) / 2;
const boardCentreZ = boardZ0 + boardLength / 2;
const cpuHeight = HARDWARE_REAL_DIMS.cpu.height;
const ramThickness = HARDWARE_REAL_DIMS.ram.height;
const ramLength = HARDWARE_REAL_DIMS.ram.length;
const gpuThickness = HARDWARE_REAL_DIMS.gpu.height;

// heights above the copper, read off motherboard_am4.glb
const BOARD_PCB = 0.0015;        // the copper surface itself
const SOCKET_STANDOFF = 0.0081;  // the AM4 socket frame, 6.6 mm proud of it
const DIMM_SOCKET = 0.0155;      // the DIMM slot bodies, 14 mm proud
const PCIE_SOCKET = 0.0145;      // the PCIe x16 slot body
// and positions along the board, fitted X (negative = below centre) and fitted Z
const SOCKET_UP = -0.0485;       // 104 mm below the board's top edge
const SOCKET_BACK = -0.0217;     // 100 mm in from the rear edge
const DIMM_UP = -0.0497;         // level with the socket, as on a real board

/** The board's copper, facing the glass: what a clip-on part actually rests on. */
export const BOARD_SURFACE_X = TRAY.face + BOARD_PCB;

/**
 * The AM4 socket, measured on the board model: 104 mm below the top edge,
 * 100 mm in from the rear, its frame standing 6.6 mm off the copper.
 */
export const SOCKET = {
  x: TRAY.face + SOCKET_STANDOFF + cpuHeight / 2,
  y: boardCentreY - SOCKET_UP,
  z: boardCentreZ + SOCKET_BACK
};

/**
 * The DIMM bank. The sticks stand 133 mm tall in their slots, level with the
 * socket, and step sideways one slot pitch apart; A2 + B2 is the dual-channel
 * pair the plan asks for.
 *
 * Along the board's depth the bank is anchored just forward of the tower cooler
 * rather than on the two slots this model prints, which sit 55 mm *behind* its
 * socket - a tower cooler's 110 mm body would swallow them there. Height and
 * standoff are the measured ones.
 */
/** The board-facing face of any seated DIMM rests on this plane, whatever its width. */
export const RAM_SLOT_FACE_X = TRAY.face + DIMM_SOCKET;
export const RAM_DEFAULT_WIDTH = HARDWARE_REAL_DIMS.ram.width;

/** The DIMM bank. The sticks stand 133 mm tall in their slots, level with the
 *  socket, and step sideways one slot pitch apart; A2 + B2 is the dual-channel
 *  pair the plan asks for.
 *
 *  Along the board's depth the bank is anchored just forward of the tower cooler
 *  rather than on the two slots this model prints, which sit 55 mm *behind* its
 *  socket - a tower cooler's 110 mm body would swallow them there. Height and
 *  standoff are the measured ones.
 */
const dimmPitch = 0.0095;
const dimmCentreY = boardCentreY - DIMM_UP;
const dimmX = RAM_SLOT_FACE_X + RAM_DEFAULT_WIDTH / 2;
const dimmSlotZ = BOARD.z1 - 0.067;
export const RAM_SLOTS = {
  a1: [dimmX, dimmCentreY, dimmSlotZ],
  a2: [dimmX, dimmCentreY, dimmSlotZ + dimmPitch],
  b1: [dimmX, dimmCentreY, dimmSlotZ + dimmPitch * 2],
  b2: [dimmX, dimmCentreY, dimmSlotZ + dimmPitch * 3]
};
/** Slot heights across the bank, used for the highlight box. */
export const RAM_SLOT_SPAN = {
  y0: dimmCentreY - ramLength / 2,
  y1: dimmCentreY + ramLength / 2,
  z0: dimmSlotZ - ramThickness / 2,
  z1: RAM_SLOTS.b2[2] + ramThickness / 2
};

// ------------------------------------------------------------ PSU shroud
// Chamber sized for a real ATX unit: 140 wide x 150 deep x 86 tall.
export const SHROUD = {
  top: 0.122,
  x0: CASE_REF.xPlainInner,
  x1: 0.048,
  z0: CASE_REF.zRear + 0.006,
  z1: 0.14,
  get depth() { return this.z1 - this.z0; },
  get width() { return this.x1 - this.x0; },
  get midZ() { return (this.z0 + this.z1) / 2; },
  get midX() { return (this.x0 + this.x1) / 2; }
};

// ------------------------------------------------------------ rear panel
export const REAR = {
  plane: CASE_REF.zRear + T / 2,
  centreY: FEET + H / 2,
  halfW: (W - 0.004) / 2,
  halfH: (H - 0.008) / 2,
  fan: { x: -0.012, y: 0.409, r: 0.057 },
  io: { y: 0.326, w: 0.159, h: 0.042 },
  slots: { x: -0.012, top: 0.2865, pitch: 0.0203, span: 0.145, w: 0.122 },
  psu: { x: -0.024, w: 0.14, h: 0.086, y: CASE_REF.yFloor + 0.043 }
};
REAR.slots.y = REAR.slots.top - REAR.slots.span / 2;
REAR.toLocalY = worldY => worldY - REAR.centreY;

// ------------------------------------------------------------------- roof
export const ROOF = {
  fan: { x: 0, z: 0.045, r: 0.07 },
  io: { x: -0.02, z: CASE_REF.zFront - 0.05 }
};

/** Tray panels, in case-local [yMin, yMax, zMin, zMax]. Voids: CPU cut-out + fan notch. */
export function trayRects() {
  return [
    [TRAY.y0, TRAY.rearTop, TRAY.z0, TRAY.cutZ0],
    [TRAY.rearTopStrip, TRAY.y1, TRAY.z0, TRAY.cutZ0],
    [TRAY.y0, TRAY.cutY0, TRAY.cutZ0, TRAY.cutZ1],
    [TRAY.cutY1, TRAY.y1, TRAY.cutZ0, TRAY.cutZ1],
    [TRAY.y0, TRAY.y1, TRAY.cutZ1, TRAY.z1]
  ];
}

export function trayHas(y, z) {
  return trayRects().some(
    ([y0, y1, z0, z1]) => y >= y0 && y <= y1 && z >= z0 && z <= z1
  );
}

/** The nine ATX mounting-hole positions, case-local. */
export const ATX_STANDOFFS = [
  [0.011, 0.006], [0.011, 0.075], [0.011, 0.144],
  [0.101, 0.006], [0.101, 0.144],
  [0.191, 0.006], [0.191, 0.075], [0.191, 0.144],
  [0.101, 0.222]
].map(([u, v]) => ({ y: boardTop - v, z: boardZ0 + u }));

/** Standoffs that actually exist: the top-rear one falls inside the fan notch. */
export const ATX_STANDOFFS_ACTIVE = ATX_STANDOFFS.filter(s => trayHas(s.y, s.z));

/**
 * Build Zone snap anchors, in case-local space.
 *  anchor     = where a correctly seated part sits
 *  size       = the zone footprint, used for the highlight box and screen-space snap
 *  mount      = how the part is oriented once installed:
 *                 long - where the part's longest edge points
 *                 thin - where the part's thinnest axis (its visible face) points
 *               Chosen so a builder looking through the glass pane can read
 *               every part at a glance.
 *  face       - which way fasteners come in, and therefore where screw heads sit
 *  faceLift   - how far the fastener heads stand proud of that face
 *  screws     = how many fasteners lock the part down
 *  screwPts   = authored offsets, read as:
 *                 face +/-X : [a, b] = (up, along the rack)
 *                 face +Y   : [a, b] = (along the rack, across)
 *                 face -Z   : [a, b] = (across, up)
 *               so fasteners land where a real builder would put them, on the
 *               same side as the part's own mounting face.
 */

export const CASE_ZONES = {
  glass: {
    label: 'Nắp kính cường lực',
    anchor: [CASE_REF.xGlassOuter, FEET + H / 2, 0],
    size: [0.02, H - 0.012, D - 0.012],
    mount: { long: [0, 1, 0], thin: [1, 0, 0] },
    face: [1, 0, 0],
    faceLift: 0.008,
    screws: 4,
    screwPts: [[-0.17, -0.17], [-0.17, 0.17], [0.17, -0.17], [0.17, 0.17]]
  },
  motherboard: {
    label: 'Vị trí bo mạch chủ ATX',
    anchor: [boardCentreX, boardCentreY, boardCentreZ],
    size: [0.006, boardHeight, boardLength],
    // Same ATX fit as authored: 305mm runs vertically in the tray and the 45mm
    // component stack faces the glass, so the board's copper rests on the tray
    // face. The long edge maps to -Y so the board is carried flipped in its own
    // spot: that is the pose the printed socket lands in the upper half of the
    // tray, level with the DIMM bank and with the PCIe slot below both. The
    // anchors above are read off the model in that pose.
    mount: { long: [0, -1, 0], thin: [1, 0, 0] },
    face: [1, 0, 0],
    faceLift: 0.014,
    // the real ATX hole pattern - one hole sits under the fan notch, so this
    // chassis genuinely fastens with 8, not 9
    screws: ATX_STANDOFFS_ACTIVE.length,
    screwPts: ATX_STANDOFFS_ACTIVE.map(s => [s.y - boardCentreY, s.z - boardCentreZ])
  },
  cpu: {
    label: 'Socket CPU',
    // on the socket the board model actually prints, its heatspreader resting
    // on the socket frame rather than floating in front of the board
    anchor: [SOCKET.x, SOCKET.y, SOCKET.z],
    size: [0.01, 0.042, 0.042],
    // flat against the board, heatspreader facing the glass
    mount: { long: [0, 1, 0], thin: [1, 0, 0] },
    face: [1, 0, 0],
    faceLift: 0.008,
    screws: 0
  },
  cooler: {
    label: 'Tản nhiệt khí trên socket',
    // The cooler stands off the board on the socket's normal: its base block
    // lands on the CPU and the fin stack reaches out towards the glass, which is
    // what every model in public/models is actually shaped like (measured: the
    // cpu plate sits at the -X end of the fitted part in all three). It used to
    // be mounted with that axis vertical, so the base pointed at the floor and
    // nothing lined up with the CPU.
    //   long -> +X   the base-to-fin-stack axis: base on the CPU, fins to the glass
    //   thin -> -Z   cross() then sends the fan axis to +Y, so the fan faces up
    anchor: [
      Math.min(
        SOCKET.x + cpuHeight / 2 + HARDWARE_REAL_DIMS.cooler.length / 2,
        CASE_REF.xGlassInner - HARDWARE_REAL_DIMS.cooler.length / 2 - 0.002
      ),
      SOCKET.y,
      SOCKET.z
    ],
    size: [
      HARDWARE_REAL_DIMS.cooler.length,
      HARDWARE_REAL_DIMS.cooler.width,
      HARDWARE_REAL_DIMS.cooler.height
    ],
    // fin stack reaching to the glass, fan on its upper face blowing up
    mount: { long: [1, 0, 0], thin: [0, 0, -1] },
    face: [1, 0, 0],
    // the spring screws are reached from the far side, past the fin stack
    faceLift: HARDWARE_REAL_DIMS.cooler.length + 0.004,
    screws: 4,
    // the four spring posts around the cold plate
    screwPts: [[-0.02, -0.022], [0.02, -0.022], [0.02, 0.022], [-0.02, 0.022]]
  },
  ram: {
    label: 'Khe RAM DDR4 (cắm khe 2 & 4)',
    // the anchor is the middle of the DIMM bank - that is where the highlight
    // box belongs - while `slots` gives each stick its own seat
    anchor: [
      dimmX,
      dimmCentreY,
      (RAM_SLOT_SPAN.z0 + RAM_SLOT_SPAN.z1) / 2
    ],
    // dual-channel pair first, so two sticks land in A2 and B2
    slots: [RAM_SLOTS.a2, RAM_SLOTS.b2],
    size: [
      HARDWARE_REAL_DIMS.ram.width,
      RAM_SLOT_SPAN.y1 - RAM_SLOT_SPAN.y0,
      RAM_SLOT_SPAN.z1 - RAM_SLOT_SPAN.z0
    ],
    // The stick stands in its slot: 133mm long edge straight up the board,
    // the 45mm heat spreader out towards the glass, and the 7mm PCB edge-on
    // to the side - which is how you actually read a DIMM through a side panel.
    mount: { long: [0, 1, 0], thin: [0, 0, 1] },
    face: [1, 0, 0],
    faceLift: 0.012,
    screws: 0
  },
  ssd: {
    label: 'Khay ổ cứng 2.5" trên tấm che nguồn',
    anchor: [-0.01, SHROUD.top + 0.005, 0.05],
    size: [0.1, 0.008, 0.07],
    // 2.5" drive lies in the tray, label upwards
    mount: { long: [1, 0, 0], thin: [0, 1, 0] },
    face: [0, 1, 0],
    faceLift: 0.01,
    screws: 2,
    // both screws at the tail of the drive
    screwPts: [[0, -0.03], [0, 0.03]]
  },
  psu: {
    label: 'Hộc nguồn ATX dưới đáy',
    // a 150mm unit sits at the rear of the bay
    anchor: [SHROUD.midX, CASE_REF.yFloor + 0.043, SHROUD.z0 + 0.075],
    size: [SHROUD.width - 0.01, 0.086, 0.15],
    mount: { long: [1, 0, 0], thin: [0, 1, 0] },
    // screwed in through the shroud wall you can see through the glass
    face: [1, 0, 0],
    faceLift: 0.085,
    screws: 4,
    screwPts: [[-0.03, -0.06], [-0.03, 0.06], [0.03, -0.06], [0.03, 0.06]]
  },
  gpu: {
    label: 'Khe PCIe x16',
    // 313mm card hangs from the rear slots: its edge connector goes into the
    // slot the board prints, and its top edge clears the bottom of the DIMMs
    anchor: [
      TRAY.face + PCIE_SOCKET + gpuThickness / 2,
      RAM_SLOT_SPAN.y0 - 0.006 - HARDWARE_REAL_DIMS.gpu.width / 2,
      BOARD.z0 + 0.157
    ],
    size: [0.112, 0.05, 0.313],
    // card hangs nose-forward: its 313mm length runs into the case, the 52mm
    // body thickness faces the glass, and the 130mm height stands upright with
    // the fans down. Mapping the thin axis vertical here (as this once did)
    // laid the card on its side.
    mount: { long: [0, 0, 1], thin: [1, 0, 0] },
    face: [0, 1, 0],
    faceLift: 0.032,
    screws: 2,
    // retention screws on the bracket at the rear, 120mm apart
    screwPts: [[-0.12, -0.05], [-0.12, 0.05]]
  },
  cables: {
    label: 'Dây nguồn 24-pin & 8-pin CPU',
    anchor: [TRAY.back - 0.012, BOARD.centreY, BOARD.centreZ],
    size: [0.03, 0.14, 0.12],
    face: [-1, 0, 0],
    faceLift: 0.01,
    screws: 0
  },
  display: {
    label: 'Cổng xuất hình DisplayPort',
    anchor: [-0.03, REAR.io.y, CASE_REF.zRear + 0.012],
    size: [0.05, 0.05, 0.02],
    face: [0, 0, -1],
    faceLift: 0.006,
    screws: 0
  },
  power: {
    label: 'Nút nguồn trên nắp trên',
    anchor: [ROOF.io.x, CASE_REF.yTop + 0.004, ROOF.io.z],
    size: [0.022, 0.012, 0.022],
    face: [0, 1, 0],
    faceLift: 0.004,
    screws: 0
  }
};

/**
 * Builds the quaternion that stands a fitted part up in its mount orientation.
 *
 * `zone.mount` maps the part's three edges onto case axes. The older form named
 * only two - `long` and `thin` - and the third was derived. That is ambiguous
 * for parts like a graphics card, where naming all three is the only way to say
 * "long edge into the case, fan face down, backplate to the glass", so the
 * three-axis form is preferred and the two-axis form still works.
 */
export function mountQuaternion(zone) {
  const m = zone.mount;
  if (!m) return null;

  // the part's own edges, longest first
  const edges = m.edges
    ? {
        x: new THREE.Vector3(...m.edges.long).normalize(),
        y: new THREE.Vector3(...m.edges.thin).normalize(),
        z: new THREE.Vector3(...m.edges.width).normalize()
      }
    : {
        x: new THREE.Vector3(...m.long).normalize(),
        y: new THREE.Vector3(...m.thin).normalize(),
        z: new THREE.Vector3().crossVectors(
          new THREE.Vector3(...m.long),
          new THREE.Vector3(...m.thin)
        ).normalize()
      };

  // A part whose edges are not mutually perpendicular (a bent or lathed model)
  // would collapse here, so re-orthogonalise before building the basis.
  const basis = new THREE.Matrix4().makeBasis(edges.x, edges.y, edges.z);
  if (Math.abs(basis.determinant()) < 1e-6) return null;
  return new THREE.Quaternion().setFromRotationMatrix(basis);
}


/** Bounding box of the whole chassis, used to frame the camera. */
export const CASE_BOUNDS = {
  min: [-W / 2, 0, -D / 2],
  max: [W / 2, FEET + H, D / 2]
};

export { W as CASE_WIDTH, H as CASE_HEIGHT, D as CASE_DEPTH, T as CASE_SHEET, GT as CASE_GLASS };
