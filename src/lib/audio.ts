'use client';

// One AudioContext for effects, ambience and music
let sharedContext: AudioContext | null = null;

export function audioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!sharedContext) {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return null;
    sharedContext = new AudioCtx();
  }
  // A hidden tab stays paused (see lib/music)
  if (sharedContext.state === 'suspended' && !document.hidden) {
    sharedContext.resume().catch(() => {});
  }
  return sharedContext;
}

class SoundSynthesizer {
  private bus: GainNode | null = null;
  private level = 0.8;

  // From 0 (silent) to 1; the ambience plays through the same channel
  get volume() {
    return this.level;
  }

  set volume(level: number) {
    this.level = level;
    if (this.bus) this.bus.gain.value = level;
  }

  // The effects channel, for sounds made elsewhere (ambience)
  public output(): { ctx: AudioContext; out: GainNode } | null {
    const ctx = audioContext();
    if (!ctx) return null;
    if (!this.bus) {
      this.bus = ctx.createGain();
      this.bus.gain.value = this.level;
      this.bus.connect(ctx.destination);
    }
    return { ctx, out: this.bus };
  }

  public playTone(
    freq: number,
    type: OscillatorType = 'sine',
    duration: number = 0.12,
    volume: number = 0.12,
    slideTo?: number
  ) {
    if (this.level <= 0) return;
    const output = this.output();
    if (!output) return;
    const { ctx, out } = output;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(
        slideTo,
        ctx.currentTime + duration
      );
    }

    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(out);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  public till() {
    this.playTone(150, 'triangle', 0.11, 0.18, 85);
  }

  public water() {
    this.playTone(340, 'sine', 0.16, 0.12, 580);
  }

  public plant() {
    this.playTone(420, 'sine', 0.09, 0.12, 620);
  }

  public animalHappy() {
    this.playTone(520, 'sine', 0.1, 0.14, 780);
    setTimeout(() => this.playTone(780, 'triangle', 0.15, 0.14, 980), 90);
  }

  public harvest() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      setTimeout(() => this.playTone(n, 'triangle', 0.14, 0.14), idx * 55);
    });
  }

  public coin() {
    this.playTone(880, 'sine', 0.08, 0.12);
    setTimeout(() => this.playTone(1318.5, 'sine', 0.18, 0.14), 70);
  }

  public questClaim() {
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((n, idx) => {
      setTimeout(() => this.playTone(n, 'sine', 0.18, 0.15), idx * 75);
    });
  }

  public cast() {
    this.playTone(620, 'sine', 0.22, 0.1, 220);
  }

  public splash() {
    this.playTone(260, 'triangle', 0.18, 0.16, 90);
    setTimeout(() => this.playTone(520, 'sine', 0.1, 0.1, 300), 60);
  }

  public teleport() {
    this.playTone(280, 'sine', 0.28, 0.14, 860);
  }

  public chat() {
    this.playTone(680, 'sine', 0.07, 0.08, 920);
  }

  public shutter() {
    this.playTone(1800, 'square', 0.03, 0.06, 900);
    setTimeout(() => this.playTone(900, 'triangle', 0.09, 0.1, 380), 70);
  }

  public error() {
    this.playTone(180, 'sawtooth', 0.18, 0.12, 120);
  }
}

export const soundFX = new SoundSynthesizer();
