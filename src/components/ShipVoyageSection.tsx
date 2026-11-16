import { useEffect, useRef } from 'react';
import { addFrameEffect } from '../lib/lenisScrollBus';
import {
  createCircleFormation3D,
  type YachtCalloutKey,
} from '../lib/circleFormation3D';
import {
  clamp,
  computeVoyageFrameState,
  computeVoyageSectionProgress,
} from '../lib/voyageChoreography';

interface ShipVoyageSectionProps {
  theme?: 'light' | 'dark';
}

interface YachtPointerCallout {
  key: YachtCalloutKey;
  /** Strictly two words as requested */
  label: string;
  labelXPct: number;
  labelYPct: number;
  align: 'left' | 'right';
}

const YACHT_CALLOUTS: YachtPointerCallout[] = [
  {
    key: 'bow',
    label: 'FLARED BOW',
    labelXPct: 5,
    labelYPct: 18,
    align: 'left',
  },
  {
    key: 'bridge',
    label: 'RADAR BRIDGE',
    labelXPct: 5,
    labelYPct: 18,
    align: 'right',
  },
  {
    key: 'keel',
    label: 'KEEL HULL',
    labelXPct: 5,
    labelYPct: 82,
    align: 'left',
  },
  {
    key: 'props',
    label: 'TWIN PROPS',
    labelXPct: 5,
    labelYPct: 82,
    align: 'right',
  },
];

