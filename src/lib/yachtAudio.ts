export interface YachtAudioController {
  unlock: () => void;
  setIntensity: (intensity: number) => void;
  setMuted: (muted: boolean) => void;
  isMuted: () => boolean;
  dispose: () => void;
}

/**
 * 100% procedural Web Audio synthesizer for the luxury yacht voyage:
 * blends gentle ocean surf/bow spray, twin low-RPM marine diesel hum,
 * and a soft resonant maritime chord upon entering the bridge interior.
 * Zero external MP3 dependencies and zero errors if audio context is restricted.
 */
export function createYachtAudioController(): YachtAudioController {
  let ctx: AudioContext | null = null;
  let masterGain: GainNode | null = null;
  let surfFilter: BiquadFilterNode | null = null;
  let engineOscA: OscillatorNode | null = null;
  let engineOscB: OscillatorNode | null = null;
  let noiseSource: AudioBufferSourceNode | null = null;
  let muted = false;
  let currentIntensity = 0;
  let hornPlayed = false;

  const ensureNodes = () => {
    if (ctx) return true;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return false;

    try {
      ctx = new AudioCtx();
      masterGain = ctx.createGain();
      masterGain.gain.value = 0;
      masterGain.connect(ctx.destination);

      // 1. Filtered pink/brown noise for ocean surf & bow wake
      const sampleRate = ctx.sampleRate;
      const len = sampleRate * 2;
      const noiseBuf = ctx.createBuffer(1, len, sampleRate);
      const data = noiseBuf.getChannelData(0);
      let lastOut = 0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + 0.025 * white) / 1.025;
        data[i] = lastOut * 3.2;
      }

      noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuf;
      noiseSource.loop = true;

      surfFilter = ctx.createBiquadFilter();
      surfFilter.type = 'lowpass';
      surfFilter.frequency.value = 480;

      const surfGain = ctx.createGain();
      surfGain.gain.value = 0.22;

      noiseSource.connect(surfFilter);
      surfFilter.connect(surfGain);
      surfGain.connect(masterGain);
      noiseSource.start();

      // 2. Twin marine engine warm low-RPM rumble (52Hz + 78Hz)
      const engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 140;

      const engineGain = ctx.createGain();
      engineGain.gain.value = 0.085;

      engineOscA = ctx.createOscillator();
      engineOscA.type = 'sawtooth';
      engineOscA.frequency.value = 52;

      engineOscB = ctx.createOscillator();
      engineOscB.type = 'triangle';
      engineOscB.frequency.value = 78.5;

      engineOscA.connect(engineFilter);
      engineOscB.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(masterGain);

      engineOscA.start();
      engineOscB.start();

      return true;
    } catch {
      ctx = null;
      return false;
    }
  };

  const playArrivalHornSwell = () => {
    if (!ctx || !masterGain || muted || ctx.state !== 'running') return;
    try {
      const now = ctx.currentTime;
      const hornGain = ctx.createGain();
      hornGain.gain.setValueAtTime(0.0001, now);
      hornGain.gain.exponentialRampToValueAtTime(0.065, now + 0.35);
      hornGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

      const hornFilter = ctx.createBiquadFilter();
      hornFilter.type = 'lowpass';
      hornFilter.frequency.value = 520;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc1.type = 'triangle';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(146.83, now); // D3 warm maritime horn
      osc2.frequency.setValueAtTime(220.0, now); // A3 fifth harmony

      osc1.connect(hornFilter);
      osc2.connect(hornFilter);
      hornFilter.connect(hornGain);
      hornGain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.9);
      osc2.stop(now + 1.9);
    } catch {
      // Ignore audio errors if restricted
    }
  };

  const applyGain = () => {
    if (!ctx || !masterGain) return;
    const target = muted ? 0 : Math.min(Math.max(currentIntensity, 0), 1) * 0.55;
    masterGain.gain.setTargetAtTime(target, ctx.currentTime, 0.14);
    if (surfFilter) {
      surfFilter.frequency.setTargetAtTime(380 + currentIntensity * 460, ctx.currentTime, 0.2);
    }
  };

  const unlock = () => {
    if (!ensureNodes() || !ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().then(() => applyGain()).catch(() => undefined);
    } else {
      applyGain();
    }
  };

  const setIntensity = (intensity: number) => {
    const prev = currentIntensity;
    currentIntensity = intensity;

    if (intensity > 0.35 && prev <= 0.35 && !hornPlayed) {
      hornPlayed = true;
      playArrivalHornSwell();
    } else if (intensity < 0.05) {
      hornPlayed = false;
    }

    if (ctx && ctx.state === 'running') {
      applyGain();
    }
  };

  const setMuted = (nextMuted: boolean) => {
    muted = nextMuted;
    if (!muted) unlock();
    applyGain();
  };

  const isMuted = () => muted;

  const dispose = () => {
    try {
      noiseSource?.stop();
      engineOscA?.stop();
      engineOscB?.stop();
      ctx?.close().catch(() => undefined);
    } catch {
      // Ignore cleanup errors
    }
    ctx = null;
    masterGain = null;
  };

  return { unlock, setIntensity, setMuted, isMuted, dispose };
}
