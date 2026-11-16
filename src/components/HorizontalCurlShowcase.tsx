import { useCallback, useEffect, useRef, useState } from 'react';
import { useLenis } from 'lenis/react';
import { ArrowRight, MoveRight } from 'lucide-react';

interface HorizontalCurlShowcaseProps {
  scrollVelocity: number;
}

const SHOWCASE_CARDS = [
  {
    id: '01',
    title: 'SPATIAL WEBGL & 3D',
    category: 'Shader Architecture',
    subtitle: 'Real-time procedural geometry and physical studio materials.',
    stats: '60 FPS LOCKED',
    details: 'Custom Three.js pipelines with zero-garbage collection render loops, ACES tone mapping, and software WebGL fallback guards.',
    bg: 'from-zinc-900 to-black',
    accent: '#38bdf8',
    pill: 'Three.js / WebGL',
  },
  {
    id: '02',
    title: 'KINETIC DESIGN SYSTEMS',
    category: 'Token Engineering',
    subtitle: 'Fluid typography scales, semantic tokens, and dynamic surfaces.',
    stats: '100% WCAG AA',
    details: 'Unified design tokens for color, radius, spatial math, and responsive layouts that translate without friction from Figma to production code.',
    bg: 'from-neutral-900 to-stone-900',
    accent: '#f59e0b',
    pill: 'Design Tokens',
  },
  {
    id: '03',
    title: 'ARABIC MULTI-SCRIPT UI',
    category: 'Bi-Directional RTL',
    subtitle: 'Culturally grounded typography and mirrored UX patterns.',
    stats: 'DUAL SCRIPT',
    details: 'Specialized in Arabic & Latin bidirectional typography systems, optical font weights, baseline alignment, and cultural localization across MENA.',
    bg: 'from-sky-950 to-slate-900',
    accent: '#34d399',
    pill: 'Arabic Typography',
  },
  {
    id: '04',
    title: 'HAPTIC & SPRING MOTION',
    category: 'Physics Kinematics',
    subtitle: 'Natural inertia curves with zero-latency input response.',
    stats: '< 16ms RESPONSE',
    details: 'Second-order spring physics, momentum damping, and compositor-only transforms providing tactile physical weight to digital interfaces.',
    bg: 'from-amber-950/90 to-stone-900',
    accent: '#fbbf24',
    pill: 'Motion Physics',
  },
  {
    id: '05',
    title: 'GAME SHOP ECONOMIES',
    category: 'Virtual HUD Architecture',
    subtitle: 'High-conversion virtual stores and uncluttered inventory flows.',
    stats: '+35% CONVERSION',
    details: 'Psychology of in-game rewards, tiered bundles, instant feedback loops, and crystal-clear currency displays optimized for mobile gaming.',
    bg: 'from-indigo-950 to-purple-950',
    accent: '#c084fc',
    pill: 'Game Economy',
  },
];

