import * as THREE from 'three';
import { getShelfLayout } from './shelfLayout.js';
import { BenchTodoList } from './BenchTodoList.js';
import { buildFittedModel } from './ModelFit.js';
import { loadModelCopy } from './ModelCache.js';
import { loadCaseModel } from './CaseModel.js';
import {
  CASE, CASE_REF, CASE_SHEET as T, CASE_GLASS as GT, CASE_WIDTH as W,
  CASE_HEIGHT as H, CASE_DEPTH as D,
  BOARD, TRAY, SHROUD, REAR, ROOF, trayRects, ATX_STANDOFFS,
  BENCH_CASE_AT, BENCH_CASE_YAW, BENCH_MONITOR_AT
} from './caseLayout.js';

/**
 * The desk peripherals, as downloaded models.
 *
 * `realSize` is the real-world longest edge and is the only number that has to be
 * right: the files are Sketchfab exports in their own units (the board arrives
 * 0.906 units wide, the mouse 4.302 long), so the loader scales each model from
 * its own bounding box. `size` is the stand-in box shown while the GLB loads -
 * the real thing's own proportions at that scale, so the swap does not jump.
 */
/**
 * The monitor, as a downloaded model.
 *
 * 27" panel with its stand: about 610 mm across, which is the longest edge of the
 * export. The yaw matches the angle the procedural monitor was drawn at, so the
 * panel still turns towards the player and towards the case.
 */
const MONITOR = {
  modelPath: '/models/Peripherals_model/asus_pc_gaming_monitor.glb',
  realSize: 0.61,
  yaw: -0.25
};

const PERIPHERALS = {
  keyboard: {
    modelPath: '/models/Peripherals_model/gigabyte_aorus_k1_rgb_gaming_keyboard.glb',
    realSize: 0.443,                                   // a tenkeyless board is ~443 mm across
    size: [0.443, 0.037, 0.13],                       // w, h, d as authored (906 : 75 : 266)
    x: 0.45, z: 0.22, yaw: -0.15
  },
  mouse: {
    modelPath: '/models/Peripherals_model/computer_mouse.glb',
    realSize: 0.125,                                   // 125 mm nose to tail
    size: [0.065, 0.042, 0.125],                      // as authored (2247 : 1449 : 4302)
    // turned 180 degrees off the exported pose: the file's nose points back at
    // the player, and a mouse on a bench points away from them, the way the
    // hand pushes it
    x: 0.82, z: 0.2, yaw: Math.PI - 0.1
  },
  mousepad: {
    modelPath: '/models/Peripherals_model/damascus_mousepad.glb',
    realSize: 0.4,                                      // a 400 x 240 mm desk mat
    size: [0.4, 0.003, 0.241],                          // as authored (3325 : 19 : 2000)
    // centred on the mouse, the way a mat is actually used: the pointer sits in
    // the middle of it rather than balanced on its edge. The build-plan clipboard
    // moved right to make room - see BenchTodoList PLACEMENT
    x: 0.82, z: 0.2, yaw: -0.1
  }
};

// The mat is a few millimetres thick, so the two things standing on it are lifted
// by that much - otherwise the keyboard's feet sink into it.
const PAD_THICKNESS = 0.003;

export class Room {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.colliders = [];
    this.surfaces = [];
    this.interactables = [];
    this.monitorTexture = null;
    this.monitorCanvas = null;
    this.monitorContext = null;
    this.monitorScreenMesh = null;
    this.monitorState = 'OFF'; // 'OFF', 'NO_SIGNAL', 'POST', 'OS'
    this.postProgress = 0;
    this.rgbTime = 0;

    this.createRoom();
    this.createWorkbench();
    this.createBenchTodoList();
    this.createPartsTable();
    this.createComputerCasePlaceholder();
    this.createMonitor();
    this.createPeripherals();
    this.createDecorations();

