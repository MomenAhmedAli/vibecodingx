import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight } from 'lucide-react';
import { OrbitingInterfaces360 } from './OrbitingInterfaces360';

gsap.registerPlugin(ScrollTrigger);

interface HeroSectionProps {
  scrollVelocity?: number;
  theme?: 'light' | 'dark';
  isReady?: boolean;
  onOpenContact?: () => void;
}

const HERO_EYEBROW = "HI, I'M MOAMEN · PRODUCT & UX DESIGNER";
const HERO_HEADLINE_LINES = [
  'I create design',
  'who need to someone',
  'deserve it.',
];
const QUOTE_PART_1 = '“I help founders who care about the people they serve to ';
const QUOTE_PART_2 = 'build calm and really useful apps';
const QUOTE_PART_3 = ', not more noise”';

const SIGNATURE_STROKES = [
  {
    id: 'sig-M',
    d: 'M 14 66 C 21 38, 30 15, 37 12 C 42 10, 44 42, 46 57 C 54 36, 68 15, 76 13 C 81 12, 81 44, 77 63',
    start: 0.22,
    duration: 0.48,
  },
  {
    id: 'sig-oamen',
    d: 'M 94 46 C 85 46, 82 61, 93 62 C 103 63, 109 49, 100 44 C 95 41, 93 47, 103 48 C 115 48, 126 42, 134 45 C 125 43, 118 59, 127 62 C 135 64, 142 50, 142 44 C 141 54, 141 62, 147 62 C 154 62, 158 46, 164 44 C 169 42, 167 59, 167 61 C 172 45, 180 41, 185 45 C 189 48, 186 60, 186 61 C 191 45, 199 41, 204 45 C 208 49, 204 61, 212 61 C 221 61, 232 49, 229 43 C 226 39, 218 45, 217 53 C 216 61, 226 63, 235 55 C 241 49, 245 42, 249 45 C 253 48, 248 61, 254 61 C 260 61, 267 51, 272 47',
    start: 0.66,
    duration: 0.72,
  },
  {
    id: 'sig-flourish',
    d: 'M 86 73 C 142 67, 206 66, 260 69',
    start: 1.32,
    duration: 0.26,
  },
] as const;