export function ShipVoyageSection({ theme = 'dark' }: ShipVoyageSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const stageLabelRef = useRef<HTMLSpanElement>(null);
  const svgOverlayRef = useRef<SVGSVGElement>(null);
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const dotRefs = useRef<(SVGCircleElement | null)[]>([]);
  const labelRefs = useRef<(HTMLDivElement | null)[]>([]);

  const themeRef = useRef(theme);
  themeRef.current = theme;

  useEffect(() => {
    const section = sectionRef.current;
    const mount = canvasMountRef.current;
    if (!section || !mount) return;

    let vw = window.innerWidth;
    let vh = window.innerHeight;

    const syncSvgViewport = () => {
      if (svgOverlayRef.current) {
        svgOverlayRef.current.setAttribute('viewBox', `0 0 ${Math.max(vw, 1)} ${Math.max(vh, 1)}`);
      }
    };
    syncSvgViewport();

    const formation3D = createCircleFormation3D(mount, vw, vh);
    if (!formation3D) return;

    const handleResize = () => {
      vw = window.innerWidth;
      vh = window.innerHeight;
      syncSvgViewport();
      formation3D.resize(vw, vh);
    };

    window.addEventListener('resize', handleResize);

    let disposed = false;
    let hasInitialized = false;
    let smoothProgress = 0;
    let elapsedSec = 0;

    const removeEffect = addFrameEffect(20, (_timeMs, delta) => {
      if (disposed) return;

      const dt = Math.min(Math.max(delta, 1 / 240), 0.1);
      const rect = section.getBoundingClientRect();
      if (rect.bottom < -120 || rect.top > vh + 120) {
        hasInitialized = false;
        formation3D.clearCanvas();
        if (svgOverlayRef.current) {
          svgOverlayRef.current.style.opacity = '0';
        }
        labelRefs.current.forEach((el) => {
          if (el) el.style.opacity = '0';
        });
        return;
      }

      const rawProgress = computeVoyageSectionProgress(rect.top, rect.height, vh);
      if (!hasInitialized || Math.abs(rawProgress - smoothProgress) > 0.18) {
        smoothProgress = rawProgress;
        hasInitialized = true;
      } else {
        const dampRate = rawProgress >= 0.85 ? 24 : 12;
        smoothProgress += (rawProgress - smoothProgress) * (1 - Math.exp(-dt * dampRate));
      }
      const state = computeVoyageFrameState(smoothProgress);

      const exitGuard =
        rawProgress > 0.72 ? clamp((rect.bottom - vh * 0.86) / (vh * 0.14), 0, 1) : 1;
      const effectiveYachtAlpha = state.yachtAlpha * exitGuard;

      elapsedSec += dt;

      if (stageLabelRef.current) {
        stageLabelRef.current.textContent = state.stageLabel;
      }

      const anchors = formation3D.updateAndRender(
        state,
        effectiveYachtAlpha,
        elapsedSec,
        themeRef.current,
        vw,
        vh
      );

      const calloutOpacity = state.calloutAlpha * exitGuard;
      const drawPct = clamp(state.lineDrawProgress, 0, 1);

      if (svgOverlayRef.current) {
        svgOverlayRef.current.style.opacity = calloutOpacity.toFixed(3);
      }

      const isMobile = vw < 768;

      YACHT_CALLOUTS.forEach((item, idx) => {
        const labelEl = labelRefs.current[idx];
        const pathEl = pathRefs.current[idx];
        const dotEl = dotRefs.current[idx];

        const anchor = anchors ? anchors[item.key] : null;
        const marginPct = isMobile ? 5.5 : item.labelXPct;
        const rowYPct = isMobile ? (item.labelYPct < 50 ? 16 : 84) : item.labelYPct;
        const labelY = (rowYPct / 100) * vh;

        if (labelEl) {
          if (item.align === 'left') {
            labelEl.style.left = `${marginPct}%`;
            labelEl.style.right = 'auto';
          } else {
            labelEl.style.left = 'auto';
            labelEl.style.right = `${marginPct}%`;
          }
          labelEl.style.top = `${labelY.toFixed(1)}px`;
          labelEl.style.opacity = calloutOpacity.toFixed(3);
        }

        if (
          pathEl &&
          dotEl &&
          labelEl &&
          anchor &&
          anchor.visible &&
          drawPct > 0.01 &&
          calloutOpacity > 0.01
        ) {
          const ax = (anchor.xPct / 100) * vw;
          const ay = (anchor.yPct / 100) * vh;

          // Stop leader line cleanly 12px outside the text box so it never strikes through words
          const gapPx = isMobile ? 10 : 14;
          const labelStopX =
            item.align === 'left'
              ? labelEl.offsetLeft + labelEl.offsetWidth + gapPx
              : labelEl.offsetLeft - gapPx;
          const elbowX = ax + (labelStopX - ax) * 0.48;

          pathEl.setAttribute(
            'd',
            `M ${ax.toFixed(1)} ${ay.toFixed(1)} L ${elbowX.toFixed(1)} ${labelY.toFixed(1)} L ${labelStopX.toFixed(1)} ${labelY.toFixed(1)}`
          );

          const totalLen = pathEl.getTotalLength();
          if (totalLen > 0) {
            if (drawPct >= 0.995) {
              pathEl.style.strokeDasharray = 'none';
              pathEl.style.strokeDashoffset = '0';
            } else {
              pathEl.style.strokeDasharray = `${totalLen.toFixed(1)} ${totalLen.toFixed(1)}`;
              pathEl.style.strokeDashoffset = (totalLen * (1 - drawPct)).toFixed(1);
            }
          }
          pathEl.style.opacity = '1';

          dotEl.setAttribute('cx', ax.toFixed(1));
          dotEl.setAttribute('cy', ay.toFixed(1));
          dotEl.style.opacity = Math.min(1, drawPct * 2.2).toFixed(3);
        } else if (pathEl && dotEl) {
          pathEl.style.opacity = '0';
          dotEl.style.opacity = '0';
        }
      });
    });

    return () => {
      disposed = true;
      removeEffect();
      window.removeEventListener('resize', handleResize);
      formation3D.dispose();
    };
  }, []);

  return (
    <section
      id="ship-voyage"
      ref={sectionRef}
      aria-label="3D Luxury Yacht Camera Journey"
      className="relative w-full h-[440vh] z-10"
    >
      <div className="sticky top-0 w-full h-screen overflow-hidden flex items-center justify-center">
        {/* 3D Luxury Yacht Canvas */}
        <div
          ref={canvasMountRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />

        {/* Quiet Top Stage Marker */}
        <div className="absolute top-[74px] sm:top-[78px] left-6 sm:left-12 right-6 sm:right-12 flex items-center justify-between font-pixel text-[10px] sm:text-xs uppercase pointer-events-none z-20">
          <span ref={stageLabelRef} className="opacity-75">
            01 // EXTERIOR APPROACH
          </span>
          <span className="opacity-55 hidden sm:inline">YACHT ANATOMY</span>
        </div>

        {/* SVG Leader Pointer Lines Connecting Yacht Features -> Strictly 2-Word Callouts */}
        <svg
          ref={svgOverlayRef}
          className="absolute inset-0 w-full h-full pointer-events-none z-20 opacity-0"
          fill="none"
          aria-hidden="true"
        >
          {YACHT_CALLOUTS.map((item, idx) => (
            <g key={`leader-${item.key}`}>
              <path
                ref={(el) => {
                  pathRefs.current[idx] = el;
                }}
                stroke="currentColor"
                strokeWidth="1.35"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="opacity-85"
              />
              <circle
                ref={(el) => {
                  dotRefs.current[idx] = el;
                }}
                r="3.2"
                fill="currentColor"
              />
            </g>
          ))}
        </svg>

        {/* Strictly 2-Word Minimal Callout Labels (Zero Bulky Card Boxes) */}
        <div className="absolute inset-0 pointer-events-none z-20">
          {YACHT_CALLOUTS.map((item, idx) => (
            <div
              key={item.key}
              ref={(el) => {
                labelRefs.current[idx] = el;
              }}
              className={`absolute -translate-y-1/2 opacity-0 will-change-transform ${
                item.align === 'left' ? 'text-left' : 'text-right'
              }`}
            >
              <span className="font-pixel text-[11px] sm:text-xs lg:text-sm font-semibold uppercase tracking-[0.2em] whitespace-nowrap">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