    this.scene.add(this.group);
  }

  createRoom() {
    // Room dimensions: 12m wide, 10m deep, 4.2m high
    const roomWidth = 12;
    const roomDepth = 10;
    const roomHeight = 4.2;

    // Floor texture: Clean light oak wood planks / modern concrete
    const floorCanvas = document.createElement('canvas');
    floorCanvas.width = 512;
    floorCanvas.height = 512;
    const fCtx = floorCanvas.getContext('2d');
    fCtx.fillStyle = '#e5e0d8';
    fCtx.fillRect(0, 0, 512, 512);
    // Subtle wood planks
    fCtx.strokeStyle = '#d0cac0';
    fCtx.lineWidth = 3;
    for (let y = 0; y <= 512; y += 64) {
      fCtx.beginPath();
      fCtx.moveTo(0, y);
      fCtx.lineTo(512, y);
      fCtx.stroke();
    }
    for (let y = 0; y < 512; y += 64) {
      const offset = (y / 64) % 2 === 0 ? 0 : 128;
      for (let x = offset; x <= 512; x += 256) {
        fCtx.beginPath();
        fCtx.moveTo(x, y);
        fCtx.lineTo(x, y + 64);
        fCtx.stroke();
      }
    }
    const floorTex = new THREE.CanvasTexture(floorCanvas);
    floorTex.wrapS = THREE.RepeatWrapping;
    floorTex.wrapT = THREE.RepeatWrapping;
    floorTex.repeat.set(6, 5);

    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.45,
      metalness: 0.05
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(roomWidth, roomDepth), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    // Tagged so dropped hardware can tell "on the floor" from "on a bench"
    floor.userData = { isFloor: true };
    this.group.add(floor);
    this.surfaces.push(floor);

    // Ceiling
    const ceilMat = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.9 });
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(roomWidth, roomDepth), ceilMat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = roomHeight;
    this.group.add(ceil);

    // Walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xf4f3f0, roughness: 0.8 });
    const accentWallMat = new THREE.MeshStandardMaterial({ color: 0xe8e6e1, roughness: 0.7 });

    // Back Wall (Z = -roomDepth / 2)
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(roomWidth, roomHeight), accentWallMat);
    backWall.position.set(0, roomHeight / 2, -roomDepth / 2);
    backWall.receiveShadow = true;
    this.group.add(backWall);

    // Front Wall (Z = roomDepth / 2)
    const frontWall = new THREE.Mesh(new THREE.PlaneGeometry(roomWidth, roomHeight), wallMat);
    frontWall.rotation.y = Math.PI;
    frontWall.position.set(0, roomHeight / 2, roomDepth / 2);
    this.group.add(frontWall);

    // Left Wall with large window
    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(roomDepth, roomHeight), wallMat);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-roomWidth / 2, roomHeight / 2, 0);
    this.group.add(leftWall);

    // Window frame on left wall
    const windowFrameMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.3 });
    const winOuter = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.4, 5.0), windowFrameMat);
    winOuter.position.set(-roomWidth / 2 + 0.05, 2.2, 0);
    this.group.add(winOuter);

    // Window Glass with sky glow
    const winGlassMat = new THREE.MeshBasicMaterial({
      color: 0xddf0ff,
      transparent: true,
      opacity: 0.85
    });
    const winGlass = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.2, 4.8), winGlassMat);
    winGlass.position.set(-roomWidth / 2 + 0.05, 2.2, 0);
    this.group.add(winGlass);

    // Right Wall (next to iron rack)
    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(roomDepth, roomHeight), wallMat);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(roomWidth / 2, roomHeight / 2, 0);
    rightWall.receiveShadow = true;
    this.group.add(rightWall);

    // Baseboards around walls
    const baseboardMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
    const bbBack = new THREE.Mesh(new THREE.BoxGeometry(roomWidth, 0.15, 0.04), baseboardMat);
    bbBack.position.set(0, 0.075, -roomDepth / 2 + 0.02);
    this.group.add(bbBack);
  }

  createWorkbench() {
    // Workbench in center: 2.6m wide, 1.2m deep, 0.82m high
    const tableWidth = 2.6;
    const tableDepth = 1.2;
    const tableHeight = 0.82;
    const topThickness = 0.06;

    // Rich dark oak wooden tabletop texture
    const woodCanvas = document.createElement('canvas');
    woodCanvas.width = 512;
    woodCanvas.height = 512;
    const wCtx = woodCanvas.getContext('2d');
    wCtx.fillStyle = '#6b4724'; // Warm oak tone
    wCtx.fillRect(0, 0, 512, 512);
    // Subtle wood grain stripes
    for (let i = 0; i < 50; i++) {
      const y = Math.random() * 512;
      wCtx.strokeStyle = Math.random() > 0.5 ? '#553617' : '#7d542d';
      wCtx.lineWidth = 2 + Math.random() * 4;
      wCtx.beginPath();
      wCtx.moveTo(0, y);
      wCtx.bezierCurveTo(150, y + (Math.random() - 0.5) * 20, 350, y + (Math.random() - 0.5) * 20, 512, y);
      wCtx.stroke();
    }
    const woodTex = new THREE.CanvasTexture(woodCanvas);
    woodTex.wrapS = THREE.RepeatWrapping;
    woodTex.wrapT = THREE.RepeatWrapping;
    woodTex.repeat.set(2, 1);

    const tableTopMat = new THREE.MeshStandardMaterial({
      map: woodTex,
      roughness: 0.35,
      metalness: 0.05
    });

    const tableTop = new THREE.Mesh(
      new THREE.BoxGeometry(tableWidth, topThickness, tableDepth),
      tableTopMat
    );
    tableTop.position.set(0, tableHeight - topThickness / 2, 0);
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    this.group.add(tableTop);
    this.surfaces.push(tableTop);

    // Sturdy matte black steel legs
    const legMat = new THREE.MeshStandardMaterial({
      color: 0x1f2226,
      roughness: 0.4,
      metalness: 0.8
    });

    const legRadius = 0.04;
    const legH = tableHeight - topThickness;
    const legPositions = [
      [-tableWidth / 2 + 0.1, legH / 2, -tableDepth / 2 + 0.1],
      [tableWidth / 2 - 0.1, legH / 2, -tableDepth / 2 + 0.1],
      [-tableWidth / 2 + 0.1, legH / 2, tableDepth / 2 - 0.1],
      [tableWidth / 2 - 0.1, legH / 2, tableDepth / 2 - 0.1]
    ];

    legPositions.forEach(([x, y, z]) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, legH, 0.08), legMat);
      leg.position.set(x, y, z);
      leg.castShadow = true;
      leg.receiveShadow = true;
      this.group.add(leg);
    });

    // Crossbar support
    const crossbar = new THREE.Mesh(new THREE.BoxGeometry(tableWidth - 0.2, 0.05, 0.05), legMat);
    crossbar.position.set(0, 0.25, -tableDepth / 2 + 0.1);
    this.group.add(crossbar);

    // Add table to collision system
    this.colliders.push({
      minX: -tableWidth / 2 - 0.2,
      maxX: tableWidth / 2 + 0.2,
      minZ: -tableDepth / 2 - 0.2,
      maxZ: tableDepth / 2 + 0.2
    });

    // Antistatic assembly desk pad on table (center-left for assembling)
    const padMat = new THREE.MeshStandardMaterial({
      color: 0x1a2130,
      roughness: 0.6,
      metalness: 0.1
    });
    const pad = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.005, 0.8), padMat);
    pad.position.set(-0.25, tableHeight + 0.003, 0);
    pad.receiveShadow = true;
    this.group.add(pad);
    this.surfaces.push(pad);

    // Decorative grid on antistatic pad
    const padBorderMat = new THREE.MeshBasicMaterial({ color: 0x3b82f6 });
    const padBorder = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.006, 0.01), padBorderMat);
    padBorder.position.set(-0.25, tableHeight + 0.004, -0.39);
    this.group.add(padBorder);
  }

  /**
   * The parts to-do list, standing on the bench rather than floating over it.
   *
   * The guided build panel only exists once the player is at the case, but the
   * fetching happens out in the room, so the list has to be out there too. See
   * BenchTodoList for the shape and `updateTodoList` for who drives it.
   */
  createBenchTodoList() {
    this.benchTodoList = new BenchTodoList();
    this.group.add(this.benchTodoList.group);
    this.interactables.push(...this.benchTodoList.interactables);
  }

  /** Repaints the bench clipboard. Cheap to call whenever anything moves. */
  updateTodoList(state) {
    this.benchTodoList?.update(state);
  }


  /**
   * Long white wooden parts table that carries every piece of hardware.
   * Replaces the old dark steel rack: painted-white timber top, a lower shelf and
   * a stretcher, with the tier surfaces driven by the shared layout spec.
   */
  createPartsTable() {
    const { table } = getShelfLayout();
    const tx = table.x;
    const tz = table.z;
    const width = table.width;
    const length = table.length;
    const legSize = table.legSize;

    // White-painted timber with a faint wood grain showing through
    const grainCanvas = document.createElement('canvas');
    grainCanvas.width = 256;
    grainCanvas.height = 256;
    const gCtx = grainCanvas.getContext('2d');
    gCtx.fillStyle = '#f4f1ea';
    gCtx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 70; i++) {
      const y = Math.random() * 256;
      gCtx.strokeStyle = `rgba(190, 182, 168, ${0.10 + Math.random() * 0.22})`;
      gCtx.lineWidth = 1 + Math.random() * 2.5;
      gCtx.beginPath();
      gCtx.moveTo(0, y);
      gCtx.bezierCurveTo(70, y + (Math.random() - 0.5) * 8, 180, y + (Math.random() - 0.5) * 8, 256, y);
      gCtx.stroke();
    }
    const grainTex = new THREE.CanvasTexture(grainCanvas);
    grainTex.wrapS = THREE.RepeatWrapping;
    grainTex.wrapT = THREE.RepeatWrapping;
    grainTex.repeat.set(2, Math.max(2, Math.round(length * 1.4)));

    const topMat = new THREE.MeshStandardMaterial({
      map: grainTex, color: 0xffffff, roughness: 0.42, metalness: 0.03
    });
    const legMat = new THREE.MeshStandardMaterial({
      color: 0xe9e5dc, roughness: 0.55, metalness: 0.04
    });
    const trimMat = new THREE.MeshStandardMaterial({
      color: 0xd6d1c6, roughness: 0.6, metalness: 0.05
    });

    // ---- table top (tier 0 surface) ----
    const top = new THREE.Mesh(
      new THREE.BoxGeometry(width, table.topThickness, length),
      topMat
    );
    top.position.set(tx, table.topHeight - table.topThickness / 2, tz);
    top.castShadow = true;
    top.receiveShadow = true;
    this.group.add(top);
    this.surfaces.push(top);

    // Soft rounded front edge so it reads as furniture, not a steel rack
    const edge = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, table.topThickness + 0.008, length),
      trimMat
    );
    edge.position.set(tx - width / 2 - 0.008, table.topHeight - table.topThickness / 2 - 0.002, tz);
    edge.castShadow = true;
    this.group.add(edge);

    // ---- lower shelves, if the layout ever defines any ----
    // The bench is currently a single worktop: anything on a lower shelf is a
    // part the player cannot reach or see, so there are none. Drawn from the
    // layout so adding one is a data change, not a geometry change.
    table.tierSurfaces.slice(1).forEach(surfaceY => {
      const board = new THREE.Mesh(
        new THREE.BoxGeometry(width - 0.06, table.shelfThickness, length - 0.1),
        topMat
      );
      board.position.set(tx, surfaceY - table.shelfThickness / 2, tz);
      board.castShadow = true;
      board.receiveShadow = true;
      this.group.add(board);
      this.surfaces.push(board);
    });


    // ---- legs ----
    const legH = table.height - table.topThickness;
    const legGeo = new THREE.BoxGeometry(legSize, legH, legSize);
    const legInset = 0.09;
    [
      [-1, -1], [1, -1], [-1, 1], [1, 1]
    ].forEach(([sx, sz]) => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(
        tx + sx * (width / 2 - legInset),
        legH / 2,
        tz + sz * (length / 2 - legInset)
      );
      leg.castShadow = true;
      leg.receiveShadow = true;
      this.group.add(leg);
    });

    // Centre legs so a long bench does not sag. Purely structural - not a
    // surface, so nothing can ever be placed on them.
    [-1, 1].forEach(sz => {
      const leg = new THREE.Mesh(
        new THREE.BoxGeometry(legSize, legH, legSize),
        legMat
      );
      leg.position.set(tx, legH / 2, tz + sz * (length / 2 - legInset));
      leg.castShadow = true;
      this.group.add(leg);
    });


    // ---- aprons / stretchers ----
    const apronMat = trimMat;
    [-1, 1].forEach(sz => {
      const apron = new THREE.Mesh(
        new THREE.BoxGeometry(width - legInset * 2, 0.07, 0.025),
        apronMat
      );
      apron.position.set(tx, table.topHeight - table.topThickness - 0.05, tz + sz * (length / 2 - legInset));
      apron.castShadow = true;
      this.group.add(apron);
    });
    [-1, 1].forEach(sx => {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(0.025, 0.05, length - legInset * 2),
        apronMat
      );
      rail.position.set(tx + sx * (width / 2 - legInset), table.shelfHeight - 0.05, tz);
      rail.castShadow = true;
      this.group.add(rail);
    });

    // ---- small engraved plaque on the front edge ----
    const plaqueCanvas = document.createElement('canvas');
    plaqueCanvas.width = 1024;
    plaqueCanvas.height = 128;
    const pCtx = plaqueCanvas.getContext('2d');
    pCtx.fillStyle = '#e8e3d8';
    pCtx.fillRect(0, 0, 1024, 128);
    pCtx.strokeStyle = '#9aa4b2';
    pCtx.lineWidth = 4;
    pCtx.strokeRect(6, 6, 1012, 116);
    pCtx.font = 'bold 52px "Segoe UI", sans-serif';
    pCtx.fillStyle = '#475569';
    pCtx.textAlign = 'center';
    pCtx.textBaseline = 'middle';
    pCtx.fillText('Bàn linh kiện, phần cứng', 512, 66);
    const plaqueTex = new THREE.CanvasTexture(plaqueCanvas);
    const plaque = new THREE.Mesh(
      new THREE.PlaneGeometry(1.15, 0.144),
      new THREE.MeshStandardMaterial({ map: plaqueTex, roughness: 0.5 })
    );
    plaque.position.set(tx - width / 2 - 0.019, table.topHeight - 0.12, tz);
    plaque.rotation.y = -Math.PI / 2;
    this.group.add(plaque);

    // ---- collider ----
    this.colliders.push({
      minX: tx - width / 2 - 0.2,
      maxX: tx + width / 2 + 0.2,
      minZ: tz - length / 2 - 0.2,
      maxZ: tz + length / 2 + 0.2
    });
  }

  /**
   * A 27" 16:9 panel on the right of the desk, angled towards the player.
   *
   * The panel itself is a downloaded model, but the screen on it is not: the boot
   * sequence (POST, BIOS, the desktop) is drawn on a canvas this room owns, and
   * the model ships its own blank screen mesh which is handed that canvas as its
   * texture. That is why the live display survives the swap - the canvas and
   * every state that drives it are untouched by the geometry.
   *
   * The procedural box below is what the room shows for the moment the file takes
   * to arrive, and it is what stays if the file is ever missing.
   */
  createMonitor() {
    const body = new THREE.Group();
    body.position.set(BENCH_MONITOR_AT.x, 0.82, BENCH_MONITOR_AT.z);
    body.rotation.y = MONITOR.yaw;
    this.group.add(body);
    this.monitorBody = body;

    this.monitorCanvas = document.createElement('canvas');
    this.monitorCanvas.width = 1024;
    this.monitorCanvas.height = 576;
    this.monitorContext = this.monitorCanvas.getContext('2d');
    this.monitorTexture = new THREE.CanvasTexture(this.monitorCanvas);
    this.monitorTexture.minFilter = THREE.LinearFilter;
    this.monitorTexture.anisotropy = 4;

    this.renderMonitorScreen();

    this.monitorStandIn = new THREE.Group();
    body.add(this.monitorStandIn);
    this.buildMonitorStandIn();

    this.mountMonitorModel();
  }

  /**
   * The procedural stand, bezel, port and halo. Every mesh is added to the
   * stand-in group so the swap can take all of them out in one go.
   */
  buildMonitorStandIn() {
    const monW = 0.68;   // 27" is about 62cm of panel
    const monH = 0.40;

    const shellMat = new THREE.MeshStandardMaterial({ color: 0x14171c, roughness: 0.44, metalness: 0.5 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x2b313b, roughness: 0.28, metalness: 0.85 });

    // stand: a weighted plate and a neck that leans the panel back a few degrees.
    // The neck has to stay behind the panel: at the authored depth it poked its
    // top through the screen and showed up as a black block in the middle of the
    // panel.
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.016, 0.22), trimMat);
    base.position.set(0, 0.008, 0.012);
    this.monitorStandIn.add(base);

    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.27, 0.03), trimMat);
    neck.position.set(0, 0.155, -0.05);
    neck.rotation.x = 0.07;
    this.monitorStandIn.add(neck);

    // the panel itself, with the screen recessed a centimetre into the bezel
    const panel = new THREE.Group();
    panel.position.set(0, 0.375, 0);
    panel.rotation.x = -0.04;
    this.monitorStandIn.add(panel);

    const shell = new THREE.Mesh(new THREE.BoxGeometry(monW, monH, 0.022), shellMat);
    panel.add(shell);

    // a slightly wider lower chin, the way 16:9 panels are actually built
    const chin = new THREE.Mesh(new THREE.BoxGeometry(monW + 0.012, 0.05, 0.026), shellMat);
    chin.position.set(0, -monH / 2 + 0.005, 0.001);
    panel.add(chin);

    const led = new THREE.Mesh(
      new THREE.BoxGeometry(0.016, 0.003, 0.002),
      new THREE.MeshBasicMaterial({ color: 0x94a3b8 })
    );
    led.position.set(monW / 2 - 0.05, -monH / 2 + 0.006, 0.0135);
    panel.add(led);

    // The panel is emissive: it is the one light source on the desk that is
    // meant to read as "on" rather than "lit by the room".
    this.monitorScreenMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(monW - 0.03, monH - 0.036),
      new THREE.MeshBasicMaterial({ map: this.monitorTexture })
    );
    this.monitorScreenMesh.position.set(0, 0.004, 0.0112);
    panel.add(this.monitorScreenMesh);

    // Video input on the lower back edge, where a monitor really keeps it. It
    // faces the case on the other side of the desk, and it is the second half of
    // the wiring task: click the case's port, then this.
    this.monitorPort = this.makeMonitorPort(panel, new THREE.Vector3(-0.19, -monH / 2 + 0.012, -0.014));
    panel.add(this.monitorPortHalo);

    const face = new THREE.Mesh(new THREE.BoxGeometry(monW, monH, 0.03), shellMat);
    face.position.set(0, 0, -0.02);
    panel.add(face);
    face.userData = { type: 'monitor' };
    this.interactables.push(face);
    shell.userData = { type: 'monitor' };
    this.interactables.push(shell);
  }

  /**
   * The clickable HDMI port, added to `parent` at `localPosition`, plus the halo
   * that lights up when the port is the next thing to click. The halo is left
   * for the caller to parent, because it rides with the port but not under it.
   */
  makeMonitorPort(parent, localPosition) {
    const portMat = new THREE.MeshStandardMaterial({
      color: 0x0b0d10, roughness: 0.5, metalness: 0.4
    });
    const port = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.006, 0.005), portMat);
    port.position.copy(localPosition);
    port.rotation.x = 0.5;
    port.name = 'hdmiPortAnchor';
    port.userData = { type: 'monitorPort', portName: 'HDMI' };
    this.interactables.push(port);

    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(0.016, 0.0022, 6, 20),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8, transparent: true, opacity: 0, depthWrite: false
      })
    );
    halo.position.copy(localPosition);
    halo.rotation.copy(port.rotation);
    halo.rotation.x += Math.PI / 2;
    this.monitorPortHalo = halo;

    return port;
  }

  /**
   * Swaps the procedural monitor for the downloaded one and hands the model its
   * own screen mesh as the live display.
   *
   * Everything gameplay needs stays exactly where it was: the port keeps the name
   * the cable run looks up, the halo keeps lighting on the same cue, and the
   * screen is the same canvas. Only the geometry is replaced.
   */
  mountMonitorModel() {
    loadModelCopy(MONITOR.modelPath).then(copy => {
      if (!copy || !this.monitorBody) return;   // keep the stand-in

      // Sketchfab ships a light and a camera with the model. Nothing in this
      // room uses them, and GLTFLoader would leave a stray camera behind.
      const unused = [];
      copy.traverse(child => { if (child.isCamera || child.isLight) unused.push(child); });
      unused.forEach(child => child.removeFromParent());

      // realSize normalises the uniform scale; flat:false keeps the pose the file
      // was exported in, which is already the pose the desk wants
      const { group } = buildFittedModel(copy, { realSize: MONITOR.realSize, flat: false });

      // the stand-in goes first, so its meshes leave the raycast list with it
      this.removeMonitorStandIn();

      group.traverse(child => {
        if (!child.isMesh) return;
        child.castShadow = true;
        child.receiveShadow = true;
        child.userData = { type: 'monitor' };
        this.interactables.push(child);
      });
      this.monitorBody.add(group);
      this.monitorModel = group;

      // The model's own screen mesh becomes the live display. Reusing the mesh
      // rather than dropping a plane in front of it means the boot canvas lands
      // on the panel exactly, with no alignment maths and nothing to drift.
      const screen = this.findScreenMesh(group);
      if (screen) {
        screen.material = new THREE.MeshBasicMaterial({
          map: this.monitorTexture,
          side: THREE.DoubleSide,
          // the bezel is a hair in front of the screen: pull it towards the
          // camera so the two coplanar-ish surfaces never fight
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1
        });
        screen.castShadow = false;
        screen.receiveShadow = false;
        screen.userData = { type: 'monitor' };
        this.monitorScreenMesh = screen;
      }

      // The port and the LED are placed off the model's own measurements rather
      // than hard-coded, so a different monitor model still lands correctly.

      // Which way the panel faces is a property of the file, not something to
      // hard-code: the screen sits on the front, so whichever end of the panel's
      // depth it is nearest to IS the front. This export is authored facing -Z,
      // i.e. with its backplate towards the player, so the model is turned around
      // to face the room - and every measurement below stays in the model's own
      // space, which the turn carries with it.
      const panelBox = this.localBoxOf(screen ? screen.parent || group : group, group);
      const screenBox = screen ? this.localBoxOf(screen, group) : panelBox;
      const facesRoom = Math.abs(screenBox.max.z - panelBox.max.z) <= Math.abs(screenBox.min.z - panelBox.min.z);
      if (!facesRoom) group.rotation.y = Math.PI;

      // the video input belongs on the back, the power LED on the chin in front
      const backZ = facesRoom ? panelBox.min.z - 0.004 : panelBox.max.z + 0.004;
      const frontZ = facesRoom ? panelBox.max.z + 0.0015 : panelBox.min.z - 0.0015;

      this.monitorPort = this.makeMonitorPort(group, new THREE.Vector3(
        screenBox.min.x + panelBox.getSize(new THREE.Vector3()).x * 0.16,
        screenBox.min.y - 0.02,
        backZ
      ));
      group.add(this.monitorPortHalo);

      const led = new THREE.Mesh(
        new THREE.BoxGeometry(0.016, 0.003, 0.002),
        new THREE.MeshBasicMaterial({ color: 0x94a3b8 })
      );
      led.position.set(
        screenBox.max.x - 0.05,
        screenBox.min.y - 0.012,
        frontZ
      );
      group.add(led);
      this.monitorLed = led;
    });
  }

  /** The model's screen surface, matched by name across the usual export naming. */
  findScreenMesh(root) {
    let found = null;
    root.traverse(child => {
      if (found || !child.isMesh) return;
      if (/screen|display|panel_?front/i.test(child.name || '')) found = child;
    });
    return found;
  }

  /**
   * A box measured in the fitted model's own space - metres, model-aligned - so
   * anything placed into that space lines up with the geometry that is already
   * there. The model sits in the scene graph while this runs, which is what makes
   * the inverse world matrix available.
   */
  localBoxOf(object, modelRoot) {
    const box = new THREE.Box3();
    if (!object) return box;
    object.updateMatrixWorld(true);
    const world = new THREE.Box3().setFromObject(object);
    const toModel = new THREE.Matrix4().copy(modelRoot.matrixWorld).invert();
    const v = new THREE.Vector3();
    for (let i = 0; i < 8; i++) {
      box.expandByPoint(v.set(
        i & 1 ? world.max.x : world.min.x,
        i & 2 ? world.max.y : world.min.y,
        i & 4 ? world.max.z : world.min.z
      ).applyMatrix4(toModel));
    }
    return box;
  }

  /** Takes the procedural monitor and everything it added to the raycast list. */
  removeMonitorStandIn() {
    const standIn = this.monitorStandIn;
    if (!standIn) return;

    const doomed = [];
    standIn.traverse(child => { if (child.isMesh) doomed.push(child); });
    doomed.forEach(mesh => {
      const at = this.interactables.indexOf(mesh);
      if (at !== -1) this.interactables.splice(at, 1);
      mesh.geometry?.dispose?.();
      mesh.material?.dispose?.();
    });

    this.monitorBody.remove(standIn);
    this.monitorStandIn = null;
    this.monitorScreenMesh = null;
  }

  /**
   * The video port on a freshly built machine, so the player can plug the case
   * into the monitor. It sits where the card's bracket is: on the rear strip of
   * the chassis, at the height of the expansion slots.
   *
   * @param {THREE.Object3D} machine the assembled group standing on the bench
   */
  addVideoPortToMachine(machine) {
    if (!machine) return null;

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.016, 0.006),
      new THREE.MeshStandardMaterial({ color: 0x0b0d10, roughness: 0.5, metalness: 0.4 })
    );
    // case-local: rear panel, just under the top of the expansion-slot strip
    body.position.set(-0.012, 0.272, -0.219);
    body.userData = { type: 'pcVideoPort', portName: 'DisplayPort' };
    machine.add(body);

    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(0.026, 0.0026, 6, 20),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.6, depthWrite: false })
    );
    halo.position.copy(body.position);
    halo.position.z -= 0.004;
    machine.add(halo);

    this.machinePort = body;
    this.machinePortHalo = halo;
    this.registerMachinePort(body);
    return body;
  }

  /** Keeps the machine's port in the raycast list only while it is on the bench. */
  registerMachinePort(port) {
    if (!port) return;
    if (!this.interactables.includes(port)) this.interactables.push(port);
    if (this.machinePortHalo) this.machinePortHalo.visible = true;
  }

  unregisterMachinePort() {
    if (this.machinePort) {
      const at = this.interactables.indexOf(this.machinePort);
      if (at !== -1) this.interactables.splice(at, 1);
    }
    if (this.machinePortHalo) this.machinePortHalo.visible = false;
  }

  /** Highlights whichever end of the cable the player has to click next. */
  setCableTaskArmed(armed, connected) {
    if (this.monitorPortHalo) this.monitorPortHalo.material.opacity = armed ? 0.75 : 0;
    if (this.machinePortHalo) this.machinePortHalo.material.opacity = connected ? 0 : 0.6;
  }

  /** Draws the HDMI run from the machine's port to the monitor's port. */
  connectCable() {
    if (this.videoCable) return;
    const from = this.machinePort;
    const to = this.monitorBody && this.monitorBody.getObjectByName('hdmiPortAnchor');
    if (!from) return;

    const a = new THREE.Vector3();
    from.getWorldPosition(a);
    const b = new THREE.Vector3();
    if (to) {
      to.getWorldPosition(b);
    } else {
      b.set(0.75, 0.9, -0.2);
    }
    // drape it: down off the case, along the desk, up into the panel
    const mid = a.clone().lerp(b, 0.5);
    mid.y = Math.min(a.y, b.y) - 0.16;
    mid.z += 0.08;
    const curve = new THREE.CatmullRomCurve3([
      a.clone(),
      a.clone().add(new THREE.Vector3(0.04, -0.1, 0.06)),
      mid,
      b.clone().add(new THREE.Vector3(-0.05, -0.09, 0.05)),
      b.clone()
    ]);
    const cable = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 42, 0.0042, 8, false),
      new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.62, metalness: 0.1 })
    );
    cable.name = 'hdmiCable';
    cable.castShadow = false;
    this.scene.add(cable);
    this.videoCable = cable;
    if (this.monitorPortHalo) this.monitorPortHalo.material.opacity = 0;
    if (this.machinePortHalo) this.machinePortHalo.material.opacity = 0;
  }

  /** Drops the cable again, e.g. when the machine is picked up. */
  removeCable() {
    if (!this.videoCable) return;
    this.scene.remove(this.videoCable);
    this.videoCable.geometry.dispose();
    this.videoCable.material.dispose();
    this.videoCable = null;
  }

  createPeripherals() {
    const pY = 0.82; // table top

    // the mat goes down first; the keyboard and the mouse stand on top of it
    this.mountPeripheral(PERIPHERALS.mousepad, pY);
    const onPad = pY + PAD_THICKNESS;
    this.mountPeripheral(PERIPHERALS.keyboard, onPad);
    this.mountPeripheral(PERIPHERALS.mouse, onPad);

    const toolMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.3, metalness: 0.7 });
    const screwdriver = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.2), toolMat);
    screwdriver.rotation.z = Math.PI / 2;
    screwdriver.position.set(-0.95, pY + 0.015, 0.25);
    this.group.add(screwdriver);

    const pasteMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.3 });
    const pasteTube = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.12), pasteMat);
    pasteTube.rotation.z = Math.PI / 2;
    pasteTube.rotation.y = 0.4;
    pasteTube.position.set(-0.92, pY + 0.01, 0.1);
    this.group.add(pasteTube);
  }

  /**
   * Puts a real, downloaded peripheral on the bench.
   *
   * Both files are Sketchfab exports authored in their own arbitrary units - one
   * arrives 0.9 units wide, the other 4.3 - so the size is normalised from the
   * model's own bounding box against the part's real-world longest edge, exactly
   * like the hardware on the bench. The orientation is left as authored, because
   * both files already stand the right way up: the board's long edge runs across
   * the bench, the mouse's runs away from the player.
   *
   * Nothing is authored to its scale directly, so a placeholder box holds the
   * spot for the frame or two the GLB takes to arrive. The bench reads as a full
   * bench immediately instead of two empty patches.
   */
  mountPeripheral(spec, surfaceY) {
    const slot = new THREE.Group();
    slot.position.set(spec.x, surfaceY, spec.z);
    slot.rotation.y = spec.yaw;
    this.group.add(slot);

    const [w, h, d] = spec.size;
    const standIn = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({
        color: 0xcbd5e1, roughness: 0.85, metalness: 0.05, transparent: true, opacity: 0.55
      })
    );
    standIn.position.y = h / 2;
    slot.add(standIn);

    loadModelCopy(spec.modelPath).then(copy => {
      if (!copy) return;   // leave the stand-in: a missing file is better than a hole

      // realSize normalises the uniform scale; flat:false keeps the pose the
      // file was exported in, which is already the pose we want on the bench
      const { group } = buildFittedModel(copy, { realSize: spec.realSize, flat: false });
      group.traverse(child => {
        if (!child.isMesh) return;
        child.castShadow = true;
        child.receiveShadow = true;
      });

      slot.remove(standIn);
      standIn.geometry.dispose();
      standIn.material.dispose();
      slot.add(group);
    });
  }

  createComputerCasePlaceholder() {
    const { caseGroup, interactables } = createComputerCase3DGroup();
    caseGroup.position.set(BENCH_CASE_AT.x, 0.825, BENCH_CASE_AT.z);
    // Turned so the tempered glass looks at the player standing at the bench -
    // the open side is the one you see the parts through, so it has to face them.
    // The angle itself, and the two viewpoints it was measured against, are in
    // `caseLayout.js`.
    caseGroup.rotation.y = BENCH_CASE_YAW;
    // The stand-in is built with its glass on +X, the model that replaces it has
    // it on -X. Mirroring the stand-in lines the two up so the swap does not spin
    // the case round.
    caseGroup.scale.x = -1;
    caseGroup.traverse(child => {
      if (!child.isMesh) return;
      // a mirrored shell shows its inside out unless every face is drawn
      child.material.side = THREE.DoubleSide;
    });
    caseGroup.name = 'benchCasePlaceholder';

    interactables.forEach(mesh => {
      mesh.userData = { type: 'computerCase', isCasePlaceholder: true };
    });

    this.group.add(caseGroup);
    this.casePlaceholder = caseGroup;
    this.interactables.push(...interactables);

    // The real chassis arrives a moment later and takes the procedural one's
    // place. The procedural case is not thrown away until then - it is what the
    // room shows while the file is on the wire, and what it keeps if the file
    // ever fails to load.
    this.swapInCaseModel(caseGroup, interactables);
  }

  /**
   * Replaces the stand-in chassis with the downloaded one.
   *
   * Everything the game needs from the case is re-established on the new model:
   * the same spot on the bench, the same angle, and the same click target, so
   * left-clicking the chassis still opens Build Mode.
   */
  async swapInCaseModel(standIn, standInInteractables) {
    // glassSide -1: the glass stays on the chassis's own left, the side a real
    // tower has it on, and the loader turns the case to suit. The build view
    // asks for the layout's +X instead, because there the camera looks through
    // the glass at the parts on the tray.
    const built = await loadCaseModel({ glassSide: -1 });
    if (!built || !this.casePlaceholder) return;

    const model = built.group;
    model.position.copy(standIn.position);
    model.rotation.y = standIn.rotation.y;
    // the model keeps the scale the loader gave it: the stand-in was mirrored to
    // match, so copying its scale across would undo the glass side
    model.name = 'benchCasePlaceholder';

    const meshes = built.interactables;
    meshes.forEach(mesh => {
      mesh.userData = { type: 'computerCase', isCasePlaceholder: true };
    });

    this.group.remove(standIn);
    standInInteractables.forEach(mesh => {
      const at = this.interactables.indexOf(mesh);
      if (at !== -1) this.interactables.splice(at, 1);
      mesh.geometry?.dispose?.();
    });
    // the stand-in's own materials are shared with the build-mode case, so they
    // are left for that one to dispose

    this.group.add(model);
    this.casePlaceholder = model;
    this.interactables.push(...meshes);
    this.caseModelReady?.();
  }

  createDecorations() {
    const makePoster = (title, subtitle, color, x, y) => {
      const pCanvas = document.createElement('canvas');
      pCanvas.width = 512;
      pCanvas.height = 720;
      const ctx = pCanvas.getContext('2d');
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, 512, 720);
      ctx.strokeStyle = color;
      ctx.lineWidth = 12;
      ctx.strokeRect(16, 16, 480, 688);
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 720; i += 40) {
        ctx.beginPath();
        ctx.moveTo(30, i);
        ctx.lineTo(480, i);
        ctx.stroke();
      }
      ctx.fillStyle = color;
      ctx.font = 'bold 52px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(title, 256, 320);
      ctx.font = '28px "Segoe UI", sans-serif';
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText(subtitle, 256, 380);

      const pTex = new THREE.CanvasTexture(pCanvas);
      const poster = new THREE.Mesh(
        new THREE.PlaneGeometry(1.2, 1.7),
        new THREE.MeshStandardMaterial({ map: pTex, roughness: 0.4 })
      );
      poster.position.set(x, y, -4.95);
      this.group.add(poster);
    };

    makePoster('PC MASTER RACE', 'BUILD • OPTIMIZE • GAME', '#38bdf8', -2.8, 2.5);
    makePoster('STAY COOL', 'HIGH AIRFLOW & LOW TEMPS', '#a855f7', 0, 2.5);

    const lightFixtMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const ledMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    for (let x = -3; x <= 3; x += 3) {
      const fixture = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 4.0), lightFixtMat);
      fixture.position.set(x, 4.16, 0);
      this.group.add(fixture);

      const led = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.01, 3.8), ledMat);
      led.position.set(x, 4.11, 0);
      this.group.add(led);
    }
  }

  setMonitorState(state) {
    this.monitorState = state;
    this.renderMonitorScreen();
  }

  renderMonitorScreen() {
    const ctx = this.monitorContext;
    if (!ctx) return;
    const w = this.monitorCanvas.width;
    const h = this.monitorCanvas.height;

    ctx.clearRect(0, 0, w, h);

    if (this.monitorState === 'OFF') {
      ctx.fillStyle = '#05070a';
      ctx.fillRect(0, 0, w, h);
    } else if (this.monitorState === 'NO_SIGNAL') {
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 44px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('NO SIGNAL', w / 2, h / 2 - 30);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '26px "Segoe UI", sans-serif';
      ctx.fillText('Vui lòng kết nối cáp DisplayPort / HDMI từ Card đồ họa', w / 2, h / 2 + 30);
    } else if (this.monitorState === 'POST') {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 32px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('AMERICAN MEGATRENDS / PC BUILDER BIOS v3.80', 50, 70);

      ctx.fillStyle = '#f8fafc';
      ctx.font = '22px monospace';
      ctx.fillText('Main Processor : AMD Ryzen 5 3600 6-Core Processor @ 3.60GHz', 50, 140);
      ctx.fillText('Memory Testing : 16384KB OK (Dual-Channel DDR4 3200MHz)', 50, 180);
      ctx.fillText('Primary Storage: Samsung SSD 860 EVO 500GB (SATA 6Gb/s)', 50, 220);
      ctx.fillText('Display Adapter: NVIDIA GeForce RTX 3090 (24576MB VRAM)', 50, 260);
      ctx.fillText('Power Supply   : 650W ATX Power Good Signal Detected [OK]', 50, 300);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 26px monospace';
      ctx.fillText('>>> POWER-ON SELF-TEST COMPLETED SUCCESSFULLY!', 50, 380);
      ctx.fillText('>>> BOOTING SYSTEM...', 50, 420);

      ctx.fillStyle = '#1e293b';
      ctx.fillRect(50, 480, w - 100, 24);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(50, 480, (w - 100) * Math.min(1, this.postProgress), 24);
} else if (this.monitorState === 'OS') {
      // Desktop: wallpaper, a build-report window and a taskbar, so the panel
      // reads as a machine that came up rather than a splash card.
      const bg = ctx.createLinearGradient(0, 0, w, h);
      bg.addColorStop(0, '#0b1220');
      bg.addColorStop(0.55, '#152a45');
      bg.addColorStop(1, '#0f766e');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = 'rgba(148, 197, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 48) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 48) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // top bar
      ctx.fillStyle = 'rgba(8, 15, 28, 0.82)';
      ctx.fillRect(0, 0, w, 34);
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '600 17px "Segoe UI", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('PC BUILDER OS', 18, 18);
      ctx.fillStyle = '#7dd3fc';
      ctx.textAlign = 'right';
      ctx.fillText('build complete', w - 18, 18);

      // report window
      const wx = 96;
      const wy = 58;
      const ww = w - 192;
      const wh = h - 124;
      ctx.fillStyle = 'rgba(10, 18, 32, 0.93)';
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(wx, wy, ww, wh, 10);
      ctx.fill();
      ctx.stroke();

      // window title bar
      ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
      ctx.beginPath();
      ctx.roundRect(wx, wy, ww, 34, 10);
      ctx.fill();
      ctx.fillStyle = '#e0f2fe';
      ctx.font = '600 16px "Segoe UI", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('build-report.txt', wx + 16, wy + 18);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(wx + ww - 56, wy + 12, 12, 12);
      ctx.fillStyle = '#f87171';
      ctx.fillRect(wx + ww - 34, wy + 12, 12, 12);

      const rows = [
        ['MOTHERBOARD', 'MSI MAG B550 Tomahawk - AM4 / DDR4'],
        ['CPU', 'AMD Ryzen 5 3600 - 6C/12T - 38 C'],
        ['RAM', '16 GB dual channel DDR4-3200'],
        ['SSD', 'Samsung 860 EVO 500 GB - 550 MB/s'],
        ['GPU', 'NVIDIA GeForce RTX 3090 - 24 GB'],
        ['COOLER', 'tower cooler, airflow front to back'],
        ['PSU', '650 W ATX, bronze']
      ];
      ctx.font = '17px "Segoe UI", sans-serif';
      rows.forEach(([key, value], i) => {
        const y = wy + 66 + i * 29;
        ctx.fillStyle = '#7dd3fc';
        ctx.textAlign = 'left';
        ctx.fillText(key, wx + 22, y);
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText(value, wx + 186, y);
      });

      // taskbar
      ctx.fillStyle = 'rgba(8, 15, 28, 0.92)';
      ctx.fillRect(0, h - 40, w, 40);
      ctx.fillStyle = 'rgba(56, 189, 248, 0.22)';
      ctx.beginPath();
      ctx.roundRect(14, h - 34, 150, 28, 6);
      ctx.fill();
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '15px "Segoe UI", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Build Report', 26, h - 20);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#4ade80';
      ctx.fillText('all systems nominal', w - 20, h - 20);
    }
  }

  update(delta) {
    if (this.monitorState === 'POST') {
      this.postProgress += delta * 0.4;
      this.renderMonitorScreen();
      if (this.postProgress >= 1.0) {
        this.setMonitorState('OS');
      }
    }
  }


  /** Hides the empty case prop once the player has a real built machine. */
  hideCasePlaceholder() {
    if (this.casePlaceholder) this.casePlaceholder.visible = false;
  }

  /** Y of the workshop table top, where a dropped floor-level part returns to. */
  get partsTableSurfaceY() {
    return getShelfLayout().table.topHeight;
  }
}

