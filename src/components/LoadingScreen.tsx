import { useEffect, useRef, useState } from 'react';

interface LoadingScreenProps {
  theme: 'light' | 'dark';
  onRevealStart?: () => void;
  onComplete: () => void;
}

const CRITICAL_ASSETS = ['/assets/aistudio/moamen_hero_clean.png'];

// Each letter of "Moamen." drawn sequentially stroke-by-stroke like pen handwriting
const LETTER_STROKES = [
  {
    id: 'M',
    d: 'M 24 84 C 28 58, 33 34, 38 20 L 60 66 L 83 20 C 87 42, 92 64, 97 84',
    start: 0.0,
    end: 0.24,
  },
  {
    id: 'o',
    d: 'M 140 50 C 127 43, 111 52, 111 66 C 111 81, 125 86, 138 80 C 149 74, 151 55, 137 48',
    start: 0.21,
    end: 0.38,
  },
  {
    id: 'a',
    d: 'M 197 53 C 190 45, 175 43, 165 51 C 155 60, 157 79, 171 83 C 185 86, 196 74, 198 48 L 200 77 C 201 82, 206 84, 211 80',
    start: 0.35,
    end: 0.54,
  },
  {
    id: 'm',
    d: 'M 222 83 L 222 48 C 222 48, 229 45, 237 46 C 247 47, 252 55, 252 65 L 252 83 L 252 63 C 252 52, 260 45, 270 46 C 280 47, 285 55, 287 67 L 289 83',
    start: 0.51,
    end: 0.72,
  },
  {
    id: 'e',
    d: 'M 304 65 L 342 62 C 344 50, 332 45, 319 47 C 305 50, 300 66, 310 78 C 320 87, 338 82, 346 73',
    start: 0.69,
    end: 0.84,
  },
  {
    id: 'n',
    d: 'M 360 83 L 360 48 C 360 48, 367 45, 376 46 C 388 47, 394 55, 396 67 L 400 83',
    start: 0.81,
    end: 0.96,
  },
  {
    id: 'dot',
    d: 'M 412 80 L 413 80',
    start: 0.94,
    end: 1.0,
  },
] as const;

const MIN_DISPLAY_MS = 1850;
const MAX_WAIT_MS = 3200;
const EXIT_DURATION_MS = 480;

export function LoadingScreen({ theme, onRevealStart, onComplete }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [animT, setAnimT] = useState(0);
  const [exitProgress, setExitProgress] = useState(0);
  const onRevealStartRef = useRef(onRevealStart);
  onRevealStartRef.current = onRevealStart;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    let active = true;
    let assetsReady = false;
    let loadedCount = 0;

    const markLoaded = () => {
      loadedCount += 1;
      if (loadedCount >= CRITICAL_ASSETS.length) {
        assetsReady = true;
      }
    };

    CRITICAL_ASSETS.forEach((src) => {
      let handled = false;
      const done = () => {
        if (handled) return;
        handled = true;
        markLoaded();
      };
      const img = new Image();
      img.onload = done;
      img.onerror = done;
      img.src = src;
      if (img.complete) {
        done();
      }
    });

    const start = performance.now();
    let exitStart: number | null = null;
    let rafId = 0;

    const tick = (now: number) => {
      if (!active) return;

      const elapsed = Math.max(0, now - start);
      const timeFraction = Math.min(1, elapsed / MIN_DISPLAY_MS);
      const assetFraction = loadedCount / CRITICAL_ASSETS.length;

      // Constant-tempo linear timeline from frame 1
      const targetProgress = assetsReady
        ? timeFraction
        : Math.min(timeFraction, Math.max(assetFraction * 0.9, timeFraction * 0.85));

      setAnimT(targetProgress);
      setProgress(Math.min(100, Math.round(targetProgress * 100)));

      const readyToFinish =
        (elapsed >= MIN_DISPLAY_MS && assetsReady) || elapsed >= MAX_WAIT_MS;

      if (readyToFinish && exitStart === null) {
        setAnimT(1);
        setProgress(100);
        exitStart = now;
        onRevealStartRef.current?.();
      }

      if (exitStart !== null) {
        const exitT = Math.min(1, Math.max(0, now - exitStart) / EXIT_DURATION_MS);
        setExitProgress(exitT);
        if (exitT >= 1) {
          onCompleteRef.current();
          return;
        }
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      active = false;
      window.cancelAnimationFrame(rafId);
    };
  }, []);

  const isDark = theme === 'dark';

  // Center-to-edges circular mask opening on exit: cuts open from 0% center outward to 130% edges
  const holeRadiusPct = exitProgress * 135;
  const maskStyle =
    exitProgress > 0
      ? {
          WebkitMaskImage: `radial-gradient(circle at 50% 50%, transparent ${holeRadiusPct.toFixed(1)}%, black ${(holeRadiusPct + 14).toFixed(1)}%)`,
          maskImage: `radial-gradient(circle at 50% 50%, transparent ${holeRadiusPct.toFixed(1)}%, black ${(holeRadiusPct + 14).toFixed(1)}%)`,
        }
      : undefined;

  return (
    <div
      role="status"
      aria-label="Loading portfolio"
      data-testid="loading-screen"
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center px-6 select-none overflow-hidden"
      style={{
        background: isDark
          ? 'linear-gradient(155deg, #091559 0%, #060D3D 52%, #071048 100%)'
          : 'linear-gradient(155deg, #BEE0FA 0%, #CEE8FC 50%, #C2E2FA 100%)',
        color: 'var(--text-color)',
        pointerEvents: exitProgress > 0 ? 'none' : 'auto',
        ...maskStyle,
      }}
    >
      {/* Centered Handwritten Stroke-by-Stroke "Moamen." + Linear Counter */}
      <div
        className="relative z-10 w-[min(86vw,440px)] flex flex-col items-center transition-transform duration-300"
        style={{
          transform: `scale(${(1 + exitProgress * 0.14).toFixed(4)})`,
          opacity: Math.max(0, 1 - exitProgress * 1.4),
        }}
      >
        <svg
          viewBox="0 0 432 106"
          className="w-full h-auto overflow-visible"
          fill="none"
          aria-label="Moamen"
        >
          {LETTER_STROKES.map((letter) => {
            const span = Math.max(0.01, letter.end - letter.start);
            const letterProgress = Math.max(0, Math.min(1, (animT - letter.start) / span));

            return (
              <path
                key={letter.id}
                d={letter.d}
                pathLength={1}
                stroke="currentColor"
                strokeWidth="4.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="1"
                strokeDashoffset={1 - letterProgress}
                style={{
                  opacity: letterProgress > 0 ? 1 : 0,
                }}
              />
            );
          })}
        </svg>

        <div
          className="w-full max-w-[300px] h-[2px] mt-4 overflow-hidden"
          style={{
            backgroundColor: isDark
              ? 'rgba(244, 246, 255, 0.16)'
              : 'rgba(13, 17, 23, 0.14)',
          }}
        >
          <div
            className="h-full"
            style={{
              width: `${progress}%`,
              backgroundColor: 'var(--text-color)',
            }}
          />
        </div>

        <div className="w-full max-w-[300px] mt-2.5 flex items-center justify-between font-pixel text-[10px] sm:text-xs uppercase tracking-wider">
          <span className="opacity-75">LOADING</span>
          <span className="tabular-nums font-semibold">
            {String(progress).padStart(2, '0')}%
          </span>
        </div>
      </div>
    </div>
  );
}