export function HorizontalCurlShowcase({ scrollVelocity }: HorizontalCurlShowcaseProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  const updateProgress = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const totalScrollable = container.offsetHeight - window.innerHeight;
    if (totalScrollable <= 0) return;

    const currentScroll = -rect.top;
    const progress = Math.min(Math.max(currentScroll / totalScrollable, 0), 1);
    setScrollProgress(progress);
  }, []);

  // Sync pinned progress directly with Lenis raf ticks + native fallback/resize
  useLenis(updateProgress);

  useEffect(() => {
    updateProgress();
    window.addEventListener('resize', updateProgress);
    return () => window.removeEventListener('resize', updateProgress);
  }, [updateProgress]);

  // Compute dynamic curl and skew from scroll velocity
  const velocityClamp = Math.min(Math.max(scrollVelocity, -30), 30);
  const dynamicSkew = velocityClamp * 0.45;
  const dynamicCurl = velocityClamp * 0.6;
  const isMovingFast = Math.abs(scrollVelocity) > 4;

  return (
    <section
      ref={containerRef}
      id="spatial"
      className="relative w-full h-[320vh] bg-[#111111] text-[#E7E5DF] select-none"
    >
      {/* Sticky Viewport Window */}
      <div className="sticky top-0 h-screen w-full overflow-hidden flex flex-col justify-between py-8 sm:py-12 perspective-container">
        {/* Top Header & Dynamic Velocity Ticker */}
        <div className="px-6 sm:px-10 lg:px-16 flex items-center justify-between border-b border-white/10 pb-4 z-20">
          <div className="flex items-center gap-3">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
            <span className="font-mono-code text-xs uppercase tracking-widest text-zinc-400">
              HORIZONTAL CURL LAB // VELOCITY: {Math.abs(scrollVelocity).toFixed(1)} px/s
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono-code text-zinc-400">
            <span>SCROLL DOWN TO ADVANCE</span>
            <MoveRight className="w-3.5 h-3.5 text-zinc-300 animate-pulse" />
          </div>
        </div>

        {/* Accelerated Marquee Ribbon that speeds up when scrolling */}
        <div
          className="w-full overflow-hidden whitespace-nowrap py-2 border-b border-white/5 opacity-40 font-mono-code text-xs text-zinc-300"
          style={{
            transform: `skewX(${dynamicSkew * 0.5}deg)`,
            transition: 'transform 0.1s ease-out',
          }}
        >
          <div className="inline-block animate-marquee whitespace-nowrap">
            KINETIC ARCHITECTURE · SPATIAL UI LAB · WEBDESIGN 2026 · FLUID INTERACTIONS · HIGH-VELOCITY SCROLL CURL · BESPOKE SHADERS ·&nbsp;
            KINETIC ARCHITECTURE · SPATIAL UI LAB · WEBDESIGN 2026 · FLUID INTERACTIONS · HIGH-VELOCITY SCROLL CURL · BESPOKE SHADERS ·&nbsp;
          </div>
        </div>

        {/* Main Horizontal Track that curls and slides */}
        <div className="relative w-full my-auto overflow-visible py-6">
          <div
            ref={trackRef}
            className="flex items-center gap-8 sm:gap-12 pl-6 sm:pl-16 pr-24 will-change-transform"
            style={{
              transform: `translate3d(-${scrollProgress * 70}%, 0, 0)`,
            }}
          >
            {SHOWCASE_CARDS.map((card, idx) => {
              // Individual card 3D curl calculation based on progress & velocity
              const cardOffset = idx * 0.2 - scrollProgress;
              const individualCurl = cardOffset * -14 + dynamicCurl;

              return (
                <div
                  key={card.id}
                  className="curl-card shrink-0 w-[300px] sm:w-[400px] lg:w-[460px] h-[440px] sm:h-[480px] rounded-3xl p-6 sm:p-8 flex flex-col justify-between border border-white/10 shadow-2xl relative overflow-hidden bg-gradient-to-br"
                  style={{
                    backgroundColor: '#18181b',
                    transform: `perspective(1200px) rotateY(${individualCurl}deg) skewX(${dynamicSkew * 0.7}deg) scale(${
                      isMovingFast ? 0.98 : 1
                    })`,
                    transformOrigin: scrollVelocity >= 0 ? 'left center' : 'right center',
                  }}
                >
                  {/* Subtle Grid Ambient on card */}
                  <div className="absolute inset-0 opacity-10 bg-[radial-gradient(white_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

                  {/* Top Bar of Card */}
                  <div className="flex items-center justify-between z-10">
                    <span className="font-mono-code text-sm font-bold text-zinc-400">
                      // {card.id}
                    </span>
                    <span
                      className="px-2.5 py-1 rounded-full text-[10px] font-mono-code font-bold tracking-wider uppercase border border-white/10 bg-white/5"
                      style={{ color: card.accent }}
                    >
                      {card.pill}
                    </span>
                  </div>

                  {/* Center Content */}
                  <div className="my-auto space-y-3 z-10">
                    <span className="text-[11px] font-mono-code uppercase tracking-widest text-zinc-500 block">
                      {card.category}
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-sans leading-tight">
                      {card.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-light">
                      {card.subtitle}
                    </p>
                    <p className="text-[11px] text-zinc-400 leading-normal pt-2 border-t border-white/5 font-mono-code">
                      {card.details}
                    </p>
                  </div>

                  {/* Card Bottom: Metric & Arrow */}
                  <div className="flex items-center justify-between border-t border-white/10 pt-4 z-10">
                    <span className="text-xs font-mono-code font-bold text-zinc-200">
                      {card.stats}
                    </span>
                    <div
                      className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center transition-transform hover:scale-110"
                      style={{ backgroundColor: `${card.accent}20` }}
                    >
                      <ArrowRight className="w-3.5 h-3.5" style={{ color: card.accent }} />
                    </div>
                  </div>
                </div>
              );
            })}

            {/* End of Horizontal Reel Outro Card */}
            <div
              className="curl-card shrink-0 w-[280px] sm:w-[340px] h-[440px] sm:h-[480px] rounded-3xl p-8 flex flex-col justify-between border border-dashed border-white/20 bg-white/[0.02] text-zinc-400"
              style={{
                transform: `perspective(1200px) rotateY(${dynamicCurl * 1.2}deg) skewX(${dynamicSkew * 0.7}deg)`,
              }}
            >
              <div className="font-mono-code text-xs text-zinc-500">// FINAL CHAPTER</div>
              <div className="space-y-3">
                <span className="text-xs font-mono-code text-amber-300 uppercase tracking-widest block">
                  CURL COMPLETE
                </span>
                <h4 className="text-xl sm:text-2xl font-black text-white">
                  Continue Down For Next Step
                </h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Smooth vertical scrolling automatically resumes right below into the grand call-to-action.
                </p>
              </div>
              <div className="text-xs font-mono-code text-zinc-500">
                ↓ SCROLL TO CALL TO ACTION
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Horizontal Progress Bar */}
        <div className="px-6 sm:px-10 lg:px-16 flex items-center justify-between border-t border-white/10 pt-4 z-20">
          <div className="flex-1 max-w-xs h-1 bg-white/10 rounded-full overflow-hidden mr-4">
            <div
              className="h-full bg-amber-400 transition-all duration-75"
              style={{ width: `${Math.round(scrollProgress * 100)}%` }}
            />
          </div>
          <span className="font-mono-code text-xs text-zinc-400">
            {Math.round(scrollProgress * 100)}% EXPLORED
          </span>
        </div>
      </div>
    </section>
  );
}
