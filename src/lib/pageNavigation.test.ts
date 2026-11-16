import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ORDERED_PAGE_SECTION_IDS,
  resolveAdjacentPageTarget,
  resolveCurrentPageIndex,
  resolveGentleBoundarySettleTarget,
  resolveWrittenFrameTarget,
  shouldAcceptWheelFrameStep,
  SectionRectInfo,
} from './pageNavigation.ts';

const SAMPLE_SECTIONS: SectionRectInfo[] = [
  { id: 'hero', top: 0 },
  { id: 'stats', top: 860 },
  { id: 'work', top: 1280 },
  { id: 'ship-voyage', top: 2800 },
  { id: 'contact', top: 7400 },
];

const WRITTEN_FRAMES: SectionRectInfo[] = [
  { id: 'hero', top: 0 },
  { id: 'stats', top: 860 },
  { id: 'work', top: 1280 },
  { id: 'project-rivka', top: 1860 },
  { id: 'project-simulation-game', top: 2380 },
  { id: 'circle-copy', top: 3800 },
  { id: 'contact', top: 6200 },
];

describe('pageNavigation', () => {
  it('orders Page 1, Page 2, Page 3 cleanly first in sequence', () => {
    assert.deepEqual(ORDERED_PAGE_SECTION_IDS.slice(0, 3), ['hero', 'stats', 'work']);
  });

  it('steps sequentially from Page 1 -> Page 2 -> Page 3 and back', () => {
    assert.equal(resolveCurrentPageIndex(0, SAMPLE_SECTIONS), 0);
    assert.equal(resolveAdjacentPageTarget(0, SAMPLE_SECTIONS, 1)?.id, 'stats');
    assert.equal(resolveAdjacentPageTarget(860, SAMPLE_SECTIONS, 1)?.id, 'work');
    assert.equal(resolveAdjacentPageTarget(1280, SAMPLE_SECTIONS, -1)?.id, 'stats');
    assert.equal(resolveAdjacentPageTarget(860, SAMPLE_SECTIONS, -1)?.id, 'hero');
  });

  it('resolves exact next and previous written frames on immediate scroll', () => {
    assert.equal(resolveWrittenFrameTarget(0, WRITTEN_FRAMES, 1)?.id, 'stats');
    assert.equal(resolveWrittenFrameTarget(860, WRITTEN_FRAMES, 1)?.id, 'work');
    assert.equal(resolveWrittenFrameTarget(1280, WRITTEN_FRAMES, 1)?.id, 'project-rivka');
    assert.equal(resolveWrittenFrameTarget(2380, WRITTEN_FRAMES, 1)?.id, 'circle-copy');
    assert.equal(resolveWrittenFrameTarget(3800, WRITTEN_FRAMES, 1)?.id, 'contact');
    assert.equal(resolveWrittenFrameTarget(3800, WRITTEN_FRAMES, -1)?.id, 'project-simulation-game');
    assert.equal(resolveWrittenFrameTarget(860, WRITTEN_FRAMES, -1)?.id, 'hero');
  });

  it('gates rapid wheel events cleanly while allowing direction reversals', () => {
    assert.equal(shouldAcceptWheelFrameStep(1000, 0, 0, 1, 760), true);
    assert.equal(shouldAcceptWheelFrameStep(1120, 1000, 1, 1, 760), false);
    assert.equal(shouldAcceptWheelFrameStep(1250, 1000, 1, -1, 760), true);
    assert.equal(shouldAcceptWheelFrameStep(1800, 1000, 1, 1, 760), true);
  });

  it('aligns gently only near Page 1/2/3 top edges and ignores mid-section reading', () => {
    assert.equal(resolveGentleBoundarySettleTarget(820, SAMPLE_SECTIONS)?.id, 'stats');
    assert.equal(resolveGentleBoundarySettleTarget(1240, SAMPLE_SECTIONS)?.id, 'work');
    assert.equal(resolveGentleBoundarySettleTarget(1950, SAMPLE_SECTIONS), null);
    assert.equal(resolveGentleBoundarySettleTarget(2830, SAMPLE_SECTIONS), null);
  });
});
