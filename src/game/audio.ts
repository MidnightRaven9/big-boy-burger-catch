/** Tiny WebAudio sound effects - no audio files, no network, no external assets. */
export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  muted = false;

  constructor(muted: boolean) {
    this.muted = muted;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.32, this.ctx.currentTime, 0.02);
    }
  }

  /** Must be called from a user gesture on iOS/Safari. */
  unlock(): void {
    if (!this.ctx) {
      const Ctor = window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.32;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  private tone(
    frequency: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    delay = 0,
    endFrequency?: number,
  ): void {
    if (this.muted || !this.ctx || !this.master) return;
    const start = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, start);
    if (endFrequency) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), start + duration);
    }
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(start);
    osc.stop(start + duration + 0.03);
  }

  catch(): void {
    this.tone(880, 0.11, 'triangle', 0.65);
    this.tone(1320, 0.14, 'triangle', 0.5, 0.07);
    this.tone(1760, 0.16, 'sine', 0.36, 0.14);
  }

  hit(): void {
    this.tone(220, 0.28, 'sawtooth', 0.5, 0, 80);
    this.tone(110, 0.32, 'square', 0.28, 0.02, 55);
  }

  gameOver(): void {
    this.tone(523, 0.18, 'triangle', 0.5);
    this.tone(415, 0.2, 'triangle', 0.5, 0.18);
    this.tone(311, 0.24, 'triangle', 0.5, 0.36);
    this.tone(208, 0.42, 'triangle', 0.55, 0.56);
  }

  click(): void {
    this.tone(660, 0.07, 'sine', 0.35);
  }
}
