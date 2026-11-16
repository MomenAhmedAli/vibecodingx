import { useEffect, useRef, useState } from 'react';
import { addFrameEffect, getLenisScrollSnapshot } from '../lib/lenisScrollBus';

interface CenterCylinderScrollProps {
  onScrollToProgress: (progress: number, immediate?: boolean) => void;
  theme?: 'light' | 'dark';
}

const TRACK_HEIGHT_DESKTOP = 152;
const THUMB_HEIGHT = 36;

/**
 * Simple, clean vertical scrollbar positioned at the center-right of the viewport.
 * Occupies only a compact centered band rather than the full page height.
 */
export function CenterCylinderScroll({
  onScrollToProgress,
  theme = 'dark',
}: CenterCylinderScrollProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const [ariaPct, setAriaPct] = useState(0);
  const lastAriaPctRef = useRef(-1);

  const onScrollRef = useRef(onScrollToProgress);
  onScrollRef.current = onScrollToProgress;

  const scrubToClientY = (clientY: number, immediate: boolean) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const usableSpan = Math.max(rect.height - THUMB_HEIGHT, 1);
    const localY = clientY - rect.top - THUMB_HEIGHT * 0.5;
    const rel = Math.min(Math.max(localY / usableSpan, 0), 1);
    onScrollRef.current(rel, immediate);
  };

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      scrubToClientY(e.clientY, true);
    };

    const handlePointerUp = () => {
      isDraggingRef.current = false;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, []);

  useEffect(() => {
    let smoothProgress = 0;

    const removeEffect = addFrameEffect(25, (_timeMs, delta) => {
      const dt = Math.min(Math.max(delta, 1 / 240), 0.1);
      const maxScroll = Math.max(
        document.documentElement.scrollHeight - window.innerHeight,
        1
      );
      const currScroll = getLenisScrollSnapshot().scrollTop;
      const rawProgress = Math.min(Math.max(currScroll / maxScroll, 0), 1);

      smoothProgress += (rawProgress - smoothProgress) * (1 - Math.exp(-dt * 18));

      const track = trackRef.current;
      const thumb = thumbRef.current;
      if (track && thumb) {
        const trackH = track.clientHeight || TRACK_HEIGHT_DESKTOP;
        const maxTravel = Math.max(trackH - THUMB_HEIGHT, 0);
        const y = smoothProgress * maxTravel;
        thumb.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0)`;
      }

      const rounded = Math.round(smoothProgress * 100);
      if (rounded !== lastAriaPctRef.current) {
        lastAriaPctRef.current = rounded;
        setAriaPct(rounded);
      }
    });

    return () => {
      removeEffect();
    };
  }, []);

  const isDark = theme === 'dark';

  return (
    <div className="fixed right-2 sm:right-3 top-1/2 -translate-y-1/2 z-40 select-none pointer-events-auto">
      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-orientation="vertical"
        aria-label="Vertical page scrollbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={ariaPct}
        onPointerDown={(e) => {
          isDraggingRef.current = true;
          scrubToClientY(e.clientY, false);
        }}
        onKeyDown={(e) => {
          const curr = ariaPct / 100;
          if (e.key === 'ArrowDown' || e.key === 'PageDown') {
            e.preventDefault();
            onScrollRef.current(Math.min(1, curr + 0.1), false);
          } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
            e.preventDefault();
            onScrollRef.current(Math.max(0, curr - 0.1), false);
          }
        }}
        className="group relative w-4 h-[136px] sm:h-[152px] flex justify-center cursor-pointer"
      >
        {/* Simple centered rail */}
        <div
          className="w-[4px] h-full rounded-full transition-colors duration-200"
          style={{
            backgroundColor: isDark
              ? 'rgba(255, 255, 255, 0.22)'
              : 'rgba(255, 255, 255, 0.45)',
            boxShadow: isDark ? undefined : '0 0 0 1px rgba(13, 17, 23, 0.08)',
          }}
        />

        {/* Clean sliding white scrollbar thumb */}
        <div
          ref={thumbRef}
          className="absolute top-0 w-[6px] group-hover:w-[7px] rounded-full transition-[width,background-color] duration-150 will-change-transform"
          style={{
            height: `${THUMB_HEIGHT}px`,
            backgroundColor: '#FFFFFF',
            boxShadow: isDark
              ? '0 1px 4px rgba(0, 0, 0, 0.28)'
              : '0 1px 6px rgba(13, 17, 23, 0.26)',
          }}
        />
      </div>
    </div>
  );
}
