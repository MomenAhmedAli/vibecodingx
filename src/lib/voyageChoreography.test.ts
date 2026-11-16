import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeVoyageFrameState,
  computeVoyageSectionProgress,
  isCompassActiveInSection,
} from './voyageChoreography';

test('isCompassActiveInSection is false outside section and true when dominant in viewport', () => {
  const vh = 900;
  assert.equal(isCompassActiveInSection(1200, 5200, vh), false);
  assert.equal(isCompassActiveInSection(700, 5200, vh), false);
  assert.equal(isCompassActiveInSection(-4800, -100, vh), false);
  assert.equal(isCompassActiveInSection(300, 4800, vh), true);
});

test('computeVoyageSectionProgress clamps smoothly between 0 and 1', () => {
  assert.equal(computeVoyageSectionProgress(400, 4680, 900), 0);
  assert.equal(computeVoyageSectionProgress(-5000, 4680, 900), 1);
  const mid = computeVoyageSectionProgress(-1890, 4680, 900);
  assert.ok(Math.abs(mid - 0.5) < 0.01);
});

test('luxury yacht journey moves from afar exterior, inside forward, dives under with callout lines, and fades out', () => {
  // Stage 1: Exterior approach from afar
  const afar = computeVoyageFrameState(0.14);
  assert.equal(afar.stageIndex, 1);
  assert.equal(afar.yachtAlpha, 1);
  assert.equal(afar.interiorForwardProgress, 0);
  assert.equal(afar.diveUnderProgress, 0);
  assert.equal(afar.calloutAlpha, 0);

  // Stage 2: Glides inside salon & moves forward toward bow
  const inside = computeVoyageFrameState(0.38);
  assert.equal(inside.stageIndex, 2);
  assert.equal(inside.yachtAlpha, 1);
  assert.ok(inside.interiorForwardProgress > 0.6);
  assert.equal(inside.diveUnderProgress, 0);
  assert.equal(inside.calloutAlpha, 0);

  // Stage 3: Dives beneath waterline/hull & reveals pointer lines + 2-word callouts
  const under = computeVoyageFrameState(0.71);
  assert.equal(under.stageIndex, 3);
  assert.equal(under.yachtAlpha, 1);
  assert.equal(under.diveUnderProgress, 1);
  assert.equal(under.lineDrawProgress, 1);
  assert.equal(under.calloutAlpha, 1);

  // Stage 4: Both callouts and yacht fade out cleanly before CTA
  const exit = computeVoyageFrameState(0.94);
  assert.equal(exit.stageIndex, 4);
  assert.equal(exit.vanishProgress, 1);
  assert.equal(exit.calloutAlpha, 0);
  assert.equal(exit.yachtAlpha, 0);
});
