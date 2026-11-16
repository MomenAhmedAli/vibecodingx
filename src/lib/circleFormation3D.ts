import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { VoyageFrameState } from './voyageChoreography';
import { clamp, smoothstep } from './voyageChoreography';

export type YachtCalloutKey = 'bow' | 'bridge' | 'keel' | 'props';

export interface ProjectedYachtAnchor {
  xPct: number;
  yPct: number;
  visible: boolean;
}

export type YachtAnchorProjectionMap = Record<YachtCalloutKey, ProjectedYachtAnchor>;

export interface CircleFormation3DHandle {
  updateAndRender: (
    state: VoyageFrameState,
    effectiveAlpha: number,
    elapsedTimeSec: number,
    theme: 'light' | 'dark',
    viewportWidth: number,
    viewportHeight: number
  ) => YachtAnchorProjectionMap | null;
  clearCanvas: () => void;
  resize: (width: number, height: number) => void;
  dispose: () => void;
  domElement: HTMLCanvasElement;
}

// Reusable math scratch objects (zero per-frame allocations)
const _camPos = new THREE.Vector3();
const _camLook = new THREE.Vector3();
const _projVec = new THREE.Vector3();

function detectSoftwareWebGL(): boolean {
  const probe = document.createElement('canvas').getContext('webgl2');
  if (!probe) return true;
  const ext = probe.getExtension('WEBGL_debug_renderer_info');
  const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
  const gpu = String(probe.getParameter(param));
  probe.getExtension('WEBGL_lose_context')?.loseContext();
  return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
}

/**
 * Creates a procedural Burmese teak deck planking texture with caulked dark seams.
 */
function createTeakTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const w = 512;
  const h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.fillStyle = '#9b6b3e';
    ctx.fillRect(0, 0, w, h);

    const plankCount = 14;
    const plankW = w / plankCount;
    for (let i = 0; i < plankCount; i++) {
      const shade = ((i * 37) % 19) - 9;
      ctx.fillStyle = `rgb(${156 + shade}, ${106 + Math.round(shade * 0.7)}, ${62 + Math.round(shade * 0.4)})`;
      ctx.fillRect(i * plankW + 2, 0, plankW - 3, h);

      // Subtle wood grain streaks
      ctx.fillStyle = 'rgba(72, 42, 18, 0.14)';
      for (let g = 0; g < 6; g++) {
        const gx = i * plankW + 4 + ((g * 7 + i * 3) % Math.max(4, Math.floor(plankW - 8)));
        ctx.fillRect(gx, 0, 1.5, h);
      }

      // Black marine caulk seam
      ctx.fillStyle = '#24180e';
      ctx.fillRect(i * plankW, 0, 2, h);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2.5, 5);
  tex.anisotropy = Math.min(8, maxAnisotropy);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Generates an indexed, strictly manifold lofted geometry across symmetric yacht hull cross-sections.
 * Winding is verified outward CCW on starboard (+X), keel (-Y), and port (-X).
 */
interface HullStation {
  z: number;
  sheerX: number;
  sheerY: number;
  chineX: number;
  chineY: number;
  keelY: number;
}

function createHullStations(): HullStation[] {
  // Stern z = -5.15 -> Sharply raked V-bow stem z = +6.05
  return [
    { z: -5.15, sheerX: 1.54, sheerY: 0.96, chineX: 1.38, chineY: 0.14, keelY: -0.46 },
    { z: -4.2, sheerX: 1.58, sheerY: 0.97, chineX: 1.42, chineY: 0.12, keelY: -0.52 },
    { z: -2.8, sheerX: 1.62, sheerY: 1.0, chineX: 1.45, chineY: 0.1, keelY: -0.60 },
    { z: -1.1, sheerX: 1.64, sheerY: 1.04, chineX: 1.44, chineY: 0.08, keelY: -0.68 },
    { z: 0.6, sheerX: 1.60, sheerY: 1.10, chineX: 1.36, chineY: 0.08, keelY: -0.74 },
    { z: 2.2, sheerX: 1.45, sheerY: 1.18, chineX: 1.15, chineY: 0.1, keelY: -0.76 },
    { z: 3.6, sheerX: 1.15, sheerY: 1.28, chineX: 0.80, chineY: 0.14, keelY: -0.70 },
    { z: 4.85, sheerX: 0.66, sheerY: 1.39, chineX: 0.36, chineY: 0.24, keelY: -0.48 },
    { z: 5.65, sheerX: 0.20, sheerY: 1.47, chineX: 0.09, chineY: 0.42, keelY: -0.08 },
    { z: 6.08, sheerX: 0.025, sheerY: 1.53, chineX: 0.015, chineY: 0.72, keelY: 0.28 },
  ];
}

