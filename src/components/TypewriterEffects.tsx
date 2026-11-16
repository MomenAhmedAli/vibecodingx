import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Splits a string into grapheme clusters when Intl.Segmenter is available
 * so Arabic diacritics stay attached to their base letters during typing.
 */
function splitGraphemes(input: string): string[] {
  const SegmenterCtor = (
    Intl as unknown as {
      Segmenter?: new (
        locales?: string | string[],
        options?: { granularity: 'grapheme' }
      ) => { segment: (text: string) => Iterable<{ segment: string }> };
    }
  ).Segmenter;

  if (SegmenterCtor) {
    const segmenter = new SegmenterCtor(undefined, { granularity: 'grapheme' });
    return Array.from(segmenter.segment(input), (item) => item.segment);
  }
  return Array.from(input);
}

interface TypewriterTextProps {
  text: string;
  speedMs?: number;
  delayMs?: number;
  className?: string;
  showCursor?: boolean;
  startOnView?: boolean;
  typingColor?: string;
}

/**
 * GSAP-powered character-by-character typewriter effect for light editorial copy.
 * Optionally highlights characters in typingColor while actively typing, then fades back to inherit color.
 */
export function TypewriterText({
  text,
  speedMs = 24,
  delayMs = 0,
  className = '',
  showCursor = true,
  startOnView = true,
  typingColor,
}: TypewriterTextProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const cursorRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const textEl = textRef.current;
    if (!container || !textEl) return;

    const chars = splitGraphemes(text);
    const totalDuration = Math.max(0.25, (chars.length * speedMs) / 1000);
    const proxy = { count: 0 };

    const ctx = gsap.context(() => {
      textEl.textContent = '';
      if (typingColor) {
        textEl.style.color = typingColor;
      }

      if (cursorRef.current) {
        gsap.to(cursorRef.current, {
          opacity: 0,
          duration: 0.45,
          repeat: -1,
          yoyo: true,
          ease: 'steps(1)',
        });
      }

      const typeTween = gsap.to(proxy, {
        count: chars.length,
        duration: totalDuration,
        delay: delayMs / 1000,
        ease: 'none',
        paused: startOnView,
        onStart: () => {
          if (typingColor) {
            textEl.style.color = typingColor;
          }
        },
        onUpdate: () => {
          const nextCount = Math.round(proxy.count);
          textEl.textContent = chars.slice(0, nextCount).join('');
        },
        onComplete: () => {
          textEl.textContent = text;
          textEl.style.color = '';
          if (cursorRef.current) {
            cursorRef.current.style.display = 'none';
          }
        },
      });

      if (startOnView) {
        const restartTyping = () => {
          proxy.count = 0;
          textEl.textContent = '';
          if (typingColor) {
            textEl.style.color = typingColor;
          }
          if (cursorRef.current) {
            cursorRef.current.style.display = 'inline-block';
          }
          typeTween.restart(true);
        };

        const clearTyping = () => {
          typeTween.pause(0);
          proxy.count = 0;
          textEl.textContent = '';
          textEl.style.color = '';
        };

        ScrollTrigger.create({
          trigger: container,
          start: 'top 92%',
          end: 'bottom 8%',
          onEnter: restartTyping,
          onEnterBack: restartTyping,
          onLeave: clearTyping,
          onLeaveBack: clearTyping,
        });
      }
    }, containerRef);

    return () => ctx.revert();
  }, [text, speedMs, delayMs, startOnView, typingColor]);

  return (
    <span ref={containerRef} className={className}>
      <span
        ref={textRef}
        className="transition-colors duration-700 ease-out"
      />
      {showCursor && (
        <span
          ref={cursorRef}
          className="inline-block w-[0.45em] h-[0.9em] align-middle ml-0.5 bg-current"
          style={typingColor ? { backgroundColor: typingColor } : undefined}
          aria-hidden="true"
        />
      )}
    </span>
  );
}

interface GreetingLang {
  word: string;
  label: string;
  code: string;
  rtl?: boolean;
}

export const HERO_8_LANGUAGES: GreetingLang[] = [
  { word: 'GREETINGS.', label: 'ENGLISH', code: '01' },
  { word: 'HOLA.', label: 'SPANISH', code: '02' },
  { word: 'مرحباً.', label: 'ARABIC', code: '03', rtl: true },
  { word: 'こんにちは.', label: 'JAPANESE', code: '04' },
];

/**
 * GSAP infinite typewriter display cycling through the 4 requested languages:
 * GREETINGS. -> HOLA. -> مرحباً. -> こんにちは.
 * Types character-by-character, holds, erases character-by-character, and moves to the next language.
 */
