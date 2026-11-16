import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export interface LanguageGreeting {
  word: string;
  lang: string;
  code: string;
  rtl?: boolean;
  tiltDir: [number, number]; // Distinct entry/exit side tilt per language
}

export const GREETINGS_LANGS: LanguageGreeting[] = [
  { word: 'HELLO', lang: 'ENGLISH', code: '01', tiltDir: [1, 0.4] },
  { word: 'مرحباً', lang: 'ARABIC', code: '02', rtl: true, tiltDir: [-1, 0.5] },
  { word: 'HOLA', lang: 'SPANISH', code: '03', tiltDir: [0.8, -0.5] },
  { word: 'こんにちは', lang: 'JAPANESE', code: '04', tiltDir: [-0.9, -0.45] },
];

interface Greetings3DRollProps {
  scrollVelocity?: number;
  theme?: 'light' | 'dark';
}

const _pointerTarget = new THREE.Vector2(0, 0);
const _pointerCurrent = new THREE.Vector2(0, 0);

const STAR6_VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

// Half-resolution Star 6 optical diffraction pass (3 fixed axes -> 6 rays)
const STAR6_FRAGMENT_SHADER = `
  uniform sampler2D tDiffuse;
  uniform vec2 uResolution;
  uniform float uThreshold;
  uniform float uStreakScale;
  uniform vec3 uTrailTint;
  varying vec2 vUv;

  float luma(vec3 color) {
    return dot(color, vec3(0.2126, 0.7152, 0.0722));
  }

  float brightMask(float luminance) {
    float value = max(luminance - uThreshold, 0.0);
    value /= max(1.0 - uThreshold, 1e-5);
    return smoothstep(0.0, 1.0, clamp(value, 0.0, 1.0));
  }

  vec3 sampleBright(vec2 uv) {
    vec4 texel = texture2D(tDiffuse, clamp(uv, vec2(0.0), vec2(1.0)));
    vec3 color = texel.rgb * texel.a;
    return color * brightMask(luma(color));
  }

  vec3 streak(vec2 direction) {
    vec3 result = vec3(0.0);
    for (int i = 1; i <= 8; i++) {
      float distancePx = float(i) * 1.5;
      float weight = 1.0 / (1.0 + distancePx * 0.22);
      weight *= weight;

      vec2 offset = direction * distancePx;
      result += sampleBright(vUv + offset) * weight;
      result += sampleBright(vUv - offset) * weight;
    }
    return result;
  }

  void main() {
    vec4 baseTex = texture2D(tDiffuse, vUv);
    vec3 base = baseTex.rgb * baseTex.a;
    vec3 flare = base * brightMask(luma(base)) * 1.15;
    vec2 px = (1.0 / max(uResolution, vec2(1.0))) * uStreakScale;

    flare += streak(vec2(0.0, px.y));
    flare += streak(vec2(px.x * 0.8660254,  px.y * 0.5)) * mix(vec3(1.0), uTrailTint, 0.45);
    flare += streak(vec2(px.x * 0.8660254, -px.y * 0.5)) * mix(vec3(1.0), uTrailTint.bgr, 0.35);

    gl_FragColor = vec4(flare * uTrailTint, 1.0);
  }
`;

const COMPOSITE_FRAGMENT_SHADER = `
  uniform sampler2D tBase;
  uniform sampler2D tStar;
  uniform float uFlareIntensity;
  varying vec2 vUv;

  void main() {
    vec4 base = texture2D(tBase, vUv);
    vec3 star = texture2D(tStar, vUv).rgb * uFlareIntensity;

    float flareAlpha = clamp(max(star.r, max(star.g, star.b)) * 0.85, 0.0, 1.0);
    float outAlpha = max(base.a, flareAlpha);
    vec3 outRgb = base.rgb + star;

    gl_FragColor = vec4(outRgb, outAlpha);
  }
`;

