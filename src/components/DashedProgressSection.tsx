import { useCallback, useEffect, useRef, useState } from 'react';
import { useLenis } from 'lenis/react';

const TOTAL_DASHES = 36;

export function DashedProgressSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(1);

  const updateProgress = useCallback(() => {
    const el = sectionRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight || 800;

    // Progress goes from 1 when approaching section down to 100 as Selected Work takes focus
    const startY = vh * 0.95;
    const endY = vh * 0.22;
    const raw = (startY - rect.top) / Math.max(startY - endY, 1);
    const clamped = Math.min(Math.max(raw, 0), 1);
    const nextCount = Math.max(1, Math.min(100, Math.round(1 + clamped * 99)));
    setCount(nextCount);
  }, []);

  useLenis(updateProgress);

  useEffect(() => {
    updateProgress();
    window.addEventListener('resize', updateProgress);
    return () => window.removeEventListener('resize', updateProgress);
  }, [updateProgress]);

  const activeDashes = Math.round((count / 100) * TOTAL_DASHES);

  return (
    <section
      ref={sectionRef}
      aria-label="Scroll progress to Selected Work"
      className="w-full py-6 sm:py-10 px-[2.5%] relative z-10 select-none"
    >
      <div className="w-full px-2 sm:px-3 flex items-center justify-between gap-4 font-pixel text-[10px] sm:text-xs uppercase">
        {/* Start Marker: 001 */}
        <span className="shrink-0 opacity-65 tabular-nums">001</span>

        {/* Architectural Dashes Strip */}
        <div
          className="flex-1 flex items-center justify-between gap-1.5 sm:gap-2 overflow-hidden"
          aria-hidden="true"
        >
          {Array.from({ length: TOTAL_DASHES }).map((_, idx) => {
            const isActive = idx < activeDashes;
            return (
              <span
                key={idx}
                className="h-[1.5px] flex-1 transition-colors duration-150"
                style={{
                  backgroundColor: isActive ? 'var(--text-color)' : 'var(--border-color)',
                  opacity: isActive ? 0.85 : 0.7,
                }}
              />
            );
          })}
        </div>

        {/* Live Counter 001 -> 100 leading into Selected Work */}
        <span className="shrink-0 font-bold tabular-nums tracking-wider">
          {String(count).padStart(3, '0')} / 100
        </span>
      </div>
    </section>
  );
}
