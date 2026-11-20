import { HIGH_SCORE_KEY, MUTED_KEY } from './config';

export function readHighScore(): number {
  try {
    return Math.max(0, Number(localStorage.getItem(HIGH_SCORE_KEY) ?? 0) || 0);
  } catch {
    return 0;
  }
}

export function writeHighScore(score: number): void {
  try {
    localStorage.setItem(HIGH_SCORE_KEY, String(Math.max(0, Math.floor(score))));
  } catch {
    // Private browsing / WebView restrictions: keep the in-memory score only.
  }
}

export function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTED_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeMuted(muted: boolean): void {
  try {
    localStorage.setItem(MUTED_KEY, muted ? '1' : '0');
  } catch {
    // Ignore storage failures.
  }
}
