/**
 * Tiny WebAudio sound and music engine - no audio files, no network, no
 * external assets. Effects and the diner/rockabilly loop share one master gain
 * so the existing mute button silences everything.
 */

const MUSIC_BPM = 132;
const STEP_SECONDS = 60 / MUSIC_BPM / 2; // eighth-note shuffle
const MUSIC_STEPS = 32;
const MUSIC_VOLUME = 0.24;
const MASTER_VOLUME = 0.32;

/** A2/C3/E3/G3 walking line followed by F, C and G turnarounds. */
const BASS: Array<number | null> = [
  110, null, 130.81, null, 164.81, null, 196.0, null,
  87.31, null, 110.0, null, 130.81, null, 164.81, null,
  130.81, null, 164.81, null, 196.0, null, 220.0, null,
  98.0, null, 123.47, null, 146.83, null, 174.61, null,
];

const CHORDS: Array<number[] | null> = [
  [220.0, 261.63, 329.63], null, null, null,
  null, null, null, null,
  [174.61, 220.0, 261.63], null, null, null,
  null, null, null, null,
  [261.63, 329.63, 392.0], null, null, null,
  null, null, null, null,
  [196.0, 246.94, 293.66], null, null, null,
  null, null, null, null,
];

/** Sparse jukebox-style riff using notes from the same chords. */
const MELODY: Array<number | null> = [
  null, 440.0, null, null, null, 523.25, null, null,
  null, 349.23, null, null, null, 440.0, null, null,
  null, 392.0, null, null, null, 523.25, null, null,
  null, 392.0, null, null, null, 293.66, null, null,
];

export interface AudioDebugState {
  supported: boolean;
  unlocked: boolean;
  contextState: string;
  muted: boolean;
  musicPlaying: boolean;
  step: number;
}

export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private musicTimer: number | null = null;
  private nextNoteTime = 0;
  private step = 0;
  private musicPlaying = false;
  muted = false;

  constructor(muted: boolean) {
    this.muted = muted;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : MASTER_VOLUME, this.ctx.currentTime, 0.02);
    }
  }

  /** Must be called from a user gesture on iOS/Safari. */
  unlock(): void {
    if (!this.ctx) {
      const Ctor = window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      try {
        this.ctx = new Ctor();
      } catch {
        return;
      }
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : MASTER_VOLUME;
      this.master.connect(this.ctx.destination);

      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = 0;
      this.musicBus.connect(this.master);

      const length = Math.floor(this.ctx.sampleRate * 0.5);
      this.noiseBuffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  /** Start the looping diner band. Safe to call repeatedly. */
  startMusic(): void {
    if (!this.ctx || !this.musicBus || this.musicPlaying) return;
    this.musicPlaying = true;
    this.step = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.06;
    this.musicBus.gain.cancelScheduledValues(this.ctx.currentTime);
    this.musicBus.gain.setTargetAtTime(MUSIC_VOLUME, this.ctx.currentTime, 0.12);
    this.scheduleMusic();
    this.musicTimer = window.setInterval(() => this.scheduleMusic(), 60);
  }

  /** Fade the band out and stop scheduling notes. */
  stopMusic(): void {
    if (!this.ctx || !this.musicBus) return;
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    if (this.musicPlaying) {
      this.musicBus.gain.cancelScheduledValues(this.ctx.currentTime);
      this.musicBus.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
    }
    this.musicPlaying = false;
  }

  dispose(): void {
    this.stopMusic();
    const ctx = this.ctx;
    this.ctx = null;
    this.master = null;
    this.musicBus = null;
    this.noiseBuffer = null;
    if (ctx && ctx.state !== 'closed') void ctx.close();
  }

  getDebugState(): AudioDebugState {
    return {
      supported: Boolean(window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext),
      unlocked: this.ctx !== null,
      contextState: this.ctx?.state ?? 'none',
      muted: this.muted,
      musicPlaying: this.musicPlaying,
      step: this.step,
    };
  }

  private scheduleMusic(): void {
    const ctx = this.ctx;
    if (!ctx || !this.musicPlaying) return;
    const horizon = ctx.currentTime + 0.25;
    while (this.nextNoteTime < horizon) {
      this.scheduleStep(this.step, this.nextNoteTime);
      this.nextNoteTime += STEP_SECONDS;
      this.step = (this.step + 1) % MUSIC_STEPS;
    }
  }

  private scheduleStep(step: number, time: number): void {
    const bass = BASS[step];
    if (bass) this.musicNote(bass, time, STEP_SECONDS * 1.7, 'triangle', 0.5, 700);

    const chord = CHORDS[step];
    if (chord) {
      for (const frequency of chord) {
        this.musicNote(frequency, time, STEP_SECONDS * 1.15, 'square', 0.075, 1800);
      }
    }

    const melody = MELODY[step];
    if (melody) this.musicNote(melody, time, STEP_SECONDS * 1.3, 'sine', 0.15, 2600);

    // Shuffled hi-hat: every eighth note, with the offbeat accented.
    this.musicNoise(time, 0.035, step % 2 === 1 ? 0.07 : 0.035, 'highpass', 6500);
    if (step % 8 === 4) this.musicNoise(time, 0.13, 0.16, 'bandpass', 1800);
    if (step % 8 === 0 || step === 14 || step === 30) {
      this.musicNote(70, time, 0.13, 'sine', 0.42, 180, 42);
    }
  }

  private musicNote(
    frequency: number,
    time: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    filterFrequency: number,
    endFrequency?: number,
  ): void {
    const ctx = this.ctx;
    if (!ctx || !this.musicBus) return;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, time);
    if (endFrequency) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), time + duration);
    }
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFrequency, time);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(volume, time + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicBus);
    osc.start(time);
    osc.stop(time + duration + 0.03);
  }

  private musicNoise(
    time: number,
    duration: number,
    volume: number,
    filterType: BiquadFilterType,
    frequency: number,
  ): void {
    const ctx = this.ctx;
    if (!ctx || !this.musicBus || !this.noiseBuffer) return;
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    source.buffer = this.noiseBuffer;
    filter.type = filterType;
    filter.frequency.setValueAtTime(frequency, time);
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicBus);
    source.start(time);
    source.stop(time + duration + 0.02);
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
