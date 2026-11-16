import { useEffect, useRef, useState } from 'react';
import Lenis from 'lenis';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { Project } from '../types';
import { TypewriterText } from './TypewriterEffects';

interface ProjectModalProps {
  project: Project | null;
  projects: Project[];
  theme?: 'light' | 'dark';
  onSelectProject: (project: Project) => void;
  onNavigateSection?: (selector: string) => void;
  onOpenContact?: () => void;
  onClose: () => void;
}

const MODAL_TRACK_HEIGHT = 152;
const MODAL_THUMB_HEIGHT = 36;

export function ProjectModal({
  project,
  theme = 'dark',
  onNavigateSection,
  onOpenContact,
  onClose,
}: ProjectModalProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollContentRef = useRef<HTMLDivElement>(null);
  const mainContentRef = useRef<HTMLElement>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const scrollTrackRef = useRef<HTMLDivElement>(null);
  const scrollThumbRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const [contentHeight, setContentHeight] = useState(960);
  const [scrollAriaPct, setScrollAriaPct] = useState(0);
  const lastAriaPctRef = useRef(-1);

  const rowHeight = 320;
  const topOffset = 66;
  const colPcts = [2.5, 34.167, 65.833, 97.5];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const scrubModalToProgress = (progress: number, immediate: boolean) => {
    const wrapper = scrollContainerRef.current;
    if (!wrapper) return;
    const maxScroll = Math.max(wrapper.scrollHeight - wrapper.clientHeight, 0);
    const targetY = Math.max(0, Math.min(1, progress)) * maxScroll;
    if (lenisRef.current) {
      lenisRef.current.scrollTo(targetY, immediate ? { immediate: true } : { duration: 1.3 });
    } else {
      wrapper.scrollTo({ top: targetY, behavior: immediate ? 'auto' : 'smooth' });
    }
  };

  const scrubFromClientY = (clientY: number, immediate: boolean) => {
    const track = scrollTrackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const usableSpan = Math.max(rect.height - MODAL_THUMB_HEIGHT, 1);
    const localY = clientY - rect.top - MODAL_THUMB_HEIGHT * 0.5;
    const rel = Math.min(Math.max(localY / usableSpan, 0), 1);
    scrubModalToProgress(rel, immediate);
  };

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      scrubFromClientY(e.clientY, true);
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

  // Scoped Lenis smooth scrolling & synced custom white centered scrollbar
  useEffect(() => {
    const wrapper = scrollContainerRef.current;
    const content = scrollContentRef.current;
    if (!project || !wrapper || !content) return;

    wrapper.scrollTop = 0;

    const modalLenis = new Lenis({
      wrapper,
      content,
      smoothWheel: true,
      lerp: 0.042,
      duration: 2.0,
      wheelMultiplier: 0.55,
      touchMultiplier: 0.78,
    });
    lenisRef.current = modalLenis;

    let smoothProgress = 0;
    let lastTime = performance.now();
    let rafId = 0;

    const onRaf = (time: number) => {
      const dt = Math.min(Math.max((time - lastTime) / 1000, 1 / 240), 0.1);
      lastTime = time;
      modalLenis.raf(time);

      const maxScroll = Math.max(wrapper.scrollHeight - wrapper.clientHeight, 1);
      const rawProgress = Math.min(Math.max(wrapper.scrollTop / maxScroll, 0), 1);
      smoothProgress += (rawProgress - smoothProgress) * (1 - Math.exp(-dt * 18));

      const track = scrollTrackRef.current;
      const thumb = scrollThumbRef.current;
      if (track && thumb) {
        const trackH = track.clientHeight || MODAL_TRACK_HEIGHT;
        const maxTravel = Math.max(trackH - MODAL_THUMB_HEIGHT, 0);
        const y = smoothProgress * maxTravel;
        thumb.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0)`;
      }

      const rounded = Math.round(smoothProgress * 100);
      if (rounded !== lastAriaPctRef.current) {
        lastAriaPctRef.current = rounded;
        setScrollAriaPct(rounded);
      }

      rafId = window.requestAnimationFrame(onRaf);
    };
    rafId = window.requestAnimationFrame(onRaf);

    const updateHeight = () => {
      const mainEl = mainContentRef.current;
      const measuredMainBottom = mainEl
        ? mainEl.offsetTop + mainEl.offsetHeight
        : content.scrollHeight;
      const h = Math.max(measuredMainBottom, window.innerHeight);
      setContentHeight(h);
    };
    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    if (mainContentRef.current) {
      observer.observe(mainContentRef.current);
    } else {
      observer.observe(content);
    }
    window.addEventListener('resize', updateHeight);

    return () => {
      window.cancelAnimationFrame(rafId);
      observer.disconnect();
      window.removeEventListener('resize', updateHeight);
      modalLenis.destroy();
      lenisRef.current = null;
    };
  }, [project]);

  if (!project) return null;

  const isDark = theme === 'dark';
  const maxRowIndex = Math.max(0, Math.floor((contentHeight - topOffset - 48) / rowHeight));
  const gridPoints: { x: number; y: number }[] = [];
  for (let r = 0; r <= maxRowIndex; r++) {
    const y = r * rowHeight + topOffset;
    colPcts.forEach((pct) => {
      gridPoints.push({ x: pct, y });
    });
  }

  const totalCharacters = project.writtenNarrative.length + project.description.length;

  return (
    <div
      ref={scrollContainerRef}
      data-lenis-prevent
      role="dialog"
      aria-modal="true"
      aria-label={`${project.title} (${project.arabicTitle}) Case Study Page`}
      className="fixed inset-0 z-50 overflow-y-auto no-scrollbar transition-colors duration-300"
      style={{
        background: isDark
          ? 'linear-gradient(155deg, #091559 0%, #060D3D 52%, #071048 100%)'
          : 'linear-gradient(155deg, #BEE0FA 0%, #CEE8FC 50%, #C2E2FA 100%)',
        color: 'var(--text-color)',
      }}
    >
      <div ref={scrollContentRef} className="relative min-h-full w-full">
        {/* Full-Page Architectural Segmented Grid + 4-Point Star '+' Intersections (Crisp All The Way Above Nav Bar) */}
        <div
          className="absolute inset-x-0 top-0 pointer-events-none z-0 overflow-hidden"
          style={{ height: `${contentHeight}px` }}
          aria-hidden="true"
        >
          {/* Vertical Grid Lines: Continuous Navbar Pillars + Repeating Body Columns */}
          {colPcts.map((pct, colIdx) => (
            <div key={`modal-col-wrap-${colIdx}`}>
              <div
                className="absolute w-px"
                style={{
                  left: `${pct}%`,
                  top: '0px',
                  height: `${topOffset - 10}px`,
                  backgroundColor: 'var(--border-color)',
                }}
              />
              <div
                className="absolute bottom-0 w-px"
                style={{
                  left: `${pct}%`,
                  top: `${topOffset + 10}px`,
                  background: `repeating-linear-gradient(to bottom, var(--border-color) 0px, var(--border-color) calc(${rowHeight}px - 20px), transparent calc(${rowHeight}px - 20px), transparent ${rowHeight}px)`,
                }}
              />
            </div>
          ))}

          {/* Horizontal Segmented Grid Rows */}
          {Array.from({ length: maxRowIndex + 1 }).map((_, rowIdx) => {
            const y = rowIdx * rowHeight + topOffset;
            const segments = [
              { left: '0px', right: 'calc(97.5% + 10px)' },
              { left: 'calc(2.5% + 10px)', right: 'calc(65.833% + 10px)' },
              { left: 'calc(34.167% + 10px)', right: 'calc(34.167% + 10px)' },
              { left: 'calc(65.833% + 10px)', right: 'calc(2.5% + 10px)' },
              { left: 'calc(97.5% + 10px)', right: '0px' },
            ];

            return (
              <div
                key={`modal-row-${rowIdx}`}
                className="absolute left-0 right-0 h-px"
                style={{ top: `${y}px` }}
              >
                {segments.map((seg, segIdx) => (
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

          {/* 4-Point '+' Star SVG Markers at Every Grid Intersection */}
          {gridPoints.map((pt, idx) => (
            <div
              key={`star-${idx}`}
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

        {/* Sticky Transparent Header Aligned Inside Framed Navbar Grid Cell */}
        <header className="sticky top-0 z-30 h-[66px] px-[2.5%] flex items-center bg-transparent pointer-events-none">
          <div className="w-full relative flex items-center px-3 lg:px-4">
            <div className="flex flex-col items-start pointer-events-auto relative">
              <button
                type="button"
                onClick={onClose}
                className="font-editorial font-medium text-2xl sm:text-[26px] tracking-tight leading-none hover:opacity-75 transition-opacity cursor-pointer"
              >
                Moamen.
              </button>
              <button
                type="button"
                onClick={onClose}
                className="absolute top-[42px] left-0 inline-flex items-center gap-1 text-[10px] sm:text-[11px] tracking-tight opacity-75 hover:opacity-100 transition-opacity cursor-pointer whitespace-nowrap"
              >
                <ArrowLeft className="w-3 h-3" aria-hidden="true" />
                <span>Back</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Flow Over Architectural Grid */}
        <main
          ref={mainContentRef}
          className="relative z-10 max-w-5xl mx-auto px-5 sm:px-10 pt-10 sm:pt-14 pb-12 space-y-12 sm:space-y-14"
        >
          {/* Small Project Name Above Top-Right of Box + ONE Solid Gray Rounded-[20px] Details Box */}
          <div className="max-w-4xl mx-auto space-y-3">
            <div className="flex justify-end px-1">
              <h1
                dir="rtl"
                className="font-sans font-bold text-base sm:text-lg tracking-tight opacity-95"
              >
                <TypewriterText
                  key={`ar-title-${project.id}`}
                  text={project.arabicTitle}
                  speedMs={45}
                  delayMs={0}
                  startOnView={false}
                  showCursor={false}
                />
              </h1>
            </div>

            <section
              aria-label="Platform details"
              className="w-full rounded-[20px] border p-6 sm:p-10 lg:p-12 space-y-8"
              style={{
                borderColor: isDark ? '#6B7280' : '#94A3B8',
                backgroundColor: isDark ? '#4B5563' : '#D1D5DB',
                color: isDark ? '#F9FAFB' : '#0F172A',
              }}
            >
              {/* Layout 1 (First): Platform Story & Purpose */}
              <div dir="rtl" className="text-right space-y-4">
                <div className="font-pixel text-[10px] uppercase tracking-[0.18em] opacity-70" dir="ltr">
                  01 // PLATFORM STORY &amp; PURPOSE
                </div>
                <p className="font-sans text-lg sm:text-2xl font-medium leading-[1.75] min-h-[5rem]">
                  <TypewriterText
                    key={`narrative-${project.id}`}
                    text={project.writtenNarrative}
                    speedMs={14}
                    delayMs={0}
                    startOnView={false}
                    showCursor={true}
                  />
                </p>
                <p className="font-sans text-xs sm:text-sm opacity-85 leading-relaxed">
                  <TypewriterText
                    key={`desc-${project.id}`}
                    text={project.description}
                    speedMs={14}
                    delayMs={0}
                    startOnView={false}
                    showCursor={false}
                  />
                </p>
              </div>

              {/* Layout 2 (Second): Launch Date, Grade Stages / Scope, Appointment System & Platform Status */}
              <div
                dir="rtl"
                className="pt-7 border-t text-right"
                style={{ borderColor: isDark ? 'rgba(249, 250, 251, 0.2)' : 'rgba(15, 23, 42, 0.16)' }}
              >
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                  {project.scheduleTiles.map((tile, idx) => (
                    <div key={`${project.id}-meta-${idx}`} className="space-y-1.5">
                      <div className="font-sans text-[11px] opacity-70">
                        <TypewriterText
                          key={`tile-lbl-${project.id}-${idx}`}
                          text={tile.label}
                          speedMs={28}
                          delayMs={0}
                          startOnView={false}
                          showCursor={false}
                        />
                      </div>
                      <div className="font-sans text-xs sm:text-sm font-bold leading-snug">
                        <TypewriterText
                          key={`tile-val-${project.id}-${idx}`}
                          text={tile.value}
                          speedMs={24}
                          delayMs={0}
                          startOnView={false}
                          showCursor={false}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>

          {/* Clean Unboxed 0px-Radius Visual Frames Matching Landing Page Work Grid */}
          <section aria-label="Project visual interfaces" className="space-y-10 max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
              <figure className="space-y-2.5">
                <div className="w-full aspect-[16/10] overflow-hidden rounded-none">
                  <img
                    src={project.imageSrc}
                    alt={`${project.title} main showcase interface`}
                    className="w-full h-full object-cover block rounded-none"
                  />
                </div>
                <figcaption className="flex items-baseline justify-between font-pixel text-[10px] uppercase opacity-70">
                  <span>{project.title} // PRIMARY VIEW</span>
                  <span>{project.years}</span>
                </figcaption>
              </figure>

              <figure className="space-y-2.5">
                <div className="w-full aspect-[16/10] overflow-hidden rounded-none">
                  <img
                    src={project.hoverImageSrc}
                    alt={`${project.title} identity and system view`}
                    className="w-full h-full object-cover block rounded-none"
                  />
                </div>
                <figcaption className="flex items-baseline justify-between font-pixel text-[10px] uppercase opacity-70">
                  <span dir="rtl">{project.arabicTitle} // IDENTITY &amp; SYSTEM</span>
                  <span>{project.category}</span>
                </figcaption>
              </figure>
            </div>

            {project.showcaseVideo && (
              <figure className="space-y-2.5 max-w-2xl mx-auto pt-2">
                <div className="w-full overflow-hidden rounded-none">
                  <video
                    key={project.showcaseVideo.src}
                    src={project.showcaseVideo.src}
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="auto"
                    ref={(el) => {
                      if (el) {
                        el.muted = true;
                        el.play().catch(() => {});
                      }
                    }}
                    className="w-full h-auto block rounded-none"
                  />
                </div>
                <figcaption className="flex items-baseline justify-between font-pixel text-[10px] uppercase opacity-70">
                  <span>{project.showcaseVideo.captionLeft}</span>
                  <span dir="rtl">{project.showcaseVideo.captionRight}</span>
                </figcaption>
              </figure>
            )}

            {project.extraGallery && project.extraGallery.length > 0 && (
              <div className="space-y-8 pt-2">
                {project.extraGallery.map((item, idx) => (
                  <figure key={`${project.id}-extra-${idx}`} className="space-y-2.5">
                    <div className="w-full overflow-hidden rounded-none">
                      <img
                        src={item.src}
                        alt={item.alt}
                        className="w-full h-auto block rounded-none"
                      />
                    </div>
                    <figcaption className="flex items-baseline justify-between font-pixel text-[10px] uppercase opacity-70">
                      <span>{item.captionLeft}</span>
                      <span dir="rtl">{item.captionRight}</span>
                    </figcaption>
                  </figure>
                ))}
              </div>
            )}
          </section>

          {/* Metadata Card (Matching User Reference Image) */}
          <section
            aria-label="Project metadata"
            className="max-w-4xl mx-auto rounded-[16px] border p-6 sm:p-8 text-left"
            style={{
              backgroundColor: '#121316',
              borderColor: 'rgba(255, 255, 255, 0.08)',
              color: '#F3F4F6',
            }}
          >
            <h2 className="font-sans text-base sm:text-lg font-semibold tracking-tight text-white mb-6">
              Metadata
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pb-6 border-b border-dashed border-white/15">
              <div className="space-y-2">
                <div className="font-sans text-xs font-semibold text-white/90">Last Updated</div>
                <div className="font-mono text-xs sm:text-sm text-white/55 tabular-nums">
                  May 07, 2026
                </div>
              </div>

              <div className="space-y-2">
                <div className="font-sans text-xs font-semibold text-white/90">Dimensions</div>
                <div className="font-mono text-xs sm:text-sm text-white/55 tabular-nums">
                  1656×802
                </div>
              </div>

              <div className="space-y-2">
                <div className="font-sans text-xs font-semibold text-white/90">Characters</div>
                <div className="font-mono text-xs sm:text-sm text-white/55 tabular-nums">
                  {totalCharacters}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6">
              <div className="font-sans text-xs font-semibold text-white/90">Links</div>

              <div className="flex flex-col items-start gap-2 font-mono text-xs sm:text-sm text-white/55">
                <button
                  type="button"
                  onClick={onClose}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Home
                </button>
                <button
                  type="button"
                  onClick={() => (onNavigateSection ? onNavigateSection('#work') : onClose())}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Work
                </button>
                <button
                  type="button"
                  onClick={() => (onNavigateSection ? onNavigateSection('#contact') : onClose())}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Contact
                </button>
              </div>

              <div className="flex flex-col items-start gap-2 font-mono text-xs sm:text-sm text-white/55">
                <a
                  href={project.behanceCaseStudyUrl ?? 'https://www.behance.net/supworld'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  Behance
                </a>
                <a
                  href="https://www.linkedin.com/in/supworld/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  LinkedIn
                </a>
                <button
                  type="button"
                  onClick={() => (onOpenContact ? onOpenContact() : onClose())}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Email
                </button>
              </div>
            </div>
          </section>

          {/* Bottom Actions: Optional Behance Case Study Link + Back to Home Page */}
          <footer className="max-w-4xl mx-auto pt-4 flex flex-wrap items-center justify-center gap-8">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 font-pixel text-[11px] sm:text-xs uppercase tracking-[0.16em] border-b border-current pb-1 opacity-85 hover:opacity-100 transition-opacity cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              <span>BACK TO HOME PAGE</span>
            </button>

            {project.behanceCaseStudyUrl && (
              <a
                href={project.behanceCaseStudyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 font-pixel text-[11px] sm:text-xs uppercase tracking-[0.16em] border-b border-current pb-1 opacity-85 hover:opacity-100 transition-opacity"
              >
                <span>VIEW CASE STUDY ON BEHANCE</span>
                <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
              </a>
            )}
          </footer>
        </main>
      </div>

      {/* Compact Centered White Vertical Scrollbar Matching Landing Page */}
      <div className="fixed right-2 sm:right-3 top-1/2 -translate-y-1/2 z-[55] select-none pointer-events-auto">
        <div
          ref={scrollTrackRef}
          role="slider"
          tabIndex={0}
          aria-orientation="vertical"
          aria-label="Case study page scrollbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={scrollAriaPct}
          onPointerDown={(e) => {
            isDraggingRef.current = true;
            scrubFromClientY(e.clientY, false);
          }}
          onKeyDown={(e) => {
            const curr = scrollAriaPct / 100;
            if (e.key === 'ArrowDown' || e.key === 'PageDown') {
              e.preventDefault();
              scrubModalToProgress(Math.min(1, curr + 0.1), false);
            } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
              e.preventDefault();
              scrubModalToProgress(Math.max(0, curr - 0.1), false);
            }
          }}
          className="group relative w-4 h-[136px] sm:h-[152px] flex justify-center cursor-pointer"
        >
          <div
            className="w-[4px] h-full rounded-full transition-colors duration-200"
            style={{
              backgroundColor: isDark
                ? 'rgba(255, 255, 255, 0.22)'
                : 'rgba(255, 255, 255, 0.45)',
              boxShadow: isDark ? undefined : '0 0 0 1px rgba(13, 17, 23, 0.08)',
            }}
          />
          <div
            ref={scrollThumbRef}
            className="absolute top-0 w-[6px] group-hover:w-[7px] rounded-full transition-[width,background-color] duration-150 will-change-transform"
            style={{
              height: `${MODAL_THUMB_HEIGHT}px`,
              backgroundColor: '#FFFFFF',
              boxShadow: isDark
                ? '0 1px 4px rgba(0, 0, 0, 0.28)'
                : '0 1px 6px rgba(13, 17, 23, 0.26)',
            }}
          />
        </div>
      </div>
    </div>
  );
}
