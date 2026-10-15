'use client';

import { useEffect } from 'react';
import { MUSIC_THEMES, MusicTheme, ThemeId } from '@/config/music';
import { TIME_PHASES } from '@/config/time';
import { Ambience, MusicScene, NoteEvent, composeBar, musicSceneFor } from '@/lib/musicScore';
import { audioContext, soundFX } from '@/lib/audio';
import { seasonOf, weatherOf } from '@/lib/seasons';
import { isEventActive } from '@/lib/event';
import { localDateKey } from '@/lib/dailyGift';
import { useGameStore } from '@/store/useGameStore';

// Seconds of music queued ahead of the audio clock
const LOOKAHEAD = 0.6;

const midiToHz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

interface Layer {
  stop: () => void;
}

// A short pitched blip: one bird chirp or cricket pulse
function chirp(ctx: AudioContext, out: AudioNode, at: number, from: number, to: number, length: number, level: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.setValueAtTime(from, at);
  osc.frequency.exponentialRampToValueAtTime(to, at + length);
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(level, at + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
  osc.connect(gain).connect(out);
  osc.start(at);
  osc.stop(at + length + 0.02);
}

// Generated background music plus the sounds of the surroundings, all synthesised with WebAudio.
// Music has its own volume; the ambience shares the sound-effects channel.
class MusicEngine {
  private level = 0.5;
  private running = false;
  private bus: GainNode | null = null;
  // The tune playing now; it fades out when the scene calls for another
  private tune: { id: ThemeId; out: GainNode; bar: number; at: number } | null = null;
  private scene: MusicScene | null = null;
  private layers = new Map<Ambience, Layer>();
  private noise: AudioBuffer | null = null;

  get volume() {
    return this.level;
  }

  set volume(level: number) {
    this.level = level;
    if (this.bus) this.bus.gain.value = level;
  }

  // Browsers keep a page silent until the player clicks or presses a key, so this waits for one
  start() {
    if (this.running) return;
    const ctx = audioContext();
    if (!ctx) return;
    this.running = true;
    this.bus = ctx.createGain();
    this.bus.gain.value = this.level;
    this.bus.connect(ctx.destination);
    setInterval(() => this.queueBars(), 150);
    // Nothing plays in a hidden tab
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) ctx.suspend().catch(() => {});
      else ctx.resume().catch(() => {});
    });
    if (this.scene) this.play(this.scene);
  }

  setScene(scene: MusicScene) {
    this.scene = scene;
    if (this.running) this.play(scene);
  }

  // The rumble that follows a lightning flash
  thunder(delay: number) {
    if (!this.running || soundFX.volume <= 0) return;
    const output = soundFX.output();
    if (!output) return;
    const { ctx, out } = output;
    const at = ctx.currentTime + delay;
    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer(ctx);
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 380;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(1.2, at + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.001, at + 2.8);
    source.connect(filter).connect(gain).connect(out);
    source.start(at);
    source.stop(at + 2.9);
  }

  private play(scene: MusicScene) {
    const ctx = audioContext();
    if (!ctx || !this.bus) return;

    if (this.tune?.id !== scene.theme) {
      const old = this.tune?.out;
      if (old) {
        old.gain.setTargetAtTime(0, ctx.currentTime, 0.5);
        setTimeout(() => old.disconnect(), 4000);
      }
      const out = ctx.createGain();
      out.connect(this.bus);
      this.tune = { id: scene.theme, out, bar: 0, at: ctx.currentTime + (old ? 1 : 0.2) };
    }

    this.layers.forEach((layer, kind) => {
      if (scene.ambience.includes(kind)) return;
      layer.stop();
      this.layers.delete(kind);
    });
    scene.ambience.forEach((kind) => {
      if (this.layers.has(kind)) return;
      const layer = this.startLayer(kind);
      if (layer) this.layers.set(kind, layer);
    });
  }

  private queueBars() {
    const ctx = audioContext();
    const tune = this.tune;
    if (!ctx || !tune || ctx.state !== 'running') return;
    const theme = MUSIC_THEMES[tune.id];
    const beat = 60 / theme.bpm;
    // After a stall, carry on from now rather than rushing through the missed bars
    if (tune.at < ctx.currentTime) tune.at = ctx.currentTime + 0.05;
    while (tune.at < ctx.currentTime + LOOKAHEAD) {
      if (this.level > 0) {
        composeBar(tune.id, tune.bar).forEach((note) =>
          this.note(ctx, tune.out, note, theme, tune.at + note.beat * beat, note.beats * beat)
        );
      }
      tune.at += 4 * beat;
      tune.bar++;
    }
  }

  private note(ctx: AudioContext, out: AudioNode, note: NoteEvent, theme: MusicTheme, at: number, length: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = midiToHz(note.midi);

    const buzzy = note.voice === 'lead' && (theme.lead === 'square' || theme.lead === 'sawtooth');
    let peak: number;
    let pluck: boolean;
    if (note.voice === 'lead') {
      osc.type = theme.lead;
      peak = buzzy ? 0.035 : 0.09;
      pluck = theme.pluck;
    } else if (note.voice === 'bass') {
      osc.type = 'triangle';
      peak = 0.11;
      pluck = false;
    } else {
      osc.type = 'sine';
      peak = theme.stabs ? 0.03 : 0.022;
      pluck = theme.stabs;
    }

    gain.gain.setValueAtTime(0, at);
    let end: number;
    if (pluck) {
      const ring = Math.max(0.25, Math.min(length * 1.5, 0.9));
      gain.gain.linearRampToValueAtTime(peak, at + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + ring);
      end = at + ring;
    } else {
      const attack = Math.min(note.voice === 'pad' ? 0.25 : 0.02, length / 2);
      const release = note.voice === 'pad' ? 0.4 : 0.08;
      gain.gain.linearRampToValueAtTime(peak, at + attack);
      gain.gain.setValueAtTime(peak, at + length);
      gain.gain.linearRampToValueAtTime(0, at + length + release);
      end = at + length + release;
    }

    if (buzzy) {
      // Soften square and sawtooth leads
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1800;
      osc.connect(filter).connect(gain);
    } else {
      osc.connect(gain);
    }
    gain.connect(out);
    osc.start(at);
    osc.stop(end + 0.05);
  }

  private noiseBuffer(ctx: AudioContext) {
    if (!this.noise) {
      this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    return this.noise;
  }

  private startLayer(kind: Ambience): Layer | null {
    switch (kind) {
      case 'rain':
        return this.noiseLayer('bandpass', 1600, 0.5, 0.15);
      case 'wind':
        return this.noiseLayer('lowpass', 420, 0.7, 0.25, { rate: 0.07, depth: 0.15 });
      case 'waves':
        return this.noiseLayer('lowpass', 650, 0.7, 0.3, { rate: 0.11, depth: 0.22 });
      case 'birds':
        return this.calls(
          () => 2500 + Math.random() * 5000,
          (ctx, out, at) => {
            const pitch = 2400 + Math.random() * 1600;
            const count = 2 + Math.floor(Math.random() * 4);
            let t = at;
            for (let k = 0; k < count; k++) {
              chirp(ctx, out, t, pitch * (0.9 + Math.random() * 0.2), pitch * (1.2 + Math.random() * 0.35), 0.06 + Math.random() * 0.04, 0.05);
              t += 0.08 + Math.random() * 0.06;
            }
          }
        );
      case 'crickets':
        return this.calls(
          () => 600 + Math.random() * 900,
          (ctx, out, at) => {
            const pulses = 3 + Math.floor(Math.random() * 2);
            for (let k = 0; k < pulses; k++) chirp(ctx, out, at + k * 0.055, 4300, 4200, 0.035, 0.025);
          }
        );
    }
  }

  // A looping hiss through a filter (rain, wind, surf); swells ride on its level
  private noiseLayer(
    type: BiquadFilterType,
    frequency: number,
    q: number,
    level: number,
    swell?: { rate: number; depth: number }
  ): Layer | null {
    const output = soundFX.output();
    if (!output) return null;
    const { ctx, out } = output;
    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer(ctx);
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = q;
    const body = ctx.createGain();
    body.gain.value = level;
    const fade = ctx.createGain();
    fade.gain.setValueAtTime(0, ctx.currentTime);
    fade.gain.setTargetAtTime(1, ctx.currentTime, 0.6);
    source.connect(filter).connect(body).connect(fade).connect(out);

    let lfo: OscillatorNode | null = null;
    if (swell) {
      lfo = ctx.createOscillator();
      lfo.frequency.value = swell.rate;
      const depth = ctx.createGain();
      depth.gain.value = swell.depth;
      lfo.connect(depth).connect(body.gain);
      lfo.start();
    }
    source.start();

    return {
      stop: () => {
        fade.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
        setTimeout(() => {
          source.stop();
          lfo?.stop();
          fade.disconnect();
        }, 2500);
      },
    };
  }

  // Short calls (birdsong, cricket chirps) at random moments
  private calls(gap: () => number, call: (ctx: AudioContext, out: AudioNode, at: number) => void): Layer {
    let timer: ReturnType<typeof setTimeout>;
    const next = () => {
      const output = soundFX.output();
      if (output && soundFX.volume > 0 && output.ctx.state === 'running') {
        call(output.ctx, output.out, output.ctx.currentTime + 0.02);
      }
      timer = setTimeout(next, gap());
    };
    timer = setTimeout(next, gap());
    return { stop: () => clearTimeout(timer) };
  }
}

export const music = new MusicEngine();

// Keeps the music and the ambience in step with the zone, the hour and the weather
export function useBackgroundMusic() {
  const world = useGameStore((s) => s.currentWorld);
  const phase = useGameStore((s) => TIME_PHASES[s.timePhaseIndex].id);
  const day = useGameStore((s) => s.day);
  const musicVolume = useGameStore((s) => s.musicVolume);
  const sfxVolume = useGameStore((s) => s.sfxVolume);

  useEffect(() => {
    music.volume = musicVolume;
  }, [musicVolume]);

  useEffect(() => {
    soundFX.volume = sfxVolume;
  }, [sfxVolume]);

  useEffect(() => {
    music.setScene(
      musicSceneFor({
        world,
        phase,
        weather: weatherOf(day),
        season: seasonOf(day),
        festival: isEventActive(localDateKey(new Date())),
      })
    );
  }, [world, phase, day]);

  useEffect(() => {
    const begin = () => music.start();
    window.addEventListener('click', begin);
    window.addEventListener('keydown', begin);
    return () => {
      window.removeEventListener('click', begin);
      window.removeEventListener('keydown', begin);
    };
  }, []);
}