export function HeroSection({
  scrollVelocity = 0,
  theme = 'dark',
  isReady = true,
  onOpenContact,
}: HeroSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const eyebrowRef = useRef<HTMLSpanElement>(null);
  const headlineLineRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const quotePart1Ref = useRef<HTMLSpanElement>(null);
  const quotePart2Ref = useRef<HTMLSpanElement>(null);
  const quotePart3Ref = useRef<HTMLSpanElement>(null);
  const sigStrokeRefs = useRef<(SVGPathElement | null)[]>([]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      if (!isReady) {
        gsap.set(['[data-hero-copy]', '[data-hero-portrait]', '[data-hero-cta]'], {
          opacity: 0,
          y: 16,
        });
        if (eyebrowRef.current) eyebrowRef.current.textContent = '';
        headlineLineRefs.current.forEach((el) => {
          if (el) el.textContent = '';
        });
        if (quotePart1Ref.current) quotePart1Ref.current.textContent = '';
        if (quotePart2Ref.current) quotePart2Ref.current.textContent = '';
        if (quotePart3Ref.current) quotePart3Ref.current.textContent = '';
        sigStrokeRefs.current.forEach((pathEl) => {
          if (pathEl) {
            const len = pathEl.getTotalLength() || 300;
            gsap.set(pathEl, { strokeDasharray: len, strokeDashoffset: len, opacity: 0 });
          }
        });
        return;
      }

      const heroEntrance = gsap.timeline();

      heroEntrance
        .fromTo(
          '[data-hero-copy]',
          { y: 14, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.42, ease: 'power2.out' },
          0
        )
        .fromTo(
          '[data-hero-portrait]',
          { y: 20, opacity: 0, scale: 0.985 },
          { y: 0, opacity: 1, scale: 1, duration: 0.65, ease: 'power2.out' },
          0
        )
        .fromTo(
          '[data-hero-cta]',
          { y: 12, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out' },
          0.32
        );

      // Typewriter: Eyebrow opens concurrently with portrait
      const eyeProxy = { count: 0 };
      heroEntrance.to(
        eyeProxy,
        {
          count: HERO_EYEBROW.length,
          duration: 0.52,
          ease: 'none',
          onUpdate: () => {
            if (eyebrowRef.current) {
              eyebrowRef.current.textContent = HERO_EYEBROW.slice(0, Math.round(eyeProxy.count));
            }
          },
          onComplete: () => {
            if (eyebrowRef.current) eyebrowRef.current.textContent = HERO_EYEBROW;
          },
        },
        0.04
      );

      // Typewriter: 3-line Headline
      const headlineFull = HERO_HEADLINE_LINES.join('\n');
      const headProxy = { count: 0 };
      heroEntrance.to(
        headProxy,
        {
          count: headlineFull.length,
          duration: 0.85,
          ease: 'none',
          onUpdate: () => {
            const visible = headlineFull.slice(0, Math.round(headProxy.count)).split('\n');
            HERO_HEADLINE_LINES.forEach((_, idx) => {
              const lineEl = headlineLineRefs.current[idx];
              if (lineEl) lineEl.textContent = visible[idx] ?? '';
            });
          },
          onComplete: () => {
            HERO_HEADLINE_LINES.forEach((line, idx) => {
              const lineEl = headlineLineRefs.current[idx];
              if (lineEl) lineEl.textContent = line;
            });
          },
        },
        0.12
      );

      // Typewriter: Bottom-right Editorial Quote
      const quoteTotal = QUOTE_PART_1.length + QUOTE_PART_2.length + QUOTE_PART_3.length;
      const quoteProxy = { count: 0 };
      heroEntrance.to(
        quoteProxy,
        {
          count: quoteTotal,
          duration: 1.05,
          ease: 'none',
          onUpdate: () => {
            const n = Math.round(quoteProxy.count);
            const p1 = Math.min(n, QUOTE_PART_1.length);
            const p2 = Math.min(Math.max(n - QUOTE_PART_1.length, 0), QUOTE_PART_2.length);
            const p3 = Math.max(n - QUOTE_PART_1.length - QUOTE_PART_2.length, 0);
            if (quotePart1Ref.current) quotePart1Ref.current.textContent = QUOTE_PART_1.slice(0, p1);
            if (quotePart2Ref.current) quotePart2Ref.current.textContent = QUOTE_PART_2.slice(0, p2);
            if (quotePart3Ref.current) quotePart3Ref.current.textContent = QUOTE_PART_3.slice(0, p3);
          },
          onComplete: () => {
            if (quotePart1Ref.current) quotePart1Ref.current.textContent = QUOTE_PART_1;
            if (quotePart2Ref.current) quotePart2Ref.current.textContent = QUOTE_PART_2;
            if (quotePart3Ref.current) quotePart3Ref.current.textContent = QUOTE_PART_3;
          },
        },
        0.08
      );

      // Calligraphic SVG stroke-by-stroke writing animation for "Moamen" signature
      SIGNATURE_STROKES.forEach((stroke, idx) => {
        const pathEl = sigStrokeRefs.current[idx];
        if (!pathEl) return;
        const len = pathEl.getTotalLength() || 300;
        gsap.set(pathEl, { strokeDasharray: len, strokeDashoffset: len, opacity: 1 });
        heroEntrance.to(
          pathEl,
          {
            strokeDashoffset: 0,
            duration: stroke.duration,
            ease: 'power1.inOut',
          },
          stroke.start
        );
      });

      gsap.fromTo(
        '[data-hero-scroll-stage]',
        { y: 0, opacity: 1, scale: 1 },
        {
          y: -44,
          opacity: 0.14,
          scale: 0.96,
          ease: 'none',
          immediateRender: false,
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: 'bottom 18%',
            scrub: 0.45,
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, [isReady]);

  const isDark = theme === 'dark';

  return (
    <section
      id="hero"
      ref={sectionRef}
      className="relative w-full md:h-[calc(100vh-90px)] md:min-h-[656px] md:max-h-[896px] pt-14 md:pt-0 pb-6 md:pb-0 px-[2.5%] sm:px-[3.5%] flex flex-col justify-end select-none overflow-hidden"
    >
      {/* Full Hero Visual Stage */}
      <div
        data-hero-scroll-stage
        className="relative w-full h-full flex flex-col justify-end items-center origin-bottom will-change-transform"
      >
        {/* Curved 3D Panoramic Website & UI Interfaces Strip Behind the Portrait */}
        <div className="relative md:absolute inset-x-0 top-0 md:top-[8%] lg:top-[9%] h-[280px] sm:h-[360px] md:h-[420px] lg:h-[460px] w-screen left-1/2 -translate-x-1/2 pointer-events-none z-[5]">
          <OrbitingInterfaces360 theme={theme} scrollVelocity={scrollVelocity} />
        </div>

        {/* Centered Portrait Cutout Anchored Cleanly to Bottom Edge */}
        <div className="relative w-full flex justify-center items-end z-20 -mt-28 sm:-mt-32 md:mt-0 pointer-events-none">
          <div
            data-hero-portrait
            className="relative w-[310px] sm:w-[440px] md:w-[560px] lg:w-[650px] xl:w-[700px] translate-x-[5%] flex items-end justify-center [mask-image:linear-gradient(to_bottom,black_80%,transparent_100%)] md:[mask-image:none]"
          >
            <img
              src="/assets/aistudio/moamen_hero_clean.png"
              alt="Moamen — Product & UX Designer"
              className="w-full h-auto block object-contain object-bottom pointer-events-none select-none drop-shadow-[0_22px_44px_rgba(6,13,61,0.42)]"
            />
          </div>
        </div>

        {/* Bottom-Left Hero Headline (Animated Typewriter on Open) & Primary CTA */}
        <div
          data-hero-copy
          className="relative md:absolute md:left-0 md:bottom-4 lg:bottom-5 z-30 w-full md:w-auto max-w-[335px] sm:max-w-[385px] lg:max-w-[420px] mt-6 md:mt-0 flex flex-col items-start text-left"
        >
          <p className="relative font-sans text-[10px] sm:text-[11px] font-medium tracking-[0.24em] uppercase opacity-70 mb-2">
            <span className="invisible" aria-hidden="true">
              {HERO_EYEBROW}
            </span>
            <span ref={eyebrowRef} className="absolute inset-0">
              {HERO_EYEBROW}
            </span>
          </p>

          <h1 className="relative font-editorial font-medium text-[32px] sm:text-[38px] lg:text-[42px] xl:text-[46px] leading-[1.04] tracking-[-0.02em]">
            <span className="invisible block" aria-hidden="true">
              {HERO_HEADLINE_LINES.map((line, i) => (
                <span key={`ghost-${i}`} className="block">
                  {line}
                </span>
              ))}
            </span>
            <span className="absolute inset-0 block">
              {HERO_HEADLINE_LINES.map((line, i) => (
                <span
                  key={`line-${i}`}
                  ref={(el) => {
                    headlineLineRefs.current[i] = el;
                  }}
                  className="block"
                >
                  {line}
                </span>
              ))}
            </span>
          </h1>

          <button
            data-hero-cta
            type="button"
            onClick={onOpenContact}
            className={`mt-5 inline-flex items-center gap-3 pl-1.5 pr-5 py-1.5 rounded-full text-xs sm:text-[13px] font-medium tracking-tight transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-lg ${
              isDark
                ? 'bg-[#F4F6FF] text-[#060D3D] hover:bg-white'
                : 'bg-[#0D1117] text-[#F4F6FF] hover:bg-black'
            }`}
          >
            <span
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 ${
                isDark
                  ? 'bg-[#060D3D] text-[#F4F6FF]'
                  : 'bg-[#C8E3FA] text-[#0D1117]'
              }`}
            >
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </span>
            <span>Begin a project</span>
          </button>
        </div>

        {/* Bottom-Right Editorial Quote (Animated Typewriter) & Handwriting SVG "Moamen" Signature */}
        <div
          data-hero-copy
          className="relative md:absolute md:right-0 md:bottom-4 lg:bottom-5 z-30 w-full md:w-auto max-w-[320px] lg:max-w-[345px] mt-6 md:mt-0 self-start md:self-auto text-left md:text-right flex flex-col items-start md:items-end"
        >
          <blockquote className="relative font-editorial text-[16px] sm:text-[18px] lg:text-[19px] leading-[1.36] tracking-[-0.01em]">
            {/* Hidden height keeper so typing causes zero vertical jitter */}
            <span className="invisible block" aria-hidden="true">
              {QUOTE_PART_1}
              <span className="font-semibold">{QUOTE_PART_2}</span>
              {QUOTE_PART_3}
            </span>
            <span className="absolute inset-0 block">
              <span ref={quotePart1Ref} className="opacity-70">
                {QUOTE_PART_1}
              </span>
              <span ref={quotePart2Ref} className="font-semibold opacity-100">
                {QUOTE_PART_2}
              </span>
              <span ref={quotePart3Ref} className="opacity-70">
                {QUOTE_PART_3}
              </span>
            </span>
          </blockquote>

          {/* Live Calligraphic Stroke-by-Stroke Written "Moamen" Signature */}
          <div className="mt-2 select-none" aria-label="Moamen signature">
            <svg
              data-signature-svg="true"
              viewBox="0 0 280 84"
              className="w-[155px] sm:w-[185px] h-auto overflow-visible opacity-95"
              fill="none"
              role="img"
              aria-label="Moamen signature"
            >
              <title>Moamen</title>
              {SIGNATURE_STROKES.map((stroke, idx) => (
                <path
                  key={stroke.id}
                  ref={(el) => {
                    sigStrokeRefs.current[idx] = el;
                  }}
                  d={stroke.d}
                  stroke="currentColor"
                  strokeWidth={idx === 2 ? '1.8' : '2.8'}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="800"
                  strokeDashoffset="800"
                />
              ))}
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
