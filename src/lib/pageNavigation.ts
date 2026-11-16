export const ORDERED_PAGE_SECTION_IDS = [
  'hero',
  'stats',
  'work',
  'ship-voyage',
  'contact',
] as const;

export interface SectionRectInfo {
  id: string;
  top: number;
}

export interface WrittenFrameAnchor {
  id: string;
  top: number;
}

/**
 * Resolves the active ordered page index based on scrollTop and section offsets.
 */
export function resolveCurrentPageIndex(
  scrollTop: number,
  sections: SectionRectInfo[],
  offsetTolerance = 120
): number {
  if (sections.length === 0) return 0;

  let currentIndex = 0;
  for (let i = 0; i < sections.length; i++) {
    if (scrollTop + offsetTolerance >= sections[i].top) {
      currentIndex = i;
    }
  }
  return currentIndex;
}

/**
 * Returns the next or previous ordered section anchor in Page 1 -> Page 2 -> Page 3 order.
 */
export function resolveAdjacentPageTarget(
  scrollTop: number,
  sections: SectionRectInfo[],
  direction: 1 | -1,
  offsetTolerance = 120
): SectionRectInfo | null {
  if (sections.length === 0) return null;

  const currentIdx = resolveCurrentPageIndex(scrollTop, sections, offsetTolerance);
  const currentSection = sections[currentIdx];

  // If moving up while deep inside a tall section (like Selected Work or Circle section),
  // align cleanly to the top of the current section first before stepping to the previous page.
  if (direction === -1 && scrollTop - currentSection.top > 180) {
    return currentSection;
  }

  const nextIdx = Math.max(0, Math.min(sections.length - 1, currentIdx + direction));
  if (nextIdx === currentIdx && direction === 1 && currentIdx === sections.length - 1) {
    return sections[sections.length - 1];
  }
  return sections[nextIdx];
}

/**
 * Resolves the exact next or previous written content frame anchor so scrolling
 * immediately advances smoothly from one written frame to the next without getting stuck.
 */
export function resolveWrittenFrameTarget(
  scrollTop: number,
  frames: WrittenFrameAnchor[],
  direction: 1 | -1,
  tolerancePx = 56
): WrittenFrameAnchor | null {
  if (frames.length === 0) return null;

  if (direction === 1) {
    for (let i = 0; i < frames.length; i++) {
      if (frames[i].top > scrollTop + tolerancePx) {
        return frames[i];
      }
    }
    return frames[frames.length - 1];
  }

  for (let i = frames.length - 1; i >= 0; i--) {
    if (frames[i].top < scrollTop - tolerancePx) {
      return frames[i];
    }
  }
  return frames[0];
}

/**
 * Gates rapid trackpad/mouse wheel streams so one deliberate scroll gesture
 * advances cleanly by exactly one written frame while keeping reverse jumps responsive.
 */
export function shouldAcceptWheelFrameStep(
  nowMs: number,
  lastStepAtMs: number,
  lastDirection: 1 | -1 | 0,
  direction: 1 | -1,
  cooldownMs = 760
): boolean {
  if (direction !== lastDirection && nowMs - lastStepAtMs > 180) {
    return true;
  }
  return nowMs - lastStepAtMs >= cooldownMs;
}

/**
 * Gentle idle settle strictly near Page 1 (#hero), Page 2 (#stats), or Page 3 (#work) top boundaries
 * so transitions between the first three pages align cleanly without ever hijacking reading inside cards.
 */
export function resolveGentleBoundarySettleTarget(
  scrollTop: number,
  sections: SectionRectInfo[],
  thresholdPx = 92
): SectionRectInfo | null {
  const editorialSections = sections.slice(0, 3);
  let bestMatch: SectionRectInfo | null = null;
  let bestDistance = Infinity;

  for (let i = 0; i < editorialSections.length; i++) {
    const distance = Math.abs(scrollTop - editorialSections[i].top);
    if (distance > 4 && distance <= thresholdPx && distance < bestDistance) {
      bestDistance = distance;
      bestMatch = editorialSections[i];
    }
  }

  return bestMatch;
}