function createGreetingWordTexture(
  item: LanguageGreeting,
  maxAniso: number,
  isDark: boolean,
  isExtrudeLayer = false
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1536;
  canvas.height = 440;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const fontSize = item.word.length > 6 ? 195 : 245;
    ctx.font = `900 ${fontSize}px "Plus Jakarta Sans", "Segoe UI", system-ui, sans-serif`;

    if (isExtrudeLayer) {
      // Sculpted 3D back/bevel depth color
      ctx.fillStyle = isDark ? '#1d4ed8' : '#2563eb';
      ctx.fillText(item.word, canvas.width / 2, canvas.height / 2);
    } else {
      // Front glossy metallic/cobalt gradient face
      const grad = ctx.createLinearGradient(0, 70, 0, canvas.height - 70);
      if (isDark) {
        grad.addColorStop(0, '#FFFFFF');
        grad.addColorStop(0.45, '#DBEAFE');
        grad.addColorStop(1, '#60A5FA');
      } else {
        grad.addColorStop(0, '#0D1117');
        grad.addColorStop(0.55, '#1E3A8A');
        grad.addColorStop(1, '#2B3BE0');
      }

      // Subtle crisp rim highlight
      ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.65)' : 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 4;
      ctx.strokeText(item.word, canvas.width / 2, canvas.height / 2);

      ctx.fillStyle = grad;
      ctx.fillText(item.word, canvas.width / 2, canvas.height / 2);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  tex.needsUpdate = true;
  return tex;
}

