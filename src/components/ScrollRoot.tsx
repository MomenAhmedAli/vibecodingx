import { ReactNode, useEffect } from 'react';
import { ReactLenis, useLenis } from 'lenis/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { bindLenisScrollBus, runFrameEffects } from '../lib/lenisScrollBus';
import {
  resolveWrittenFrameTarget,
  shouldAcceptWheelFrameStep,
  WrittenFrameAnchor,
} from '../lib/pageNavigation';

gsap.registerPlugin(ScrollTrigger);

// Silky quintic ease-out / ease-in-out curve for effortless frame-to-frame Lenis glides
function smoothGlideEasing(t: number): number {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

const LENIS_OPTIONS = {
  autoRaf: false,
  lerp: 0.024,
  duration: 2.4,
  easing: (t: number) => Math.min(1, 1 - Math.pow(1 - t, 4)),
  orientation: 'vertical' as const,
  gestureOrientation: 'vertical' as const,
  smoothWheel: true,
  syncTouch: true,
  wheelMultiplier: 0.42,
  touchMultiplier: 0.72,
  anchors: { duration: 2.2, easing: smoothGlideEasing },
};

function readWrittenFrameAnchors(currentScrollTop: number): WrittenFrameAnchor[] {
  const vh = window.innerHeight || 900;
  const maxScroll = Math.max(document.documentElement.scrollHeight - vh, 1);
  const anchors: WrittenFrameAnchor[] = [];

  // 1. Page 1: Hero
  anchors.push({ id: 'hero', top: 0 });

  // 2. Page 2: Bio & Stats (//01)
  const statsEl = document.getElementById('stats');
  if (statsEl) {
    const r = statsEl.getBoundingClientRect();
    const statsTop = Math.max(0, Math.round(r.top + currentScrollTop - Math.max(64, (vh - r.height) * 0.35)));
    anchors.push({ id: 'stats', top: statsTop });
  }

  // 3. Page 3: Selected Work Header + Card 1 (NURABI)
  const workEl = document.getElementById('work');
  if (workEl) {
    const r = workEl.getBoundingClientRect();
    anchors.push({ id: 'work', top: Math.max(0, Math.round(r.top + currentScrollTop - 36)) });
  }

  // 4. Card 2 (RIVKA) & Card 3 (TAWREEDAT) centered cleanly
  const cardIds = ['project-rivka', 'project-tawreed'] as const;
  for (const cardId of cardIds) {
    const cardEl = document.getElementById(cardId);
    if (cardEl) {
      const r = cardEl.getBoundingClientRect();
      const centeredTop = Math.max(
        0,
        Math.round(r.top + currentScrollTop - Math.max(88, (vh - r.height) * 0.44))
      );
      anchors.push({ id: cardId, top: centeredTop });
    }
  }

  // 5. 3D Yacht Journey Camera Beats: Afar Approach -> Interior Forward -> Dive Under + 2-Word Lines
  const circleEl = document.getElementById('ship-voyage');
  if (circleEl) {
    const r = circleEl.getBoundingClientRect();
    const circleDocTop = r.top + currentScrollTop;
    const travel = Math.max(circleEl.offsetHeight - vh, 1);
    anchors.push(
      {
        id: 'yacht-approach',
        top: Math.min(maxScroll, Math.max(0, Math.round(circleDocTop + travel * 0.14))),
      },
      {
        id: 'yacht-inside',
        top: Math.min(maxScroll, Math.max(0, Math.round(circleDocTop + travel * 0.38))),
      },
      {
        id: 'circle-copy',
        top: Math.min(maxScroll, Math.max(0, Math.round(circleDocTop + travel * 0.68))),
      }
    );
  }

  // 6. Final Frame: GET READY FOR BEYOND (//03)
  const contactEl = document.getElementById('contact');
  if (contactEl) {
    const r = contactEl.getBoundingClientRect();
    anchors.push({
      id: 'contact',
      top: Math.min(maxScroll, Math.max(0, Math.round(r.top + currentScrollTop - 32))),
    });
  }

  // Ensure strictly monotonic non-decreasing offsets
  const ordered: WrittenFrameAnchor[] = [];
  for (const item of anchors) {
    const prevTop = ordered.length > 0 ? ordered[ordered.length - 1].top : -1;
    if (item.top > prevTop + 24 || ordered.length === 0) {
      ordered.push(item);
    }
  }
  return ordered;
}

function LenisScrollEnvBridge() {
  const lenis = useLenis();

  useEffect(() => {
    bindLenisScrollBus(lenis ?? null);
    return () => bindLenisScrollBus(null);
  }, [lenis]);

  useEffect(() => {
    if (!lenis) return;

    let rafId = 0;
    let lastTime = performance.now();

    const frame = (time: number) => {
      const deltaSec = Math.min(Math.max((time - lastTime) / 1000, 1 / 240), 0.1);
      lastTime = time;

      // 1. Advance Lenis & update DOM + ScrollBus snapshot first
      lenis.raf(time);

      // 2. Sync GSAP ScrollTrigger with fresh scroll position in the same frame
      ScrollTrigger.update();

      // 3. Run DOM curvature & canvas animations in unified frame sync
      runFrameEffects(time, deltaSec);

      rafId = window.requestAnimationFrame(frame);
    };

    rafId = window.requestAnimationFrame(frame);

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [lenis]);

  // Immediate smooth Lenis frame-to-frame navigation straight to every written content frame
  useEffect(() => {
    if (!lenis) return;

    let lastStepAt = 0;
    let lastDir: 1 | -1 | 0 = 0;
    let wheelBurstTimer = 0;
    let burstConsumed = false;

    const glideToDirection = (direction: 1 | -1) => {
      const now = performance.now();
      if (!shouldAcceptWheelFrameStep(now, lastStepAt, lastDir, direction, 950)) {
        return;
      }

      const frames = readWrittenFrameAnchors(lenis.scroll);
      const target = resolveWrittenFrameTarget(lenis.scroll, frames, direction, 56);
      if (!target) return;

      lastStepAt = now;
      lastDir = direction;
      const dist = Math.abs(target.top - lenis.scroll);
      const duration = Math.min(2.8, Math.max(1.75, 1.65 + (dist / 2200) * 1.0));

      lenis.scrollTo(target.top, {
        duration,
        easing: smoothGlideEasing,
        lock: false,
      });
    };

    const handleWheel = (e: WheelEvent) => {
      if (lenis.isStopped) return;
      if (e.ctrlKey || Math.abs(e.deltaY) < 4) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) * 1.4) return;

      // Prevent native jumpiness so Lenis executes a single silky glide straight to the next written frame
      e.preventDefault();

      const direction: 1 | -1 = e.deltaY > 0 ? 1 : -1;

      window.clearTimeout(wheelBurstTimer);
      wheelBurstTimer = window.setTimeout(() => {
        burstConsumed = false;
      }, 160);

      if (!burstConsumed || direction !== lastDir) {
        burstConsumed = true;
        glideToDirection(direction);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (lenis.isStopped) return;
      const activeTag = document.activeElement?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') {
        return;
      }

      if (e.key === 'PageDown' || e.key === 'ArrowDown' || (e.key === ' ' && !e.shiftKey)) {
        e.preventDefault();
        glideToDirection(1);
      } else if (e.key === 'PageUp' || e.key === 'ArrowUp' || (e.key === ' ' && e.shiftKey)) {
        e.preventDefault();
        glideToDirection(-1);
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.clearTimeout(wheelBurstTimer);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [lenis]);

  return null;
}

export function ScrollRoot({ children }: { children: ReactNode }) {
  return (
    <ReactLenis root options={LENIS_OPTIONS}>
      <LenisScrollEnvBridge />
      {children}
    </ReactLenis>
  );
}