function buildLoftedHullBandGeometry(
  stations: HullStation[],
  band: 'lower' | 'upper'
): THREE.BufferGeometry {
  // Lower band covers keel (-Y) up to waterline (+0.16)
  // Upper band covers waterline (+0.14) up to flared deck sheer (sheerY)
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const profileCount = band === 'lower' ? 7 : 7;
  const rows = stations.length;

  for (let s = 0; s < rows; s++) {
    const st = stations[s];
    const v = s / (rows - 1);

    let pts: [number, number][];
    if (band === 'lower') {
      const wlX = st.chineX + (st.sheerX - st.chineX) * 0.08;
      const wlY = Math.max(st.chineY + 0.04, 0.16);
      const midChineX = st.chineX * 0.56;
      const midKeelY = st.keelY * 0.72 + st.chineY * 0.28;
      pts = [
        [wlX, wlY],
        [st.chineX, st.chineY],
        [midChineX, midKeelY],
        [0, st.keelY],
        [-midChineX, midKeelY],
        [-st.chineX, st.chineY],
        [-wlX, wlY],
      ];
    } else {
      const wlX = st.chineX + (st.sheerX - st.chineX) * 0.06;
      const wlY = Math.max(st.chineY + 0.02, 0.14);
      const midX = (wlX + st.sheerX) * 0.52;
      const midY = (wlY + st.sheerY) * 0.50;
      const upperX = st.sheerX * 0.94;
      // Include narrow rolled gunwale lip inward on top edge
      pts = [
        [upperX, st.sheerY],
        [st.sheerX, st.sheerY - 0.04],
        [midX, midY],
        [wlX, wlY],
        // Skip bottom closure here so we keep clean quad topology along starboard -> bottom-cut -> port:
        // Actually bridge across port cleanly using mirror order:
        [-wlX, wlY],
        [-midX, midY],
        [-st.sheerX, st.sheerY - 0.04],
      ];
      // Wait: bridging wlX -> -wlX cuts across inside hull! Instead build starboard and port side planks separately for 'upper'!
      void pts;
    }

    if (band === 'lower') {
      for (let i = 0; i < profileCount; i++) {
        positions.push(pts![i][0], pts![i][1], st.z);
        uvs.push(i / (profileCount - 1), v);
      }
    }
  }

  if (band === 'lower') {
    for (let s = 0; s < rows - 1; s++) {
      for (let i = 0; i < profileCount - 1; i++) {
        const a = s * profileCount + i;
        const b = s * profileCount + (i + 1);
        const c = (s + 1) * profileCount + (i + 1);
        const d = (s + 1) * profileCount + i;
        indices.push(a, d, c, a, c, b);
      }
    }

    // Close flat stern transom at station 0
    const s0 = stations[0];
    const wlY0 = Math.max(s0.chineY + 0.04, 0.16);
    const transomCenterIdx = positions.length / 3;
    positions.push(0, (wlY0 + s0.keelY) * 0.5, s0.z);
    uvs.push(0.5, 0);
    for (let i = 0; i < profileCount - 1; i++) {
      // Looking from -Z (stern), outward is -Z, so (center, i, i+1) gives -Z normal!
      indices.push(transomCenterIdx, i, i + 1);
    }
    // Close top chord between index (profileCount - 1) and index 0
    indices.push(transomCenterIdx, profileCount - 1, 0);

    // Close bow stem tip at station rows - 1
    const lastBase = (rows - 1) * profileCount;
    const bowCenterIdx = positions.length / 3;
    const sBow = stations[rows - 1];
    positions.push(0, (sBow.chineY + sBow.keelY) * 0.5, sBow.z + 0.01);
    uvs.push(0.5, 1);
    for (let i = 0; i < profileCount - 1; i++) {
      indices.push(bowCenterIdx, lastBase + i + 1, lastBase + i);
    }
    indices.push(bowCenterIdx, lastBase, lastBase + profileCount - 1);
  } else {
    // Upper band: separate starboard (+X), port (-X), and flat fore/side deck surface so zero internal triangles cut across!
    const sidePts = 4; // [sheerTopIn, sheerOuter, midFlank, waterlineEdge]
    const buildFlank = (sign: 1 | -1) => {
      const baseVertex = positions.length / 3;
      for (let s = 0; s < rows; s++) {
        const st = stations[s];
        const v = s / (rows - 1);
        const wlX = (st.chineX + (st.sheerX - st.chineX) * 0.06) * sign;
        const wlY = Math.max(st.chineY + 0.02, 0.14);
        const midX = ((st.chineX + st.sheerX) * 0.52) * sign;
        const midY = (wlY + st.sheerY) * 0.52;
        const sheerX = st.sheerX * sign;
        const deckEdgeX = st.sheerX * 0.90 * sign;

        const curve: [number, number][] =
          sign === 1
            ? [
                [deckEdgeX, st.sheerY],
                [sheerX, st.sheerY - 0.03],
                [midX, midY],
                [wlX, wlY],
              ]
            : [
                [wlX, wlY],
                [midX, midY],
                [sheerX, st.sheerY - 0.03],
                [deckEdgeX, st.sheerY],
              ];

        for (let i = 0; i < sidePts; i++) {
          positions.push(curve[i][0], curve[i][1], st.z);
          uvs.push(i / (sidePts - 1), v);
        }
      }
      for (let s = 0; s < rows - 1; s++) {
        for (let i = 0; i < sidePts - 1; i++) {
          const a = baseVertex + s * sidePts + i;
          const b = baseVertex + s * sidePts + (i + 1);
          const c = baseVertex + (s + 1) * sidePts + (i + 1);
          const d = baseVertex + (s + 1) * sidePts + i;
          indices.push(a, d, c, a, c, b);
        }
      }
    };

    buildFlank(1);
    buildFlank(-1);

    // Full white main deck top sheet spanning port sheer -> starboard sheer
    const deckBase = positions.length / 3;
    for (let s = 0; s < rows; s++) {
      const st = stations[s];
      const v = s / (rows - 1);
      positions.push(-st.sheerX * 0.92, st.sheerY, st.z);
      uvs.push(0, v);
      positions.push(0, st.sheerY + 0.03, st.z);
      uvs.push(0.5, v);
      positions.push(st.sheerX * 0.92, st.sheerY, st.z);
      uvs.push(1, v);
    }
    for (let s = 0; s < rows - 1; s++) {
      for (let i = 0; i < 2; i++) {
        const a = deckBase + s * 3 + i;
        const b = deckBase + s * 3 + i + 1;
        const c = deckBase + (s + 1) * 3 + i + 1;
        const d = deckBase + (s + 1) * 3 + i;
        // Normal points +Y: (A->D = +Z), (A->B = +X), (+Z) x (+X) = +Y!
        indices.push(a, d, c, a, c, b);
      }
    }

    // Solid white transom bulkhead at stern (z = -5.15)
    const s0 = stations[0];
    const wlY0 = Math.max(s0.chineY + 0.02, 0.14);
    const wlX0 = s0.chineX + (s0.sheerX - s0.chineX) * 0.06;
    const tBase = positions.length / 3;
    positions.push(
      -wlX0, wlY0, s0.z,
      wlX0, wlY0, s0.z,
      s0.sheerX, s0.sheerY - 0.03, s0.z,
      -s0.sheerX, s0.sheerY - 0.03, s0.z
    );
    uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
    // Normal points -Z: (0->2 = +X,+Y), (0->1 = +X) => Wait: (+X) x (+Y) = +Z, so reverse to (0, 3, 2, 0, 2, 1)!
    indices.push(tBase, tBase + 3, tBase + 2, tBase, tBase + 2, tBase + 1);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

/**
 * Builds the entire sculptural composite 3D Luxury Motor Yacht matching the turnaround sheet.
 */
function buildLuxuryYachtGroup(
  teakTex: THREE.CanvasTexture,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
  trackMat: <T extends THREE.Material>(m: T) => T
) {
  const yacht = new THREE.Group();
  const fadeableMaterials: { mat: THREE.Material; baseOpacity: number }[] = [];
  const propellers: THREE.Object3D[] = [];

  const registerMat = <T extends THREE.Material>(mat: T, baseOpacity = 1): T => {
    mat.transparent = true;
    mat.opacity = baseOpacity;
    fadeableMaterials.push({ mat, baseOpacity });
    return trackMat(mat);
  };

  // Materials calibrated for distinct yacht silhouettes & PBR light response
  const gelcoatWhiteMat = registerMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xf4f7fc,
      roughness: 0.14,
      metalness: 0.06,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
      envMapIntensity: 1.25,
    })
  );

  const superWhiteMat = registerMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xf8fafc,
      roughness: 0.18,
      metalness: 0.04,
      clearcoat: 0.85,
      clearcoatRoughness: 0.1,
      envMapIntensity: 1.1,
    })
  );

  const lowerKeelMat = registerMat(
    new THREE.MeshStandardMaterial({
      color: 0x131926,
      roughness: 0.42,
      metalness: 0.14,
      envMapIntensity: 0.9,
    })
  );

  const blackTrimMat = registerMat(
    new THREE.MeshStandardMaterial({
      color: 0x0b0f18,
      roughness: 0.3,
      metalness: 0.25,
    })
  );

  const tintedGlassMat = registerMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x09162d,
      roughness: 0.06,
      metalness: 0.12,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      envMapIntensity: 1.5,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
    0.58
  );

  const teakMat = registerMat(
    new THREE.MeshStandardMaterial({
      map: teakTex,
      color: 0xffffff,
      roughness: 0.62,
      metalness: 0.02,
      envMapIntensity: 0.65,
    })
  );

  const stainlessMat = registerMat(
    new THREE.MeshStandardMaterial({
      color: 0xe6edf6,
      roughness: 0.14,
      metalness: 0.92,
      envMapIntensity: 1.4,
    })
  );

  const bronzePropMat = registerMat(
    new THREE.MeshStandardMaterial({
      color: 0xc48b45,
      roughness: 0.24,
      metalness: 0.88,
      envMapIntensity: 1.35,
    })
  );

  const creamUpholsteryMat = registerMat(
    new THREE.MeshStandardMaterial({
      color: 0xebe8e1,
      roughness: 0.72,
      metalness: 0.02,
    })
  );

  const helmDisplayMat = registerMat(
    new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      emissive: new THREE.Color(0x38bdf8),
      emissiveIntensity: 0.75,
      roughness: 0.2,
    })
  );

  // 1. Primary Hull: Lower Dark Anti-Fouling Hull + Upper Flared White Hull + Waterline Boot Stripe
  const stations = createHullStations();
  const lowerHull = new THREE.Mesh(
    trackGeo(buildLoftedHullBandGeometry(stations, 'lower')),
    lowerKeelMat
  );
  const upperHull = new THREE.Mesh(
    trackGeo(buildLoftedHullBandGeometry(stations, 'upper')),
    gelcoatWhiteMat
  );
  yacht.add(lowerHull, upperHull);

  // Black Boot-Top Accent Stripe flanking waterline
  for (const sign of [-1, 1] as const) {
    const bootPts = stations.map(
      (st) =>
        new THREE.Vector3(
          (st.chineX + (st.sheerX - st.chineX) * 0.075 + 0.015) * sign,
          Math.max(st.chineY + 0.03, 0.155),
          st.z
        )
    );
    const bootCurve = new THREE.CatmullRomCurve3(bootPts);
    const bootMesh = new THREE.Mesh(
      trackGeo(new THREE.TubeGeometry(bootCurve, 40, 0.026, 8, false)),
      blackTrimMat
    );
    yacht.add(bootMesh);
  }

  // 2. Stepped Teak Aft Swim Platform + Aft Cockpit Deck + Foredeck Sunpad
  const swimPlatformShape = new THREE.Shape();
  swimPlatformShape.moveTo(-1.38, -0.45);
  swimPlatformShape.lineTo(1.38, -0.45);
  swimPlatformShape.quadraticCurveTo(1.42, 0.35, 1.1, 0.48);
  swimPlatformShape.lineTo(-1.1, 0.48);
  swimPlatformShape.quadraticCurveTo(-1.42, 0.35, -1.38, -0.45);

  const swimPlatformGeo = trackGeo(
    new THREE.ExtrudeGeometry(swimPlatformShape, {
      depth: 0.14,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.03,
      bevelSegments: 2,
    })
  );
  swimPlatformGeo.rotateX(Math.PI / 2);
  const swimPlatform = new THREE.Mesh(swimPlatformGeo, teakMat);
  swimPlatform.position.set(0, 0.25, -5.5);
  yacht.add(swimPlatform);

  // White transom swim platform surround rim
  const swimRim = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(2.88, 0.16, 0.98)),
    gelcoatWhiteMat
  );
  swimRim.position.set(0, 0.16, -5.45);
  yacht.add(swimRim);

  // Aft Cockpit Teak Sole
  const cockpitTeak = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(2.45, 0.04, 2.35)),
    teakMat
  );
  cockpitTeak.position.set(0, 0.99, -3.72);
  yacht.add(cockpitTeak);

  // Foredeck Teak Center Accent & Cushion Sunpad (flat flush inlay)
  const foredeckTeakShape = new THREE.Shape();
  foredeckTeakShape.moveTo(-0.34, -0.78);
  foredeckTeakShape.lineTo(0.34, -0.78);
  foredeckTeakShape.lineTo(0.11, 0.78);
  foredeckTeakShape.lineTo(-0.11, 0.78);
  foredeckTeakShape.closePath();

  const foredeckTeakGeo = trackGeo(
    new THREE.ExtrudeGeometry(foredeckTeakShape, {
      depth: 0.03,
      bevelEnabled: true,
      bevelThickness: 0.008,
      bevelSize: 0.01,
      bevelSegments: 1,
    })
  );
  foredeckTeakGeo.rotateX(Math.PI / 2);
  const foredeckTeak = new THREE.Mesh(foredeckTeakGeo, teakMat);
  foredeckTeak.rotation.x = -0.085;
  foredeckTeak.position.set(0, 1.435, 4.65);
  yacht.add(foredeckTeak);

  const sunpadGeo = trackGeo(new THREE.BoxGeometry(1.52, 0.12, 1.55));
  const sunpad = new THREE.Mesh(sunpadGeo, creamUpholsteryMat);
  sunpad.rotation.x = -0.07;
  sunpad.position.set(0, 1.36, 3.15);
  yacht.add(sunpad);

  // 3. Port & Starboard Sleek Recessed Bow Anchor Pockets + 4 Hull Oval Portholes per side
  const anchorPocketGeo = trackGeo(new THREE.BoxGeometry(0.10, 0.38, 0.42));
  const anchorShankGeo = trackGeo(new THREE.ConeGeometry(0.10, 0.26, 4));
  const portholeGeo = trackGeo(new THREE.CylinderGeometry(0.11, 0.11, 0.06, 16));
  portholeGeo.rotateZ(Math.PI / 2);

  for (const sign of [-1, 1] as const) {
    const pocket = new THREE.Mesh(anchorPocketGeo, blackTrimMat);
    pocket.position.set(0.54 * sign, 1.0, 4.78);
    pocket.rotation.y = -0.46 * sign;
    pocket.rotation.z = -0.24 * sign;
    yacht.add(pocket);

    const anchor = new THREE.Mesh(anchorShankGeo, stainlessMat);
    anchor.position.set(0.58 * sign, 0.98, 4.80);
    anchor.rotation.z = Math.PI * 0.5 * sign;
    yacht.add(anchor);

    const portholeZs = [3.15, 1.92, 0.72, -0.52];
    const portholeYs = [0.76, 0.72, 0.68, 0.65];
    const portholeXs = [1.22, 1.44, 1.54, 1.56];
    portholeZs.forEach((pz, idx) => {
      const portMesh = new THREE.Mesh(portholeGeo, blackTrimMat);
      portMesh.scale.set(1, 0.68, 1.65);
      portMesh.position.set(portholeXs[idx] * sign, portholeYs[idx], pz);
      portMesh.rotation.y = -0.18 * sign * (idx === 0 ? 1.4 : 0.4);
      yacht.add(portMesh);
    });
  }

  // 4. Sculpted Main Cabin Superstructure & Curved Side Buttresses (ExtrudeGeometry)
  const sideArchShape = new THREE.Shape();
  sideArchShape.moveTo(-2.75, 0.98);
  sideArchShape.lineTo(-2.35, 1.02);
  sideArchShape.lineTo(-2.15, 1.96);
  sideArchShape.lineTo(-3.45, 2.08);
  sideArchShape.quadraticCurveTo(-3.65, 2.15, -3.52, 2.26);
  sideArchShape.lineTo(1.75, 2.26);
  sideArchShape.quadraticCurveTo(2.45, 1.75, 2.55, 1.26);
  sideArchShape.lineTo(1.95, 1.20);
  sideArchShape.quadraticCurveTo(1.85, 1.75, 1.15, 2.02);
  sideArchShape.lineTo(-2.28, 2.02);
  sideArchShape.lineTo(-2.75, 0.98);

  const sideArchGeo = trackGeo(
    new THREE.ExtrudeGeometry(sideArchShape, {
      depth: 0.14,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.03,
      bevelSegments: 2,
    })
  );
  // Extrude is in XY -> rotate so X becomes +Z (bow) and Y stays +Y
  sideArchGeo.rotateY(-Math.PI / 2);

  for (const sign of [-1, 1] as const) {
    const buttress = new THREE.Mesh(sideArchGeo, superWhiteMat);
    buttress.position.set((sign === 1 ? 1.28 : -1.14), 0, 0);
    yacht.add(buttress);
  }

  // Main Cabin Sweeping Translucent Smoked Glass Wrap (Side Windows + Forward Windshield + Aft Doors)
  const salonWindowGeo = trackGeo(new THREE.BoxGeometry(0.05, 0.78, 3.85));
  for (const sign of [-1, 1] as const) {
    const sideGlass = new THREE.Mesh(salonWindowGeo, tintedGlassMat);
    sideGlass.position.set(1.18 * sign, 1.56, -0.22);
    sideGlass.rotation.y = -0.05 * sign;
    yacht.add(sideGlass);
  }

  // Forward Main Windshield (angled aerodynamically backward)
  const mainWindshield = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(2.24, 0.95, 0.06)),
    tintedGlassMat
  );
  mainWindshield.position.set(0, 1.66, 2.02);
  mainWindshield.rotation.x = -0.78;
  yacht.add(mainWindshield);

  // Aft Cockpit Sliding Glass Bulkhead Doors
  const aftGlassDoors = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(2.12, 0.96, 0.05)),
    tintedGlassMat
  );
  aftGlassDoors.position.set(0, 1.48, -2.32);
  yacht.add(aftGlassDoors);

  // Main Cabin Ceiling / Flybridge Structural Floor Deck
  const flyFloorShape = new THREE.Shape();
  flyFloorShape.moveTo(-1.26, -3.55);
  flyFloorShape.lineTo(1.26, -3.55);
  flyFloorShape.lineTo(1.18, 1.35);
  flyFloorShape.quadraticCurveTo(0, 1.95, -1.18, 1.35);
  flyFloorShape.lineTo(-1.26, -3.55);

  const flyFloorGeo = trackGeo(
    new THREE.ExtrudeGeometry(flyFloorShape, {
      depth: 0.16,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.04,
      bevelSegments: 2,
    })
  );
  flyFloorGeo.rotateX(Math.PI / 2);
  const flyFloor = new THREE.Mesh(flyFloorGeo, superWhiteMat);
  flyFloor.position.set(0, 2.24, 0);
  yacht.add(flyFloor);

  // 5. Interior Salon Lounge & Illuminated Helm Console (visible in Stage 2!)
  const interiorDeckFloor = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(2.25, 0.06, 4.3)),
    teakMat
  );
  interiorDeckFloor.position.set(0, 1.02, -0.2);
  yacht.add(interiorDeckFloor);

  const sofaBase = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.68, 0.34, 2.15)),
    creamUpholsteryMat
  );
  sofaBase.position.set(-0.76, 1.22, -0.72);
  yacht.add(sofaBase);

  const salonTable = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.64, 0.08, 1.05)),
    teakMat
  );
  salonTable.position.set(0.08, 1.36, -0.62);
  yacht.add(salonTable);

  const helmConsole = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.95, 0.38, 0.42)),
    lowerKeelMat
  );
  helmConsole.position.set(0.56, 1.18, 1.32);
  yacht.add(helmConsole);

  const helmScreen = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.54, 0.19, 0.03)),
    helmDisplayMat
  );
  helmScreen.position.set(0.56, 1.42, 1.42);
  helmScreen.rotation.x = -0.45;
  yacht.add(helmScreen);

  // 6. Upper Flybridge Windscreen, Sun Visor Roof, Dual SATCOM Domes & Mast Array
  const flyCoaming = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(2.15, 0.36, 3.35)),
    superWhiteMat
  );
  flyCoaming.position.set(0, 2.38, -1.45);
  yacht.add(flyCoaming);

  const flyWindscreen = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(1.94, 0.58, 0.05)),
    tintedGlassMat
  );
  flyWindscreen.position.set(0, 2.66, 0.65);
  flyWindscreen.rotation.x = -0.82;
  yacht.add(flyWindscreen);

  // Streamlined Flybridge Sun Roof & Radar Arch
  const radarArchRoof = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(1.98, 0.14, 2.45)),
    superWhiteMat
  );
  radarArchRoof.position.set(0, 2.94, -1.05);
  yacht.add(radarArchRoof);

  const radarArchCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.96, 2.32, -2.05),
    new THREE.Vector3(-0.92, 2.94, -1.75),
    new THREE.Vector3(0, 3.04, -1.68),
    new THREE.Vector3(0.92, 2.94, -1.75),
    new THREE.Vector3(0.96, 2.32, -2.05),
  ]);
  const radarArchMesh = new THREE.Mesh(
    trackGeo(new THREE.TubeGeometry(radarArchCurve, 28, 0.085, 10, false)),
    superWhiteMat
  );
  yacht.add(radarArchMesh);

  // Dual White SATCOM Domes (matching turnaround sheet)
  const domeGeo = trackGeo(new THREE.SphereGeometry(0.24, 20, 16));
  const domeBaseGeo = trackGeo(new THREE.CylinderGeometry(0.16, 0.2, 0.14, 16));
  for (const sign of [-1, 1] as const) {
    const domeBase = new THREE.Mesh(domeBaseGeo, superWhiteMat);
    domeBase.position.set(0.58 * sign, 3.05, -1.55);
    const domeCap = new THREE.Mesh(domeGeo, gelcoatWhiteMat);
    domeCap.scale.set(1, 1.08, 1);
    domeCap.position.set(0.58 * sign, 3.22, -1.55);
    yacht.add(domeBase, domeCap);
  }

  // Central Navigation Mast + Open-Array Radar Scanner + Twin VHF Whip Antennas
  const mastColumn = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.055, 0.1, 1.18, 12)),
    superWhiteMat
  );
  mastColumn.position.set(0, 3.55, -1.32);
  yacht.add(mastColumn);

  const radarBar = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.92, 0.08, 0.14)),
    gelcoatWhiteMat
  );
  radarBar.position.set(0, 3.45, -1.25);
  yacht.add(radarBar);

  const spreaderBar = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.025, 0.025, 0.85, 8)),
    superWhiteMat
  );
  spreaderBar.rotation.z = Math.PI / 2;
  spreaderBar.position.set(0, 3.86, -1.32);
  yacht.add(spreaderBar);

  const topBeacon = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.04, 0.06, 0.16, 10)),
    gelcoatWhiteMat
  );
  topBeacon.position.set(0, 4.18, -1.32);
  yacht.add(topBeacon);

  const whipGeo = trackGeo(new THREE.CylinderGeometry(0.012, 0.016, 1.25, 6));
  for (const sign of [-1, 1] as const) {
    const whip = new THREE.Mesh(whipGeo, superWhiteMat);
    whip.position.set(0.84 * sign, 3.55, -1.72);
    whip.rotation.x = -0.08;
    yacht.add(whip);
  }

  // 7. Stainless Steel Bow Pulpit & Flybridge Aft Guardrails (TubeGeometry)
  const bowRailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(1.52, 1.38, -2.5),
    new THREE.Vector3(1.48, 1.48, 1.4),
    new THREE.Vector3(1.12, 1.66, 3.55),
    new THREE.Vector3(0.42, 1.82, 5.25),
    new THREE.Vector3(0.0, 1.88, 5.92),
    new THREE.Vector3(-0.42, 1.82, 5.25),
    new THREE.Vector3(-1.12, 1.66, 3.55),
    new THREE.Vector3(-1.48, 1.48, 1.4),
    new THREE.Vector3(-1.52, 1.38, -2.5),
  ]);
  yacht.add(
    new THREE.Mesh(trackGeo(new THREE.TubeGeometry(bowRailCurve, 56, 0.024, 8, false)), stainlessMat)
  );

  const stanchionGeo = trackGeo(new THREE.CylinderGeometry(0.016, 0.016, 0.42, 6));
  const railZAnchors = [-2.2, -0.5, 1.2, 2.7, 4.0, 5.1];
  const railXAnchors = [1.52, 1.54, 1.48, 1.26, 0.92, 0.46];
  const railYAnchors = [1.22, 1.24, 1.29, 1.42, 1.54, 1.64];
  railZAnchors.forEach((rz, idx) => {
    for (const sign of [-1, 1] as const) {
      const post = new THREE.Mesh(stanchionGeo, stainlessMat);
      post.position.set(railXAnchors[idx] * sign, railYAnchors[idx], rz);
      yacht.add(post);
    }
  });

  const flyRailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(1.12, 2.58, -0.8),
    new THREE.Vector3(1.14, 2.66, -3.35),
    new THREE.Vector3(0.0, 2.68, -3.45),
    new THREE.Vector3(-1.14, 2.66, -3.35),
    new THREE.Vector3(-1.12, 2.58, -0.8),
  ]);
  yacht.add(
    new THREE.Mesh(trackGeo(new THREE.TubeGeometry(flyRailCurve, 32, 0.02, 8, false)), stainlessMat)
  );

  // 8. Underwater Twin Bronze 4-Blade Propellers, Shafts, P-Struts & Rudders (Stage 3 Star!)
  const shaftGeo = trackGeo(new THREE.CylinderGeometry(0.04, 0.04, 1.45, 10));
  shaftGeo.rotateX(Math.PI / 2 - 0.14);
  const strutGeo = trackGeo(new THREE.BoxGeometry(0.05, 0.42, 0.16));
  const rudderGeo = trackGeo(new THREE.BoxGeometry(0.06, 0.44, 0.34));
  const hubGeo = trackGeo(new THREE.CylinderGeometry(0.07, 0.09, 0.22, 12));
  hubGeo.rotateX(Math.PI / 2);
  const bladeGeo = trackGeo(new THREE.BoxGeometry(0.24, 0.03, 0.12));

  for (const sign of [-1, 1] as const) {
    const px = 0.56 * sign;

    const shaft = new THREE.Mesh(shaftGeo, stainlessMat);
    shaft.position.set(px, -0.44, -3.45);
    yacht.add(shaft);

    const strut = new THREE.Mesh(strutGeo, bronzePropMat);
    strut.position.set(px, -0.34, -3.85);
    yacht.add(strut);

    const rudder = new THREE.Mesh(rudderGeo, bronzePropMat);
    rudder.position.set(px, -0.52, -4.62);
    yacht.add(rudder);

    const propPivot = new THREE.Group();
    propPivot.position.set(px, -0.54, -4.16);
    propPivot.add(new THREE.Mesh(hubGeo, bronzePropMat));

    for (let b = 0; b < 4; b++) {
      const bladeHolder = new THREE.Group();
      bladeHolder.rotation.z = (b * Math.PI) / 2;
      const blade = new THREE.Mesh(bladeGeo, bronzePropMat);
      blade.position.set(0.14, 0, 0);
      blade.rotation.x = 0.46;
      bladeHolder.add(blade);
      propPivot.add(bladeHolder);
    }
    yacht.add(propPivot);
    propellers.push(propPivot);
  }

  // Subtle calm waterline shimmer plane at y = 0.02
  const waterGeo = trackGeo(new THREE.RingGeometry(2.1, 34, 64));
  waterGeo.rotateX(-Math.PI / 2);
  const waterMat = registerMat(
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
    0.09
  );
  const waterPlane = new THREE.Mesh(waterGeo, waterMat);
  waterPlane.position.y = 0.02;
  yacht.add(waterPlane);

  // Subtle horizontal waterline grid rings around the yacht
  const wakeRingGeo = trackGeo(new THREE.RingGeometry(6.8, 6.86, 72));
  wakeRingGeo.rotateX(-Math.PI / 2);
  const wakeRingMat = registerMat(
    new THREE.MeshBasicMaterial({
      color: 0x93c5fd,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
    0.16
  );
  const wakeRing = new THREE.Mesh(wakeRingGeo, wakeRingMat);
  wakeRing.position.y = 0.025;
  yacht.add(wakeRing);

  return { yacht, fadeableMaterials, propellers, waterMat, wakeRingMat };
}

export function createCircleFormation3D(
  mount: HTMLElement,
  initialWidth: number,
  initialHeight: number
): CircleFormation3DHandle | null {
  const isSoftwareGl = detectSoftwareWebGL();

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: !isSoftwareGl,
      preserveDrawingBuffer: isSoftwareGl,
      powerPreference: 'high-performance',
    });
  } catch {
    return null;
  }

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.setSize(initialWidth, initialHeight, false);
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.display = 'block';
  renderer.domElement.setAttribute('data-testid', 'circle-formation-canvas');
  mount.appendChild(renderer.domElement);

  const scene = new THREE.Scene();

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const envRenderTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envRenderTarget.texture;
  pmremGenerator.dispose();

  // Studio 3-point warm/cool lighting rig
  const hemiLight = new THREE.HemisphereLight(0xf0f9ff, 0x0f172a, 1.35);
  scene.add(hemiLight);

  const keyLight = new THREE.DirectionalLight(0xfff6ea, 2.2);
  keyLight.position.set(10, 12, 9);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x7dd3fc, 1.5);
  rimLight.position.set(-10, -4, -9);
  scene.add(rimLight);

  const underKeelFill = new THREE.DirectionalLight(0x38bdf8, 1.2);
  underKeelFill.position.set(4, -10, 3);
  scene.add(underKeelFill);

  const camera = new THREE.PerspectiveCamera(
    42,
    initialWidth / Math.max(initialHeight, 1),
    0.1,
    140
  );

  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };

  const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
  const teakTexture = createTeakTexture(maxAnisotropy);
  const { yacht, fadeableMaterials, propellers, waterMat, wakeRingMat } = buildLuxuryYachtGroup(
    teakTexture,
    trackGeo,
    trackMat
  );
  scene.add(yacht);

  // Local coordinates of the 4 strictly 2-word pointer-line callout anchors on the yacht
  const anchorLocalPoints: Record<YachtCalloutKey, THREE.Vector3> = {
    bow: new THREE.Vector3(0.45, 0.98, 4.55),
    bridge: new THREE.Vector3(0.0, 3.35, -1.32),
    keel: new THREE.Vector3(0.35, -0.58, 1.35),
    props: new THREE.Vector3(0.56, -0.54, -4.16),
  };

  let gpuBusy = false;
  let lastTheme: 'light' | 'dark' | null = null;
  let clearedSinceInvisible = true;
  let pendingTimer = 0;
  let disposed = false;

  const waitForAfterDraw = () => {
    if (!isSoftwareGl) return;
    const gl = renderer.getContext() as WebGL2RenderingContext;
    if (typeof gl.fenceSync !== 'function') {
      gpuBusy = false;
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const startWait = performance.now();
    const poll = () => {
      if (disposed) {
        if (sync && gl.isSync(sync)) gl.deleteSync(sync);
        return;
      }
      const timedOut = performance.now() - startWait > 140;
      const status =
        !timedOut && sync && gl.isSync(sync)
          ? gl.getSyncParameter(sync, gl.SYNC_STATUS)
          : gl.SIGNALED;
      if (status === gl.UNSIGNALED && !timedOut) {
        pendingTimer = window.setTimeout(poll, 4);
      } else {
        if (sync && gl.isSync(sync)) gl.deleteSync(sync);
        gpuBusy = false;
      }
    };
    gpuBusy = true;
    pendingTimer = window.setTimeout(poll, 4);
  };

  const syncPalette = (theme: 'light' | 'dark') => {
    if (lastTheme === theme) return;
    lastTheme = theme;
    const isDark = theme === 'dark';
    waterMat.color.setHex(isDark ? 0x38bdf8 : 0x0284c7);
    wakeRingMat.color.setHex(isDark ? 0x93c5fd : 0x1d4ed8);
    hemiLight.intensity = isDark ? 1.3 : 1.45;
  };

  syncPalette('dark');

  const clearCanvas = () => {
    if (clearedSinceInvisible) return;
    renderer.clear();
    clearedSinceInvisible = true;
  };

  const resize = (width: number, height: number) => {
    camera.aspect = width / Math.max(height, 1);
    camera.fov = width < 768 ? 50 : 42;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
  };

  const updateAndRender = (
    state: VoyageFrameState,
    effectiveAlpha: number,
    elapsedTimeSec: number,
    theme: 'light' | 'dark',
    viewportWidth: number,
    _viewportHeight: number
  ): YachtAnchorProjectionMap | null => {
    if (disposed) return null;
    if (effectiveAlpha <= 0.004) {
      clearCanvas();
      return null;
    }

    if (isSoftwareGl && gpuBusy) {
      return null;
    }

    syncPalette(theme);
    clearedSinceInvisible = false;

    const isMobile = viewportWidth < 768;
    const stage1DistScale = isMobile ? 1.42 : 1.0;
    const stage3DistScale = isMobile ? 1.72 : 1.0;

    // Gentle authentic marine heave & roll
    yacht.position.set(
      0,
      Math.sin(elapsedTimeSec * 1.15) * 0.045,
      state.vanishProgress * 5.2
    );
    yacht.rotation.set(
      Math.sin(elapsedTimeSec * 0.9) * 0.012,
      Math.sin(elapsedTimeSec * 0.45) * 0.03,
      Math.cos(elapsedTimeSec * 1.1) * 0.018
    );

    // Subtle spin on twin bronze propellers
    propellers.forEach((prop, idx) => {
      prop.rotation.z = elapsedTimeSec * (idx === 0 ? 4.2 : -4.2);
    });

    // Apply unified alpha fade to all yacht materials
    const alphaClamped = clamp(effectiveAlpha, 0, 1);
    for (let i = 0; i < fadeableMaterials.length; i++) {
      const entry = fadeableMaterials[i];
      entry.mat.opacity = entry.baseOpacity * alphaClamped;
    }

    // 4-Stage Scroll Camera Path:
    // Stage 1 (Approach afar): (13.4, 4.3, 12.2) -> (8.4, 2.8, 8.2)
    // Stage 2 (Enter cockpit/salon & glide forward): curves cleanly through aft doors -> helm -> forward windshield
    // Stage 3 (Dive beneath waterline/keel): sweeps out to starboard-aft subsurface view showing full keel & twin props
    // Stage 4 (Fade/recede): smoothly drifts outward as opacity reaches 0
    const a = state.approachProgress;
    const b = state.interiorForwardProgress;
    const d = state.diveUnderProgress;
    const v = state.vanishProgress;

    // Stage 1 -> Stage 2 camera transition
    const stage1X = (13.4 - a * 4.8) * stage1DistScale;
    const stage1Y = 4.3 - a * 1.4;
    const stage1Z = (12.2 - a * 3.8) * stage1DistScale;
    const look1X = 0;
    const look1Y = 0.85 + a * 0.25;
    const look1Z = 0.2;

    // Stage 2 interior forward sweep: enters stern cockpit -> center salon aisle -> forward windshield & bow
    const enterArc = smoothstep(0.0, 0.35, b);
    const forwardWalk = smoothstep(0.28, 1.0, b);
    const stage2X = (1 - enterArc) * 1.45 - enterArc * 0.14;
    const stage2Y = 1.66 + Math.sin(b * Math.PI) * 0.08;
    const stage2Z = -4.8 + forwardWalk * 7.6; // -4.8 (aft cockpit) -> +2.8 (forward bow outlook)
    const look2X = -0.05;
    const look2Y = 1.48 - forwardWalk * 0.14;
    const look2Z = 2.0 + forwardWalk * 7.2;

    // Blend Stage 1 -> Stage 2
    const blend12 = smoothstep(0.0, 0.38, b);
    let cx = stage1X + (stage2X - stage1X) * blend12;
    let cy = stage1Y + (stage2Y - stage1Y) * blend12;
    let cz = stage1Z + (stage2Z - stage1Z) * blend12;
    let lx = look1X + (look2X - look1X) * blend12;
    let ly = look1Y + (look2Y - look1Y) * blend12;
    let lz = look1Z + (look2Z - look1Z) * blend12;

    // Blend Stage 2 -> Stage 3 (Dive beneath waterline & frame full hull + keel + twin props + radar mast)
    const stage3X = (10.5 + v * 3.4) * stage3DistScale;
    const stage3Y = -3.15 - v * 0.85;
    const stage3Z = (-4.75 - v * 2.2) * stage3DistScale;
    const look3X = 0.0;
    const look3Y = 0.55;
    const look3Z = -0.3;

    // Arc gracefully out starboard during dive so camera never clips awkwardly
    const arcOut = Math.sin(d * Math.PI) * 2.4;
    cx = cx + (stage3X - cx) * d + arcOut;
    cy = cy + (stage3Y - cy) * d;
    cz = cz + (stage3Z - cz) * d;
    lx = lx + (look3X - lx) * d;
    ly = ly + (look3Y - ly) * d;
    lz = lz + (look3Z - lz) * d;

    _camPos.set(cx, cy, cz);
    _camLook.set(lx, ly, lz);
    camera.position.copy(_camPos);
    camera.lookAt(_camLook);
    camera.updateMatrixWorld();
    yacht.updateMatrixWorld(true);

    renderer.render(scene, camera);
    waitForAfterDraw();

    // Compute accurate 2D screen anchor coordinates for Stage 3 pointer callout lines
    const projection = {} as YachtAnchorProjectionMap;
    (Object.keys(anchorLocalPoints) as YachtCalloutKey[]).forEach((key) => {
      _projVec.copy(anchorLocalPoints[key]).applyMatrix4(yacht.matrixWorld);
      _projVec.project(camera);
      const xPct = clamp((_projVec.x * 0.5 + 0.5) * 100, 12, 88);
      const yPct = clamp((-_projVec.y * 0.5 + 0.5) * 100, 14, 86);
      projection[key] = {
        xPct,
        yPct,
        visible: _projVec.z >= -1 && _projVec.z <= 1,
      };
    });

    return projection;
  };

  if (!isSoftwareGl) {
    renderer.compile(scene, camera);
  }

  return {
    updateAndRender,
    clearCanvas,
    resize,
    dispose: () => {
      disposed = true;
      window.clearTimeout(pendingTimer);
      scene.environment = null;
      envRenderTarget.dispose();
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      teakTexture.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    },
    domElement: renderer.domElement,
  };
}
