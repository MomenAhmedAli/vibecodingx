import { useEffect, useRef } from 'react';

interface HalftoneCircleCanvasProps {
  /** Normalized progress [0..1] animating circles radially from center to edges */
  progress: number;
  /** Zoom mode: 'out-to-in' for Loading Screen, 'in-to-out' for Selected Work images */
  zoomDirection: 'out-to-in' | 'in-to-out';
  /** Dot fill color (CSS rgba / hex) */
  dotColor?: string;
  /** Overall lattice rotation in radians (default PI / 4 matching reference pattern) */
  angleRad?: number;
  /** Base grid cell spacing at scale 1 */
  spacing?: number;
  /** Maximum radius factor relative to min/max dimension */
  coverage?: 'contain' | 'cover';
  className?: string;
}

/**
 * Procedural 45-degree diagonal halftone circle renderer matching
 * black-white-circle-halftone-pattern-texture-background.png:
 * circles bloom sequentially from exact center outward to edges,
 * with largest circles at the center tapering smoothly to tiny points at edges.
 */
export function HalftoneCircleCanvas({
  progress,
  zoomDirection,
  dotColor = 'rgba(255, 255, 255, 0.34)',
  angleRad = Math.PI / 4,
  spacing = 26,
  coverage = 'cover',
  className = '',
}: HalftoneCircleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const propsRef = useRef({ progress, zoomDirection, dotColor, angleRad, spacing, coverage });
  propsRef.current = { progress, zoomDirection, dotColor, angleRad, spacing, coverage };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const {
        progress: p,
        zoomDirection: dir,
        dotColor: color,
        angleRad: angle,
        spacing: baseSpacing,
        coverage: cov,
      } = propsRef.current;

      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w <= 0 || h <= 0) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const tw = Math.floor(w * dpr);
      const th = Math.floor(h * dpr);
      if (canvas.width !== tw || canvas.height !== th) {
        canvas.width = tw;
        canvas.height = th;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const clampedP = Math.max(0, Math.min(1, p));
      if (clampedP <= 0.002) return;

      const cx = w * 0.5;
      const cy = h * 0.5;
      const maxRadius =
        cov === 'contain' ? Math.min(w, h) * 0.48 : Math.hypot(cx, cy) * 1.02;

      // Loading screen zooms Out -> In (0.62 -> 1.48); Images zoom In -> Out (1.45 -> 0.88)
      const zoomScale =
        dir === 'out-to-in'
          ? 0.62 + clampedP * 0.86
          : 1.45 - clampedP * 0.57;

      const step = baseSpacing * zoomScale;
      const maxDotRadius = step * 0.36;

      // Determine grid bounds in rotated coordinates
      const extent = Math.ceil((maxRadius * 1.15) / Math.max(step, 8));
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      ctx.fillStyle = color;
      ctx.beginPath();

      for (let gy = -extent; gy <= extent; gy++) {
        const ly = gy * step;
        for (let gx = -extent; gx <= extent; gx++) {
          const lx = gx * step;
          const dist = Math.hypot(lx, ly);
          const distNorm = dist / Math.max(maxRadius, 1);
          if (distNorm >= 1) continue;

          // Center-to-edges sequential bloom: center dots emerge first, outer edges last
          const delay = distNorm * 0.56;
          const localT = Math.max(0, Math.min(1, (clampedP * 1.56 - delay) / 0.44));
          if (localT <= 0.01) continue;

          // Smooth ease for dot growth + reference halftone radial taper (largest center -> smallest edge)
          const radialTaper = Math.pow(1 - distNorm, 1.18);
          const r = maxDotRadius * radialTaper * localT;
          if (r <= 0.35) continue;

          const px = cx + lx * cosA - ly * sinA;
          const py = cy + lx * sinA + ly * cosA;
          if (px + r < 0 || px - r > w || py + r < 0 || py - r > h) continue;

          ctx.moveTo(px + r, py);
          ctx.arc(px, py, r, 0, Math.PI * 2);
        }
      }

      ctx.fill();
    };

    draw();
  }, [progress, zoomDirection, dotColor, angleRad, spacing, coverage]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none ${className}`}
    />
  );
}
