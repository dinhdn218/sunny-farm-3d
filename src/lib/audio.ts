'use client';

class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  public muted: boolean = false;

  private getContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public playTone(
    freq: number,
    type: OscillatorType = 'sine',
    duration: number = 0.12,
    volume: number = 0.12,
    slideTo?: number
  ) {
    const ctx = this.getContext();
    if (!ctx) return;

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
    gain.connect(ctx.destination);
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

  public teleport() {
    this.playTone(280, 'sine', 0.28, 0.14, 860);
  }

  public chat() {
    this.playTone(680, 'sine', 0.07, 0.08, 920);
  }

  public error() {
    this.playTone(180, 'sawtooth', 0.18, 0.12, 120);
  }
}

export const soundFX = new SoundSynthesizer();