export function TypewriterGreetings8() {
  const rootRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const wordRef = useRef<HTMLSpanElement>(null);
  const cursorRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const wordEl = wordRef.current;
    const headingEl = headingRef.current;
    if (!wordEl || !headingEl) return;

    const ctx = gsap.context(() => {
      if (cursorRef.current) {
        gsap.to(cursorRef.current, {
          opacity: 0,
          duration: 0.42,
          repeat: -1,
          yoyo: true,
          ease: 'steps(1)',
        });
      }

      const master = gsap.timeline({ repeat: -1 });

      HERO_8_LANGUAGES.forEach((lang) => {
        const chars = splitGraphemes(lang.word);
        const proxy = { count: 0 };
        const typeDuration = Math.max(0.48, chars.length * 0.065);
        const eraseDuration = Math.max(0.32, chars.length * 0.04);
        const dir = lang.rtl ? 'rtl' : 'ltr';

        master
          .call(() => {
            headingEl.setAttribute('dir', dir);
            proxy.count = 0;
            wordEl.textContent = '';
          })
          .to(proxy, {
            count: chars.length,
            duration: typeDuration,
            ease: 'none',
            onUpdate: () => {
              wordEl.textContent = chars.slice(0, Math.round(proxy.count)).join('');
            },
          })
          .to({}, { duration: 1.0 })
          .to(proxy, {
            count: 0,
            duration: eraseDuration,
            ease: 'none',
            onUpdate: () => {
              wordEl.textContent = chars.slice(0, Math.round(proxy.count)).join('');
            },
          })
          .to({}, { duration: 0.14 });
      });
    }, rootRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={rootRef} className="w-full flex flex-col items-center justify-center text-center">
      {/* Giant Display Typography with Fixed Line Height to Prevent Layout Shift */}
      <div className="w-full min-h-[1.06em] flex items-center justify-center text-[10vw] sm:text-[11vw] lg:text-[11.4vw] font-bold tracking-tight leading-[0.94] uppercase font-sans">
        <h1
          ref={headingRef}
          dir="ltr"
          className="inline-flex items-center justify-center"
          style={{ color: 'var(--text-color)' }}
        >
          <span ref={wordRef}>GREETINGS.</span>
          <span
            ref={cursorRef}
            className="inline-block w-[0.06em] h-[0.76em] mx-1 bg-current"
            aria-hidden="true"
          />
        </h1>
      </div>
    </div>
  );
}

interface RollingNumberProps {
  value: string;
  className?: string;
  triggerKey?: number;
  duration?: number;
  stagger?: number;
  start?: string;
}

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

/**
 * GSAP-driven mechanical rolling-scroll odometer for numeric digits triggered on scroll into view (and hover triggerKey).
 */
export function RollingNumber({
  value,
  className = '',
  triggerKey = 0,
  duration = 0.52,
  stagger = 0,
  start = 'top 94%',
}: RollingNumberProps) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const stripRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      const chars = value.split('');

      const runRoll = () => {
        chars.forEach((char, idx) => {
          const digit = Number(char);
          const strip = stripRefs.current[idx];
          if (!strip || !Number.isInteger(digit) || char < '0' || char > '9') return;

          gsap.fromTo(
            strip,
            { yPercent: 0 },
            {
              yPercent: -digit * 10,
              duration: duration + idx * stagger,
              ease: 'none',
              overwrite: 'auto',
            }
          );
        });
      };

      const resetRoll = () => {
        chars.forEach((char, idx) => {
          const strip = stripRefs.current[idx];
          if (!strip || char < '0' || char > '9') return;
          gsap.set(strip, { yPercent: 0 });
        });
      };

      if (triggerKey > 0) {
        runRoll();
        return;
      }

      ScrollTrigger.create({
        trigger: root,
        start,
        end: 'bottom 6%',
        onEnter: runRoll,
        onEnterBack: runRoll,
        onLeave: resetRoll,
        onLeaveBack: resetRoll,
      });
    }, rootRef);

    return () => ctx.revert();
  }, [value, triggerKey, duration, stagger, start]);

  return (
    <span ref={rootRef} className={`inline-flex items-baseline tabular-nums ${className}`}>
      {value.split('').map((char, idx) => {
        const digit = Number(char);
        if (!Number.isInteger(digit) || char < '0' || char > '9') {
          return <span key={idx}>{char}</span>;
        }

        return (
          <span
            key={idx}
            className="relative inline-block h-[1em] overflow-hidden leading-none"
            style={{ minWidth: '0.68em' }}
          >
            <span
              ref={(el) => {
                stripRefs.current[idx] = el;
              }}
              className="flex flex-col items-center will-change-transform"
            >
              {DIGITS.map((d) => (
                <span key={d} className="h-[1em] flex items-center justify-center leading-none">
                  {d}
                </span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
}
