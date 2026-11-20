import { PLAYER_DRAW_HEIGHT, PLATE_FALLBACK, PLATE_OVERRIDE } from './config';
import type { GameImages, PlateRelative } from './types';

const base = import.meta.env.BASE_URL.endsWith('/')
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`;

export const ASSET_URLS = {
  mascot: `${base}assets/mascot.png`,
  burger: `${base}assets/burger.png`,
  gravy: `${base}assets/gravy.png`,
} as const;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load game image: ${url}`));
    img.src = url;
  });
}

export async function loadImages(): Promise<GameImages> {
  const [mascot, burger, gravy] = await Promise.all([
    loadImage(ASSET_URLS.mascot),
    loadImage(ASSET_URLS.burger),
    loadImage(ASSET_URLS.gravy),
  ]);
  return { mascot, burger, gravy };
}

interface Sample {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

function sampleImage(img: HTMLImageElement): Sample | null {
  const sourceW = img.naturalWidth || img.width;
  const sourceH = img.naturalHeight || img.height;
  if (!sourceW || !sourceH) return null;
  const width = Math.min(200, sourceW);
  const height = Math.max(1, Math.round((sourceH / sourceW) * width));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, width, height);
  return { width, height, data: ctx.getImageData(0, 0, width, height).data };
}

function isPlateWhite(data: Uint8ClampedArray, index: number): boolean {
  const i = index * 4;
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  const a = data[i + 3];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return a > 150 && r > 232 && g > 228 && b > 224 && max - min < 28;
}

interface PlateBand {
  x: number;
  y: number;
  radiusX: number;
  span: number;
}

/**
 * The original mascot holds a wide, thin white plate out to one side. Find it
 * by scanning the upper/middle of the artwork for a long horizontal run of
 * pure white pixels. This keeps the catch hitbox aligned with the artwork.
 */
function findPlateBand(sample: Sample): PlateBand | null {
  const { width, height, data } = sample;
  const rows: Array<{ y: number; minX: number; maxX: number; count: number }> = [];

  for (let y = Math.floor(height * 0.16); y < Math.floor(height * 0.42); y += 1) {
    let minX = width;
    let maxX = -1;
    let count = 0;
    for (let x = Math.floor(width * 0.58); x < width; x += 1) {
      if (!isPlateWhite(data, y * width + x)) continue;
      count += 1;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
    }
    if (count > width * 0.12 && maxX - minX > width * 0.12) {
      rows.push({ y, minX, maxX, count });
    }
  }
  if (!rows.length) return null;

  // Keep the largest contiguous group of qualifying rows.
  const groups: typeof rows[] = [];
  let current: typeof rows = [];
  for (const row of rows) {
    if (current.length && row.y > current[current.length - 1].y + 2) {
      groups.push(current);
      current = [];
    }
    current.push(row);
  }
  if (current.length) groups.push(current);
  const group = groups.reduce((best, g) =>
    g.reduce((sum, r) => sum + r.count, 0) > best.reduce((sum, r) => sum + r.count, 0) ? g : best,
  );

  const minX = Math.min(...group.map((r) => r.minX));
  const maxX = Math.max(...group.map((r) => r.maxX));
  const minY = Math.min(...group.map((r) => r.y));
  const maxY = Math.max(...group.map((r) => r.y));
  let sumX = 0;
  let sumY = 0;
  let total = 0;
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = Math.floor(width * 0.58); x < width; x += 1) {
      if (!isPlateWhite(data, y * width + x)) continue;
      sumX += x;
      sumY += y;
      total += 1;
    }
  }
  if (!total) return null;

  return {
    x: sumX / total / width,
    y: sumY / total / height,
    radiusX: clampNumber(((maxX - minX + 1) / 2 / width) * 1.02, 0.08, 0.24),
    span: maxX - minX,
  };
}

/** Fallback: largest near-white blob in the lower half of the artwork. */
function findLowerWhiteBlob(sample: Sample): PlateBand | null {
  const { width, height, data } = sample;
  const visited = new Uint8Array(width * height);
  let best: { area: number; sumX: number; sumY: number; minX: number; maxX: number } | null = null;
  const minY = Math.floor(height * 0.34);

  for (let y = minY; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const start = y * width + x;
      if (visited[start] || !isPlateWhite(data, start)) continue;
      const stack = [start];
      visited[start] = 1;
      let area = 0;
      let sumX = 0;
      let sumY = 0;
      let minX = x;
      let maxX = x;
      while (stack.length) {
        const p = stack.pop() as number;
        const px = p % width;
        const py = (p - px) / width;
        area += 1;
        sumX += px;
        sumY += py;
        minX = Math.min(minX, px);
        maxX = Math.max(maxX, px);
        for (let ny = Math.max(minY, py - 1); ny <= Math.min(height - 1, py + 1); ny += 1) {
          for (let nx = Math.max(0, px - 1); nx <= Math.min(width - 1, px + 1); nx += 1) {
            const n = ny * width + nx;
            if (!visited[n] && isPlateWhite(data, n)) {
              visited[n] = 1;
              stack.push(n);
            }
          }
        }
      }
      if (!best || area > best.area) best = { area, sumX, sumY, minX, maxX };
    }
  }
  if (!best || best.area < width) return null;
  return {
    x: best.sumX / best.area / width,
    y: best.sumY / best.area / height,
    radiusX: clampNumber(((best.maxX - best.minX + 1) / 2 / width) * 1.05, 0.08, 0.24),
    span: best.maxX - best.minX,
  };
}

/**
 * Locates the white plate in the ORIGINAL mascot artwork by inspecting pixels.
 * Coordinates are fractions of the image (x/y from top-left, radiusX of width).
 */
export function detectPlate(img: HTMLImageElement): PlateRelative {
  if (PLATE_OVERRIDE) return PLATE_OVERRIDE;
  const sample = sampleImage(img);
  if (!sample) return PLATE_FALLBACK;
  const band = findPlateBand(sample) ?? findLowerWhiteBlob(sample);
  if (!band) return PLATE_FALLBACK;
  return { x: band.x, y: band.y, radiusX: band.radiusX, detected: true };
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Mascot display size for a given sprite, used by both engine and renderer. */
export function mascotDrawSize(img: HTMLImageElement): { width: number; height: number } {
  const height = PLAYER_DRAW_HEIGHT;
  const aspect = (img.naturalWidth || img.width) / (img.naturalHeight || img.height);
  return { width: height * aspect, height };
}
