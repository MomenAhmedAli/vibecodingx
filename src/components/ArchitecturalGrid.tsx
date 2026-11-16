import { useEffect, useRef, useState } from 'react';
import { addFrameEffect } from '../lib/lenisScrollBus';

interface ArchitecturalGridProps {
  rowHeight?: number;
  theme?: 'light' | 'dark';
}

interface CurtainShaft {
  uPos: number;       // normalized lateral anchor across viewport (-0.1..1.1)
  vPos: number;       // normalized vertical anchor (0.1..0.9)
  halfWidth: number;  // capsule/oval half-width factor relative to viewport width
  halfLength: number; // capsule/oval half-length factor relative to viewport diagonal
  angleDeg: number;   // diagonal sunbeam/curtain slant matching reference video
  swaySpeed: number;
  swayAmp: number;
  mouseWeight: number;
  phase: number;
  alpha: number;
  tone: 0 | 1 | 2;
}

// Soft diagonal curtain-like volumetric light shafts & rounded folds matching the reference video
// that sway gently back and forth with mouse movement without harsh edges or thin lines.
function createCurtainShafts(): CurtainShaft[] {
  return [
    { uPos: 0.14, vPos: 0.36, halfWidth: 0.085, halfLength: 0.56, angleDeg: -38, swaySpeed: 0.24, swayAmp: 26, mouseWeight: 42, phase: 0.2, alpha: 0.62, tone: 0 },
    { uPos: 0.34, vPos: 0.44, halfWidth: 0.11, halfLength: 0.62, angleDeg: -36, swaySpeed: 0.20, swayAmp: 32, mouseWeight: 58, phase: 1.5, alpha: 0.78, tone: 1 },
    { uPos: 0.52, vPos: 0.48, halfWidth: 0.135, halfLength: 0.66, angleDeg: -37, swaySpeed: 0.27, swayAmp: 36, mouseWeight: 70, phase: 2.8, alpha: 0.88, tone: 0 },
    { uPos: 0.70, vPos: 0.52, halfWidth: 0.10, halfLength: 0.60, angleDeg: -35, swaySpeed: 0.22, swayAmp: 30, mouseWeight: 52, phase: 4.1, alpha: 0.74, tone: 2 },
    { uPos: 0.88, vPos: 0.56, halfWidth: 0.095, halfLength: 0.54, angleDeg: -39, swaySpeed: 0.29, swayAmp: 24, mouseWeight: 44, phase: 5.3, alpha: 0.64, tone: 1 },
  ];
}

