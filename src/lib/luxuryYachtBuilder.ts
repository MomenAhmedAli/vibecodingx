import * as THREE from 'three';

export interface LuxuryYachtRig {
  yachtGroup: THREE.Group;
  helmWheelGroup: THREE.Group;
  captainGroup: THREE.Group;
  leftArmPivot: THREE.Group;
  rightArmPivot: THREE.Group;
  radarBar: THREE.Mesh;
  dispose: () => void;
}

function createTeakDeckTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#a87c4f';
  ctx.fillRect(0, 0, 512, 512);

  // Fine vertical teak planks with dark marine caulk seams
  const plankCount = 16;
  const plankW = 512 / plankCount;
  for (let i = 0; i < plankCount; i++) {
    const shade = (i % 3) * 8 - 8;
    ctx.fillStyle = `rgb(${168 + shade}, ${124 + Math.round(shade * 0.7)}, ${79 + Math.round(shade * 0.5)})`;
    ctx.fillRect(i * plankW + 2, 0, plankW - 3, 512);

    // Subtle wood grain lines
    ctx.fillStyle = 'rgba(72, 44, 20, 0.14)';
    for (let g = 0; g < 6; g++) {
      const gx = i * plankW + 4 + ((g * 7 + i * 3) % (plankW - 6));
      ctx.fillRect(gx, 0, 1.2, 512);
    }

    // Dark marine caulking seam
    ctx.fillStyle = '#2d2219';
    ctx.fillRect(i * plankW, 0, 2.2, 512);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 4);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createNavDisplayTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#061529';
  ctx.fillRect(0, 0, 512, 256);

  // Subtle nautical grid
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.18)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= 512; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 256);
    ctx.stroke();
  }
  for (let y = 0; y <= 256; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  // Left radar ring screen
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;
  [28, 56, 84].forEach((r) => {
    ctx.beginPath();
    ctx.arc(136, 128, r, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.fillStyle = 'rgba(56, 189, 248, 0.22)';
  ctx.beginPath();
  ctx.moveTo(136, 128);
  ctx.arc(136, 128, 84, -Math.PI * 0.65, -Math.PI * 0.35);
  ctx.closePath();
  ctx.fill();

  // Right course & telemetry screen
  ctx.strokeStyle = '#34d399';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(280, 210);
  ctx.quadraticCurveTo(355, 130, 420, 48);
  ctx.stroke();

  ctx.fillStyle = '#e0f2fe';
  ctx.font = 'bold 20px monospace';
  ctx.fillText('HDG 004° N', 274, 48);
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 16px monospace';
  ctx.fillText('24.8 KTS', 274, 80);
  ctx.fillStyle = '#34d399';
  ctx.fillText('DEPTH 42m', 274, 108);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Generates a sculpted Deep-V Luxury Superyacht hull BufferGeometry matching
 * the attached turnaround sheet: sharp flared bow at -Z, chine & wide beam midship,
 * tapering to a square swim-platform transom at +Z.
 */
function buildSculptedYachtHullGeometry(): THREE.BufferGeometry {
  const zStations = [-5.1, -4.3, -3.2, -1.8, -0.3, 1.3, 2.9, 4.3, 4.9];
  const positions: number[] = [];
  const indices: number[] = [];

  // Profile curves per station: halfBeam, sheerY, chineY, keelY
  const stations = zStations.map((z) => {
    const t = (z + 5.1) / 10.0; // 0 = bow (-5.1), 1 = stern (+4.9)
    const beamCurve =
      t < 0.45
        ? Math.pow(t / 0.45, 0.68)
        : 1.0 - Math.pow((t - 0.45) / 0.55, 1.8) * 0.18;
    const halfBeam = Math.max(0.03, 1.46 * beamCurve);
    const sheerY = 0.94 + Math.max(0, 0.35 - t) * 0.45 - Math.max(0, t - 0.72) * 0.28;
    const chineY = 0.16 + Math.max(0, 0.25 - t) * 0.32;
    const keelY = -0.38 + Math.max(0, 0.12 - t) * 0.45;
    return { z, halfBeam, sheerY, chineY, keelY };
  });

  // 7-point cross-section per station (port sheer -> port chine -> keel -> stbd chine -> stbd sheer)
  const ringPts = 7;
  stations.forEach((s) => {
    const profile: [number, number][] = [
      [-s.halfBeam, s.sheerY],
      [-s.halfBeam * 0.96, (s.sheerY + s.chineY) * 0.5],
      [-s.halfBeam * 0.82, s.chineY],
      [0, s.keelY],
      [s.halfBeam * 0.82, s.chineY],
      [s.halfBeam * 0.96, (s.sheerY + s.chineY) * 0.5],
      [s.halfBeam, s.sheerY],
    ];
    profile.forEach(([x, y]) => {
      positions.push(x, y, s.z);
    });
  });

  for (let i = 0; i < stations.length - 1; i++) {
    for (let j = 0; j < ringPts - 1; j++) {
      const a = i * ringPts + j;
      const b = (i + 1) * ringPts + j;
      const c = (i + 1) * ringPts + (j + 1);
      const d = i * ringPts + (j + 1);
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  // Close transom stern (+Z)
  const lastBase = (stations.length - 1) * ringPts;
  const sternCenterIdx = positions.length / 3;
  const lastS = stations[stations.length - 1];
  positions.push(0, (lastS.sheerY + lastS.keelY) * 0.5, lastS.z);
  for (let j = 0; j < ringPts - 1; j++) {
    indices.push(lastBase + j, sternCenterIdx, lastBase + j + 1);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds a sleek 2D deck silhouette Shape matching the yacht planform from the turnaround sheet.
 */
function createYachtPlanShape(scaleX = 1, scaleZ = 1): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(0, -5.05 * scaleZ);
  s.bezierCurveTo(
    0.85 * scaleX,
    -3.8 * scaleZ,
    1.52 * scaleX,
    -1.6 * scaleZ,
    1.46 * scaleX,
    1.2 * scaleZ
  );
  s.bezierCurveTo(
    1.42 * scaleX,
    2.9 * scaleZ,
    1.28 * scaleX,
    4.2 * scaleZ,
    1.16 * scaleX,
    4.85 * scaleZ
  );
  s.lineTo(-1.16 * scaleX, 4.85 * scaleZ);
  s.bezierCurveTo(
    -1.28 * scaleX,
    4.2 * scaleZ,
    -1.42 * scaleX,
    2.9 * scaleZ,
    -1.46 * scaleX,
    1.2 * scaleZ
  );
  s.bezierCurveTo(
    -1.52 * scaleX,
    -1.6 * scaleZ,
    -0.85 * scaleX,
    -3.8 * scaleZ,
    0,
    -5.05 * scaleZ
  );
  s.closePath();
  return s;
}

export function buildLuxuryYacht(maxAnisotropy = 4): LuxuryYachtRig {
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];

  const teakTex = createTeakDeckTexture(maxAnisotropy);
  const navTex = createNavDisplayTexture(maxAnisotropy);
  textures.push(teakTex, navTex);

  // Calibrated PBR Materials (>= 0.25 roughness contrast between hull, teak, glass, chrome)
  const whiteGelcoatMat = new THREE.MeshPhysicalMaterial({
    color: 0xf4f6f9,
    metalness: 0.06,
    roughness: 0.22,
    clearcoat: 0.85,
    clearcoatRoughness: 0.12,
    side: THREE.DoubleSide,
  });
  const blackBootStripeMat = new THREE.MeshStandardMaterial({
    color: 0x10141d,
    metalness: 0.25,
    roughness: 0.38,
  });
  const teakMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: teakTex,
    metalness: 0.04,
    roughness: 0.78,
  });
  const tintedGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0a1322,
    metalness: 0.2,
    roughness: 0.06,
    clearcoat: 1.0,
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const darkPortholeMat = new THREE.MeshPhysicalMaterial({
    color: 0x090e18,
    metalness: 0.35,
    roughness: 0.08,
    clearcoat: 1.0,
  });
  const stainlessMat = new THREE.MeshPhysicalMaterial({
    color: 0xe2e8f0,
    metalness: 0.94,
    roughness: 0.16,
  });
  const bronzeMat = new THREE.MeshPhysicalMaterial({
    color: 0xc99a49,
    metalness: 0.92,
    roughness: 0.24,
  });
  const loungeCreamMat = new THREE.MeshStandardMaterial({
    color: 0xe5dfd5,
    metalness: 0.02,
    roughness: 0.84,
  });
  const bridgeTrimMat = new THREE.MeshStandardMaterial({
    color: 0x1e2533,
    metalness: 0.18,
    roughness: 0.54,
  });
  const interiorPanelMat = new THREE.MeshStandardMaterial({
    color: 0x10192b,
    metalness: 0.12,
    roughness: 0.76,
  });
  const navScreenMat = new THREE.MeshBasicMaterial({
    map: navTex,
  });

  // Shaded Captain / Helmsman Materials
  const captainSuitMat = new THREE.MeshStandardMaterial({
    color: 0x162238,
    metalness: 0.08,
    roughness: 0.68,
  });
  const captainShirtMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    metalness: 0.02,
    roughness: 0.76,
  });
  const captainSkinMat = new THREE.MeshStandardMaterial({
    color: 0xd9b392,
    metalness: 0.04,
    roughness: 0.56,
  });
  const captainCapMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    metalness: 0.05,
    roughness: 0.52,
  });

  materials.push(
    whiteGelcoatMat,
    blackBootStripeMat,
    teakMat,
    tintedGlassMat,
    darkPortholeMat,
    stainlessMat,
    bronzeMat,
    loungeCreamMat,
    bridgeTrimMat,
    interiorPanelMat,
    navScreenMat,
    captainSuitMat,
    captainShirtMat,
    captainSkinMat,
    captainCapMat
  );

  const yachtGroup = new THREE.Group();

  // 1. Sculpted Deep-V White Hull + Black Underbody/Waterline Chine
  const hullGeo = buildSculptedYachtHullGeometry();
  geometries.push(hullGeo);
  const hullMesh = new THREE.Mesh(hullGeo, whiteGelcoatMat);
  hullMesh.castShadow = true;
  hullMesh.receiveShadow = true;
  yachtGroup.add(hullMesh);

  const bootGeo = hullGeo.clone();
  bootGeo.scale(1.006, 0.36, 1.003);
  geometries.push(bootGeo);
  const bootMesh = new THREE.Mesh(bootGeo, blackBootStripeMat);
  bootMesh.position.y = -0.14;
  yachtGroup.add(bootMesh);

  // 2. Main Deck Cap + Teak Foredeck, Walkways & Aft Swim Platform
  const mainDeckShape = createYachtPlanShape(0.98, 0.99);
  const mainDeckGeo = new THREE.ExtrudeGeometry(mainDeckShape, {
    depth: 0.09,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 2,
  });
  mainDeckGeo.rotateX(Math.PI / 2);
  geometries.push(mainDeckGeo);
  const mainDeck = new THREE.Mesh(mainDeckGeo, whiteGelcoatMat);
  mainDeck.position.y = 0.96;
  mainDeck.receiveShadow = true;
  yachtGroup.add(mainDeck);

  // Teak Deck Surface (offset +0.025 above mainDeck to avoid Z-fighting)
  const teakShape = createYachtPlanShape(0.9, 0.96);
  const teakDeckGeo = new THREE.ExtrudeGeometry(teakShape, {
    depth: 0.02,
    bevelEnabled: false,
  });
  teakDeckGeo.rotateX(Math.PI / 2);
  geometries.push(teakDeckGeo);
  const teakDeck = new THREE.Mesh(teakDeckGeo, teakMat);
  teakDeck.position.y = 1.005;
  teakDeck.receiveShadow = true;
  yachtGroup.add(teakDeck);

  // Extended Low Aft Teak Swim Platform & Boarding Steps (matching Rear View)
  const swimPlatformGeo = new THREE.BoxGeometry(2.34, 0.14, 0.95);
  geometries.push(swimPlatformGeo);
  const swimPlatform = new THREE.Mesh(swimPlatformGeo, teakMat);
  swimPlatform.position.set(0, 0.14, 5.22);
  swimPlatform.receiveShadow = true;
  yachtGroup.add(swimPlatform);

  const stepGeo = new THREE.BoxGeometry(0.42, 0.16, 0.32);
  geometries.push(stepGeo);
  [-0.92, 0.92].forEach((sx) => {
    for (let st = 0; st < 3; st++) {
      const step = new THREE.Mesh(stepGeo, teakMat);
      step.position.set(sx, 0.28 + st * 0.22, 4.78 - st * 0.24);
      yachtGroup.add(step);
    }
  });

  // Twin Bronze Stern Propellers
  const propHubGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.22, 12);
  propHubGeo.rotateX(Math.PI / 2);
  const bladeGeo = new THREE.BoxGeometry(0.24, 0.05, 0.02);
  geometries.push(propHubGeo, bladeGeo);
  [-0.48, 0.48].forEach((px) => {
    const hub = new THREE.Mesh(propHubGeo, bronzeMat);
    hub.position.set(px, -0.14, 5.05);
    yachtGroup.add(hub);
    for (let b = 0; b < 3; b++) {
      const blade = new THREE.Mesh(bladeGeo, bronzeMat);
      blade.position.set(px, -0.14, 5.13);
      blade.rotation.z = (b * Math.PI * 2) / 3;
      blade.rotation.y = 0.35;
      yachtGroup.add(blade);
    }
  });

  // 3. Hull Portholes (5 per flank) & Bow Anchor Pockets (matching Side & Front Views)
  const portholeGeo = new THREE.BoxGeometry(0.06, 0.14, 0.34);
  const anchorPocketGeo = new THREE.BoxGeometry(0.08, 0.26, 0.28);
  geometries.push(portholeGeo, anchorPocketGeo);

  const portholeZs = [-2.55, -1.55, -0.55, 0.55, 1.55];
  [-1, 1].forEach((sideSign) => {
    portholeZs.forEach((pz) => {
      const t = (pz + 5.1) / 10.0;
      const beamFactor = Math.pow(t / 0.45, 0.68);
      const bx = sideSign * Math.min(1.44, Math.max(0.55, 1.44 * (t < 0.45 ? beamFactor : 0.96)));
      const ph = new THREE.Mesh(portholeGeo, darkPortholeMat);
      ph.position.set(bx, 0.52, pz);
      ph.rotation.y = sideSign * (pz < -1 ? 0.26 : 0.03);
      yachtGroup.add(ph);
    });

    // Bow recessed anchor pocket
    const ap = new THREE.Mesh(anchorPocketGeo, blackBootStripeMat);
    ap.position.set(sideSign * 0.42, 0.62, -4.15);
    ap.rotation.y = sideSign * 0.42;
    yachtGroup.add(ap);
  });

  // Foredeck Sunpad Cushion (matching Top View)
  const sunpadGeo = new THREE.BoxGeometry(1.18, 0.12, 1.65);
  geometries.push(sunpadGeo);
  const sunpad = new THREE.Mesh(sunpadGeo, loungeCreamMat);
  sunpad.position.set(0, 1.04, -3.25);
  sunpad.castShadow = true;
  yachtGroup.add(sunpad);

  // 4. Main Superstructure Cabin Walls + Open Interior Bridge Bay
  // Left & Right Swept Salon Side Walls (tall enough for full standing headroom inside!)
  const salonSideWallShape = new THREE.Shape();
  salonSideWallShape.moveTo(-2.15, 0.0);
  salonSideWallShape.lineTo(-1.32, 1.44);
  salonSideWallShape.lineTo(2.38, 1.44);
  salonSideWallShape.lineTo(2.75, 0.0);
  salonSideWallShape.closePath();

  const sideWallGeo = new THREE.ExtrudeGeometry(salonSideWallShape, {
    depth: 0.14,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  sideWallGeo.rotateY(-Math.PI / 2);
  geometries.push(sideWallGeo);

  // Note: Extrude along -X after rotateY(-PI/2): port wall -1.22..-1.08, stbd wall 1.08..1.22
  [-1.08, 1.22].forEach((wx) => {
    const wall = new THREE.Mesh(sideWallGeo, whiteGelcoatMat);
    wall.position.set(wx, 0.98, 0);
    wall.castShadow = true;
    yachtGroup.add(wall);
  });

  // Long Swept Dark Salon Side Window Strips
  const sideWinGeo = new THREE.BoxGeometry(0.05, 0.64, 3.35);
  geometries.push(sideWinGeo);
  [-1.16, 1.16].forEach((wx) => {
    const win = new THREE.Mesh(sideWinGeo, darkPortholeMat);
    win.position.set(wx, 1.74, 0.45);
    yachtGroup.add(win);
  });

  // Curved Wraparound Front Bridge Windshield (translucent tinted glass so interior looks OUT)
  const windshieldGeo = new THREE.CylinderGeometry(1.14, 1.26, 1.18, 24, 1, true, -Math.PI * 0.44, Math.PI * 0.88);
  geometries.push(windshieldGeo);
  const windshield = new THREE.Mesh(windshieldGeo, tintedGlassMat);
  windshield.position.set(0, 1.72, -1.25);
  windshield.rotation.y = Math.PI;
  windshield.rotation.x = 0.22;
  windshield.renderOrder = 3;
  yachtGroup.add(windshield);

  // Windshield Center & Side Mullions + Wipers
  const mullionGeo = new THREE.CylinderGeometry(0.024, 0.028, 1.26, 8);
  geometries.push(mullionGeo);
  [-0.95, 0, 0.95].forEach((mx) => {
    const m = new THREE.Mesh(mullionGeo, blackBootStripeMat);
    m.position.set(mx, 1.74, -1.96 + Math.abs(mx) * 0.34);
    m.rotation.x = 0.36;
    yachtGroup.add(m);
  });

  // Aft Salon Glass Sliding Doors
  const aftDoorsGeo = new THREE.BoxGeometry(1.9, 1.32, 0.04);
  geometries.push(aftDoorsGeo);
  const aftDoors = new THREE.Mesh(aftDoorsGeo, tintedGlassMat);
  aftDoors.position.set(0, 1.66, 2.65);
  aftDoors.renderOrder = 3;
  yachtGroup.add(aftDoors);

  // =========================================================================
  // 5. BRIDGE INTERIOR: HELM CONSOLE, DUAL NAV SCREENS, WHEEL & SHADED CAPTAIN
  // Visible when the camera dives INSIDE the yacht!
  // =========================================================================
  const interiorLight = new THREE.PointLight(0xbae6fd, 3.8, 6.2, 1.3);
  interiorLight.position.set(0, 2.22, -0.52);
  yachtGroup.add(interiorLight);

  // Matte Dark Navy Interior Bridge Bulkhead Panels & Ceiling Liner (gives authentic contrast inside)
  const innerWallGeo = new THREE.BoxGeometry(0.03, 1.32, 3.85);
  const ceilingLinerGeo = new THREE.BoxGeometry(2.12, 0.04, 3.4);
  geometries.push(innerWallGeo, ceilingLinerGeo);
  [-1.06, 1.06].forEach((ix) => {
    const innerWall = new THREE.Mesh(innerWallGeo, interiorPanelMat);
    innerWall.position.set(ix, 1.66, 0.45);
    yachtGroup.add(innerWall);
  });
  const ceilingLiner = new THREE.Mesh(ceilingLinerGeo, interiorPanelMat);
  ceilingLiner.position.set(0, 2.33, 0.45);
  yachtGroup.add(ceilingLiner);

  // Helm Console Desk
  const consoleGeo = new THREE.BoxGeometry(1.58, 0.58, 0.54);
  geometries.push(consoleGeo);
  const helmConsole = new THREE.Mesh(consoleGeo, bridgeTrimMat);
  helmConsole.position.set(0, 1.25, -1.16);
  helmConsole.castShadow = true;
  helmConsole.receiveShadow = true;
  yachtGroup.add(helmConsole);

  // Glowing Navigation Chartplotter Screen sitting cleanly above Console Desk
  const navPanelGeo = new THREE.PlaneGeometry(0.86, 0.3);
  geometries.push(navPanelGeo);
  const navPanel = new THREE.Mesh(navPanelGeo, navScreenMat);
  navPanel.position.set(0.2, 1.62, -0.94);
  navPanel.rotation.x = -0.22;
  yachtGroup.add(navPanel);

  // Dual Chrome Engine Throttle Levers
  const throttleBaseGeo = new THREE.BoxGeometry(0.14, 0.06, 0.16);
  const throttleStickGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.18, 8);
  const throttleKnobGeo = new THREE.SphereGeometry(0.025, 10, 10);
  geometries.push(throttleBaseGeo, throttleStickGeo, throttleKnobGeo);
  const throttleBase = new THREE.Mesh(throttleBaseGeo, stainlessMat);
  throttleBase.position.set(0.58, 1.56, -1.04);
  yachtGroup.add(throttleBase);
  [-0.03, 0.03].forEach((tx) => {
    const stick = new THREE.Mesh(throttleStickGeo, stainlessMat);
    stick.position.set(0.58 + tx, 1.65, -1.08);
    stick.rotation.x = -0.35;
    yachtGroup.add(stick);
    const knob = new THREE.Mesh(throttleKnobGeo, blackBootStripeMat);
    knob.position.set(0.58 + tx, 1.73, -1.11);
    yachtGroup.add(knob);
  });

  // Stainless Yacht Steering Wheel (tilted cleanly facing Captain at -0.28 X)
  const helmWheelGroup = new THREE.Group();
  helmWheelGroup.position.set(-0.28, 1.48, -0.78);
  helmWheelGroup.rotation.x = -0.45;
  yachtGroup.add(helmWheelGroup);

  const rimGeo = new THREE.TorusGeometry(0.21, 0.02, 12, 28);
  const hubGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.07, 14);
  hubGeo.rotateX(Math.PI / 2);
  const spokeGeo = new THREE.CylinderGeometry(0.011, 0.013, 0.41, 8);
  geometries.push(rimGeo, hubGeo, spokeGeo);

  helmWheelGroup.add(new THREE.Mesh(rimGeo, stainlessMat));
  helmWheelGroup.add(new THREE.Mesh(hubGeo, bridgeTrimMat));
  for (let s = 0; s < 3; s++) {
    const spoke = new THREE.Mesh(spokeGeo, stainlessMat);
    spoke.rotation.z = (s * Math.PI) / 3;
    helmWheelGroup.add(spoke);
  }

  // Shaded 3D Captain / Helmsman standing inside bridge gripping wheel (top of cap ~2.20, zero roof clip!)
  const captainGroup = new THREE.Group();
  captainGroup.position.set(-0.28, 1.005, -0.32);
  captainGroup.scale.setScalar(0.86);
  yachtGroup.add(captainGroup);

  const legGeo = new THREE.CylinderGeometry(0.068, 0.056, 0.58, 12);
  const torsoGeo = new THREE.CylinderGeometry(0.16, 0.18, 0.56, 16);
  const collarGeo = new THREE.CylinderGeometry(0.075, 0.085, 0.1, 12);
  const headGeo = new THREE.SphereGeometry(0.115, 16, 16);
  const capCrownGeo = new THREE.CylinderGeometry(0.125, 0.115, 0.07, 16);
  const capVisorGeo = new THREE.BoxGeometry(0.16, 0.018, 0.12);
  const armGeo = new THREE.CylinderGeometry(0.048, 0.042, 0.44, 10);
  const handGeo = new THREE.SphereGeometry(0.04, 10, 10);
  geometries.push(
    legGeo,
    torsoGeo,
    collarGeo,
    headGeo,
    capCrownGeo,
    capVisorGeo,
    armGeo,
    handGeo
  );

  [-0.1, 0.1].forEach((lx) => {
    const leg = new THREE.Mesh(legGeo, blackBootStripeMat);
    leg.position.set(lx, 0.29, 0);
    leg.castShadow = true;
    captainGroup.add(leg);
  });

  const torso = new THREE.Mesh(torsoGeo, captainSuitMat);
  torso.position.set(0, 0.84, 0);
  torso.castShadow = true;
  captainGroup.add(torso);

  const shirtCollar = new THREE.Mesh(collarGeo, captainShirtMat);
  shirtCollar.position.set(0, 1.14, -0.02);
  captainGroup.add(shirtCollar);

  const head = new THREE.Mesh(headGeo, captainSkinMat);
  head.position.set(0, 1.27, -0.02);
  head.castShadow = true;
  captainGroup.add(head);

  const capCrown = new THREE.Mesh(capCrownGeo, captainCapMat);
  capCrown.position.set(0, 1.36, -0.02);
  captainGroup.add(capCrown);

  const capVisor = new THREE.Mesh(capVisorGeo, blackBootStripeMat);
  capVisor.position.set(0, 1.33, -0.12);
  capVisor.rotation.x = 0.18;
  captainGroup.add(capVisor);

  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(-0.18, 1.06, -0.02);
  captainGroup.add(leftArmPivot);

  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(0.18, 1.06, -0.02);
  captainGroup.add(rightArmPivot);

  const shoulderGeo = new THREE.SphereGeometry(0.058, 12, 12);
  geometries.push(shoulderGeo);

  [
    { pivot: leftArmPivot, sign: -1 },
    { pivot: rightArmPivot, sign: 1 },
  ].forEach(({ pivot, sign }) => {
    const shoulder = new THREE.Mesh(shoulderGeo, captainSuitMat);
    pivot.add(shoulder);

    const limb = new THREE.Mesh(armGeo, captainSuitMat);
    limb.position.set(0, -0.21, 0);
    limb.castShadow = true;
    pivot.add(limb);

    const hand = new THREE.Mesh(handGeo, captainSkinMat);
    hand.position.set(0, -0.43, 0);
    pivot.add(hand);

    pivot.rotation.set(1.18, 0, sign * 0.12);
  });

  // =========================================================================
  // 6. UPPER FLYBRIDGE DECK, RADAR ARCH, TWIN RADOMES & STAINLESS RAILINGS
  // =========================================================================
  const flyDeckShape = new THREE.Shape();
  flyDeckShape.moveTo(0, -1.75);
  flyDeckShape.bezierCurveTo(0.92, -1.45, 1.08, -0.45, 1.06, 0.85);
  flyDeckShape.lineTo(0.98, 2.75);
  flyDeckShape.lineTo(-0.98, 2.75);
  flyDeckShape.lineTo(-1.06, 0.85);
  flyDeckShape.bezierCurveTo(-1.08, -0.45, -0.92, -1.45, 0, -1.75);
  flyDeckShape.closePath();

  const flyDeckGeo = new THREE.ExtrudeGeometry(flyDeckShape, {
    depth: 0.11,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 2,
  });
  flyDeckGeo.rotateX(Math.PI / 2);
  geometries.push(flyDeckGeo);

  // Flybridge roof sits cleanly at y = 2.48 (underside ~2.34, full headroom above captain!)
  const flyDeck = new THREE.Mesh(flyDeckGeo, whiteGelcoatMat);
  flyDeck.position.set(0, 2.48, 0.1);
  flyDeck.castShadow = true;
  flyDeck.receiveShadow = true;
  yachtGroup.add(flyDeck);

  // Flybridge U-Lounge Seating
  const sofaBackGeo = new THREE.BoxGeometry(1.42, 0.24, 0.24);
  const sofaSideGeo = new THREE.BoxGeometry(0.24, 0.24, 1.15);
  geometries.push(sofaBackGeo, sofaSideGeo);
  const sofaBack = new THREE.Mesh(sofaBackGeo, loungeCreamMat);
  sofaBack.position.set(0, 2.62, 2.1);
  yachtGroup.add(sofaBack);
  [-0.6, 0.6].forEach((sx) => {
    const sideSofa = new THREE.Mesh(sofaSideGeo, loungeCreamMat);
    sideSofa.position.set(sx, 2.62, 1.55);
    yachtGroup.add(sideSofa);
  });

  // Sculpted White Radar Arch Hoop (matching Front & Rear Turnaround Views)
  const archCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.98, 2.48, 0.45),
    new THREE.Vector3(-0.88, 3.18, 0.65),
    new THREE.Vector3(0, 3.3, 0.72),
    new THREE.Vector3(0.88, 3.18, 0.65),
    new THREE.Vector3(0.98, 2.48, 0.45),
  ]);
  const archGeo = new THREE.TubeGeometry(archCurve, 28, 0.075, 10, false);
  geometries.push(archGeo);
  const radarArch = new THREE.Mesh(archGeo, whiteGelcoatMat);
  radarArch.castShadow = true;
  yachtGroup.add(radarArch);

  // Twin Spherical Satellite Radomes on Arch Shoulders
  const domeGeo = new THREE.SphereGeometry(0.16, 16, 14);
  geometries.push(domeGeo);
  [-0.58, 0.58].forEach((dx) => {
    const dome = new THREE.Mesh(domeGeo, whiteGelcoatMat);
    dome.position.set(dx, 3.28, 0.68);
    dome.scale.set(1, 1.12, 1);
    yachtGroup.add(dome);
  });

  // Central Communications Mast + Rotating Radar Scanner Bar
  const mastPoleGeo = new THREE.CylinderGeometry(0.032, 0.055, 0.72, 10);
  const radarBarGeo = new THREE.BoxGeometry(0.68, 0.055, 0.085);
  const antennaGeo = new THREE.CylinderGeometry(0.008, 0.012, 0.65, 6);
  geometries.push(mastPoleGeo, radarBarGeo, antennaGeo);

  const mastPole = new THREE.Mesh(mastPoleGeo, whiteGelcoatMat);
  mastPole.position.set(0, 3.62, 0.72);
  yachtGroup.add(mastPole);

  const radarBar = new THREE.Mesh(radarBarGeo, whiteGelcoatMat);
  radarBar.position.set(0, 3.66, 0.72);
  yachtGroup.add(radarBar);

  [-0.28, 0.28].forEach((ax) => {
    const whip = new THREE.Mesh(antennaGeo, stainlessMat);
    whip.position.set(ax, 3.89, 0.74);
    yachtGroup.add(whip);
  });

  // Stainless Steel Bow Pulpit & Flybridge Safety Railings (TubeGeometry)
  const bowRailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.32, 1.24, -1.65),
    new THREE.Vector3(-0.98, 1.32, -3.25),
    new THREE.Vector3(-0.36, 1.4, -4.65),
    new THREE.Vector3(0, 1.44, -5.06),
    new THREE.Vector3(0.36, 1.4, -4.65),
    new THREE.Vector3(0.98, 1.32, -3.25),
    new THREE.Vector3(1.32, 1.24, -1.65),
  ]);
  const bowRailGeo = new THREE.TubeGeometry(bowRailCurve, 44, 0.022, 8, false);
  const flyRailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.96, 2.76, 0.9),
    new THREE.Vector3(-0.94, 2.78, 2.72),
    new THREE.Vector3(0.94, 2.78, 2.72),
    new THREE.Vector3(0.96, 2.76, 0.9),
  ]);
  const flyRailGeo = new THREE.TubeGeometry(flyRailCurve, 28, 0.018, 8, false);
  const stanchionGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.28, 6);
  geometries.push(bowRailGeo, flyRailGeo, stanchionGeo);

  yachtGroup.add(new THREE.Mesh(bowRailGeo, stainlessMat));
  yachtGroup.add(new THREE.Mesh(flyRailGeo, stainlessMat));

  [
    [-1.24, 1.12, -2.1],
    [1.24, 1.12, -2.1],
    [-0.92, 1.18, -3.3],
    [0.92, 1.18, -3.3],
    [-0.36, 1.26, -4.62],
    [0.36, 1.26, -4.62],
  ].forEach(([sx, sy, sz]) => {
    const post = new THREE.Mesh(stanchionGeo, stainlessMat);
    post.position.set(sx, sy, sz);
    yachtGroup.add(post);
  });

  yachtGroup.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = false;
      child.receiveShadow = false;
    }
  });

  const dispose = () => {
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    textures.forEach((t) => t.dispose());
  };

  return {
    yachtGroup,
    helmWheelGroup,
    captainGroup,
    leftArmPivot,
    rightArmPivot,
    radarBar,
    dispose,
  };
}
