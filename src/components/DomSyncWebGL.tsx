import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import * as THREE from 'three';
import { addFrameEffect, getLenisScrollSnapshot } from '../lib/lenisScrollBus';

export interface DomSyncProjectSpec {
  id: string;
  imageSrc: string;
  hoverImageSrc: string;
}

interface DomSyncWebGLProps {
  projects: DomSyncProjectSpec[];
  imageBoxRefs: MutableRefObject<(HTMLDivElement | null)[]>;
  cardRefs: MutableRefObject<(HTMLDivElement | null)[]>;
  hoveredId: string | null;
  theme?: 'light' | 'dark';
  onReadyChange?: (ready: boolean) => void;
}

/**
 * Velocity-driven curl sampler using clamped delta and fast-attack / slow-release
 * exponential smoothing so trackpad micro-fluctuations never turn into visual noise.
 */
function createCurlStrengthSampler() {
  let previousScrollY: number | null = null;
  let activity = 0;
  let signedActivity = 0;

  return (scrollY: number, delta: number) => {
    const dt = THREE.MathUtils.clamp(delta, 1 / 240, 0.1);
    const rawDeltaY = previousScrollY == null ? 0 : scrollY - previousScrollY;
    previousScrollY = scrollY;

    const rawSignedVelocity = rawDeltaY / dt;
    const velocity = Math.abs(rawSignedVelocity);

    const target = THREE.MathUtils.clamp(velocity / 1350, 0, 1);
    const signedTarget = THREE.MathUtils.clamp(rawSignedVelocity / 1350, -1, 1);

    const tau = target > activity ? 0.14 : 0.42;
    const alpha = 1 - Math.exp(-dt / tau);
    activity += (target - activity) * alpha;

    const signedTau = Math.abs(signedTarget) > Math.abs(signedActivity) ? 0.16 : 0.45;
    const signedAlpha = 1 - Math.exp(-dt / signedTau);
    signedActivity += (signedTarget - signedActivity) * signedAlpha;

    return {
      curlStrength: 0.048 * activity,
      curlActivity: activity,
      signedVelocity: signedActivity,
    };
  };
}

const VERTEX_SHADER = /* glsl */ `
  uniform float uCurlStrength;
  uniform float uSignedVelocity;
  uniform vec4 uCardRect;
  varying vec2 vUv;
  varying vec2 vScreenUv;

  void main() {
    vUv = uv;
    vec2 screenUv = uCardRect.xy + uv * uCardRect.zw;
    vScreenUv = screenUv;

    // Normalized viewport Y (-1 at bottom edge of viewport, +1 at top edge of viewport)
    float centeredY = 2.0 * clamp(screenUv.y, 0.0, 1.0) - 1.0;
    float profile = 1.0 - sqrt(max(0.0, 1.0 - centeredY * centeredY));

    vec3 pos = position;

    // Subtle ambient + scroll-driven 3D lift near top/bottom viewport edges
    pos.z += profile * (18.0 + uCurlStrength * 880.0 + abs(uSignedVelocity) * 35.0);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D uTexture;
  uniform sampler2D uHoverTexture;
  uniform float uCurlStrength;
  uniform float uCurlActivity;
  uniform float uOpacity;
  uniform float uHover;
  uniform float uImageAspect;
  uniform float uHoverAspect;
  uniform float uPlaneAspect;
  uniform vec4 uCardRect;
  uniform vec3 uShadeTint;
  varying vec2 vUv;
  varying vec2 vScreenUv;

  vec2 applyCurl(vec2 screenUv) {
    float centered = 2.0 * clamp(screenUv.y, 0.0, 1.0) - 1.0;
    float profile = 1.0 - sqrt(max(0.0, 1.0 - centered * centered));

    // Preserve a subtle constant curl plus strong scroll-driven lens curvature
    float totalCurl = 0.008 + uCurlStrength;
    float uvScale = 1.0 - profile * totalCurl;
    float distortedX = (screenUv.x - 0.5) * uvScale + 0.5;
    return vec2(distortedX, screenUv.y);
  }

  vec2 getCoverUv(vec2 uv, float imgAspect, float planeAspect) {
    vec2 scale = vec2(1.0);
    if (planeAspect > imgAspect) {
      scale.y = imgAspect / planeAspect;
    } else {
      scale.x = planeAspect / imgAspect;
    }
    return (uv - 0.5) * scale + 0.5;
  }

  void main() {
    // 1. Apply exact screen-space semicircular lens curl on BOTH idle & hovered image
    vec2 curledScreenUv = applyCurl(vScreenUv);
    vec2 curledLocalUv = (curledScreenUv - uCardRect.xy) / max(uCardRect.zw, vec2(0.0001));
    curledLocalUv = clamp(curledLocalUv, 0.0, 1.0);

    // 2. Primary image (subtle zoom on hover) & Alternate image (Zoom-In 1.15 -> Zoom-Out 1.0 on hover)
    float baseZoom = 1.0 - uHover * 0.045;
    vec2 baseUv = getCoverUv((curledLocalUv - 0.5) * baseZoom + 0.5, uImageAspect, uPlaneAspect);
    vec4 baseTex = texture2D(uTexture, baseUv);

    float hoverZoom = mix(1.15, 1.0, uHover);
    vec2 hoverUv = getCoverUv((curledLocalUv - 0.5) * hoverZoom + 0.5, uHoverAspect, uPlaneAspect);
    vec4 hoverTex = texture2D(uHoverTexture, hoverUv);

    // 3. Circular center-to-edges wipe driven smoothly by uHover (no click recoil)
    float aspectComp = uPlaneAspect;
    vec2 centered = (curledLocalUv - 0.5) * vec2(aspectComp, 1.0);
    float maxRadius = length(vec2(0.5 * aspectComp, 0.5)) + 0.06;
    float revealRadius = uHover * maxRadius;
    float feather = 0.055;
    float hoverMask = 1.0 - smoothstep(revealRadius - feather, revealRadius + feather, length(centered));
    hoverMask *= smoothstep(0.0, 0.08, uHover);

    vec4 blendedTex = mix(baseTex, hoverTex, hoverMask);

    // 4. Persistent scroll-edge shade (mirrors computeEdgeShadeMetrics) active EVEN when hovered
    float centeredY = 2.0 * clamp(vScreenUv.y, 0.0, 1.0) - 1.0;
    float edgeProfile = 1.0 - sqrt(max(0.0, 1.0 - centeredY * centeredY));
    float edgeShade = clamp(edgeProfile * (0.14 + uCurlActivity * 0.38), 0.0, 0.52);

    vec3 finalRgb = mix(blendedTex.rgb, uShadeTint, edgeShade);

    gl_FragColor = vec4(finalRgb, blendedTex.a * uOpacity);
    #include <colorspace_fragment>
  }
`;

