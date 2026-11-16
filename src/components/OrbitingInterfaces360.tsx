import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { addFrameEffect } from '../lib/lenisScrollBus';

interface OrbitingInterfaces360Props {
  theme?: 'light' | 'dark';
  scrollVelocity?: number;
}

// 12 real high-resolution project UI screens & design mockups across Nurabi, Rivka & Tawreedat
const SITE_PROJECT_IMAGES: string[] = [
  '/assets/aistudio/tawreed_hero_dashboard.png',
  '/assets/aistudio/Arabic_Blue_Online_Learning_Platform_2c685461.png',
  '/assets/aistudio/Rivka_Desert_App_Showcase_0c2aebe6.png',
  '/assets/aistudio/Modern_Arabic_Supplier_Marketplace_Dashboard_508fd2df.png',
  '/assets/aistudio/tawreed_features.png',
  '/assets/aistudio/nurabi_education_types.png',
  '/assets/aistudio/hook_70c6e796.png',
  '/assets/aistudio/rivka_a6cdcbf7.png',
  '/assets/aistudio/tawreed_pricing.png',
  '/assets/aistudio/nurabi_testimonials.png',
  '/assets/aistudio/tawreed_metrics_partners.png',
  '/assets/aistudio/tawreed_faq_footer.png',
];

