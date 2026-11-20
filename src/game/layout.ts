import { LOGICAL_H, LOGICAL_W } from './config';

/**
 * The playfield stays portrait, but the app does not: phones are wider than the
 * 720x1280 canvas on many devices. These bounds are the part of the logical
 * scene that must never be cropped - the SPEED UP! banner near y=196 and the
 * mascot's feet near y=1122.
 */
export const SAFE_TOP = 170;
export const SAFE_BOTTOM = 1150;

export interface StageLayout {
  /** Uniform scale applied to the logical canvas (never stretches the art). */
  scale: number;
  /** CSS size of the canvas drawing surface. */
  width: number;
  height: number;
  /** Position inside the stage, which may clip overflowing canvas pixels. */
  offsetX: number;
  offsetY: number;
  /** Logical-y range actually visible on screen. */
  visibleTop: number;
  visibleBottom: number;
  /** 0..1, how much of the stage width the game occupies. */
  fillRatio: number;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/**
 * Fit as much of the game on screen as possible without hiding the mascot or
 * important gameplay feedback. On normal phone sizes this fills the stage
 * width exactly; on extremely short/wide screens it keeps the safe region and
 * leaves the unavoidable remainder as themed stage background.
 */
export function computeStageLayout(stageWidth: number, stageHeight: number): StageLayout {
  const width = Math.max(1, stageWidth);
  const height = Math.max(1, stageHeight);
  const safeHeight = clamp(SAFE_BOTTOM - SAFE_TOP, 1, LOGICAL_H);
  const safeCenter = (SAFE_TOP + SAFE_BOTTOM) / 2;

  const widthScale = width / LOGICAL_W;
  const heightScale = height / safeHeight;
  const scale = Math.max(0.05, Math.min(widthScale, heightScale));

  const canvasWidth = LOGICAL_W * scale;
  const canvasHeight = LOGICAL_H * scale;
  const offsetX = (width - canvasWidth) / 2;

  let cropTop = 0;
  let offsetY = 0;
  if (canvasHeight > height) {
    const visibleLogicalHeight = height / scale;
    cropTop = clamp(
      safeCenter - visibleLogicalHeight / 2,
      0,
      Math.max(0, LOGICAL_H - visibleLogicalHeight),
    );
    offsetY = -cropTop * scale;
  } else {
    offsetY = (height - canvasHeight) / 2;
  }

  return {
    scale,
    width: canvasWidth,
    height: canvasHeight,
    offsetX,
    offsetY,
    visibleTop: cropTop,
    visibleBottom: Math.min(LOGICAL_H, cropTop + height / scale),
    fillRatio: clamp(canvasWidth / width, 0, 1),
  };
}
