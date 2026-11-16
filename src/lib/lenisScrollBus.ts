import { useSyncExternalStore } from 'react';
import type Lenis from 'lenis';

export interface ScrollSnapshot {
  scrollTop: number;
  limit: number;
  progress: number;
  velocity: number;
  direction: number;
  viewportHeight: number;
}

const SERVER_SCROLL_SNAPSHOT: ScrollSnapshot = {
  scrollTop: 0,
  limit: 0,
  progress: 0,
  velocity: 0,
  direction: 0,
  viewportHeight: 0,
};

let snapshot: ScrollSnapshot = { ...SERVER_SCROLL_SNAPSHOT };
const listeners = new Set<() => void>();
let unbind: (() => void) | null = null;

function notifyListeners() {
  for (const listener of listeners) listener();
}

export const bindLenisScrollBus = (lenis: Lenis | null) => {
  unbind?.();
  unbind = null;
  if (!lenis) return;

  const updateFromLenis = (instance: Lenis) => {
    const vh = typeof window !== 'undefined' ? window.innerHeight : 0;
    snapshot = {
      scrollTop: Number.isFinite(instance.scroll) ? instance.scroll : 0,
      limit: Number.isFinite(instance.limit) ? instance.limit : 0,
      progress: Number.isFinite(instance.progress) ? instance.progress : 0,
      velocity: Number.isFinite(instance.velocity) ? instance.velocity : 0,
      direction: Number.isFinite(instance.direction) ? instance.direction : 0,
      viewportHeight: vh,
    };
    notifyListeners();
  };

  const onScroll = (instance: Lenis) => {
    updateFromLenis(instance);
  };

  lenis.on('scroll', onScroll);
  unbind = () => lenis.off('scroll', onScroll);
  updateFromLenis(lenis);
};

export const getLenisScrollSnapshot = (): ScrollSnapshot => snapshot;

export const subscribeLenisScroll = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const useLenisScrollSnapshot = (): ScrollSnapshot =>
  useSyncExternalStore(
    subscribeLenisScroll,
    getLenisScrollSnapshot,
    () => SERVER_SCROLL_SNAPSHOT
  );

// Deterministic post-Lenis frame consumer registry so DOM & WebGL execute inside ONE loop
export type FrameEffectCallback = (timeMs: number, deltaSec: number) => void;

interface RegisteredEffect {
  id: number;
  priority: number;
  cb: FrameEffectCallback;
}

let nextEffectId = 1;
const effects: RegisteredEffect[] = [];

export function addFrameEffect(priority: number, cb: FrameEffectCallback): () => void {
  const id = nextEffectId++;
  effects.push({ id, priority, cb });
  effects.sort((a, b) => a.priority - b.priority || a.id - b.id);

  return () => {
    const idx = effects.findIndex((item) => item.id === id);
    if (idx !== -1) {
      effects.splice(idx, 1);
    }
  };
}

export function runFrameEffects(timeMs: number, deltaSec: number) {
  for (let i = 0; i < effects.length; i++) {
    effects[i].cb(timeMs, deltaSec);
  }
}
