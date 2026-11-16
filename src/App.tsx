/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type Lenis from 'lenis';
import { useLenis } from 'lenis/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { addFrameEffect, getLenisScrollSnapshot } from './lib/lenisScrollBus';
import { computeEdgeShadeMetrics } from './lib/scrollShade';
import { ArchitecturalGrid } from './components/ArchitecturalGrid';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { BioStatsSection } from './components/BioStatsSection';
import { SelectedWorkSection, PROJECTS_DATA } from './components/SelectedWorkSection';
import { ShipVoyageSection } from './components/ShipVoyageSection';
import { CallToActionSection } from './components/CallToActionSection';
import { ProjectModal } from './components/ProjectModal';
import { ContactDrawer } from './components/ContactDrawer';
import { CenterCylinderScroll } from './components/CenterCylinderScroll';
import { DotMatrixTransition } from './components/DotMatrixTransition';
import { LoadingScreen } from './components/LoadingScreen';
import { Project } from './types';

gsap.registerPlugin(ScrollTrigger);
gsap.ticker.lagSmoothing(0);

export default function App() {
  const [scrollVelocity, setScrollVelocity] = useState(0);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [transitionId, setTransitionId] = useState(0);
  const [isLoading, setIsLoading] = useState(
    () => typeof window === 'undefined' || !window.location.search.includes('autostart=1')
  );
  const [heroReady, setHeroReady] = useState(
    () => typeof window !== 'undefined' && window.location.search.includes('autostart=1')
  );

  // Sync theme attribute on root element
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
    setTransitionId((n) => n + 1);
  };

  const shiftElsRef = useRef<HTMLElement[]>([]);
  const shadeElsRef = useRef<HTMLElement[]>([]);
  const smoothedVelRef = useRef(0);
  const curlActivityRef = useRef(0);

  // Subscribe to Lenis scroll event emitted inside unified ScrollRoot frame
  const handleLenisScroll = useCallback((instance: Lenis) => {
    setScrollVelocity(instance.velocity);
    document.documentElement.style.setProperty('--scroll-velocity', String(instance.velocity));
  }, []);

  const lenis = useLenis(handleLenisScroll);

  useEffect(() => {
    shiftElsRef.current = Array.from(document.querySelectorAll<HTMLElement>('[data-scroll-shift]'));
    shadeElsRef.current = Array.from(document.querySelectorAll<HTMLElement>('[data-scroll-shade]'));

    let prevScrollY: number | null = null;

    const removeEffect = addFrameEffect(10, (_time, deltaSec) => {
      const dt = Math.min(Math.max(deltaSec, 1 / 240), 0.1);
      const currY = getLenisScrollSnapshot().scrollTop;
      const rawVel = prevScrollY == null ? 0 : (currY - prevScrollY) / dt;
      prevScrollY = currY;

      // Exact same velocity smoothing curve as DomSyncWebGL so text & image edge shade stay locked
      const target = Math.max(-1, Math.min(1, rawVel / 1350));
      const tau = Math.abs(target) > Math.abs(smoothedVelRef.current) ? 0.14 : 0.42;
      const alpha = 1 - Math.exp(-dt / tau);
      smoothedVelRef.current += (target - smoothedVelRef.current) * alpha;

      const activityTarget = Math.min(1, Math.abs(rawVel) / 1350);
      const actTau = activityTarget > curlActivityRef.current ? 0.14 : 0.42;
      curlActivityRef.current +=
        (activityTarget - curlActivityRef.current) * (1 - Math.exp(-dt / actTau));

      const dragY = (-smoothedVelRef.current * 2.8).toFixed(2);
      const skewDeg = (smoothedVelRef.current * 0.08).toFixed(3);

      for (let i = 0; i < shiftElsRef.current.length; i++) {
        shiftElsRef.current[i].style.transform = `translate3d(0, ${dragY}px, 0) skewY(${skewDeg}deg)`;
      }

      const vh = window.innerHeight || 900;
      for (let i = 0; i < shadeElsRef.current.length; i++) {
        const el = shadeElsRef.current[i];
        const rect = el.getBoundingClientRect();
        if (rect.bottom < -120 || rect.top > vh + 120) continue;

        const centerY = rect.top + rect.height * 0.5;
        const m = computeEdgeShadeMetrics(
          centerY,
          vh,
          curlActivityRef.current,
          smoothedVelRef.current
        );

        el.style.transform = `perspective(1100px) translate3d(0, ${m.translateY.toFixed(
          2
        )}px, 0) rotateX(${m.rotateXDeg.toFixed(2)}deg) scaleX(${m.scaleX.toFixed(4)})`;
        el.style.filter = '';
      }
    });

    const refreshId = window.requestAnimationFrame(() => {
      ScrollTrigger.refresh();
    });

    return () => {
      removeEffect();
      window.cancelAnimationFrame(refreshId);
    };
  }, []);

  // Pause Lenis background scroll while loading, modal, or drawer is open
  useEffect(() => {
    if (!lenis) return;
    if (isLoading || selectedProject || isContactOpen) {
      lenis.stop();
    } else {
      lenis.start();
    }
  }, [lenis, isLoading, selectedProject, isContactOpen]);

  const scrollToTarget = (target: string | number) => {
    if (lenis) {
      lenis.scrollTo(target, { duration: 2.1 });
    } else if (typeof target === 'number') {
      window.scrollTo({ top: target, behavior: 'smooth' });
    } else {
      const el = document.querySelector(target);
      el?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToProgress = (progress: number, immediate = false) => {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const targetY = Math.max(0, progress * maxScroll);
    if (lenis) {
      lenis.scrollTo(targetY, immediate ? { immediate: true } : { duration: 1.4 });
    } else {
      window.scrollTo({ top: targetY, behavior: immediate ? 'auto' : 'smooth' });
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col relative transition-colors duration-300"
      style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}
    >
      {/* Portfolio Work Showcase Loading Screen before revealing Page 1 */}
      {isLoading && (
        <LoadingScreen
          theme={theme}
          onRevealStart={() => setHeroReady(true)}
          onComplete={() => {
            setHeroReady(true);
            setIsLoading(false);
          }}
        />
      )}

      {/* Radial Dot-Matrix Cell Transition fitted to Light/Dark Color Theme */}
      <DotMatrixTransition theme={theme} transitionId={transitionId} />

      {/* Architectural Grid with Ambient Lighting Behind */}
      <ArchitecturalGrid rowHeight={320} theme={theme} />

      {/* Top Nav Bar */}
      <Header
        onOpenContact={() => setIsContactOpen(true)}
        onScrollToWork={() => scrollToTarget('#work')}
        onScrollToAbout={() => scrollToTarget('#stats')}
        onScrollToContact={() => scrollToTarget('#contact')}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main Content Flow */}
      <main className="flex-1 flex flex-col relative z-10 pt-[66px]">
        {/* 1. Hero Section: Reference Layout over ArchitecturalGrid Background */}
        <HeroSection
          scrollVelocity={scrollVelocity}
          theme={theme}
          isReady={heroReady}
          onOpenContact={() => setIsContactOpen(true)}
        />

        {/* 2. Bio & Experience Row + About Me (//01) */}
        <BioStatsSection />

        {/* 3. Selected Work (//02) */}
        <SelectedWorkSection
          onSelectProject={(project) => setSelectedProject(project)}
          theme={theme}
        />

        {/* 4. Scroll-Driven 3D Sky Ship -> Telescope -> Rapid Dive -> Full-Body Helmsman */}
        <ShipVoyageSection theme={theme} />

        {/* 5. Final Frame: Get ready for beyond (//03) + Behance/LinkedIn + Name & Date */}
        <CallToActionSection />
      </main>

      {/* Interactive Case Study Modal */}
      <ProjectModal
        project={selectedProject}
        projects={PROJECTS_DATA}
        theme={theme}
        onSelectProject={(project) => setSelectedProject(project)}
        onNavigateSection={(selector) => {
          setSelectedProject(null);
          window.setTimeout(() => scrollToTarget(selector), 60);
        }}
        onOpenContact={() => {
          setSelectedProject(null);
          window.setTimeout(() => setIsContactOpen(true), 60);
        }}
        onClose={() => setSelectedProject(null)}
      />

      {/* Interactive Contact Drawer */}
      <ContactDrawer
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
      />

      {/* Centered Elongated Cylindrical Scroll Controller */}
      <CenterCylinderScroll onScrollToProgress={scrollToProgress} theme={theme} />
    </div>
  );
}