export function Greetings3DRoll({ scrollVelocity = 0, theme = 'light' }: Greetings3DRollProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const scrollVelocityRef = useRef(0);
  const requestedIndexRef = useRef<number | null>(null);
  const themeRef = useRef(theme);
  themeRef.current = theme;

  const frontMaterialsRef = useRef<THREE.MeshPhysicalMaterial[]>([]);
  const depthMaterialsRef = useRef<THREE.MeshPhysicalMaterial[]>([]);
  const wordTextureSetsRef = useRef<
    { front: THREE.CanvasTexture; depth: THREE.CanvasTexture }[]
  >([]);
  const activeTexIndexRef = useRef(0);
  const maxAnisoRef = useRef(1);

  const starUniformsRef = useRef<{
    uTrailTint: { value: THREE.Color };
    uThreshold: { value: number };
  } | null>(null);
  const compositeUniformsRef = useRef<{
    uFlareIntensity: { value: number };
  } | null>(null);

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    scrollVelocityRef.current = scrollVelocity;
  }, [scrollVelocity]);

  // Rebuild language textures cleanly when color theme switches
  useEffect(() => {
    const isDark = theme === 'dark';

    if (wordTextureSetsRef.current.length > 0) {
      wordTextureSetsRef.current.forEach((pair) => {
        pair.front.dispose();
        pair.depth.dispose();
      });

      wordTextureSetsRef.current = GREETINGS_LANGS.map((item) => ({
        front: createGreetingWordTexture(item, maxAnisoRef.current, isDark, false),
        depth: createGreetingWordTexture(item, maxAnisoRef.current, isDark, true),
      }));

      const currentPair = wordTextureSetsRef.current[activeTexIndexRef.current];
      if (currentPair) {
        frontMaterialsRef.current.forEach((mat) => {
          mat.map = currentPair.front;
          mat.needsUpdate = true;
        });
        depthMaterialsRef.current.forEach((mat) => {
          mat.map = currentPair.depth;
          mat.needsUpdate = true;
        });
      }
    }

    if (starUniformsRef.current) {
      starUniformsRef.current.uTrailTint.value.set(isDark ? '#8ec5ff' : '#e0e7ff');
      starUniformsRef.current.uThreshold.value = isDark ? 0.88 : 0.92;
    }
    if (compositeUniformsRef.current) {
      compositeUniformsRef.current.uFlareIntensity.value = isDark ? 0.16 : 0.09;
    }
  }, [theme]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    let width = container.clientWidth || 720;
    let height = container.clientHeight || 200;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 100);
    camera.position.set(0, 0.15, 6.2);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: 'high-performance',
    });
    const pixelRatio = isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2);
    renderer.setSize(width, height);
    renderer.setPixelRatio(pixelRatio);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    maxAnisoRef.current = renderer.capabilities.getMaxAnisotropy();

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envRT = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envRT.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 2.4);
    keyLight.position.set(4, 5, 6);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x93c5fd, 1.8);
    rimLight.position.set(-5, 2, -4);
    scene.add(rimLight);

    const glintSpot = new THREE.PointLight(0xe0f2fe, 1.3, 18);
    glintSpot.position.set(2.0, 2.0, 4.0);
    scene.add(glintSpot);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xcac6bd, 0.95);
    scene.add(hemiLight);

    // =========================================================================
    // 360-DEGREE MULTI-SIDE SCULPTED 3D TEXT (NO DARK BOX DRUM)
    // =========================================================================
    const isDarkInit = themeRef.current === 'dark';
    const textureSets = GREETINGS_LANGS.map((item) => ({
      front: createGreetingWordTexture(item, maxAnisoRef.current, isDarkInit, false),
      depth: createGreetingWordTexture(item, maxAnisoRef.current, isDarkInit, true),
    }));
    wordTextureSetsRef.current = textureSets;

    const wordGroup = new THREE.Group();
    scene.add(wordGroup);

    const planeGeo = new THREE.PlaneGeometry(5.6, 1.6, 20, 4);
    // Slight sculptural curvature so 360 rotation catches specular highlights naturally
    const posAttr = planeGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      posAttr.setZ(i, -0.045 * x * x * 0.25);
    }
    planeGeo.computeVertexNormals();

    const frontMat = new THREE.MeshPhysicalMaterial({
      map: textureSets[0].front,
      transparent: true,
      alphaTest: 0.02,
      roughness: 0.16,
      metalness: 0.35,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
      side: THREE.DoubleSide,
      opacity: 1,
    });
    const depthMat = new THREE.MeshPhysicalMaterial({
      map: textureSets[0].depth,
      transparent: true,
      alphaTest: 0.02,
      roughness: 0.3,
      metalness: 0.65,
      clearcoat: 0.6,
      side: THREE.DoubleSide,
      opacity: 0.9,
    });

    frontMaterialsRef.current = [frontMat];
    depthMaterialsRef.current = [depthMat];

    // Stacked extruded depth slices for genuine 3D thickness during 360-degree turn
    const slices = 9;
    const totalDepth = 0.24;
    for (let s = 0; s < slices; s++) {
      const t = s / (slices - 1);
      const isCap = s === 0 || s === slices - 1;
      const mesh = new THREE.Mesh(planeGeo, isCap ? frontMat : depthMat);
      mesh.position.z = (t - 0.5) * totalDepth;
      wordGroup.add(mesh);
    }

    // Subtle Star 6 half-res lens flare pass
    let sceneRT: THREE.WebGLRenderTarget | null = null;
    let starRT: THREE.WebGLRenderTarget | null = null;
    let postScene: THREE.Scene | null = null;
    let postCamera: THREE.OrthographicCamera | null = null;
    let postQuadGeo: THREE.PlaneGeometry | null = null;
    let starMat: THREE.ShaderMaterial | null = null;
    let compositeMat: THREE.ShaderMaterial | null = null;
    let postQuadMesh: THREE.Mesh | null = null;

    if (!isSoftwareGl) {
      const rtWidth = Math.max(1, Math.floor(width * pixelRatio));
      const rtHeight = Math.max(1, Math.floor(height * pixelRatio));
      const halfW = Math.max(1, Math.floor(rtWidth * 0.5));
      const halfH = Math.max(1, Math.floor(rtHeight * 0.5));

      sceneRT = new THREE.WebGLRenderTarget(rtWidth, rtHeight, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.HalfFloatType,
      });
      starRT = new THREE.WebGLRenderTarget(halfW, halfH, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.HalfFloatType,
      });

      starMat = new THREE.ShaderMaterial({
        uniforms: {
          tDiffuse: { value: sceneRT.texture },
          uResolution: { value: new THREE.Vector2(halfW, halfH) },
          uThreshold: { value: isDarkInit ? 0.88 : 0.92 },
          uStreakScale: { value: 1.1 },
          uTrailTint: { value: new THREE.Color(isDarkInit ? '#8ec5ff' : '#e0e7ff') },
        },
        vertexShader: STAR6_VERTEX_SHADER,
        fragmentShader: STAR6_FRAGMENT_SHADER,
        depthTest: false,
        depthWrite: false,
      });
      starUniformsRef.current = {
        uTrailTint: starMat.uniforms.uTrailTint,
        uThreshold: starMat.uniforms.uThreshold,
      };

      compositeMat = new THREE.ShaderMaterial({
        uniforms: {
          tBase: { value: sceneRT.texture },
          tStar: { value: starRT.texture },
          uFlareIntensity: { value: isDarkInit ? 0.16 : 0.09 },
        },
        vertexShader: STAR6_VERTEX_SHADER,
        fragmentShader: COMPOSITE_FRAGMENT_SHADER,
        transparent: true,
        depthTest: false,
        depthWrite: false,
      });
      compositeUniformsRef.current = {
        uFlareIntensity: compositeMat.uniforms.uFlareIntensity,
      };

      postScene = new THREE.Scene();
      postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      postQuadGeo = new THREE.PlaneGeometry(2, 2);
      postQuadMesh = new THREE.Mesh(postQuadGeo, starMat);
      postScene.add(postQuadMesh);
    }

    let isInViewport = true;
    const visibilityObserver = new IntersectionObserver(
      (entries) => {
        isInViewport = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0.01 }
    );
    visibilityObserver.observe(container);

    // Drag to spin 360 manually + pointer light parallax
    let isDragging = false;
    let prevPointerX = 0;
    let dragVelocity = 0;

    const handlePointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / Math.max(rect.height, 1)) * 2 - 1);
      _pointerTarget.set(nx, ny);

      if (isDragging) {
        const dx = e.clientX - prevPointerX;
        dragVelocity = dx * 0.02;
        spinAngle += dragVelocity;
        prevPointerX = e.clientX;
      }
    };

    const handlePointerDown = (e: MouseEvent) => {
      isDragging = true;
      prevPointerX = e.clientX;
    };

    const handlePointerUp = () => {
      isDragging = false;
    };

    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth || 720;
      height = container.clientHeight || 200;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);

      if (sceneRT && starRT && starMat) {
        const rtW = Math.max(1, Math.floor(width * pixelRatio));
        const rtH = Math.max(1, Math.floor(height * pixelRatio));
        const halfW = Math.max(1, Math.floor(rtW * 0.5));
        const halfH = Math.max(1, Math.floor(rtH * 0.5));
        sceneRT.setSize(rtW, rtH);
        starRT.setSize(halfW, halfH);
        starMat.uniforms.uResolution.value.set(halfW, halfH);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('resize', handleResize);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    let frameId = 0;
    const clock = new THREE.Clock();
    let spinAngle = 0; // Continuous 360-degree rotation (radians); 0 = face-on front
    let frameCounter = 0;
    let lastNotifiedIndex = 0;

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

      if (isInViewport) {
        _pointerCurrent.x = THREE.MathUtils.damp(_pointerCurrent.x, _pointerTarget.x, 4, delta);
        _pointerCurrent.y = THREE.MathUtils.damp(_pointerCurrent.y, _pointerTarget.y, 4, delta);

        const scrollBoost = Math.abs(scrollVelocityRef.current) * 0.045;

        if (!isDragging) {
          dragVelocity *= 0.92;
          // Linger smoothly when facing the viewer, accelerate cleanly through the 180-deg swap zone
          const facingFront = Math.max(0, Math.cos(spinAngle));
          const speedCurve = 0.55 + (1 - facingFront) * 1.65;
          spinAngle += (1.15 * speedCurve + scrollBoost + dragVelocity) * delta;
        }

        // Handle user clicking a specific language pill/button
        if (requestedIndexRef.current !== null) {
          const reqIdx = requestedIndexRef.current;
          requestedIndexRef.current = null;
          activeTexIndexRef.current = reqIdx;
          const pair = wordTextureSetsRef.current[reqIdx];
          if (pair) {
            frontMat.map = pair.front;
            depthMat.map = pair.depth;
            frontMat.needsUpdate = true;
            depthMat.needsUpdate = true;
          }
          setActiveIndex(reqIdx);
          lastNotifiedIndex = reqIdx;
          // Snap angle smoothly onto a clean incoming turn
          spinAngle = Math.round(spinAngle / (Math.PI * 2)) * (Math.PI * 2) - 0.55;
        }

        // Every full 2*PI revolution transitions seamlessly through the fade/edge point (PI)
        const twoPi = Math.PI * 2;
        const cycleIdx = Math.floor((spinAngle + Math.PI) / twoPi);
        const langCount = GREETINGS_LANGS.length;
        const targetLangIdx = ((cycleIdx % langCount) + langCount) % langCount;

        if (targetLangIdx !== activeTexIndexRef.current) {
          activeTexIndexRef.current = targetLangIdx;
          const pair = wordTextureSetsRef.current[targetLangIdx];
          if (pair) {
            frontMat.map = pair.front;
            depthMat.map = pair.depth;
            frontMat.needsUpdate = true;
            depthMat.needsUpdate = true;
          }
          if (targetLangIdx !== lastNotifiedIndex) {
            lastNotifiedIndex = targetLangIdx;
            setActiveIndex(targetLangIdx);
          }
        }

        const currentItem = GREETINGS_LANGS[activeTexIndexRef.current];
        const [tiltXDir, tiltZDir] = currentItem.tiltDir;

        // Smooth fade out as it turns away (~90deg..270deg) so each language disappears and reveals the next
        const cosFacing = Math.cos(spinAngle);
        const fade = THREE.MathUtils.smoothstep(cosFacing, -0.15, 0.45);
        frontMat.opacity = fade;
        depthMat.opacity = fade * 0.9;

        // 360-degree Y-axis spin + multi-side X/Z tilt & orbital entry motion
        const localPhase = ((spinAngle + Math.PI) % twoPi + twoPi) % twoPi - Math.PI; // -PI .. +PI
        wordGroup.rotation.y = spinAngle + _pointerCurrent.x * 0.22;
        wordGroup.rotation.x = Math.sin(localPhase) * 0.28 * tiltXDir + _pointerCurrent.y * -0.14;
        wordGroup.rotation.z = Math.sin(localPhase) * 0.09 * tiltZDir;
        wordGroup.position.x = Math.sin(localPhase) * 0.35 * tiltXDir;
        wordGroup.position.y = Math.sin(elapsed * 1.6) * 0.06 + Math.cos(localPhase) * 0.04;

        glintSpot.position.x = 2.0 + _pointerCurrent.x * 1.8;
        glintSpot.position.y = 2.0 + _pointerCurrent.y * 1.2;

        if (isSoftwareGl || !sceneRT || !starRT || !postScene || !postCamera || !postQuadMesh || !starMat || !compositeMat) {
          renderer.setRenderTarget(null);
          renderer.clear();
          renderer.render(scene, camera);
        } else {
          renderer.setRenderTarget(sceneRT);
          renderer.setClearColor(0x000000, 0);
          renderer.clear();
          renderer.render(scene, camera);

          if (frameCounter % 2 === 0) {
            postQuadMesh.material = starMat;
            renderer.setRenderTarget(starRT);
            renderer.setClearColor(0x000000, 0);
            renderer.clear();
            renderer.render(postScene, postCamera);
          }

          postQuadMesh.material = compositeMat;
          renderer.setRenderTarget(null);
          renderer.setClearColor(0x000000, 0);
          renderer.clear();
          renderer.render(postScene, postCamera);

          frameCounter += 1;
        }
      }

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
      visibilityObserver.disconnect();
      window.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('resize', handleResize);

      planeGeo.dispose();
      frontMat.dispose();
      depthMat.dispose();
      wordTextureSetsRef.current.forEach((pair) => {
        pair.front.dispose();
        pair.depth.dispose();
      });
      wordTextureSetsRef.current = [];
      frontMaterialsRef.current = [];
      depthMaterialsRef.current = [];
      postQuadGeo?.dispose();
      starMat?.dispose();
      compositeMat?.dispose();
      sceneRT?.dispose();
      starRT?.dispose();
      envRT.dispose();
      renderer.dispose();
      starUniformsRef.current = null;
      compositeUniformsRef.current = null;
    };
  }, []);

  const handleSelectLang = (idx: number) => {
    requestedIndexRef.current = idx;
    setActiveIndex(idx);
  };

  return (
    <div className="w-full flex flex-col items-center select-none">
      {/* 360-Degree Floating 3D Multilingual Text Canvas */}
      <div
        ref={mountRef}
        className="w-full h-[145px] sm:h-[185px] lg:h-[210px] cursor-grab active:cursor-grabbing"
        title="Drag or click a language to spin 360°"
      />

      {/* Quiet Unboxed Pixel Language Indicator Strip */}
      <div className="w-full max-w-2xl flex flex-wrap items-center justify-center gap-x-5 gap-y-1 px-4 pt-0.5 pb-1 font-pixel text-[10px] sm:text-[11px] uppercase">
        {GREETINGS_LANGS.map((item, idx) => {
          const isActive = idx === activeIndex;
          return (
            <button
              key={item.code}
              onClick={() => handleSelectLang(idx)}
              className={`cursor-pointer transition-all py-0.5 border-b ${
                isActive
                  ? 'opacity-100 border-current font-bold'
                  : 'opacity-45 border-transparent hover:opacity-85'
              }`}
            >
              {item.code}.{item.lang}
            </button>
          );
        })}
      </div>
    </div>
  );
}
