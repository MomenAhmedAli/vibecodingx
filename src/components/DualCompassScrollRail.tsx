import { useEffect, useRef, useState } from 'react';
import { addFrameEffect } from '../lib/lenisScrollBus';
import {
  computeVoyageSectionProgress,
  isCompassActiveInSection,
} from '../lib/voyageChoreography';

interface DualCompassScrollRailProps {
  onScrollToProgress: (progress: number, immediate?: boolean) => void;
  theme?: 'light' | 'dark';
}

interface BearingStop {
  deg: number; // Continuous range: -80 (80° N) -> 0 (00°) -> +190 (190° S)
  label?: string;
  major: boolean;
}

const MIN_DEG = 0;
const MAX_DEG = 360;
const TOTAL_SPAN = MAX_DEG - MIN_DEG;

const BEARING_STOPS: BearingStop[] = (() => {
  const stops: BearingStop[] = [];
  for (let d = MIN_DEG; d <= MAX_DEG; d += 10) {
    const isCardinal = d === 0 || d === 90 || d === 180 || d === 270 || d === 360;
    const isMajor = d % 30 === 0 || isCardinal;
    let label: string | undefined;
    if (d % 90 === 0) {
      label = `${String(d).padStart(3, '0')}°`;
    }
    stops.push({ deg: d, label, major: isMajor });
  }
  return stops;
})();

function formatBearing(deg: number): string {
  const rounded = Math.max(0, Math.min(360, Math.round(deg)));
  return `${String(rounded).padStart(3, '0')}°`;
}