export function ArchitecturalGrid({ rowHeight = 320, theme = 'light' }: ArchitecturalGridProps) {
  const [gridPoints, setGridPoints] = useState<{ x: number; y: number }[]>([]);
  const [docHeight, setDocHeight] = useState(4500);
  const [cellRowHeight, setCellRowHeight] = useState(rowHeight);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const themeRef = useRef(theme);
  themeRef.current = theme;

  const topOffset = 66;
  const colPcts = [2.5, 34.167, 65.833, 97.5];

  useEffect(() => {
    const updateGrid = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight || 900;
      const heroHeight = vw >= 768 ? Math.min(896, Math.max(656, vh - topOffset - 24)) : rowHeight * 2;
      const effectiveRowHeight = vw >= 768 ? Math.round(heroHeight / 2) : rowHeight;
      setCellRowHeight(effectiveRowHeight);

      const height = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight,
        4500
      );
      setDocHeight(height);

      const rowsCount = Math.ceil(height / effectiveRowHeight);
      const points: { x: number; y: number }[] = [];

      // Single clean row of '+' stars at navbar bottom (r = 0) and uniformly every effectiveRowHeight down
      for (let r = 0; r <= rowsCount; r++) {
        const y = r * effectiveRowHeight + topOffset;
        colPcts.forEach((pct) => {
          points.push({ x: pct, y });
        });
      }
      setGridPoints(points);
    };

    updateGrid();
    window.addEventListener('resize', updateGrid);
    const observer = new ResizeObserver(updateGrid);
    observer.observe(document.body);

    return () => {
      window.removeEventListener('resize', updateGrid);
      observer.disconnect();
    };
  }, [rowHeight]);

  // Ambient autonomous diagonal light shafts over architectural grid (zero mouse effect)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const shafts = createCurtainShafts();
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let vw = window.innerWidth;
    let vh = window.innerHeight;

    const resizeCanvas = () => {
      vw = window.innerWidth;
      vh = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(vw * dpr);
      canvas.height = Math.floor(vh * dpr);
      canvas.style.width = `${vw}px`;
      canvas.style.height = `${vh}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const render = (now: number) => {
      const t = now * 0.001;
      const isDark = themeRef.current === 'dark';

      ctx.clearRect(0, 0, vw, vh);

      ctx.save();
      const diag = Math.hypot(vw, vh);
      for (let i = 0; i < shafts.length; i++) {
        const s = shafts[i];
        const swayX = reducedMotion
          ? 0
          : Math.sin(t * s.swaySpeed + s.phase) * s.swayAmp;
        const swayY = reducedMotion
          ? 0
          : Math.cos(t * s.swaySpeed * 0.78 + s.phase) * (s.swayAmp * 0.55);

        const cx = s.uPos * vw + swayX;
        const cy = s.vPos * vh + swayY;
        const rw = Math.max(58, s.halfWidth * vw);
        const rh = Math.max(240, s.halfLength * diag);
        const tiltRad =
          ((s.angleDeg + (reducedMotion ? 0 : Math.sin(t * 0.18 + s.phase) * 1.8)) *
            Math.PI) /
          180;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(tiltRad);
        ctx.scale(1, rh / rw);

        const breath = reducedMotion ? 1 : 0.9 + 0.1 * Math.sin(t * 0.45 + s.phase);
        const peak = s.alpha * breath * (isDark ? 0.13 : 0.34);
        const mid = peak * 0.46;

        let rgb = '255, 255, 255';
        if (isDark) {
          rgb =
            s.tone === 0
              ? '96, 165, 250'
              : s.tone === 1
              ? '125, 211, 252'
              : '129, 140, 248';
        } else {
          rgb =
            s.tone === 0
              ? '255, 255, 255'
              : s.tone === 1
              ? '242, 250, 255'
              : '224, 242, 254';
        }

        const shaftGrad = ctx.createRadialGradient(0, 0, rw * 0.05, 0, 0, rw);
        shaftGrad.addColorStop(0, `rgba(${rgb}, ${peak.toFixed(3)})`);
        shaftGrad.addColorStop(0.48, `rgba(${rgb}, ${mid.toFixed(3)})`);
        shaftGrad.addColorStop(0.82, `rgba(${rgb}, ${(mid * 0.25).toFixed(3)})`);
        shaftGrad.addColorStop(1, `rgba(${rgb}, 0)`);

        ctx.fillStyle = shaftGrad;
        ctx.beginPath();
        ctx.arc(0, 0, rw, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    };

    const removeEffect = addFrameEffect(15, render);

    return () => {
      removeEffect();
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  const rowSegments = [
    { left: '0px', right: 'calc(97.5% + 10px)' },
    { left: 'calc(2.5% + 10px)', right: 'calc(65.833% + 10px)' },
    { left: 'calc(34.167% + 10px)', right: 'calc(34.167% + 10px)' },
    { left: 'calc(65.833% + 10px)', right: 'calc(2.5% + 10px)' },
    { left: 'calc(97.5% + 10px)', right: '0px' },
  ];

  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      {/* Base Background Surface strictly in site palette tones */}
      <div
        className="fixed inset-0 transition-colors duration-300"
        style={{
          background:
            theme === 'dark'
              ? 'linear-gradient(155deg, #091559 0%, #060D3D 52%, #071048 100%)'
              : 'linear-gradient(155deg, #BEE0FA 0%, #CEE8FC 50%, #C2E2FA 100%)',
        }}
      />

      {/* Ambient Diagonal Curtain Shafts */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      </div>

      {/* Clean Static Architectural Vertical Hairline Lines (Continuous Through Navbar + Uniform Body Columns) */}
      {colPcts.map((pct, colIdx) => (
        <div key={`col-wrap-${colIdx}`}>
          {/* Continuous vertical pillar through navbar from y=0 down to navbar bottom '+' gap */}
          <div
            className="absolute w-px"
            style={{
              left: `${pct}%`,
              top: '0px',
              height: `${topOffset - 10}px`,
              backgroundColor: 'var(--border-color)',
            }}
          />
          {/* Body repeating vertical column line matching cellRowHeight */}
          <div
            className="absolute bottom-0 w-px"
            style={{
              left: `${pct}%`,
              top: `${topOffset + 10}px`,
              background: `repeating-linear-gradient(to bottom, var(--border-color) 0px, var(--border-color) calc(${cellRowHeight}px - 20px), transparent calc(${cellRowHeight}px - 20px), transparent ${cellRowHeight}px)`,
            }}
          />
        </div>
      ))}

      {/* Clean Uniform Horizontal Hairline Rows Across Full Page (Including Below Begin a Project & Moamen) */}
      {Array.from({ length: Math.ceil(docHeight / cellRowHeight) + 1 }).map((_, rowIdx) => {
        const y = rowIdx * cellRowHeight + topOffset;
        return (
          <div
            key={`row-${rowIdx}`}
            className="absolute left-0 right-0 h-px"
            style={{ top: `${y}px` }}
          >
            {rowSegments.map((seg, segIdx) => (
              <div
                key={segIdx}
                className="absolute top-0 bottom-0"
                style={{
                  left: seg.left,
                  right: seg.right,
                  backgroundColor: 'var(--border-color)',
                }}
              />
            ))}
          </div>
        );
      })}

      {/* Clean Static 4-Point '+'-Shaped Grid Intersections */}
      {gridPoints.map((pt, idx) => (
        <div
          key={idx}
          className="absolute transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center select-none"
          style={{
            left: `${pt.x}%`,
            top: `${pt.y}px`,
          }}
        >
          <div className="w-5 h-5 flex items-center justify-center">
            <svg
              width="11"
              height="11"
              viewBox="0 0 16 16"
              fill="currentColor"
              style={{ color: 'var(--crosshair-color)' }}
              aria-hidden="true"
            >
              <path d="M8 0.5 L9.4 6.6 L15.5 8 L9.4 9.4 L8 15.5 L6.6 9.4 L0.5 8 L6.6 6.6 Z" />
            </svg>
          </div>
        </div>
      ))}
    </div>
  );
}
