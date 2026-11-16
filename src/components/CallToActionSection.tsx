import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowUpRight } from 'lucide-react';
import { RollingNumber } from './TypewriterEffects';

gsap.registerPlugin(ScrollTrigger);

export function CallToActionSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [hoveredWord, setHoveredWord] = useState<string | null>(null);

  const lines = ['GET READY', 'FOR BEYOND.'];

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      const ctaTl = gsap.timeline({ paused: true });

      ctaTl
        .fromTo(
          '[data-cta-line]',
          { yPercent: 100, opacity: 0 },
          {
            yPercent: 0,
            opacity: 1,
            duration: 0.52,
            stagger: 0.05,
            ease: 'power2.out',
          },
          0
        )
        .fromTo(
          '[data-cta-footer]',
          { y: 14, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.52,
            ease: 'power2.out',
          },
          0.08
        );

      ScrollTrigger.create({
        trigger: section,
        start: 'top 96%',
        end: 'bottom top',
        onEnter: () => ctaTl.restart(),
        onEnterBack: () => ctaTl.play(),
        onLeaveBack: () => ctaTl.reverse(),
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section id="contact" ref={sectionRef} className="w-full pt-24 pb-24 px-[2.5%] relative overflow-hidden">
      <div data-scroll-shift className="w-full px-2 sm:px-3 flex flex-col justify-between space-y-14 sm:space-y-20 will-change-transform">
        {/* Massive Final Frame Phrase: Get ready for beyond. + //03 side marker */}
        <div data-scroll-shade className="flex items-start justify-between gap-4 select-none will-change-transform">
          <div className="space-y-1 sm:space-y-2">
            {lines.map((line, idx) => (
              <div
                key={idx}
                onMouseEnter={() => setHoveredWord(line)}
                onMouseLeave={() => setHoveredWord(null)}
                className="overflow-hidden"
              >
                <h2
                  data-cta-line
                  className={`text-[9vw] sm:text-[8.4vw] font-bold tracking-tight leading-[0.9] uppercase font-sans transition-all duration-300 ${
                    hoveredWord === line ? 'opacity-65 translate-x-2' : 'opacity-100'
                  }`}
                >
                  {line}
                </h2>
              </div>
            ))}
          </div>

          <span className="font-pixel text-xs sm:text-sm font-semibold opacity-75 tracking-tight shrink-0 pt-1 sm:pt-2 inline-flex items-baseline">
            <span>//</span>
            <RollingNumber value="03" duration={0.34} stagger={0} start="top 96%" />
          </span>
        </div>

        {/* Bottom Row: MOAMEN | 2026 centered | Behance & LinkedIn with icons */}
        <div
          data-cta-footer
          data-scroll-shade
          className="pt-8 grid grid-cols-1 md:grid-cols-12 items-center gap-5 font-pixel text-[10px] sm:text-xs uppercase will-change-transform"
        >
          {/* Left Zone (Cols 1-4): MOAMEN only */}
          <div className="md:col-span-4 flex items-center justify-start opacity-85">
            <span className="font-bold tracking-wider">MOAMEN</span>
          </div>

          {/* Center Zone (Cols 5-8): 2026 centered with RollingNumber */}
          <div className="md:col-span-4 flex items-center md:justify-center opacity-80 tabular-nums tracking-widest">
            <RollingNumber value="2026" duration={0.34} stagger={0} start="top 96%" />
          </div>

          {/* Right Zone (Cols 9-12): Behance & LinkedIn with icons */}
          <div className="md:col-span-4 flex flex-wrap items-center md:justify-end gap-5 sm:gap-7">

            <a
              href="https://www.behance.net/supworld"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 hover:opacity-65 transition-opacity border-b border-current pb-1"
            >
              <svg
                className="w-4 h-4 shrink-0"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <rect x="14.6" y="6.2" width="5.2" height="1.5" />
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M2 6H8C10.1 6 11.5 7.2 11.5 9.1C11.5 10.4 10.7 11.3 9.5 11.7C11 12.1 12 13.2 12 14.9C12 17 10.4 18.2 8.2 18.2H2V6ZM4.5 8V10.6H7.8C8.8 10.6 9.3 10.1 9.3 9.3C9.3 8.5 8.8 8 7.8 8H4.5ZM4.5 12.6V15.8H8C9.1 15.8 9.7 15.2 9.7 14.2C9.7 13.2 9.1 12.6 8 12.6H4.5Z"
                />
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M21.2 15.6C20.5 17.2 19.1 18.2 17.2 18.2C14.7 18.2 13 16.4 13 13.8C13 11.2 14.7 9.4 17.2 9.4C19.8 9.4 21.4 11.2 21.4 13.9V14.4H15.2C15.4 15.7 16.2 16.3 17.3 16.3C18.2 16.3 18.9 15.9 19.3 15.2L21.2 15.6ZM15.3 12.8H19.1C18.9 11.7 18.2 11.2 17.2 11.2C16.2 11.2 15.5 11.7 15.3 12.8Z"
                />
              </svg>
              <span>BEHANCE</span>
              <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>

            <a
              href="https://www.linkedin.com/in/supworld/"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 hover:opacity-65 transition-opacity border-b border-current pb-1"
            >
              <svg
                className="w-4 h-4 shrink-0"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M4 2H20C21.1 2 22 2.9 22 4V20C22 21.1 21.1 22 20 22H4C2.9 22 2 21.1 2 20V4C2 2.9 2.9 2 4 2ZM7.5 6.25C6.75 6.25 6.15 6.85 6.15 7.6C6.15 8.35 6.75 8.95 7.5 8.95C8.25 8.95 8.85 8.35 8.85 7.6C8.85 6.85 8.25 6.25 7.5 6.25ZM6.3 10.2V18H8.7V10.2H6.3ZM10.8 10.2V18H13.2V14C13.2 12.8 13.9 12.1 14.9 12.1C15.9 12.1 16.4 12.8 16.4 14V18H18.8V13.6C18.8 11.2 17.8 10 15.8 10C14.6 10 13.6 10.5 13.1 11.3V10.2H10.8Z"
                />
              </svg>
              <span>LINKEDIN</span>
              <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