/**
 * Procedural empty ATX mid-tower used as the build-mode placeholder.
 * All dimensions come from `caseLayout.js` so the bench prop and the interactive
 * Build Zone can never drift apart.
 *
 * @param {object}  [options]
 * @param {boolean} [options.xray] build view: clearer glass, so the hardware
 *   behind the tempered panel stays readable
 */
export function createComputerCase3DGroup(options = {}) {
  const { xray = false } = options;
  const caseGroup = new THREE.Group();

  const {
    yFloor, yTop, zRear, zFront, xGlassOuter, xGlassInner, xPlainInner
  } = CASE_REF;
  const FEET = CASE.feet;

  const boardZ0 = BOARD.z0;
  const boardLength = BOARD.z1 - BOARD.z0;
  const boardTop = BOARD.top;

  const trayX = TRAY.x;
  const trayT = TRAY.thickness;
  const trayFace = TRAY.face;
  const trayZ0 = TRAY.z0;
  const trayZ1 = TRAY.z1;
  const trayY0 = TRAY.y0;
  const trayY1 = TRAY.y1;
  const cutSize = TRAY.cutSize;
  const cutY = TRAY.cutY;
  const cutZ = TRAY.cutZ;
  const cutY0 = TRAY.cutY0;
  const cutY1 = TRAY.cutY1;
  const cutZ0 = TRAY.cutZ0;
  const cutZ1 = TRAY.cutZ1;

  const shroudTop = SHROUD.top;
  const shroudHeight = shroudTop - yFloor;
  const shroudWidth = SHROUD.width;
  const shroudDepth = SHROUD.depth;
  const shroudMidZ = SHROUD.midZ;
  const shroudMidX = SHROUD.midX;

  const rearFanX = REAR.fan.x;
  const rearFanY = REAR.fan.y;
  const rearFanR = REAR.fan.r;
  const ioY = REAR.io.y;
  const slotX = REAR.slots.x;
  const slotTop = REAR.slots.top;
  const slotPitch = REAR.slots.pitch;
  const slotSpan = REAR.slots.span;
  const slotY = REAR.slots.y;
  const psuBayX = REAR.psu.x;
  const psuBayW = REAR.psu.w;
  const psuBayH = REAR.psu.h;
  const psuY = REAR.psu.y;
  const rearPlane = REAR.plane;
  const rearHalfW = REAR.halfW;
  const rearHalfH = REAR.halfH;
  const rearCentreY = REAR.centreY;
  const rearLocalY = REAR.toLocalY;

  const roofFanX = ROOF.fan.x;
  const roofFanZ = ROOF.fan.z;
  const roofFanR = ROOF.fan.r;

  // ---------------------------------------------------------- materials
  const shell = (params) => new THREE.MeshStandardMaterial(params);

  const steel = shell({ color: 0xf5f5f4, roughness: 0.42, metalness: 0.25 });
  const steelTwoSided = shell({ color: 0xf5f5f4, roughness: 0.42, metalness: 0.25 });
  steelTwoSided.side = THREE.DoubleSide;
  const steelInner = shell({ color: 0xe7e5e4, roughness: 0.55, metalness: 0.2 });
  const trim = shell({ color: 0xd6d3d1, roughness: 0.3, metalness: 0.5 });
  const dark = shell({ color: 0xf5f5f4, roughness: 0.95, metalness: 0.05 });
  const rubber = shell({ color: 0xe7e5e4, roughness: 1, metalness: 0 });

  const accent = shell({
    color: 0x38bdf8, emissive: 0x0d5f80, emissiveIntensity: 1.5, roughness: 0.4
  });
  // The tempered panel is the one part of the chassis the builder has to handle,
  // so it is NOT a build-shell material: it stays on screen (clear, at its own
  // opacity) for the remove / refit steps.
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x9fd8ff,
    transparent: true,
    opacity: xray ? 0.22 : 0.14,
    roughness: 0.03,
    metalness: 0.35,
    side: THREE.DoubleSide,
    depthWrite: false
  });

  // Perforated grille: punched holes via alphaTest, so no sort order issues
  const createGrilleMaterial = (repeatX, repeatY) => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#fff';
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const ox = (row % 2) * 4;
        ctx.beginPath();
        ctx.arc(col * 8 + ox, row * 8, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xe7e5e4,
      alphaMap: tex,
      alphaTest: 0.5,
      side: THREE.DoubleSide,
      roughness: 0.6,
      metalness: 0.55
    });
    return mat;
  };

  const interactables = [];

  const add = (geometry, material, position, options = {}) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(position[0], position[1], position[2]);
    if (options.rotation) mesh.rotation.set(options.rotation[0], options.rotation[1], options.rotation[2]);
    mesh.castShadow = options.cast !== false;
    mesh.receiveShadow = true;
    if (options.name) mesh.name = options.name;
    if (options.interactive) interactables.push(mesh);
    caseGroup.add(mesh);
    return mesh;
  };

  /** Punched sheet: outline rectangle in local XY plus round/rect holes. */
  const createPanel = (halfW, halfH, holes) => {
    const shape = new THREE.Shape();
    shape.moveTo(-halfW, -halfH);
    shape.lineTo(halfW, -halfH);
    shape.lineTo(halfW, halfH);
    shape.lineTo(-halfW, halfH);
    shape.closePath();
    holes.forEach(({ x, y, w, h, r }) => {
      const hole = new THREE.Path();
      if (r !== undefined) {
        hole.absarc(x, y, r, 0, Math.PI * 2, true);
      } else {
        hole.moveTo(x - w / 2, y - h / 2);
        hole.lineTo(x + w / 2, y - h / 2);
        hole.lineTo(x + w / 2, y + h / 2);
        hole.lineTo(x - w / 2, y + h / 2);
        hole.closePath();
      }
      shape.holes.push(hole);
    });
    return new THREE.ShapeGeometry(shape, 26);
  };

  /** Fan, axis along +Z. `rotation.x = -PI/2` turns it into a roof fan. */
  const createFan = (radius, thickness, blades = 7) => {
    const fan = new THREE.Group();

    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius - 0.007, 0.007, 8, 28), trim);
    ring.castShadow = true;
    fan.add(ring);

    const back = new THREE.Mesh(
      new THREE.CircleGeometry(radius - 0.008, 28),
      shell({ color: 0xd6d3d1, roughness: 0.8, side: THREE.DoubleSide })

    );
    back.position.z = -thickness / 2;
    fan.add(back);

    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.017, 0.017, thickness * 0.7, 14),
      shell({ color: 0xe7e5e4, roughness: 0.95, metalness: 0.05 })

    );
    hub.rotation.x = Math.PI / 2;
    fan.add(hub);

    const bladeMat = shell({
      color: 0xcbd5e1, roughness: 0.5, metalness: 0.15, side: THREE.DoubleSide

    });
    for (let i = 0; i < blades; i++) {
      const angle = (i / blades) * Math.PI * 2;
      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(radius * 0.46, 0.0015, thickness * 0.55),
        bladeMat
      );
      blade.position.set(Math.cos(angle) * radius * 0.5, Math.sin(angle) * radius * 0.5, 0);
      blade.rotation.z = angle + 0.5;
      fan.add(blade);
    }
    return fan;
  };

  // ============================================================== feet
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
    add(
      new THREE.CylinderGeometry(0.017, 0.02, FEET, 14),
      rubber,
      [sx * (W / 2 - 0.026), FEET / 2, sz * (D / 2 - 0.033)],
      { cast: false }
    );
  });

  // ======================================================== floor pan
  add(new THREE.BoxGeometry(W, T, D), steel, [0, yFloor - T / 2, 0], {
    interactive: true,
    name: 'caseBottom'
  });
  add(
    new THREE.PlaneGeometry(W - 0.04, 0.16),
    createGrilleMaterial(7, 4),
    [shroudMidX, yFloor - T / 2 - 0.0005, psuY - 0.06],
    { rotation: [Math.PI / 2, 0, 0], cast: false }
  );

  // ==================================================== roof / top panel
  add(
    createPanel((W - 0.004) / 2, (D - 0.004) / 2, [
      { x: roofFanX, y: roofFanZ, r: roofFanR }
    ]),
    steelTwoSided,
    [0, yTop - T / 2, 0],
    { rotation: [Math.PI / 2, 0, 0], interactive: true, name: 'caseTop' }
  );
  add(
    new THREE.CircleGeometry(roofFanR - 0.006, 30),
    createGrilleMaterial(7, 7),
    [roofFanX, yTop - T / 2 - 0.0008, roofFanZ],
    { rotation: [-Math.PI / 2, 0, 0], cast: false }
  );
  add(
    new THREE.TorusGeometry(roofFanR, 0.004, 8, 30),
    trim,
    [roofFanX, yTop - T / 2, roofFanZ],
    { rotation: [Math.PI / 2, 0, 0], cast: false }
  );
  const roofFan = createFan(roofFanR - 0.004, 0.025);
  roofFan.rotation.x = -Math.PI / 2;
  roofFan.position.set(roofFanX, yTop - T - 0.014, roofFanZ);
  caseGroup.add(roofFan);

  add(
    new THREE.PlaneGeometry(W - 0.05, 0.085),
    createGrilleMaterial(8, 3),
    [0, yTop + 0.0006, -0.16],
    { rotation: [-Math.PI / 2, 0, 0], cast: false }
  );

  // Front I/O cluster on the roof
  add(new THREE.BoxGeometry(0.075, 0.002, 0.032), trim, [0, yTop + 0.001, zFront - 0.05]);
  add(
    new THREE.CylinderGeometry(0.007, 0.007, 0.004, 16),
    accent,
    [ROOF.io.x, yTop + 0.003, ROOF.io.z],
    { cast: false }
  );
  add(
    new THREE.CylinderGeometry(0.003, 0.003, 0.004, 12),
    dark,
    [ROOF.io.x - 0.011, yTop + 0.003, ROOF.io.z],
    { cast: false }
  );
  add(
    new THREE.CylinderGeometry(0.0035, 0.0035, 0.004, 12),
    dark,
    [ROOF.io.x + 0.025, yTop + 0.003, ROOF.io.z],
    { cast: false }
  );
  [-0.012, 0.012].forEach(dx => {
    add(
      new THREE.BoxGeometry(0.013, 0.004, 0.008),
      dark,
      [dx, yTop + 0.003, zFront - 0.05],
      { cast: false }
    );
  });

  // ======================================================== front panel
  const frontZ = zFront - 0.007;
  const border = 0.02;
  const frontFrameParts = [
    [W - 0.004, border, 0, FEET + H - border / 2],
    [W - 0.004, border, 0, FEET + border / 2],
    [border, H - 0.004 - 2 * border, -(W - 0.004) / 2 + border / 2, FEET + H / 2],
    [border, H - 0.004 - 2 * border, (W - 0.004) / 2 - border / 2, FEET + H / 2]
  ];
  let frontPanel = null;
  frontFrameParts.forEach(([w, h, x, y]) => {
    const mesh = add(new THREE.BoxGeometry(w, h, 0.014), steel, [x, y, frontZ], {
      interactive: true,
      name: 'frontPanel'
    });
    if (!frontPanel) frontPanel = mesh;
  });
  add(
    new THREE.PlaneGeometry(W - 0.004 - 2 * border, H - 0.004 - 2 * border),
    createGrilleMaterial(9, 22),
    [0, FEET + H / 2, frontZ + 0.001],
    { rotation: [0, Math.PI, 0], cast: false }
  );
  add(
    new THREE.BoxGeometry(W - 0.06, 0.005, 0.002),
    accent,
    [0, FEET + border / 2, zFront - 0.001],
    { cast: false }
  );
  add(
    new THREE.BoxGeometry(0.05, 0.008, 0.002),
    trim,
    [0, FEET + H - border / 2, zFront - 0.001],
    { cast: false }
  );

  [0.135, 0.275].forEach(fy => {
    const fan = createFan(0.07, 0.025);
    fan.position.set(0, fy, zFront - 0.03);
    caseGroup.add(fan);
  });
  add(
    new THREE.BoxGeometry(W - 0.02, 0.32, T),
    steelInner,
    [0, 0.205, zFront - 0.048],
    { cast: false }
  );

  // ======================================================== rear panel
  add(
    createPanel(rearHalfW, rearHalfH, [
      { x: rearFanX, y: rearLocalY(rearFanY), r: rearFanR },
      { x: 0, y: rearLocalY(ioY), w: 0.159, h: 0.042 },
      { x: slotX, y: rearLocalY(slotY), w: 0.122, h: slotSpan },
      { x: psuBayX, y: rearLocalY(psuY), w: psuBayW, h: psuBayH }
    ]),
    steelTwoSided,
    [0, rearCentreY, rearPlane],
    { interactive: true, name: 'caseRear' }
  );

  add(
    new THREE.CylinderGeometry(rearFanR - 0.001, rearFanR - 0.007, 0.026, 26, 1, true),
    shell({ color: 0xe7e5e4, roughness: 0.8, metalness: 0.2, side: THREE.DoubleSide }),

    [rearFanX, rearFanY, zRear + T + 0.013],
    { rotation: [Math.PI / 2, 0, 0], cast: false }
  );
  add(
    new THREE.TorusGeometry(rearFanR, 0.004, 8, 28),
    trim,
    [rearFanX, rearFanY, rearPlane],
    { cast: false }
  );
  add(
    new THREE.CircleGeometry(rearFanR - 0.005, 26),
    createGrilleMaterial(6, 6),
    [rearFanX, rearFanY, rearPlane - 0.001],
    { cast: false }
  );
  const rearFan = createFan(rearFanR - 0.007, 0.02);
  rearFan.rotation.y = Math.PI;
  rearFan.position.set(rearFanX, rearFanY, zRear + T + 0.02);
  caseGroup.add(rearFan);

  add(
    new THREE.BoxGeometry(0.122, slotSpan, 0.004),
    dark,
    [slotX, slotY, rearPlane + 0.006],
    { cast: false }
  );
  for (let i = 0; i < 7; i++) {
    add(
      new THREE.BoxGeometry(0.12, 0.0175, 0.002),
      i === 0 ? trim : steelInner,
      [slotX, slotTop - 0.00875 - i * slotPitch, rearPlane],
      { cast: false }
    );
  }

  add(
    new THREE.BoxGeometry(0.159, 0.042, 0.005),
    dark,
    [0, ioY, rearPlane + 0.006],
    { cast: false }
  );
  [
    [-0.056, 0x1d4ed8], [-0.042, 0x1d4ed8], [-0.026, 0x334155], [0.018, 0x334155], [0.038, 0x334155]
  ].forEach(([dx, color]) => {
    add(
      new THREE.BoxGeometry(0.012, 0.007, 0.008),
      shell({ color, roughness: 0.4, metalness: 0.6 }),
      [dx, ioY + 0.004, rearPlane + 0.012],
      { cast: false }
    );
  });
  [0.058, 0.068].forEach(dx => {
    add(
      new THREE.CylinderGeometry(0.003, 0.003, 0.008, 10),
      dark,
      [dx, ioY + 0.004, rearPlane + 0.012],
      { rotation: [Math.PI / 2, 0, 0], cast: false }
    );
  });

  add(
    new THREE.BoxGeometry(psuBayW, psuBayH, 0.006),
    dark,
    [psuBayX, psuY, rearPlane + 0.006],
    { cast: false }
  );
  add(
    new THREE.PlaneGeometry(psuBayW - 0.004, psuBayH - 0.004),
    createGrilleMaterial(9, 5),
    [psuBayX, psuY, rearPlane + 0.0028],
    { cast: false }
  );
  add(
    new THREE.CylinderGeometry(0.008, 0.008, 0.008, 14),
    dark,
    [psuBayX - 0.045, psuY + 0.02, rearPlane + 0.002],
    { rotation: [Math.PI / 2, 0, 0], cast: false }
  );
  add(
    new THREE.BoxGeometry(0.02, 0.012, 0.008),
    dark,
    [psuBayX - 0.045, psuY - 0.026, rearPlane + 0.002],
    { cast: false }
  );

  // =================================================== motherboard tray
  const trayRectsList = trayRects();
  const trayHas = (y, z) =>
    trayRectsList.some(([y0, y1, z0, z1]) => y >= y0 && y <= y1 && z >= z0 && z <= z1);

  trayRectsList.forEach(([y0, y1, z0, z1]) => {
    add(
      new THREE.BoxGeometry(trayT, y1 - y0, z1 - z0),
      steelInner,
      [trayX, (y0 + y1) / 2, (z0 + z1) / 2],
      { interactive: true, name: 'motherboardTray' }
    );
  });

  add(
    new THREE.BoxGeometry(0.03, trayY1 - trayY0, T),
    steel,
    [trayX - 0.012, (trayY0 + trayY1) / 2, trayZ1 - T / 2],
    { cast: false }
  );
  [0.16, 0.26, 0.36].forEach(y => {
    add(
      new THREE.BoxGeometry(0.006, 0.014, T + 0.001),
      dark,
      [trayFace + 0.003, y, trayZ1 - T / 2],
      { cast: false }
    );
  });

  let standoffCount = 0;
  ATX_STANDOFFS.forEach(({ y, z }) => {
    if (!trayHas(y, z)) return;
    standoffCount++;
    add(
      new THREE.CylinderGeometry(0.0035, 0.0035, 0.006, 8),
      trim,
      [trayFace + 0.003, y, z],
      { rotation: [0, 0, Math.PI / 2], cast: false }
    );
  });

  [
    [trayY0 + 0.04, cutZ1 - 0.02],
    [trayY1 - 0.06, cutZ1 - 0.02]
  ].forEach(([gy, gz]) => {
    add(
      new THREE.TorusGeometry(0.012, 0.0035, 6, 16),
      rubber,
      [trayFace + 0.002, gy, gz],
      { rotation: [0, Math.PI / 2, 0], cast: false }
    );
  });

  // ========================================================== PSU shroud
  add(
    new THREE.BoxGeometry(shroudWidth, shroudHeight, shroudDepth),
    steel,
    [shroudMidX, yFloor + shroudHeight / 2, shroudMidZ],
    { interactive: true, name: 'psuShroud' }
  );
  add(
    new THREE.PlaneGeometry(shroudWidth - 0.03, shroudDepth - 0.06),
    createGrilleMaterial(7, 9),
    [shroudMidX, shroudTop + 0.0006, shroudMidZ],
    { rotation: [-Math.PI / 2, 0, 0], cast: false }
  );
  add(
    new THREE.BoxGeometry(0.102, 0.006, 0.072),
    trim,
    [-0.01, shroudTop + 0.003, 0.05],
    { cast: false }
  );
  [-0.03, 0.03].forEach(dx => {
    [-0.012, 0.012].forEach(dz => {
      add(
        new THREE.CylinderGeometry(0.0028, 0.0028, 0.004, 8),
        dark,
        [-0.01 + dx, shroudTop + 0.007, 0.05 + dz],
        { cast: false }
      );
    });
  });

  // ================================================== plain steel side
  add(
    new THREE.BoxGeometry(T, H - 0.008, D - 0.008),
    steel,
    [-W / 2 + T / 2, FEET + H / 2, 0],
    { interactive: true, name: 'caseSide' }
  );

  // ============================================ tempered glass side panel
  const sideGlass = new THREE.Mesh(
    new THREE.BoxGeometry(GT, H - 0.012, D - 0.012),
    glassMat
  );
  sideGlass.name = 'sideGlass';
  sideGlass.position.set(xGlassOuter - GT / 2, FEET + H / 2, 0);
  sideGlass.castShadow = false;
  sideGlass.receiveShadow = false;
  caseGroup.add(sideGlass);
  interactables.push(sideGlass);

  [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([sy, sz]) => {
    const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.012, 10), trim);
    screw.rotation.z = Math.PI / 2;
    screw.position.set(
      GT / 2,
      sy * ((H - 0.012) / 2 - 0.026),
      sz * ((D - 0.012) / 2 - 0.026)
    );
    sideGlass.add(screw);
  });

  const chassis = interactables.find(mesh => mesh.name === 'motherboardTray');

  const metrics = {
    shell: { width: W, height: H + FEET, depth: D },
    coolerClearance: xGlassInner - trayFace,
    cableChannel: trayX - trayT / 2 - xPlainInner,
    boardBottomToShroud: BOARD.bottom - shroudTop,
    standoffs: standoffCount,
    trayNotch: { from: TRAY.rearTop, to: TRAY.rearTopStrip },
    rearFan: { x: rearFanX, y: rearFanY, radius: rearFanR },
    roofFan: { z: roofFanZ, radius: roofFanR },
    psuChamber: { width: shroudWidth, depth: shroudDepth, height: shroudHeight }
  };

  return { caseGroup, sideGlass, chassis, frontPanel, interactables, metrics };
}
