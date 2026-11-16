import { useEffect, useRef, useState } from 'react';
import { HalftoneCircleCanvas } from './HalftoneCircleCanvas';

interface DotMatrixHoverOverlayProps {
  isHovered: boolean;
}

/**
 * Animated 45-degree halftone circle overlay for Selected Work images:
 * Blooms sequentially from center to edges while scaling strictly Zoom In -> Zoom Out.
 */
export function DotMatrixHoverOverlay({ isHovered }: DotMatrixHoverOverlayProps) {
  const [animProgress, setAnimProgress] = useState(0);
  const progressRef = useRef(0);
  const hoveredRef = useRef(isHovered);
  hoveredRef.current = isHovered;

  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();

    const step = (now: number) => {
      const dt = Math.min(Math.max((now - lastTime) / 1000, 1 / 240), 0.05);
      lastTime = now;

      const target = hoveredRef.current ? 1 : 0;
      const diff = target - progressRef.current;

      if (Math.abs(diff) > 0.004) {
        progressRef.current += diff * Math.min(1, dt * 13);
        setAnimProgress(progressRef.current);
        rafId = window.requestAnimationFrame(step);
      } else {
        progressRef.current = target;
        setAnimProgress(target);
        rafId = 0;
      }
    };

    rafId = window.requestAnimationFrame(step);
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [isHovered]);

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{ opacity: Math.min(0.68, animProgress * 0.72) }}
    >
      <HalftoneCircleCanvas
        progress={animProgress}
        zoomDirection="in-to-out"
        spacing={22}
        coverage="cover"
        dotColor="rgba(191, 219, 254, 0.52)"
        className="w-full h-full"
      />
    </div>
  );
}
