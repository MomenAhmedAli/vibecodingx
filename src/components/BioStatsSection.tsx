import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrambleLines } from './ScrambleLines';
import { RollingNumber, TypewriterText } from './TypewriterEffects';

gsap.registerPlugin(ScrollTrigger);

export function BioStatsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);
  const [hoverTick, setHoverTick] = useState(0);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      const revealTween = gsap.fromTo(
        '[data-bio-reveal]',
        { yPercent: 115, opacity: 0 },
        {
          yPercent: 0,
          opacity: 1,
          duration: 0.62,
          stagger: 0.04,
          ease: 'power2.out',
          paused: true,
        }
      );

      ScrollTrigger.create({
        trigger: section,
        start: 'top 90%',
        end: 'bottom 8%',
        onEnter: () => revealTween.restart(),
        onLeave: () => revealTween.reverse(),
        onEnterBack: () => revealTween.restart(),
        onLeaveBack: () => revealTween.reverse(),
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="stats"
      ref={sectionRef}
      className="w-full py-10 sm:py-14 px-[2.5%] relative z-10"
    >
      <div data-scroll-shift className="w-full px-2 sm:px-3 will-change-transform">
        {/* Tier 1 Marker (//01) */}
        <div data-scroll-shade className="flex items-center justify-end mb-4 will-change-transform">
          <span className="font-pixel text-xs sm:text-sm font-semibold opacity-75 tracking-tight shrink-0 inline-flex items-baseline">
            <span>//</span>
            <RollingNumber value="01" />
          </span>
        </div>

        {/* Masked Bottom-to-Top Horizontal Line Reveal on Scroll + Hover */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-6 items-start">
          {/* Column 1: Graduate / Software Engineer */}
          <div
            data-scroll-shade
            onMouseEnter={() => setHoveredCol(0)}
            onMouseLeave={() => setHoveredCol(null)}
            className="md:col-span-4 group cursor-default will-change-transform"
          >
            <div className="relative py-2 transition-transform duration-300 ease-out group-hover:translate-x-1.5 group-hover:-translate-y-0.5">
              <div className="overflow-hidden">
                <h2
                  data-bio-reveal
                  className="text-xl sm:text-2xl font-bold tracking-tight font-sans"
                >
                  Graduate
                </h2>
              </div>

              <div className="overflow-hidden mt-1">
                <p
                  data-bio-reveal
                  className="text-sm sm:text-base font-light opacity-85 min-h-[1.4em]"
                >
                  <TypewriterText
                    text="Software Engineer"
                    speedMs={30}
                    delayMs={0}
                    showCursor={hoveredCol === 0}
                  />
                </p>
              </div>

              <span
                className="block h-[1.5px] mt-3 w-0 group-hover:w-28 transition-all duration-300 ease-out"
                style={{ backgroundColor: 'var(--text-color)' }}
                aria-hidden="true"
              />
            </div>
          </div>

          {/* Column 2: +3 YEAR (Rolling Scroll Odometer + Bottom-to-Top Masked Reveal) */}
          <div
            data-scroll-shade
            onMouseEnter={() => {
              setHoveredCol(1);
              setHoverTick((t) => t + 1);
            }}
            onMouseLeave={() => setHoveredCol(null)}
            className="md:col-span-4 group cursor-default will-change-transform"
          >
            <div className="relative py-2 transition-transform duration-300 ease-out group-hover:translate-x-1.5 group-hover:-translate-y-0.5">
              <div className="overflow-hidden">
                <h3
                  data-bio-reveal
                  className="text-2xl sm:text-3xl font-extrabold tracking-tight font-sans leading-none flex items-baseline gap-1.5"
                >
                  <span>+</span>
                  <RollingNumber value="3" triggerKey={hoverTick} />
                  <span>YEAR</span>
                </h3>
              </div>

              <div className="overflow-hidden mt-2">
                <p
                  data-bio-reveal
                  className="text-[11px] sm:text-xs font-semibold tracking-wider uppercase font-pixel opacity-80"
                >
                  <ScrambleLines
                    text="LEARN TO MAKE DESIGN"
                    delayMs={0}
                    triggerKey={hoveredCol === 1 ? 1 : 0}
                  />
                </p>
              </div>

              <span
                className="block h-[1.5px] mt-3 w-0 group-hover:w-28 transition-all duration-300 ease-out"
                style={{ backgroundColor: 'var(--text-color)' }}
                aria-hidden="true"
              />
            </div>
          </div>

          {/* Column 3: Passionate at / Product Design */}
          <div
            data-scroll-shade
            onMouseEnter={() => setHoveredCol(2)}
            onMouseLeave={() => setHoveredCol(null)}
            className="md:col-span-4 group cursor-default will-change-transform"
          >
            <div className="relative py-2 transition-transform duration-300 ease-out group-hover:translate-x-1.5 group-hover:-translate-y-0.5">
              <div className="overflow-hidden">
                <h2
                  data-bio-reveal
                  className="text-xl sm:text-2xl font-bold tracking-tight font-sans"
                >
                  Passionate at
                </h2>
              </div>

              <div className="overflow-hidden mt-1">
                <p
                  data-bio-reveal
                  className="text-sm sm:text-base font-light opacity-85 min-h-[1.4em]"
                >
                  <TypewriterText
                    text="Product Design"
                    speedMs={30}
                    delayMs={0}
                    showCursor={hoveredCol === 2}
                  />
                </p>
              </div>

              <span
                className="block h-[1.5px] mt-3 w-0 group-hover:w-28 transition-all duration-300 ease-out"
                style={{ backgroundColor: 'var(--text-color)' }}
                aria-hidden="true"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
