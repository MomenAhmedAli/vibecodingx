import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Sparkles, Eye, RotateCw, Box, Layers, Minimize2, Maximize2 } from 'lucide-react';

interface Hero3DCanvasProps {
  scrollVelocity?: number;
}

// Module-level scratch variables to prevent GC in animation loop (Skill §4.3)
const _pointerTarget = new THREE.Vector2(0, 0);
const _pointerCurrent = new THREE.Vector2(0, 0);

export function Hero3DCanvas({ scrollVelocity = 0 }: Hero3DCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rootGroupRef = useRef<THREE.Group | null>(null);
  const coreMeshRef = useRef<THREE.Mesh | null>(null);
  const ring1Ref = useRef<THREE.Group | null>(null);
  const ring2Ref = useRef<THREE.Group | null>(null);
  const ring3Ref = useRef<THREE.Group | null>(null);
  const nodesGroupRef = useRef<THREE.Group | null>(null);
  const materialRefs = useRef<THREE.Material[]>([]);

  // Interactive state
  const [modelMode, setModelMode] = useState<'gyro' | 'prism' | 'mobius'>('gyro');
  const [materialFinish, setMaterialFinish] = useState<'titanium' | 'obsidian' | 'gold'>('titanium');
  const [isWireframe, setIsWireframe] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Mouse drag tracking
  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });
  const manualRotationRef = useRef({ x: 0.15, y: 0.25 });
  const manualVelocityRef = useRef({ x: 0, y: 0 });
  const scrollVelocityRef = useRef(0);

  useEffect(() => {
    scrollVelocityRef.current = scrollVelocity;
  }, [scrollVelocity]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Software WebGL Guard (Skill §2.1)
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 560;

    // 2. Scene & Camera Setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0, 7.2);

    // 3. Modern Renderer Setup
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: 'high-performance',
    });
    rendererRef.current = renderer;
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Studio Environment Reflection (Skill §2.2)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 5. Studio Lighting Rig (Skill §3.1)
    const keyLight = new THREE.DirectionalLight(0xfff7ed, 3.2);
    keyLight.position.set(4, 6, 5);
    keyLight.castShadow = !isSoftwareGl;
    if (keyLight.castShadow) {
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xdbeafe, 1.6);
    fillLight.position.set(-5, 2, -3);
    scene.add(fillLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xe5e7eb, 0.8);
    scene.add(hemiLight);

    // 6. Build Composite 3D Sculpture (Skill §1.3: 3-12 parts)
    const rootGroup = new THREE.Group();
    rootGroupRef.current = rootGroup;
    scene.add(rootGroup);

    // --- Materials creation helper ---
    const materialsList: THREE.Material[] = [];

    // Metallic Finish: Titanium/Chrome
    const titaniumMat = new THREE.MeshPhysicalMaterial({
      color: 0x222224,
      metalness: 0.95,
      roughness: 0.15,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      reflectivity: 1.0,
    });
    materialsList.push(titaniumMat);

    // Accent Gold Ring Material
    const accentGoldMat = new THREE.MeshPhysicalMaterial({
      color: 0xd4af37,
      metalness: 0.9,
      roughness: 0.22,
      clearcoat: 0.8,
    });
    materialsList.push(accentGoldMat);

    // Core Crystal Material (Refractive Faceted)
    const coreCrystalMat = new THREE.MeshPhysicalMaterial({
      color: 0x18181b,
      metalness: 0.85,
      roughness: 0.1,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
    });
    materialsList.push(coreCrystalMat);

    // Node Satellites Material
    const nodeMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.8,
      roughness: 0.25,
    });
    materialsList.push(nodeMat);

    materialRefs.current = materialsList;

    // Part 1: Outer Primary Ring (Titanium Gimbal with precision ticks)
    const ring1Group = new THREE.Group();
    const ring1Geo = new THREE.TorusGeometry(2.1, 0.07, 32, 100);
    const ring1Mesh = new THREE.Mesh(ring1Geo, titaniumMat);
    ring1Mesh.castShadow = true;
    ring1Group.add(ring1Mesh);

    // Add tick markers along outer ring
    const tickGeo = new THREE.BoxGeometry(0.04, 0.14, 0.04);
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2;
      const tick = new THREE.Mesh(tickGeo, accentGoldMat);
      tick.position.set(Math.cos(angle) * 2.1, Math.sin(angle) * 2.1, 0);
      tick.rotation.z = angle;
      ring1Group.add(tick);
    }
    rootGroup.add(ring1Group);
    ring1Ref.current = ring1Group;

    // Part 2: Middle Intersecting Gimbal Ring (Gold/Brass Accent)
    const ring2Group = new THREE.Group();
    const ring2Geo = new THREE.TorusGeometry(1.68, 0.055, 24, 80);
    const ring2Mesh = new THREE.Mesh(ring2Geo, accentGoldMat);
    ring2Mesh.castShadow = true;
    ring2Group.add(ring2Mesh);
    ring2Group.rotation.x = Math.PI / 3;
    ring2Group.rotation.y = Math.PI / 6;
    rootGroup.add(ring2Group);
    ring2Ref.current = ring2Group;

    // Part 3: Inner Orbital Ring
    const ring3Group = new THREE.Group();
    const ring3Geo = new THREE.TorusGeometry(1.28, 0.04, 20, 60);
    const ring3Mesh = new THREE.Mesh(ring3Geo, titaniumMat);
    ring3Group.add(ring3Mesh);
    ring3Group.rotation.x = -Math.PI / 4;
    ring3Group.rotation.z = Math.PI / 3;
    rootGroup.add(ring3Group);
    ring3Ref.current = ring3Group;

    // Part 4: Centerpiece Faceted Geometric Core (Icosahedron / Octahedron)
    const coreGeo = new THREE.IcosahedronGeometry(0.85, 0);
    const coreMesh = new THREE.Mesh(coreGeo, coreCrystalMat);
    coreMesh.castShadow = true;
    rootGroup.add(coreMesh);
    coreMeshRef.current = coreMesh;

    // Wireframe cage around core for architectural tech aesthetic
    const cageGeo = new THREE.IcosahedronGeometry(0.92, 0);
    const cageMat = new THREE.MeshBasicMaterial({
      color: 0x3b82f6,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    const cageMesh = new THREE.Mesh(cageGeo, cageMat);
    rootGroup.add(cageMesh);

    // Part 5: Floating Satellites & UI Nodes
    const nodesGroup = new THREE.Group();
    const nodeGeo = new THREE.SphereGeometry(0.08, 16, 16);
    const nodeCount = 8;
    for (let i = 0; i < nodeCount; i++) {
      const radius = 2.45;
      const phi = Math.acos(-1 + (2 * i) / nodeCount);
      const theta = Math.sqrt(nodeCount * Math.PI) * phi;
      const x = radius * Math.cos(theta) * Math.sin(phi);
      const y = radius * Math.sin(theta) * Math.sin(phi);
      const z = radius * Math.cos(phi);

      const node = new THREE.Mesh(nodeGeo, nodeMat);
      node.position.set(x, y, z);
      nodesGroup.add(node);
    }
    rootGroup.add(nodesGroup);
    nodesGroupRef.current = nodesGroup;

    // Part 6: Ground Contact Shadow Grounding (Skill §3.2)
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const ctx = shadowCanvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      grad.addColorStop(0, 'rgba(0,0,0,0.3)');
      grad.addColorStop(0.5, 'rgba(0,0,0,0.1)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 128, 128);
    }
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(5, 5),
      new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.45,
      })
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -2.6;
    scene.add(shadowPlane);

    // 7. Mouse and Touch Interaction Handlers
    const handlePointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      _pointerTarget.set(x, y);

      if (isDraggingRef.current) {
        const deltaX = e.clientX - previousMousePositionRef.current.x;
        const deltaY = e.clientY - previousMousePositionRef.current.y;
        manualVelocityRef.current.x = deltaX * 0.006;
        manualVelocityRef.current.y = deltaY * 0.006;
        manualRotationRef.current.y += deltaX * 0.006;
        manualRotationRef.current.x += deltaY * 0.006;
        previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDraggingRef.current = true;
        previousMousePositionRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDraggingRef.current && e.touches.length === 1) {
        const deltaX = e.touches[0].clientX - previousMousePositionRef.current.x;
        const deltaY = e.touches[0].clientY - previousMousePositionRef.current.y;
        manualRotationRef.current.y += deltaX * 0.008;
        manualRotationRef.current.x += deltaY * 0.008;
        previousMousePositionRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    const handleTouchEnd = () => {
      isDraggingRef.current = false;
    };

    window.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);

    // 8. Resize Observer
    const handleResize = () => {
      if (!container || !renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 9. Continuous Loop with Software-WebGL Pacing (Skill §2.3)
    let animationFrameId = 0;
    const clock = new THREE.Clock();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          animationFrameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          animationFrameId = window.setTimeout(cb, 80);
        }
      };
      animationFrameId = window.setTimeout(poll, 5);
    }

    const tick = () => {
      const delta = clock.getDelta();
      const elapsedTime = clock.getElapsedTime();

      // Smooth pointer damping
      _pointerCurrent.x = THREE.MathUtils.damp(_pointerCurrent.x, _pointerTarget.x, 3, delta);
      _pointerCurrent.y = THREE.MathUtils.damp(_pointerCurrent.y, _pointerTarget.y, 3, delta);

      // Inertia decay for drag
      if (!isDraggingRef.current) {
        manualVelocityRef.current.x *= 0.94;
        manualVelocityRef.current.y *= 0.94;
        manualRotationRef.current.y += manualVelocityRef.current.x;
        manualRotationRef.current.x += manualVelocityRef.current.y;
      }

      // Auto rotation & Scroll Reactivity
      const scrollInfluence = scrollVelocityRef.current * 0.001;
      const autoRotY = autoRotate ? delta * 0.45 + scrollInfluence : scrollInfluence;

      if (rootGroup) {
        rootGroup.rotation.y = manualRotationRef.current.y + autoRotY * elapsedTime;
        rootGroup.rotation.x = manualRotationRef.current.x + _pointerCurrent.y * 0.25;
        rootGroup.rotation.z = _pointerCurrent.x * 0.15;

        // Floating hover motion
        rootGroup.position.y = Math.sin(elapsedTime * 1.8) * 0.08 - scrollInfluence * 0.5;
      }

      // Gimbal sub-rotations
      if (ring1Ref.current) ring1Ref.current.rotation.z += delta * 0.15;
      if (ring2Ref.current) ring2Ref.current.rotation.x += delta * 0.25;
      if (ring3Ref.current) ring3Ref.current.rotation.y -= delta * 0.35;
      if (coreMeshRef.current) {
        coreMeshRef.current.rotation.x += delta * 0.5;
        coreMeshRef.current.rotation.y += delta * 0.6;
      }
      if (nodesGroupRef.current) {
        nodesGroupRef.current.rotation.y -= delta * 0.2;
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        animationFrameId = requestAnimationFrame(tick);
      }
    };

    tick();

    return () => {
      cancelAnimationFrame(animationFrameId);
      clearTimeout(animationFrameId);
      window.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('resize', handleResize);

      // Dispose resources
      renderer.dispose();
      materialsList.forEach((m) => m.dispose());
      ring1Geo.dispose();
      ring2Geo.dispose();
      ring3Geo.dispose();
      coreGeo.dispose();
      cageGeo.dispose();
      nodeGeo.dispose();
      shadowTex.dispose();
    };
  }, []);

  // Update Geometry Mode
  useEffect(() => {
    if (!coreMeshRef.current) return;
    let newGeo: THREE.BufferGeometry;

    if (modelMode === 'gyro') {
      newGeo = new THREE.IcosahedronGeometry(0.85, 0);
    } else if (modelMode === 'prism') {
      newGeo = new THREE.OctahedronGeometry(0.9, 0);
    } else {
      newGeo = new THREE.TorusKnotGeometry(0.6, 0.2, 80, 16);
    }

    coreMeshRef.current.geometry.dispose();
    coreMeshRef.current.geometry = newGeo;
  }, [modelMode]);

  // Update Material Finish
  useEffect(() => {
    materialRefs.current.forEach((mat) => {
      if (mat instanceof THREE.MeshPhysicalMaterial) {
        if (materialFinish === 'titanium') {
          mat.color.setHex(0x1e2022);
          mat.metalness = 0.95;
          mat.roughness = 0.15;
        } else if (materialFinish === 'obsidian') {
          mat.color.setHex(0x09090b);
          mat.metalness = 0.4;
          mat.roughness = 0.05;
        } else if (materialFinish === 'gold') {
          mat.color.setHex(0xc5a059);
          mat.metalness = 0.9;
          mat.roughness = 0.2;
        }
        mat.needsUpdate = true;
      }
    });
  }, [materialFinish]);

  // Update Wireframe
  useEffect(() => {
    materialRefs.current.forEach((mat) => {
      if ('wireframe' in mat) {
        (mat as THREE.MeshStandardMaterial).wireframe = isWireframe;
        mat.needsUpdate = true;
      }
    });
  }, [isWireframe]);

  const handleResetCamera = () => {
    manualRotationRef.current = { x: 0.15, y: 0.25 };
    manualVelocityRef.current = { x: 0, y: 0 };
  };

  return (
    <div className="relative w-full h-[520px] md:h-[620px] flex items-center justify-center select-none">
      {/* Isolated WebGL canvas container */}
      <div
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing flex items-center justify-center"
      />

      {/* Ergonomic Unified Bottom Control Dock (Three.js Skill §5) */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center">
        {/* Collapse / Expand Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="mb-1.5 px-3 py-1 bg-[#111111]/80 hover:bg-[#111111] text-[#E7E5DF] text-[11px] font-mono-code rounded-full flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
          title={isCollapsed ? 'Show 3D Controls' : 'Hide 3D Controls'}
        >
          {isCollapsed ? (
            <>
              <Maximize2 className="w-3 h-3 text-amber-300" />
              <span>3D INSPECT</span>
            </>
          ) : (
            <>
              <Minimize2 className="w-3 h-3 text-zinc-400" />
              <span>MINIMIZE HUD</span>
            </>
          )}
        </button>

        {/* Collapsible Dock Container */}
        {!isCollapsed && (
          <div className="bg-[#18181b]/95 text-white px-4 py-2.5 rounded-2xl border border-white/10 shadow-2xl flex flex-wrap items-center justify-center gap-3 sm:gap-5 text-xs max-w-[94vw] backdrop-blur-none animate-in fade-in zoom-in-95 duration-150">
            {/* Mode Selectors */}
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/5">
              <button
                onClick={() => setModelMode('gyro')}
                className={`px-2.5 py-1 rounded font-mono-code transition-colors cursor-pointer ${
                  modelMode === 'gyro' ? 'bg-white text-zinc-900 font-semibold' : 'text-zinc-400 hover:text-white'
                }`}
              >
                01. GYRO
              </button>
              <button
                onClick={() => setModelMode('prism')}
                className={`px-2.5 py-1 rounded font-mono-code transition-colors cursor-pointer ${
                  modelMode === 'prism' ? 'bg-white text-zinc-900 font-semibold' : 'text-zinc-400 hover:text-white'
                }`}
              >
                02. PRISM
              </button>
              <button
                onClick={() => setModelMode('mobius')}
                className={`px-2.5 py-1 rounded font-mono-code transition-colors cursor-pointer ${
                  modelMode === 'mobius' ? 'bg-white text-zinc-900 font-semibold' : 'text-zinc-400 hover:text-white'
                }`}
              >
                03. KNOT
              </button>
            </div>

            {/* Finish Finishes */}
            <div className="flex items-center gap-1.5 text-zinc-300">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono-code mr-1">Finish:</span>
              <button
                onClick={() => setMaterialFinish('titanium')}
                className={`w-4 h-4 rounded-full border transition-transform cursor-pointer ${
                  materialFinish === 'titanium' ? 'border-amber-400 scale-125' : 'border-zinc-600'
                } bg-zinc-700`}
                title="Titanium Dark"
              />
              <button
                onClick={() => setMaterialFinish('gold')}
                className={`w-4 h-4 rounded-full border transition-transform cursor-pointer ${
                  materialFinish === 'gold' ? 'border-amber-400 scale-125' : 'border-zinc-600'
                } bg-[#c5a059]`}
                title="Champagne Gold"
              />
              <button
                onClick={() => setMaterialFinish('obsidian')}
                className={`w-4 h-4 rounded-full border transition-transform cursor-pointer ${
                  materialFinish === 'obsidian' ? 'border-amber-400 scale-125' : 'border-zinc-600'
                } bg-zinc-950`}
                title="Obsidian Gloss"
              />
            </div>

            {/* Toggles */}
            <div className="flex items-center gap-2 border-l border-white/10 pl-3">
              <button
                onClick={() => setIsWireframe(!isWireframe)}
                className={`px-2 py-1 rounded text-[11px] font-mono-code transition-colors flex items-center gap-1 cursor-pointer ${
                  isWireframe ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'
                }`}
                title="Toggle Wireframe Mesh"
              >
                <Layers className="w-3 h-3" />
                <span>MESH</span>
              </button>

              <button
                onClick={() => setAutoRotate(!autoRotate)}
                className={`px-2 py-1 rounded text-[11px] font-mono-code transition-colors flex items-center gap-1 cursor-pointer ${
                  autoRotate ? 'bg-zinc-800 text-amber-300' : 'text-zinc-500 hover:text-white'
                }`}
                title="Toggle Kinetic Spin"
              >
                <RotateCw className="w-3 h-3" />
                <span>SPIN</span>
              </button>

              <button
                onClick={handleResetCamera}
                className="px-2 py-1 rounded text-[11px] font-mono-code text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                title="Reset Angle"
              >
                RESET
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Subtle Drag Prompt Hint (Fades out when interacted) */}
      <div className="absolute top-4 right-4 pointer-events-none text-zinc-500 font-mono-code text-[11px] flex items-center gap-1.5 bg-[#E7E5DF]/70 px-2 py-1 rounded border border-black/5">
        <Sparkles className="w-3 h-3 text-zinc-700" />
        <span>DRAG TO ROTATE 3D</span>
      </div>
    </div>
  );
}
