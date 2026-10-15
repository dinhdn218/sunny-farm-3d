import { MUSIC_THEMES, MusicTheme, PHRASE_BARS, ThemeId } from '@/config/music';
import { SeasonId, TimePhaseId, Weather, WorldId } from '@/types/game';
import { isWet } from '@/lib/seasons';
import { seeded } from '@/lib/random';

// Background sounds that play under the music
export type Ambience = 'birds' | 'crickets' | 'waves' | 'rain' | 'wind';

export interface MusicScene {
  theme: ThemeId;
  ambience: Ambience[];
}

export interface NoteEvent {
  voice: 'lead' | 'bass' | 'pad';
  midi: number;
  // Start within the 4-beat bar, and length, in beats
  beat: number;
  beats: number;
}

// What to play where the player is: the zone's tune (or a night one) and its surroundings
export function musicSceneFor({
  world,
  phase,
  weather,
  season,
  festivalNight,
}: {
  world: WorldId;
  phase: TimePhaseId;
  weather: Weather;
  season: SeasonId;
  // The running festival's night tune, if one runs
  festivalNight: ThemeId | null;
}): MusicScene {
  const night = phase === 'night';
  const ambience: Ambience[] = [];
  if (world === 'beach') ambience.push('waves');
  else if ((world === 'farm' || world === 'park') && season !== 'winter' && !isWet(weather)) {
    ambience.push(night ? 'crickets' : 'birds');
  }
  if (weather === 'rain' || weather === 'storm') ambience.push('rain');
  if (weather === 'snow') ambience.push('wind');
  return { theme: night ? festivalNight ?? 'night' : world, ambience };
}

const themeSeed = (id: ThemeId) =>
  id.split('').reduce((hash, ch) => Math.imul(hash ^ ch.charCodeAt(0), 16777619), 2166136261);

const pitchClass = (semitones: number) => ((semitones % 12) + 12) % 12;

// Melody moves mostly by step
const STEPS = [-2, -1, -1, 1, 1, 2];

// The last bar of each phrase goes back to the home chord
export const barChord = (theme: MusicTheme, bar: number) =>
  bar % PHRASE_BARS === PHRASE_BARS - 1 ? theme.chords[0] : theme.chords[bar % theme.chords.length];

// One bar of a tune: its chord, a bass line an octave down and a melody an octave up
// that lands on chord notes on the main beats
export function composeBar(id: ThemeId, bar: number): NoteEvent[] {
  const theme = MUSIC_THEMES[id];
  const chord = barChord(theme, bar);
  const inPhrase = bar % PHRASE_BARS;
  // Phrases A and B alternate, so the tune comes round every two phrases
  const random = seeded(themeSeed(id) + (Math.floor(bar / PHRASE_BARS) % 2) * 1009 + inPhrase * 7919);
  const notes: NoteEvent[] = [];

  chord.forEach((tone) => {
    const midi = theme.root + tone;
    if (theme.stabs) [0.5, 1.5, 2.5, 3.5].forEach((beat) => notes.push({ voice: 'pad', midi, beat, beats: 0.25 }));
    else notes.push({ voice: 'pad', midi, beat: 0, beats: 4 });
  });

  theme.bass.forEach((beat, k) => {
    const next = theme.bass[k + 1] ?? 4;
    notes.push({
      voice: 'bass',
      midi: theme.root - 12 + chord[k % 2 === 0 ? 0 : 2],
      beat,
      beats: Math.min(next - beat, 1),
    });
  });

  // Melody degrees run over a scale and a bit
  const size = theme.scale.length;
  const top = size + 2;
  const semitones = (degree: number) => theme.scale[degree % size] + 12 * Math.floor(degree / size);
  const chordTones = chord.map(pitchClass);
  const onChord = Array.from({ length: top + 1 }, (_, d) => d).filter((d) =>
    chordTones.includes(pitchClass(semitones(d)))
  );
  const nearestOnChord = (from: number) =>
    onChord.reduce((best, d) => (Math.abs(d - from) < Math.abs(best - from) ? d : best));

  const cadence = inPhrase === PHRASE_BARS - 1;
  let degree = onChord[Math.floor(random() * onChord.length)];
  const line: { beat: number; degree: number }[] = [];
  for (let slot = 0; slot < (cadence ? 4 : 8); slot++) {
    const mainBeat = slot % 4 === 0;
    if (!mainBeat && random() >= theme.density + (slot % 2 === 0 ? 0.25 : 0)) continue;
    degree = mainBeat
      ? nearestOnChord(degree)
      : Math.min(top, Math.max(0, degree + STEPS[Math.floor(random() * STEPS.length)]));
    line.push({ beat: slot / 2, degree });
  }
  // A phrase ends on a long home note
  if (cadence) line.push({ beat: 2, degree: Math.abs(degree - size) < degree ? size : 0 });

  line.forEach((note, k) => {
    const end = line[k + 1]?.beat ?? 4;
    const held = cadence && k === line.length - 1;
    notes.push({
      voice: 'lead',
      midi: theme.root + 12 + semitones(note.degree),
      beat: note.beat,
      beats: held ? 4 - note.beat : Math.min(end - note.beat, 1.5),
    });
  });
  return notes;
}
