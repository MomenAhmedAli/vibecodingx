import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

interface SkyShipCanvasProps {
  scrollVelocity?: number;
}

// Pre-allocated math helpers outside render loop (zero GC)
const _pointerTarget = new THREE.Vector2(0, 0);
const _pointerCurrent = new THREE.Vector2(0, 0);

export function SkyShipCanvas({ scrollVelocity = 0 }: SkyShipCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const scrollVelocityRef = useRef(0);

  useEffect(() => {
    scrollVelocityRef.current = scrollVelocity;
  }, [scrollVelocity]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Software WebGL guard (only adjusts rendering cost, never scene content)
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || 1000;
    const height = container.clientHeight || 360;

    // Scene & Camera
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 100);
    camera.position.set(0.4, 0.55, 8.6);
    camera.lookAt(0, 0, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Studio Environment Reflection for metals & glass
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envRT = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envRT.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    // 3-Point Warm/Cool Lighting Rig
    const keyLight = new THREE.DirectionalLight(0xfff5e4, 3.0);
    keyLight.position.set(5, 8, 6);
    keyLight.castShadow = !isSoftwareGl;
    if (keyLight.castShadow) {
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xdbeafe, 1.8);
    rimLight.position.set(-6, 3, -5);
    scene.add(rimLight);

    const hemiLight = new THREE.HemisphereLight(0xf8fafc, 0xcbc7be, 0.95);
    scene.add(hemiLight);

    // =========================================================================
    // COMPOSITE PROCEDURAL 3D SKY SHIP (8+ Distinct Parts, Nose Facing +X)
    // =========================================================================
    const shipGroup = new THREE.Group();
    scene.add(shipGroup);

    const geometriesToDispose: THREE.BufferGeometry[] = [];
    const materialsToDispose: THREE.Material[] = [];

    // Materials with >= 0.25 roughness contrast between adjacent surfaces
    const hullMat = new THREE.MeshPhysicalMaterial({
      color: 0x16171a,
      metalness: 0.72,
      roughness: 0.42,
      clearcoat: 0.35,
      clearcoatRoughness: 0.25,
    });
    const aluminumMat = new THREE.MeshPhysicalMaterial({
      color: 0xd9d6ce,
      metalness: 0.92,
      roughness: 0.16,
      clearcoat: 0.85,
      clearcoatRoughness: 0.1,
    });
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0x26282d,
      metalness: 0.65,
      roughness: 0.48,
    });
    const canopyMat = new THREE.MeshPhysicalMaterial({
      color: 0x0f172a,
      metalness: 0.15,
      roughness: 0.06,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      reflectivity: 1.0,
    });
    const brassAccentMat = new THREE.MeshPhysicalMaterial({
      color: 0xc89d47,
      metalness: 0.95,
      roughness: 0.18,
    });
    const cobaltStripeMat = new THREE.MeshStandardMaterial({
      color: 0x2b3be0,
      metalness: 0.3,
      roughness: 0.35,
    });
    const exhaustMat = new THREE.MeshBasicMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.85,
    });

    materialsToDispose.push(
      hullMat,
      aluminumMat,
      wingMat,
      canopyMat,
      brassAccentMat,
      cobaltStripeMat,
      exhaustMat
    );

    // 1. Primary Sculpted Fuselage (LatheGeometry rotated along X-axis, prow at +X)
    const hullPoints = [
      new THREE.Vector2(0.0, -2.05),   // stern tip
      new THREE.Vector2(0.18, -1.95),
      new THREE.Vector2(0.32, -1.35),
      new THREE.Vector2(0.42, -0.45),
      new THREE.Vector2(0.44, 0.35),   // widest mid-forward hull
      new THREE.Vector2(0.36, 1.15),
      new THREE.Vector2(0.20, 1.85),
      new THREE.Vector2(0.05, 2.25),
      new THREE.Vector2(0.0, 2.35),    // sharp nose cone (+X)
    ];
    const hullGeo = new THREE.LatheGeometry(hullPoints, 32);
    hullGeo.rotateZ(-Math.PI / 2); // Align lathe Y-axis to +X forward
    hullGeo.scale(1.0, 0.72, 0.85); // Sleek flattened aero cross-section
    geometriesToDispose.push(hullGeo);

    const hullMesh = new THREE.Mesh(hullGeo, hullMat);
    hullMesh.castShadow = true;
    hullMesh.receiveShadow = true;
    shipGroup.add(hullMesh);

    // 2. Brushed Aluminum Dorsal Spine Deck
    const spineShape = new THREE.Shape();
    spineShape.moveTo(-1.55, 0.22);
    spineShape.quadraticCurveTo(-0.4, 0.39, 0.85, 0.32);
    spineShape.lineTo(1.5, 0.16);
    spineShape.lineTo(1.3, 0.1);
    spineShape.lineTo(-1.45, 0.12);
    spineShape.closePath();

    const spineGeo = new THREE.ExtrudeGeometry(spineShape, {
      depth: 0.22,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.025,
      bevelSegments: 3,
    });
    spineGeo.translate(0, 0, -0.11);
    geometriesToDispose.push(spineGeo);

    const spineMesh = new THREE.Mesh(spineGeo, aluminumMat);
    spineMesh.castShadow = true;
    shipGroup.add(spineMesh);

    // 3. Panoramic Cockpit Canopy
    const canopyGeo = new THREE.SphereGeometry(0.34, 24, 18);
    canopyGeo.scale(2.1, 0.56, 0.78);
    geometriesToDispose.push(canopyGeo);

    const canopyMesh = new THREE.Mesh(canopyGeo, canopyMat);
    canopyMesh.position.set(0.68, 0.27, 0);
    canopyMesh.rotation.z = -0.09;
    shipGroup.add(canopyMesh);

    // 4. Swept Horizontal Wings (Port & Starboard)
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0.45, 0);
    wingShape.lineTo(-0.65, 1.48);
    wingShape.lineTo(-1.18, 1.42);
    wingShape.lineTo(-0.78, 0);
    wingShape.closePath();

    const wingGeo = new THREE.ExtrudeGeometry(wingShape, {
      depth: 0.045,
      bevelEnabled: true,
      bevelThickness: 0.015,
      bevelSize: 0.015,
      bevelSegments: 2,
    });
    wingGeo.rotateX(Math.PI / 2);
    geometriesToDispose.push(wingGeo);

    const starboardWing = new THREE.Mesh(wingGeo, wingMat);
    starboardWing.position.set(-0.05, 0.0, 0.25);
    starboardWing.rotation.x = 0.06;
    starboardWing.castShadow = true;
    shipGroup.add(starboardWing);

    const portWing = new THREE.Mesh(wingGeo, wingMat);
    portWing.scale.z = -1;
    portWing.position.set(-0.05, 0.0, -0.25);
    portWing.rotation.x = -0.06;
    portWing.castShadow = true;
    shipGroup.add(portWing);

    // 5. Dorsal Tail Stabilizer Fin & Cobalt Accent Trim
    const finShape = new THREE.Shape();
    finShape.moveTo(-0.95, 0.16);
    finShape.lineTo(-1.75, 0.92);
    finShape.lineTo(-2.05, 0.88);
    finShape.lineTo(-1.75, 0.12);
    finShape.closePath();

    const finGeo = new THREE.ExtrudeGeometry(finShape, {
      depth: 0.04,
      bevelEnabled: true,
      bevelThickness: 0.01,
      bevelSize: 0.01,
      bevelSegments: 2,
    });
    finGeo.translate(0, 0, -0.02);
    geometriesToDispose.push(finGeo);

    const finMesh = new THREE.Mesh(finGeo, aluminumMat);
    finMesh.castShadow = true;
    shipGroup.add(finMesh);

    const stripeGeo = new THREE.BoxGeometry(0.55, 0.06, 0.065);
    geometriesToDispose.push(stripeGeo);
    const finStripe = new THREE.Mesh(stripeGeo, cobaltStripeMat);
    finStripe.position.set(-1.55, 0.56, 0);
    finStripe.rotation.z = 0.65;
    shipGroup.add(finStripe);

    // 6. Ventral Stabilizer Keel
    const keelGeo = new THREE.BoxGeometry(1.1, 0.18, 0.04);
    geometriesToDispose.push(keelGeo);
    const keelMesh = new THREE.Mesh(keelGeo, wingMat);
    keelMesh.position.set(-0.85, -0.28, 0);
    shipGroup.add(keelMesh);

    // 7. Twin Outboard Engine Nacelles + Brass Nozzle Rings + Exhaust Glow
    const nacelleGeo = new THREE.CylinderGeometry(0.13, 0.11, 0.92, 20);
    nacelleGeo.rotateZ(Math.PI / 2);
    const ringGeo = new THREE.TorusGeometry(0.11, 0.022, 12, 24);
    ringGeo.rotateY(Math.PI / 2);
    const coreGlowGeo = new THREE.CylinderGeometry(0.075, 0.01, 0.42, 16);
    coreGlowGeo.rotateZ(Math.PI / 2);
    geometriesToDispose.push(nacelleGeo, ringGeo, coreGlowGeo);

    const exhaustMeshes: THREE.Mesh[] = [];
    [-0.68, 0.68].forEach((zPos) => {
      const pod = new THREE.Group();
      pod.position.set(-0.55, -0.06, zPos);

      const housing = new THREE.Mesh(nacelleGeo, aluminumMat);
      housing.castShadow = true;
      pod.add(housing);

      const nozzleRing = new THREE.Mesh(ringGeo, brassAccentMat);
      nozzleRing.position.set(-0.46, 0, 0);
      pod.add(nozzleRing);

      const intakeRing = new THREE.Mesh(ringGeo, brassAccentMat);
      intakeRing.position.set(0.45, 0, 0);
      pod.add(intakeRing);

      const flame = new THREE.Mesh(coreGlowGeo, exhaustMat);
      flame.position.set(-0.68, 0, 0);
      pod.add(flame);
      exhaustMeshes.push(flame);

      shipGroup.add(pod);
    });

    // 8. Horizontal Sky Contrail / Slipstream Lines trailing behind ship
    const contrailGroup = new THREE.Group();
    const trailMat = new THREE.MeshBasicMaterial({
      color: 0x111111,
      transparent: true,
      opacity: 0.16,
    });
    materialsToDispose.push(trailMat);

    const trailGeo = new THREE.PlaneGeometry(3.2, 0.014);
    geometriesToDispose.push(trailGeo);

    const trailOffsets = [
      { y: -0.06, z: 0.68 },
      { y: -0.06, z: -0.68 },
      { y: 0.02, z: 1.45 },
      { y: 0.02, z: -1.45 },
    ];
    trailOffsets.forEach((off) => {
      const streak = new THREE.Mesh(trailGeo, trailMat);
      streak.position.set(-2.65, off.y, off.z);
      contrailGroup.add(streak);
    });
    shipGroup.add(contrailGroup);

    // Subtle Sky Reference Cloud Streaks (sparse, minimal horizontal sky lines)
    const skyCloudsGroup = new THREE.Group();
    const cloudMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.07,
    });
    materialsToDispose.push(cloudMat);
    const cloudGeo = new THREE.PlaneGeometry(2.2, 0.012);
    geometriesToDispose.push(cloudGeo);

    const cloudSprites: { mesh: THREE.Mesh; speed: number }[] = [];
    for (let i = 0; i < 6; i++) {
      const m = new THREE.Mesh(cloudGeo, cloudMat);
      m.position.set((i - 3) * 3.2, (Math.sin(i * 2.1) * 0.9), -2.5 - (i % 3) * 0.8);
      m.scale.x = 0.6 + (i % 3) * 0.45;
      skyCloudsGroup.add(m);
      cloudSprites.push({ mesh: m, speed: 0.9 + (i % 3) * 0.45 });
    }
    scene.add(skyCloudsGroup);

    // Scale & initial angle so the 3/4 side silhouette reads cleanly left-to-right
    shipGroup.scale.setScalar(0.86);
    shipGroup.rotation.set(0.14, -0.22, 0.02);

    // Pointer Interaction & Click Barrel-Roll Maneuver
    let rollBoost = 0;
    const handlePointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      _pointerTarget.set(nx, ny);
    };

    const handleClick = () => {
      rollBoost += Math.PI * 2;
    };

    window.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('click', handleClick);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 1000;
      const h = container.clientHeight || 360;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Pre-compile shaders on hardware WebGL
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Continuous Animation Loop with Software-WebGL pacing
    let frameId = 0;
    const clock = new THREE.Clock();
    // Start visibly in the sky (left of center, sailing rightwards)
    let cruiseX = -1.2;
    let currentRoll = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const tick = () => {
      const delta = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.getElapsedTime();

      _pointerCurrent.x = THREE.MathUtils.damp(_pointerCurrent.x, _pointerTarget.x, 4, delta);
      _pointerCurrent.y = THREE.MathUtils.damp(_pointerCurrent.y, _pointerTarget.y, 4, delta);

      // Horizontal sky traverse (cruises left -> right, surges with scroll velocity)
      const velBoost = Math.min(Math.abs(scrollVelocityRef.current) * 0.06, 4.5);
      const horizontalSpeed = 0.72 + velBoost;
      cruiseX += horizontalSpeed * delta;

      // Wrap seamlessly across wide horizontal sky bounds
      const visibleHalfSpan = Math.max(5.8, (camera.aspect * 3.2) + 2.4);
      if (cruiseX > visibleHalfSpan) {
        cruiseX = -visibleHalfSpan;
      }

      // Smooth barrel-roll damping on click
      currentRoll = THREE.MathUtils.damp(currentRoll, rollBoost, 5, delta);

      // Hover & banking kinematics
      shipGroup.position.x = cruiseX;
      shipGroup.position.y = Math.sin(elapsed * 1.6) * 0.14 + _pointerCurrent.y * 0.35;
      shipGroup.position.z = _pointerCurrent.x * 0.25;

      shipGroup.rotation.x = 0.18 + _pointerCurrent.y * -0.18 + currentRoll;
      shipGroup.rotation.y = -0.22 + _pointerCurrent.x * 0.16;
      shipGroup.rotation.z = Math.cos(elapsed * 1.6) * 0.03 + velBoost * 0.03;

      // Thruster flame & contrail stretch with velocity
      const thrustScale = 1 + velBoost * 0.35 + Math.sin(elapsed * 22) * 0.08;
      exhaustMeshes.forEach((flame) => {
        flame.scale.x = thrustScale;
      });
      contrailGroup.scale.x = 1 + velBoost * 0.28;

      // Drifting sky horizon lines opposite ship travel (-X)
      cloudSprites.forEach((c) => {
        c.mesh.position.x -= (c.speed + velBoost * 0.5) * delta;
        if (c.mesh.position.x < -10) c.mesh.position.x = 10;
      });

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    tick();

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('click', handleClick);
      window.removeEventListener('resize', handleResize);

      geometriesToDispose.forEach((g) => g.dispose());
      materialsToDispose.forEach((m) => m.dispose());
      envRT.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="w-full h-[230px] sm:h-[300px] lg:h-[360px] cursor-pointer select-none"
      title="Interactive 3D Sky Ship — Move cursor to steer, click to roll"
    />
  );
}