export function DualCompassScrollRail({
  onScrollToProgress,
  theme = 'dark',
}: DualCompassScrollRailProps) {
  const leftCanvasRef = useRef<HTMLCanvasElement>(null);
  const rightCanvasRef = useRef<HTMLCanvasElement>(null);
  const leftTrackRef = useRef<HTMLDivElement>(null);
  const rightTrackRef = useRef<HTMLDivElement>(null);

  const [trackHeight, setTrackHeight] = useState(340);
  const activeSideRef = useRef<'left' | 'right' | null>(null);
  const isPressedRef = useRef(false);
  const hoveredSideRef = useRef<'left' | 'right' | null>(null);
  const isInShipSectionRef = useRef(false);
  const themeRef = useRef(theme);
  themeRef.current = theme;

  const onScrollRef = useRef(onScrollToProgress);
  onScrollRef.current = onScrollToProgress;

  useEffect(() => {
    const updateHeight = () => {
      const vh = window.innerHeight || 800;
      setTrackHeight(Math.round(Math.min(Math.max(vh * 0.64, 320), 580)));
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  // Map dragging on either compass rail directly across the Ship Voyage section bounds
  const scrubShipSection = (side: 'left' | 'right', clientY: number, immediate: boolean) => {
    const el = side === 'left' ? leftTrackRef.current : rightTrackRef.current;
    const shipEl = document.getElementById('ship-voyage');
    if (!el || !shipEl) return;

    const rect = el.getBoundingClientRect();
    const rel = Math.min(Math.max((clientY - rect.top) / Math.max(rect.height, 1), 0), 1);

    const shipRect = shipEl.getBoundingClientRect();
    const shipTopDoc = shipRect.top + window.scrollY;
    const shipTravel = Math.max(shipRect.height - window.innerHeight, 1);
    const maxDocScroll = Math.max(
      document.documentElement.scrollHeight - window.innerHeight,
      1
    );
    const targetGlobalProgress = Math.min(
      Math.max((shipTopDoc + rel * shipTravel) / maxDocScroll, 0),
      1
    );
    onScrollRef.current(targetGlobalProgress, immediate);
  };

  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      if (!isPressedRef.current || !activeSideRef.current) return;
      scrubShipSection(activeSideRef.current, e.clientY, true);
    };

    const handleUp = () => {
      isPressedRef.current = false;
      activeSideRef.current = null;
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, []);

  // Only reveal DualCompassScrollRail while scrolling within #ship-voyage; hide completely everywhere else
  useEffect(() => {
    let prevProgress: number | null = null;
    let curlActivity = 0;
    let pressActivity = 0;
    let smoothProgress = 0;
    let visibilityAlpha = 0;
    let shipSectionEl: HTMLElement | null = null;

    const drawCompassSide = (
      canvas: HTMLCanvasElement | null,
      side: 'left' | 'right',
      progress: number,
      curlStrength: number,
      pressBoost: number,
      isHovered: boolean
    ) => {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.clientWidth || 64;
      const h = canvas.clientHeight || 340;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const tw = Math.floor(w * dpr);
      const th = Math.floor(h * dpr);
      if (canvas.width !== tw || canvas.height !== th) {
        canvas.width = tw;
        canvas.height = th;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const isDark = themeRef.current === 'dark';
      const isLeft = side === 'left';
      const currentDeg = MIN_DEG + progress * TOTAL_SPAN;

      const baseSpineX = isLeft ? Math.round(w * 0.34) : Math.round(w * 0.66);
      const rawOffset = 14 + curlStrength * 16 + pressBoost * 7;
      const maxCurveOffset = rawOffset * (isLeft ? -1 : 1);

      const getCurlMetrics = (yPx: number) => {
        const yNorm = (yPx / h) * 2 - 1;
        const clamped = Math.max(-1, Math.min(1, yNorm));
        const profile = 1 - Math.sqrt(Math.max(0, 1 - clamped * clamped));
        const spineX = Math.max(5, Math.min(w - 5, baseSpineX + profile * maxCurveOffset));
        const shadeAlpha = 1 - profile * 0.84;
        return { spineX, profile, shadeAlpha };
      };

      ctx.save();
      const samples = 32;
      ctx.beginPath();
      for (let i = 0; i <= samples; i++) {
        const y = (i / samples) * h;
        const { spineX } = getCurlMetrics(y);
        if (i === 0) ctx.moveTo(spineX, y);
        else ctx.lineTo(spineX, y);
      }
      const lineGrad = ctx.createLinearGradient(0, 0, 0, h);
      const baseRgb = isDark ? '244, 246, 255' : '13, 17, 23';
      const hoverBoost = isHovered ? 0.16 : 0;
      lineGrad.addColorStop(0, `rgba(${baseRgb}, 0.04)`);
      lineGrad.addColorStop(0.5, `rgba(${baseRgb}, ${(0.38 + hoverBoost).toFixed(2)})`);
      lineGrad.addColorStop(1, `rgba(${baseRgb}, 0.04)`);
      ctx.strokeStyle = lineGrad;
      ctx.lineWidth = 1.15;
      ctx.stroke();
      ctx.restore();

      const pxPerDeg = 3.45;
      const centerY = h * 0.5;
      const dir = isLeft ? 1 : -1;

      ctx.font = '600 10.5px "IBM Plex Sans", system-ui, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.textAlign = isLeft ? 'left' : 'right';

      for (let i = 0; i < BEARING_STOPS.length; i++) {
        const stop = BEARING_STOPS[i];
        const deltaDeg = stop.deg - currentDeg;
        const linearY = centerY + deltaDeg * pxPerDeg;

        const yNorm = Math.max(-1.05, Math.min(1.05, (linearY - centerY) / (h * 0.52)));
        if (Math.abs(yNorm) > 0.99) continue;

        const curvedY = centerY + Math.sin((yNorm * Math.PI) / 2) * (h * 0.475);
        const { spineX, shadeAlpha } = getCurlMetrics(curvedY);
        const squash = Math.cos((yNorm * Math.PI) / 2);
        const tickLen = (stop.major ? 16 : 8) * (0.45 + 0.55 * squash);
        const alpha = Math.max(0.05, shadeAlpha * (stop.major ? 0.85 : 0.42));

        ctx.strokeStyle = isDark
          ? `rgba(244, 246, 255, ${alpha.toFixed(3)})`
          : `rgba(13, 17, 23, ${alpha.toFixed(3)})`;
        ctx.lineWidth = stop.major ? 1.4 : 0.9;

        ctx.beginPath();
        ctx.moveTo(spineX, curvedY);
        ctx.lineTo(spineX + dir * tickLen, curvedY);
        ctx.stroke();

        if (stop.label && squash > 0.24) {
          ctx.fillStyle = isDark
            ? `rgba(244, 246, 255, ${(alpha * 0.96).toFixed(3)})`
            : `rgba(13, 17, 23, ${(alpha * 0.96).toFixed(3)})`;
          ctx.fillText(stop.label, spineX + dir * (tickLen + 5), curvedY);
        }
      }

      const { spineX: midSpineX } = getCurlMetrics(centerY);
      const inkColor = isDark ? '#F4F6FF' : '#0D1117';

      ctx.save();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(midSpineX + dir * 2, centerY);
      ctx.lineTo(midSpineX + dir * 13, centerY - 5);
      ctx.lineTo(midSpineX + dir * 13, centerY + 5);
      ctx.closePath();
      ctx.fill();
      if (!isDark) {
        ctx.strokeStyle = 'rgba(13, 17, 23, 0.35)';
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      ctx.font = '700 11px "IBM Plex Sans", system-ui, sans-serif';
      ctx.fillStyle = inkColor;
      ctx.textAlign = isLeft ? 'left' : 'right';
      ctx.fillText(formatBearing(currentDeg), midSpineX + dir * 17, centerY);

      ctx.font = '700 9px "IBM Plex Sans", system-ui, sans-serif';
      ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.78)' : 'rgba(13, 17, 23, 0.75)';
      const topMetrics = getCurlMetrics(12);
      const botMetrics = getCurlMetrics(h - 12);
      ctx.fillText('000°', topMetrics.spineX + dir * 5, 12);
      ctx.fillText('360°', botMetrics.spineX + dir * 5, h - 12);
      ctx.restore();
    };

    const removeEffect = addFrameEffect(20, (_timeMs, delta) => {
      const dt = Math.min(Math.max(delta, 1 / 240), 0.1);
      if (!shipSectionEl || !shipSectionEl.isConnected) {
        shipSectionEl = document.getElementById('ship-voyage');
      }

      const vh = window.innerHeight || 1;
      let activeInShip = false;
      let voyageProg = 0;

      if (shipSectionEl) {
        const rect = shipSectionEl.getBoundingClientRect();
        activeInShip = isCompassActiveInSection(rect.top, rect.bottom, vh);
        voyageProg = computeVoyageSectionProgress(rect.top, rect.height, vh);
      }

      isInShipSectionRef.current = activeInShip;

      const deltaProg = prevProgress == null ? 0 : Math.abs(voyageProg - prevProgress);
      const progVel = (deltaProg / dt) * 1400;
      prevProgress = voyageProg;

      const targetVis = activeInShip ? 1 : 0;
      const visTau = targetVis > visibilityAlpha ? 0.14 : 0.2;
      visibilityAlpha += (targetVis - visibilityAlpha) * (1 - Math.exp(-dt / visTau));

      const interactivePointer = visibilityAlpha > 0.25 ? 'auto' : 'none';
      if (leftTrackRef.current) {
        leftTrackRef.current.style.opacity = visibilityAlpha.toFixed(3);
        leftTrackRef.current.style.pointerEvents = interactivePointer;
      }
      if (rightTrackRef.current) {
        rightTrackRef.current.style.opacity = visibilityAlpha.toFixed(3);
        rightTrackRef.current.style.pointerEvents = interactivePointer;
      }

      const targetCurl = Math.min(Math.max(progVel / 850, 0), 1);
      const curlTau = targetCurl > curlActivity ? 0.14 : 0.4;
      curlActivity += (targetCurl - curlActivity) * (1 - Math.exp(-dt / curlTau));

      const targetPress = isPressedRef.current ? 1 : 0;
      const pressTau = targetPress > pressActivity ? 0.1 : 0.34;
      pressActivity += (targetPress - pressActivity) * (1 - Math.exp(-dt / pressTau));

      smoothProgress += (voyageProg - smoothProgress) * (1 - Math.exp(-dt / 0.12));

      if (visibilityAlpha > 0.005) {
        drawCompassSide(
          leftCanvasRef.current,
          'left',
          smoothProgress,
          curlActivity,
          pressActivity,
          hoveredSideRef.current === 'left'
        );
        drawCompassSide(
          rightCanvasRef.current,
          'right',
          smoothProgress,
          curlActivity,
          pressActivity,
          hoveredSideRef.current === 'right'
        );
      }
    });

    return () => {
      removeEffect();
    };
  }, []);

  const handlePointerDown = (side: 'left' | 'right', clientY: number) => {
    if (!isInShipSectionRef.current) return;
    isPressedRef.current = true;
    activeSideRef.current = side;
    scrubShipSection(side, clientY, false);
  };

  return (
    <>
      <div
        ref={leftTrackRef}
        onMouseEnter={() => {
          hoveredSideRef.current = 'left';
        }}
        onMouseLeave={() => {
          hoveredSideRef.current = null;
        }}
        onPointerDown={(e) => handlePointerDown('left', e.clientY)}
        className="fixed left-0.5 sm:left-2.5 top-1/2 -translate-y-1/2 z-40 w-[72px] sm:w-[96px] cursor-ns-resize select-none"
        style={{ height: `${trackHeight}px`, opacity: 0, pointerEvents: 'none' }}
        title="Radial Cycle Rail (000° — 360°)"
        aria-label="Left Radial Cycle Scroll Indicator"
      >
        <canvas ref={leftCanvasRef} className="w-full h-full block pointer-events-none" />
      </div>

      <div
        ref={rightTrackRef}
        onMouseEnter={() => {
          hoveredSideRef.current = 'right';
        }}
        onMouseLeave={() => {
          hoveredSideRef.current = null;
        }}
        onPointerDown={(e) => handlePointerDown('right', e.clientY)}
        className="fixed right-0.5 sm:right-2.5 top-1/2 -translate-y-1/2 z-40 w-[72px] sm:w-[96px] cursor-ns-resize select-none"
        style={{ height: `${trackHeight}px`, opacity: 0, pointerEvents: 'none' }}
        title="Radial Cycle Rail (000° — 360°)"
        aria-label="Right Radial Cycle Scroll Indicator"
      >
        <canvas ref={rightCanvasRef} className="w-full h-full block pointer-events-none" />
      </div>
    </>
  );
}