function drawRoundedClip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawPureImageFrame(
  canvas: HTMLCanvasElement,
  loadedImage?: HTMLImageElement
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  const radius = 26;

  ctx.clearRect(0, 0, w, h);
  if (!loadedImage || loadedImage.width === 0 || loadedImage.height === 0) {
    return;
  }

  ctx.save();
  drawRoundedClip(ctx, 1, 1, w - 2, h - 2, radius);
  ctx.clip();

  // Slightly over-fill (1.03x) for clean edge-to-edge UI framing without borders
  const scale = Math.max(w / loadedImage.width, h / loadedImage.height) * 1.03;
  const dw = loadedImage.width * scale;
  const dh = loadedImage.height * scale;
  const dx = (w - dw) / 2;
  const dy = (h - dh) / 2;

  ctx.drawImage(loadedImage, dx, dy, dw, dh);
  ctx.restore();

  // Crisp subtle glass edge definition so dark & light UIs stay sharp over the background
  ctx.save();
  drawRoundedClip(ctx, 1.5, 1.5, w - 3, h - 3, radius);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

/**
 * Bends a subdivided PlaneGeometry smoothly onto a concave cylinder of radius R
 * so outer cards curve naturally around the viewer with perspective magnification.
 */
function createCurvedCylinderCardGeometry(
  arcLength: number,
  height: number,
  radius: number,
  segX = 28,
  segY = 4
): THREE.PlaneGeometry {
  const geo = new THREE.PlaneGeometry(arcLength, height, segX, segY);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const lx = pos.getX(i);
    const ly = pos.getY(i);
    const localTheta = lx / radius;
    const vx = radius * Math.sin(localTheta);
    const vz = radius * (1 - Math.cos(localTheta));
    pos.setXYZ(i, vx, ly, vz);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

export function OrbitingInterfaces360({ scrollVelocity = 0 }: OrbitingInterfaces360Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const scrollVelRef = useRef(0);

  useEffect(() => {
    scrollVelRef.current = scrollVelocity;
  }, [scrollVelocity]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const isSoftwareGl = (() => {
      const probe = document.createElement('canvas').getContext('webgl2');
      if (!probe) return true;
      const ext = probe.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
      const gpu = String(probe.getParameter(param));
      probe.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: !isSoftwareGl,
        preserveDrawingBuffer: isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);

    // Concave cylindrical panorama ring parameters matching MotionSites dark-portfolio scale & bow
    const CYLINDER_RADIUS = 16.0;
    const ARC_CENTER_Z = 11.5; // Center behind subject sits at z = -4.5 (16.5 + 4.5 = 21 units from cam)
    const BASE_CAM_Z = 16.5;

    let disposed = false;
    let gpuBusy = false;

    const resize = () => {
      const w = mount.clientWidth || window.innerWidth;
      const h = mount.clientHeight || 440;
      const aspect = w / Math.max(h, 1);
      camera.aspect = aspect;

      // Adapt camera distance smoothly for narrower tablet/mobile viewports without shrinking desktop scale
      const camZ = w < 640 ? 22.8 : w < 1024 ? 19.2 : BASE_CAM_Z;
      camera.position.set(0, 0.52, camZ);
      camera.lookAt(0, -0.04, 0);
      camera.updateProjectionMatrix();

      renderer.setSize(w, h, false);
      renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
      if (!disposed && !gpuBusy) {
        renderer.render(scene, camera);
      }
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);

    const carouselGroup = new THREE.Group();
    scene.add(carouselGroup);

    const cardCount = SITE_PROJECT_IMAGES.length;
    const TWO_PI = Math.PI * 2;
    const slotAngle = TWO_PI / cardCount; // 30deg spacing
    // ~26.4deg angular width per card leaving crisp gap + tall ~16:10 proportion matching reference
    const cardArcW = CYLINDER_RADIUS * THREE.MathUtils.degToRad(26.4); // ~7.37 units
    const cardH = 4.95;

    const cardGeo = createCurvedCylinderCardGeometry(
      cardArcW,
      cardH,
      CYLINDER_RADIUS,
      28,
      4
    );

    interface CardMeshEntry {
      mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
      texture: THREE.CanvasTexture;
      index: number;
      loaded: boolean;
    }

    const cardEntries: CardMeshEntry[] = SITE_PROJECT_IMAGES.map((src, idx) => {
      const canvas = document.createElement('canvas');
      canvas.width = 960;
      canvas.height = 600;

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;

      const mat = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0,
        side: THREE.FrontSide,
        depthWrite: false,
      });

      const mesh = new THREE.Mesh(cardGeo, mat);
      mesh.visible = false;
      carouselGroup.add(mesh);

      const entry: CardMeshEntry = {
        mesh,
        texture,
        index: idx,
        loaded: false,
      };

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        if (disposed) return;
        drawPureImageFrame(canvas, img);
        texture.needsUpdate = true;
        entry.loaded = true;
        mesh.visible = true;
      };
      img.src = src;

      return entry;
    });

    // Start centered symmetrically around the arc behind the portrait
    let angularOffset = slotAngle * 0.5;
    let fenceTimerId = 0;

    const scheduleSoftwareSync = () => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      if (!sync) {
        gpuBusy = false;
        return;
      }
      gl.flush();
      const poll = () => {
        if (disposed) {
          gl.deleteSync(sync);
          return;
        }
        const state = gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          fenceTimerId = window.setTimeout(poll, 4);
        } else {
          gl.deleteSync(sync);
          gpuBusy = false;
        }
      };
      fenceTimerId = window.setTimeout(poll, 4);
    };

    const maxVisibleAngle = THREE.MathUtils.degToRad(84);

    const removeEffect = addFrameEffect(20, (_timeMs, deltaSec) => {
      if (disposed) return;

      const dt = Math.min(Math.max(deltaSec, 1 / 240), 0.05);
      // Smooth constant 360deg horizontal rotation with gentle scroll responsiveness
      const velBoost = Math.min(Math.abs(scrollVelRef.current) * 0.0022, 0.14);
      angularOffset = (angularOffset + (0.165 + velBoost) * dt) % TWO_PI;

      for (let i = 0; i < cardEntries.length; i++) {
        const entry = cardEntries[i];
        let theta = ((entry.index * slotAngle - angularOffset) % TWO_PI + TWO_PI) % TWO_PI;
        if (theta > Math.PI) theta -= TWO_PI;

        const absTheta = Math.abs(theta);
        if (!entry.loaded || absTheta > maxVisibleAngle) {
          entry.mesh.visible = false;
          entry.mesh.material.opacity = 0;
          continue;
        }

        entry.mesh.visible = true;

        // Place each curved card tangentially along the concave panoramic cylinder
        const x = CYLINDER_RADIUS * Math.sin(theta);
        const z = ARC_CENTER_Z - CYLINDER_RADIUS * Math.cos(theta);
        entry.mesh.position.set(x, 0, z);
        entry.mesh.rotation.set(0, -theta, 0);

        // Soft vignette fade only as cards exit past the outer edges of the viewport
        const tFade = THREE.MathUtils.smoothstep(
          absTheta,
          THREE.MathUtils.degToRad(58),
          maxVisibleAngle
        );
        entry.mesh.material.opacity = 0.98 * (1 - tFade * 0.85);
      }

      if (isSoftwareGl && gpuBusy) {
        return;
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        gpuBusy = true;
        scheduleSoftwareSync();
      }
    });

    return () => {
      disposed = true;
      removeEffect();
      window.clearTimeout(fenceTimerId);
      resizeObserver.disconnect();

      cardEntries.forEach((entry) => {
        carouselGroup.remove(entry.mesh);
        entry.mesh.material.dispose();
        entry.texture.dispose();
      });
      cardGeo.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
}
