import { describe, expect, it } from 'vitest';
import { LOGICAL_H, LOGICAL_W } from './config';
import { computeStageLayout, SAFE_BOTTOM, SAFE_TOP } from './layout';

describe('computeStageLayout', () => {
  it('fills the available width on a typical phone without stretching the art', () => {
    const layout = computeStageLayout(390, 686);
    expect(layout.fillRatio).toBeCloseTo(1, 5);
    expect(layout.width / layout.height).toBeCloseTo(LOGICAL_W / LOGICAL_H, 5);
  });

  it('keeps the mascot and speed banner visible on a short, wide stage', () => {
    const layout = computeStageLayout(390, 450);
    expect(layout.visibleTop).toBeLessThanOrEqual(SAFE_TOP + 0.01);
    expect(layout.visibleBottom).toBeGreaterThanOrEqual(SAFE_BOTTOM - 0.01);
    expect(layout.offsetY).toBeLessThanOrEqual(0);
  });

  it('centers a smaller canvas when there is extra vertical room', () => {
    const stageHeight = 1400;
    const layout = computeStageLayout(390, stageHeight);
    expect(layout.offsetX).toBeCloseTo(0, 5);
    expect(layout.offsetY).toBeCloseTo((stageHeight - layout.height) / 2, 5);
  });

  it('never reports invalid dimensions or negative offsets outside the stage', () => {
    for (const [w, h] of [[1, 1], [0, 0], [360, 480], [430, 932], [844, 390]]) {
      const layout = computeStageLayout(w, h);
      expect(Number.isFinite(layout.scale)).toBe(true);
      expect(layout.width).toBeGreaterThan(0);
      expect(layout.height).toBeGreaterThan(0);
      expect(layout.fillRatio).toBeGreaterThanOrEqual(0);
      expect(layout.fillRatio).toBeLessThanOrEqual(1);
      expect(layout.visibleTop).toBeGreaterThanOrEqual(0);
      expect(layout.visibleBottom).toBeLessThanOrEqual(LOGICAL_H + 0.01);
    }
  });
});
