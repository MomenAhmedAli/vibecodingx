export interface VoyageFrameState {
  stageIndex: 1 | 2 | 3 | 4;
  stageLabel: string;
  /** Overall visibility of the 3D yacht scene [0..1] */
  yachtAlpha: number;
  /** Initial far exterior approach progress [0..1] */
  approachProgress: number;
  /** Camera glide inside salon & forward toward bow [0..1] */
  interiorForwardProgress: number;
  /** Camera dive downward beneath waterline / keel [0..1] */
  diveUnderProgress: number;
  /** Draw progress [0..1] of the pointer leader lines */
  lineDrawProgress: number;
  /** Visibility [0..1] of the strictly 2-word callout labels */
  calloutAlpha: number;
  /** Final fade / exit progress [0..1] */
  vanishProgress: number;
}

export function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / Math.max(edge1 - edge0, 1e-5), 0, 1);
  return t * t * (3 - 2 * t);
}

export function linearStep(edge0: number, edge1: number, x: number): number {
  return clamp((x - edge0) / Math.max(edge1 - edge0, 1e-5), 0, 1);
}

export function isCompassActiveInSection(
  rectTop: number,
  rectBottom: number,
  viewportHeight: number
): boolean {
  if (viewportHeight <= 0) return false;
  const visibleTop = Math.max(rectTop, 0);
  const visibleBottom = Math.min(rectBottom, viewportHeight);
  const visiblePx = Math.max(0, visibleBottom - visibleTop);
  return visiblePx >= viewportHeight * 0.55;
}

export function computeVoyageSectionProgress(
  rectTop: number,
  rectHeight: number,
  viewportHeight: number
): number {
  const travel = Math.max(rectHeight - viewportHeight, 1);
  return clamp(-rectTop / travel, 0, 1);
}

/**
 * 4-Stage Scroll Choreography for the 3D Luxury Yacht Camera Journey:
 * 1. Exterior from afar (0.00 -> 0.24)
 * 2. Glide inside salon & forward toward the bow (0.24 -> 0.50)
 * 3. Dive downward beneath hull + draw pointer lines to 2-word callouts (0.50 -> 0.80)
 * 4. Callouts & yacht fade out cleanly before CTA (0.80 -> 0.94)
 */
export function computeVoyageFrameState(rawProgress: number): VoyageFrameState {
  const p = clamp(rawProgress, 0, 1);

  const entryAlpha = linearStep(0.0, 0.08, p);
  const approachProgress = smoothstep(0.0, 0.24, p);
  const interiorForwardProgress = smoothstep(0.22, 0.48, p);
  const diveUnderProgress = smoothstep(0.48, 0.62, p);

  const lineDrawProgress = smoothstep(0.58, 0.67, p);
  const calloutIn = smoothstep(0.61, 0.69, p);
  const calloutOut = 1 - smoothstep(0.79, 0.86, p);
  const calloutAlpha = clamp(calloutIn * calloutOut, 0, 1);

  const vanishProgress = smoothstep(0.84, 0.94, p);
  const yachtAlpha = clamp(entryAlpha * (1 - vanishProgress), 0, 1);

  let stageIndex: 1 | 2 | 3 | 4 = 1;
  let stageLabel = '01 // EXTERIOR APPROACH';
  if (p >= 0.80) {
    stageIndex = 4;
    stageLabel = '04 // HORIZON EXIT';
  } else if (p >= 0.50) {
    stageIndex = 3;
    stageLabel = '03 // SUBSURFACE ANATOMY';
  } else if (p >= 0.23) {
    stageIndex = 2;
    stageLabel = '02 // INTERIOR SALON';
  }

  return {
    stageIndex,
    stageLabel,
    yachtAlpha,
    approachProgress,
    interiorForwardProgress,
    diveUnderProgress,
    lineDrawProgress,
    calloutAlpha,
    vanishProgress,
  };
}
