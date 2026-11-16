import * as THREE from 'three';

export interface OceanSurfaceRig {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
  update: (elapsed: number, isDark: boolean) => void;
  dispose: () => void;
}

/**
 * Analytical wave elevation matching the vertex shader so the yacht
 * pitches & rolls faithfully on the animated ocean surface.
 */
export function sampleOceanHeight(x: number, z: number, elapsed: number): number {
  const w1 = Math.sin(z * 0.28 + elapsed * 1.45) * 0.14;
  const w2 = Math.cos(x * 0.36 - z * 0.18 + elapsed * 1.1) * 0.08;
  const w3 = Math.sin((x + z) * 0.62 + elapsed * 2.1) * 0.035;
  return w1 + w2 + w3;
}

/**
 * Builds an extended PBR ocean plane with custom GLSL wave displacement,
 * dynamic normal shading, specular sunlight glints, and a trailing white foam V-wake
 * behind the luxury yacht.
 */
export function createShadedOceanSurface(): OceanSurfaceRig {
  // Compact wave & wake surface hugging the hull and trailing behind the stern
  // so the architectural grid & kinetic sky lines stay visible around the yacht.
  const geo = new THREE.PlaneGeometry(13, 30, 48, 72);
  geo.rotateX(-Math.PI / 2);

  const uniforms = {
    uTime: { value: 0 },
    uDeepColor: { value: new THREE.Color(0x05183b) },
    uShallowColor: { value: new THREE.Color(0x0e4d82) },
    uFoamColor: { value: new THREE.Color(0xe6f4ff) },
  };

  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.14,
    roughness: 0.34,
    envMapIntensity: 0.75,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.uniforms.uDeepColor = uniforms.uDeepColor;
    shader.uniforms.uShallowColor = uniforms.uShallowColor;
    shader.uniforms.uFoamColor = uniforms.uFoamColor;

    shader.vertexShader =
      `
      uniform float uTime;
      varying vec3 vOceanVessel;
      varying float vWaveCrest;

      float oceanWave(vec2 p, float t) {
        float a = sin(p.y * 0.34 + t * 1.65) * 0.11;
        float b = cos(p.x * 0.42 - p.y * 0.22 + t * 1.2) * 0.065;
        float c = sin((p.x + p.y) * 0.72 + t * 2.3) * 0.028;
        return a + b + c;
      }
      ` +
      shader.vertexShader
        .replace(
          '#include <beginnormal_vertex>',
          `
          #include <beginnormal_vertex>
          float eps = 0.22;
          vec3 vPosEps = position + vec3(0.0, 0.0, 9.5);
          float hC = oceanWave(vPosEps.xz, uTime);
          float hX = oceanWave(vPosEps.xz + vec2(eps, 0.0), uTime);
          float hZ = oceanWave(vPosEps.xz + vec2(0.0, eps), uTime);
          objectNormal = normalize(vec3(hC - hX, eps, hC - hZ));
          `
        )
        .replace(
          '#include <begin_vertex>',
          `
          #include <begin_vertex>
          vec3 vLocalPos = transformed + vec3(0.0, 0.0, 9.5);
          float wH = oceanWave(vLocalPos.xz, uTime);
          transformed.y += wH;
          vWaveCrest = clamp((wH + 0.15) / 0.34, 0.0, 1.0);
          vOceanVessel = vLocalPos;
          `
        );

    shader.fragmentShader =
      `
      uniform float uTime;
      uniform vec3 uDeepColor;
      uniform vec3 uShallowColor;
      uniform vec3 uFoamColor;
      varying vec3 vOceanVessel;
      varying float vWaveCrest;
      ` +
      shader.fragmentShader.replace(
        '#include <color_fragment>',
        `
        #include <color_fragment>
        vec3 baseSea = mix(uDeepColor, uShallowColor, vWaveCrest);

        // Localized wave & wake envelope: narrow at bow (-5.1), opening aft (+4.9..+24)
        float fromBow = clamp((vOceanVessel.z + 5.2) / 26.0, 0.0, 1.0);
        float envHalfW = mix(0.75, 4.8, pow(fromBow, 0.85));
        float distX = abs(vOceanVessel.x);
        float latFade = exp(-pow(distX / max(envHalfW, 0.35), 2.35));
        float bowMask = smoothstep(-5.5, -3.6, vOceanVessel.z);
        float aftTailFade = 1.0 - smoothstep(13.5, 23.5, vOceanVessel.z);
        float waterEnvelope = latFade * bowMask * aftTailFade;

        // Crisp trailing V-wake & stern foam streaming directly behind the yacht
        float wakeZ = vOceanVessel.z - 4.25;
        float wakeHalfW = 0.85 + max(wakeZ, 0.0) * 0.31;
        float wakeEdge = exp(-pow((distX - wakeHalfW) * 2.5, 2.0));
        float sternRoil = exp(-pow(distX * 1.4, 2.0)) * smoothstep(3.8, 5.2, vOceanVessel.z);
        float wakeFade = smoothstep(3.2, 4.9, vOceanVessel.z) * exp(-max(wakeZ, 0.0) * 0.085);
        float ripple = 0.58 + 0.42 * sin(vOceanVessel.z * 4.6 - uTime * 11.5 + vOceanVessel.x * 3.8);

        // Bow-cut spray ribbon hugging hull curve
        float bowT = clamp((vOceanVessel.z + 5.1) / 3.9, 0.0, 1.0);
        float hullHalfBeam = pow(bowT, 0.68) * 1.46;
        float bowSpray = exp(-pow((distX - hullHalfBeam) * 6.5, 2.0))
          * smoothstep(-5.25, -4.65, vOceanVessel.z)
          * (1.0 - smoothstep(-2.4, -1.1, vOceanVessel.z))
          * (0.65 + 0.35 * sin(vOceanVessel.z * 6.0 - uTime * 10.0))
          * 0.56;

        float foamMask = clamp((wakeEdge * 0.78 + sternRoil * 0.68) * wakeFade * ripple + bowSpray, 0.0, 0.94);
        float crestHighlight = smoothstep(0.84, 1.0, vWaveCrest) * 0.16;
        diffuseColor.rgb = mix(baseSea, uFoamColor, clamp(foamMask + crestHighlight, 0.0, 0.96));
        diffuseColor.a *= clamp(waterEnvelope * (0.72 + foamMask * 0.28), 0.0, 0.94);
        `
      );
  };

  const mesh = new THREE.Mesh(geo, mat);
  // Center the 30-unit length at z = +9.5 so waves cover -5.5 (bow) through +24.5 (trailing wake)
  mesh.position.set(0, -0.02, 9.5);
  mesh.receiveShadow = false;

  const update = (elapsed: number, isDark: boolean) => {
    uniforms.uTime.value = elapsed;
    if (isDark) {
      uniforms.uDeepColor.value.setHex(0x051842);
      uniforms.uShallowColor.value.setHex(0x0f5696);
      uniforms.uFoamColor.value.setHex(0xe2f4ff);
    } else {
      uniforms.uDeepColor.value.setHex(0x165387);
      uniforms.uShallowColor.value.setHex(0x3a8bc2);
      uniforms.uFoamColor.value.setHex(0xf8fcff);
    }
  };

  const dispose = () => {
    geo.dispose();
    mat.dispose();
  };

  return { mesh, update, dispose };
}
