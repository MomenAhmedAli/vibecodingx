import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeEdgeShadeMetrics } from './scrollShade.ts';

describe('scrollShade', () => {
  it('has zero curl and full opacity at vertical center of viewport', () => {
    const m = computeEdgeShadeMetrics(450, 900, 0.8, 0.5);
    assert.equal(m.edgeProfile, 0);
    assert.equal(m.scaleX, 1);
    assert.equal(m.opacity, 1);
    assert.equal(m.shadeAlpha, 0);
  });

  it('increases edge curvature and shading smoothly toward top and bottom edges during scroll', () => {
    const center = computeEdgeShadeMetrics(450, 900, 0.7, 0.6);
    const topEdge = computeEdgeShadeMetrics(20, 900, 0.7, 0.6);
    const bottomEdge = computeEdgeShadeMetrics(880, 900, 0.7, 0.6);

    assert.ok(topEdge.edgeProfile > center.edgeProfile);
    assert.ok(bottomEdge.edgeProfile > center.edgeProfile);
    assert.ok(topEdge.scaleX < 1);
    assert.ok(topEdge.shadeAlpha > 0.2);
    assert.ok(topEdge.opacity < 1);
    assert.ok(topEdge.rotateXDeg > 0);
    assert.ok(bottomEdge.rotateXDeg < 0);
  });
});
