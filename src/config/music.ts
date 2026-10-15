import { WorldId } from '@/types/game';

// Each zone has its own tune by day; nights get a lullaby, festival nights a spooky one
export type ThemeId = WorldId | 'night' | 'spooky';

export interface MusicTheme {
  bpm: number;
  // MIDI number of the key's home note, near middle C (60)
  root: number;
  // Semitones above the root that the melody may use
  scale: number[];
  // One chord per bar, as semitones above the root, looping
  chords: number[][];
  // Beats of the bar where the bass plays: the chord's root, then its fifth
  bass: number[];
  // Chance of a melody note on each eighth between the main beats
  density: number;
  lead: OscillatorType;
  // Melody notes ring out and fade like a struck string or steel drum instead of holding
  pluck: boolean;
  // Short chords on the off-beats instead of a chord held under the bar
  stabs: boolean;
}

// The melody repeats every two phrases, and each phrase ends back home
export const PHRASE_BARS = 8;

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const PENTATONIC = [0, 2, 4, 7, 9];
const MINOR = [0, 2, 3, 5, 7, 8, 10];
const HARMONIC_MINOR = [0, 2, 3, 5, 7, 8, 11];

// Chords of the key, as semitones above its root
const I = [0, 4, 7];
const ii = [2, 5, 9];
const iii = [4, 7, 11];
const IV = [5, 9, 12];
const V = [7, 11, 14];
const vi = [9, 12, 16];
const i = [0, 3, 7];
const III = [3, 7, 10];
const iv = [5, 8, 12];
const VI = [8, 12, 15];
const VII = [10, 14, 17];

export const MUSIC_THEMES: Record<ThemeId, MusicTheme> = {
  // Bright and bouncy in C
  farm: { bpm: 100, root: 60, scale: PENTATONIC, chords: [I, vi, IV, V], bass: [0, 1, 2, 3], density: 0.45, lead: 'triangle', pluck: false, stabs: false },
  // A gentle stroll in F
  park: { bpm: 84, root: 65, scale: MAJOR, chords: [I, IV, I, V], bass: [0, 2], density: 0.35, lead: 'sine', pluck: false, stabs: false },
  // Steel drums and off-beat chords in G
  beach: { bpm: 108, root: 67, scale: PENTATONIC, chords: [I, IV, V, IV], bass: [0, 1.5, 2], density: 0.55, lead: 'sine', pluck: true, stabs: true },
  // Upbeat shopping-centre pop in B♭
  mall: { bpm: 116, root: 58, scale: MAJOR, chords: [I, vi, ii, V], bass: [0, 1, 2, 3], density: 0.5, lead: 'square', pluck: true, stabs: true },
  // Slow, cinematic D minor
  cinema: { bpm: 76, root: 62, scale: MINOR, chords: [i, VI, III, VII], bass: [0, 2], density: 0.3, lead: 'sawtooth', pluck: false, stabs: false },
  // A soft lullaby
  night: { bpm: 66, root: 60, scale: PENTATONIC, chords: [I, iii, IV, I], bass: [0], density: 0.2, lead: 'sine', pluck: false, stabs: false },
  // Lễ Hội Bí Ngô nights: a creepy waltz-like shuffle in A minor
  spooky: { bpm: 92, root: 57, scale: HARMONIC_MINOR, chords: [i, iv, V, i], bass: [0, 1.5, 2], density: 0.45, lead: 'triangle', pluck: true, stabs: false },
};
