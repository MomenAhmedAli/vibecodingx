import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/+*#-_';

type TickerListener = () => void;

const listeners = new Set<TickerListener>();
let tickerId: number | null = null;
let transitionOpened = true;
const readyWaiters = new Set<() => void>();

export function setScrambleTransitionOpen(isOpen: boolean) {
  transitionOpened = isOpen;
  if (isOpen) {
    readyWaiters.forEach((fn) => fn());
    readyWaiters.clear();
  }
}

function subscribeTicker(listener: TickerListener) {
  listeners.add(listener);
  if (tickerId === null) {
    tickerId = window.setInterval(() => {
      listeners.forEach((fn) => fn());
    }, 40);
  }
}

function unsubscribeTicker(listener: TickerListener) {
  listeners.delete(listener);
  if (listeners.size === 0 && tickerId !== null) {
    window.clearInterval(tickerId);
    tickerId = null;
  }
}

interface ScrambleLinesProps {
  text: string;
  className?: string;
  delayMs?: number;
  triggerKey?: string | number;
}

export function ScrambleLines({
  text,
  className = '',
  delayMs = 0,
  triggerKey,
}: ScrambleLinesProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const [displayText, setDisplayText] = useState(text);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let finished = false;
    let tickCount = 0;
    let delayTimer = 0;
    const totalTicks = Math.max(10, Math.min(24, Math.ceil(text.length * 0.75)));

    const onTick = () => {
      if (finished) return;
      tickCount += 1;
      const progress = Math.min(1, tickCount / totalTicks);
      const lockedCount = Math.floor(progress * text.length);

      let next = '';
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (ch === ' ' || ch === '\n') {
          next += ch;
        } else if (i < lockedCount) {
          next += ch;
        } else {
          next += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
        }
      }

      setDisplayText(next);

      if (progress >= 1) {
        finished = true;
        setDisplayText(text);
        unsubscribeTicker(onTick);
      }
    };

    let currentLaunch: (() => void) | null = null;

    const startScramble = () => {
      window.clearTimeout(delayTimer);
      unsubscribeTicker(onTick);
      if (currentLaunch) {
        readyWaiters.delete(currentLaunch);
      }
      finished = false;
      tickCount = 0;

      const launch = () => {
        if (delayMs > 0) {
          delayTimer = window.setTimeout(() => {
            if (!finished) subscribeTicker(onTick);
          }, delayMs);
        } else {
          subscribeTicker(onTick);
        }
      };

      currentLaunch = launch;

      if (transitionOpened) {
        launch();
      } else {
        readyWaiters.add(launch);
      }
    };

    const ctx = gsap.context(() => {
      if (triggerKey) {
        startScramble();
      }

      ScrollTrigger.create({
        trigger: el,
        start: 'top 94%',
        end: 'bottom 6%',
        onEnter: startScramble,
        onEnterBack: startScramble,
      });
    }, containerRef);

    return () => {
      finished = true;
      window.clearTimeout(delayTimer);
      if (currentLaunch) {
        readyWaiters.delete(currentLaunch);
      }
      unsubscribeTicker(onTick);
      ctx.revert();
    };
  }, [text, delayMs, triggerKey]);

  return (
    <span ref={containerRef} className={className}>
      {displayText}
    </span>
  );
}
