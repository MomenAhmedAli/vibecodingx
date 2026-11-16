import { useState, useEffect, useRef, useCallback } from 'react';
import type Lenis from 'lenis';
import { useLenis } from 'lenis/react';

interface LiveStatusBarProps {
  onScrollToTop: () => void;
}

function clamp01(v: number) {
  return Math.min(Math.max(v, 0), 1);
}

function rangeProgress(p: number, start: number, end: number) {
  return clamp01((p - start) / Math.max(end - start, 1e-4));
}

export function LiveStatusBar({ onScrollToTop }: LiveStatusBarProps) {
  const [timeStr, setTimeStr] = useState('00:00');
  const [coords, setCoords] = useState({ x: '0309', y: '0244' });

  const dotRef = useRef<SVGCircleElement>(null);
  const outlineRef = useRef<SVGEllipseElement>(null);
  const clipEllipseRef = useRef<SVGEllipseElement>(null);
  const latCenterRef = useRef<SVGLineElement>(null);
  const latTopMidRef = useRef<SVGLineElement>(null);
  const latBotMidRef = useRef<SVGLineElement>(null);
  const latTopOuterRef = useRef<SVGLineElement>(null);
  const latBotOuterRef = useRef<SVGLineElement>(null);
  const meridianInnerRef = useRef<SVGEllipseElement>(null);
  const meridianOuterRef = useRef<SVGEllipseElement>(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setTimeStr(`${hours}:${minutes}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      const x = String(Math.round(e.clientX)).padStart(4, '0');
      const y = String(Math.round(e.clientY)).padStart(4, '0');
      setCoords({ x, y });
    };
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, []);

  // Morph bottom-right point -> empty oval planet -> multi-line horizontal wireframe planet on scroll
  const applyPlanetMorph = useCallback((rawProgress: number) => {
    const p = clamp01(rawProgress);
    const cx = 14;
    const cy = 9;

    // Stage 0 -> 1 (0% to 16%): Point expands into empty oval planet silhouette
    const morphShape = rangeProgress(p, 0.0, 0.16);
    const easedShape = 1 - Math.pow(1 - morphShape, 3);
    const rx = 2.0 + easedShape * 9.5; // 2.0 -> 11.5
    const ry = 2.0 + easedShape * 5.2; // 2.0 -> 7.2

    // Solid center point fades out as the oval opens
    const dotOpacity = 1 - rangeProgress(p, 0.02, 0.12);
    if (dotRef.current) {
      dotRef.current.setAttribute('r', (2.0 + easedShape * 0.4).toFixed(2));
      dotRef.current.setAttribute('opacity', dotOpacity.toFixed(3));
    }

    if (outlineRef.current && clipEllipseRef.current) {
      outlineRef.current.setAttribute('rx', rx.toFixed(2));
      outlineRef.current.setAttribute('ry', ry.toFixed(2));
      clipEllipseRef.current.setAttribute('rx', rx.toFixed(2));
      clipEllipseRef.current.setAttribute('ry', ry.toFixed(2));
    }

    // Helper to grow a horizontal latitude line symmetrically from center inside the oval
    const setLatLine = (el: SVGLineElement | null, t: number, maxHalfW: number) => {
      if (!el) return;
      const eased = 1 - Math.pow(1 - t, 2);
      const hw = eased * maxHalfW;
      el.setAttribute('x1', (cx - hw).toFixed(2));
      el.setAttribute('x2', (cx + hw).toFixed(2));
      el.setAttribute('opacity', t > 0.01 ? Math.min(1, t * 1.4).toFixed(3) : '0');
    };

    // Stage 2 (18% -> 36%): Equator line (y=9)
    setLatLine(latCenterRef.current, rangeProgress(p, 0.18, 0.36), 11.5);

    // Stage 3 (36% -> 58%): Mid horizontal lines (y=6.2 & y=11.8)
    const midT = rangeProgress(p, 0.36, 0.58);
    setLatLine(latTopMidRef.current, midT, 11.5);
    setLatLine(latBotMidRef.current, midT, 11.5);

    // Stage 4 (58% -> 78%): Outer polar horizontal lines (y=3.8 & y=14.2)
    const outerT = rangeProgress(p, 0.58, 0.78);
    setLatLine(latTopOuterRef.current, outerT, 11.5);
    setLatLine(latBotOuterRef.current, outerT, 11.5);

    // Stage 5 (74% -> 100%): Oval vertical meridians complete detailed planet wireframe
    const m1 = rangeProgress(p, 0.72, 0.90);
    if (meridianInnerRef.current) {
      meridianInnerRef.current.setAttribute('rx', (m1 * 4.4).toFixed(2));
      meridianInnerRef.current.setAttribute('ry', ry.toFixed(2));
      meridianInnerRef.current.setAttribute('opacity', (m1 * 0.85).toFixed(3));
    }

    const m2 = rangeProgress(p, 0.82, 1.0);
    if (meridianOuterRef.current) {
      meridianOuterRef.current.setAttribute('rx', (m2 * 8.4).toFixed(2));
      meridianOuterRef.current.setAttribute('ry', ry.toFixed(2));
      meridianOuterRef.current.setAttribute('opacity', (m2 * 0.65).toFixed(3));
    }
  }, []);

  const handleLenisScroll = useCallback(
    (lenis: Lenis) => {
      applyPlanetMorph(Number.isFinite(lenis.progress) ? lenis.progress : 0);
    },
    [applyPlanetMorph]
  );

  useLenis(handleLenisScroll);

  useEffect(() => {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const initial = maxScroll > 0 ? window.scrollY / maxScroll : 0;
    applyPlanetMorph(initial);
  }, [applyPlanetMorph]);

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 h-11 flex items-center pointer-events-none bg-transparent"
    >
      <div className="w-full px-[2.5%] grid grid-cols-12 items-center font-pixel text-[10px] sm:text-[11px] uppercase tabular-nums">
        {/* Left Zone: GMT+2 EG HH:MM */}
        <div className="col-span-4 px-2 sm:px-3 flex items-center justify-start opacity-85">
          <span className="truncate">GMT+2 EG {timeStr}</span>
        </div>

        {/* Center Zone: Live Cursor Coordinates centered */}
        <div className="col-span-4 px-2 sm:px-3 flex items-center justify-center opacity-85">
          <span className="truncate">
            {coords.x} X {coords.y} Y
          </span>
        </div>

        {/* Right Zone: Scroll-Morphing Point -> Oval Planet Wireframe */}
        <div className="col-span-4 px-2 sm:px-3 flex items-center justify-end pointer-events-auto">
          <button
            onClick={onScrollToTop}
            className="opacity-85 hover:opacity-100 transition-opacity cursor-pointer p-1 shrink-0"
            title="Scroll Progress Planet — Click to return to top"
            aria-label="Scroll Progress Planet Back to Top"
          >
            <svg
              width="28"
              height="18"
              viewBox="0 0 28 18"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
            >
              <defs>
                <clipPath id="planet-oval-clip">
                  <ellipse ref={clipEllipseRef} cx="14" cy="9" rx="2" ry="2" />
                </clipPath>
              </defs>

              {/* Initial Solid Point at top of page (fades as oval opens) */}
              <circle
                ref={dotRef}
                cx="14"
                cy="9"
                r="2"
                fill="currentColor"
                stroke="none"
                opacity="1"
              />

              {/* Outer Oval Planet Silhouette (empty first, then fills with detail on scroll) */}
              <ellipse ref={outlineRef} cx="14" cy="9" rx="2" ry="2" />

              {/* Progressive Horizontal Lines & Meridians clipped inside the oval */}
              <g clipPath="url(#planet-oval-clip)">
                <line ref={latTopOuterRef} x1="14" y1="3.8" x2="14" y2="3.8" opacity="0" />
                <line ref={latTopMidRef} x1="14" y1="6.2" x2="14" y2="6.2" opacity="0" />
                <line ref={latCenterRef} x1="14" y1="9" x2="14" y2="9" opacity="0" />
                <line ref={latBotMidRef} x1="14" y1="11.8" x2="14" y2="11.8" opacity="0" />
                <line ref={latBotOuterRef} x1="14" y1="14.2" x2="14" y2="14.2" opacity="0" />
                <ellipse ref={meridianInnerRef} cx="14" cy="9" rx="0" ry="2" opacity="0" />
                <ellipse ref={meridianOuterRef} cx="14" cy="9" rx="0" ry="2" opacity="0" />
              </g>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