interface PlaneEntry {
  id: string;
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  texture: THREE.Texture;
  hoverTexture: THREE.Texture;
  imageAspect: number;
  hoverAspect: number;
  hoverAmount: number;
}

export function DomSyncWebGL({
  projects,
  imageBoxRefs,
  cardRefs,
  hoveredId,
  theme = 'dark',
  onReadyChange,
}: DomSyncWebGLProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hoveredIdRef = useRef(hoveredId);
  hoveredIdRef.current = hoveredId;

  const themeRef = useRef(theme);
  themeRef.current = theme;

  const projectsRef = useRef(projects);
  projectsRef.current = projects;

  const onReadyChangeRef = useRef(onReadyChange);
  onReadyChangeRef.current = onReadyChange;

  useEffect(() => {
    const mount = containerRef.current;
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
      onReadyChangeRef.current?.(false);
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
    const fov = 45;
    let vw = window.innerWidth;
    let vh = window.innerHeight;
    const camera = new THREE.PerspectiveCamera(fov, vw / Math.max(vh, 1), 10, 4000);

    const syncCamera = () => {
      vw = window.innerWidth;
      vh = window.innerHeight;
      camera.aspect = vw / Math.max(vh, 1);
      camera.position.z = vh / (2 * Math.tan(THREE.MathUtils.degToRad(fov / 2)));
      camera.updateProjectionMatrix();
      renderer.setSize(vw, vh, false);
      renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    };

    syncCamera();
    window.addEventListener('resize', syncCamera);

    const sharedGeometry = new THREE.PlaneGeometry(1, 1, 32, 32);
    const textureLoader = new THREE.TextureLoader();
    const entries: PlaneEntry[] = [];
    let loadedBaseCount = 0;

    projectsRef.current.forEach((proj) => {
      const texture = textureLoader.load(proj.imageSrc, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.needsUpdate = true;

        const img = tex.image as { width?: number; height?: number } | undefined;
        if (img && img.width && img.height) {
          entry.imageAspect = img.width / img.height;
          material.uniforms.uImageAspect.value = entry.imageAspect;
        }

        loadedBaseCount += 1;
        if (loadedBaseCount === projectsRef.current.length) {
          onReadyChangeRef.current?.(true);
        }
      });

      const hoverTexture = textureLoader.load(proj.hoverImageSrc, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.needsUpdate = true;

        const img = tex.image as { width?: number; height?: number } | undefined;
        if (img && img.width && img.height) {
          entry.hoverAspect = img.width / img.height;
          material.uniforms.uHoverAspect.value = entry.hoverAspect;
        }
      });

      texture.colorSpace = THREE.SRGBColorSpace;
      hoverTexture.colorSpace = THREE.SRGBColorSpace;

      const material = new THREE.ShaderMaterial({
        uniforms: {
          uTexture: { value: texture },
          uHoverTexture: { value: hoverTexture },
          uCurlStrength: { value: 0 },
          uCurlActivity: { value: 0 },
          uSignedVelocity: { value: 0 },
          uOpacity: { value: 0 },
          uHover: { value: 0 },
          uImageAspect: { value: 1.6 },
          uHoverAspect: { value: 1.6 },
          uPlaneAspect: { value: 1.6 },
          uCardRect: { value: new THREE.Vector4(0, 0, 1, 1) },
          uShadeTint: { value: new THREE.Color(0x060d3d) },
        },
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
        transparent: true,
        depthWrite: false,
      });

      const mesh = new THREE.Mesh(sharedGeometry, material);
      mesh.frustumCulled = false;
      scene.add(mesh);

      const entry: PlaneEntry = {
        id: proj.id,
        mesh,
        texture,
        hoverTexture,
        imageAspect: 1.6,
        hoverAspect: 1.6,
        hoverAmount: 0,
      };
      entries.push(entry);
    });

    const sampleCurl = createCurlStrengthSampler();
    let disposed = false;

    const removeEffect = addFrameEffect(20, (_timeMs, delta) => {
      if (disposed) return;

      const scrollY = getLenisScrollSnapshot().scrollTop;
      const { curlStrength, curlActivity, signedVelocity } = sampleCurl(scrollY, delta);
      const shadeHex = themeRef.current === 'dark' ? 0x060d3d : 0x1e3a8a;

      let anyVisible = false;
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const imgEl = imageBoxRefs.current[i];
        const cardEl = cardRefs.current[i];

        if (!imgEl || !cardEl) {
          entry.mesh.visible = false;
          continue;
        }

        const rect = imgEl.getBoundingClientRect();
        const rawStyleOpacity = cardEl.style.opacity;
        const cardOpacity = rawStyleOpacity === '' ? 1 : parseFloat(rawStyleOpacity) || 0;

        if (
          rect.width <= 1 ||
          rect.height <= 1 ||
          rect.bottom < -120 ||
          rect.top > vh + 120 ||
          cardOpacity <= 0.005
        ) {
          entry.mesh.visible = false;
          continue;
        }

        anyVisible = true;
        entry.mesh.visible = true;
        entry.mesh.scale.set(rect.width, rect.height, 1);
        entry.mesh.position.set(
          rect.left + rect.width / 2 - vw / 2,
          -(rect.top + rect.height / 2 - vh / 2),
          0
        );

        const targetHover = hoveredIdRef.current === entry.id ? 1 : 0;
        entry.hoverAmount = THREE.MathUtils.damp(
          entry.hoverAmount,
          targetHover,
          8.5,
          Math.min(delta, 0.05)
        );

        const uniforms = entry.mesh.material.uniforms;
        uniforms.uCurlStrength.value = curlStrength;
        uniforms.uCurlActivity.value = curlActivity;
        uniforms.uSignedVelocity.value = signedVelocity;
        uniforms.uOpacity.value = cardOpacity;
        uniforms.uHover.value = entry.hoverAmount;
        uniforms.uPlaneAspect.value = rect.width / Math.max(rect.height, 1);
        (uniforms.uShadeTint.value as THREE.Color).setHex(shadeHex);
        (uniforms.uCardRect.value as THREE.Vector4).set(
          rect.left / Math.max(vw, 1),
          (vh - rect.bottom) / Math.max(vh, 1),
          rect.width / Math.max(vw, 1),
          rect.height / Math.max(vh, 1)
        );
      }

      if (anyVisible) {
        renderer.render(scene, camera);
      } else {
        renderer.clear();
      }
    });

    return () => {
      disposed = true;
      removeEffect();
      window.removeEventListener('resize', syncCamera);

      entries.forEach((entry) => {
        scene.remove(entry.mesh);
        entry.mesh.material.dispose();
        entry.texture.dispose();
        entry.hoverTexture.dispose();
      });
      sharedGeometry.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
      onReadyChangeRef.current?.(false);
    };
  }, [imageBoxRefs, cardRefs]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-10"
    />
  );
}
