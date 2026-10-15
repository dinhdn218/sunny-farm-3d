import { describe, expect, it } from 'vitest';
import { MUSIC_THEMES, PHRASE_BARS, ThemeId } from '@/config/music';
import { barChord, composeBar, musicSceneFor } from '@/lib/musicScore';

const morningOnTheFarm = {
  world: 'farm',
  phase: 'morning',
  weather: 'sunny',
  season: 'spring',
  festival: false,
} as const;

const THEME_IDS = Object.keys(MUSIC_THEMES) as ThemeId[];
const pitchClass = (semitones: number) => ((semitones % 12) + 12) % 12;
const leadOf = (id: ThemeId, bar: number) => composeBar(id, bar).filter((n) => n.voice === 'lead');

describe('musicSceneFor', () => {
  it('plays each zone its own tune by day', () => {
    (['farm', 'park', 'beach', 'mall', 'cinema'] as const).forEach((world) =>
      expect(musicSceneFor({ ...morningOnTheFarm, world }).theme).toBe(world)
    );
  });

  it('switches to a lullaby at night, and to a spooky tune on festival nights', () => {
    expect(musicSceneFor({ ...morningOnTheFarm, phase: 'night' }).theme).toBe('night');
    expect(musicSceneFor({ ...morningOnTheFarm, phase: 'night', festival: true }).theme).toBe('spooky');
    expect(musicSceneFor({ ...morningOnTheFarm, festival: true }).theme).toBe('farm');
  });

  it('fills the farm and the park with birdsong by day and crickets at night', () => {
    expect(musicSceneFor(morningOnTheFarm).ambience).toEqual(['birds']);
    expect(musicSceneFor({ ...morningOnTheFarm, world: 'park', phase: 'sunset' }).ambience).toEqual(['birds']);
    expect(musicSceneFor({ ...morningOnTheFarm, phase: 'night' }).ambience).toEqual(['crickets']);
  });

  it('rolls waves on the beach, day and night', () => {
    expect(musicSceneFor({ ...morningOnTheFarm, world: 'beach' }).ambience).toEqual(['waves']);
    expect(musicSceneFor({ ...morningOnTheFarm, world: 'beach', phase: 'night' }).ambience).toEqual(['waves']);
  });

  it('lets rain drown out the birds, and a cold wind blow on snowy days', () => {
    expect(musicSceneFor({ ...morningOnTheFarm, weather: 'rain' }).ambience).toEqual(['rain']);
    expect(musicSceneFor({ ...morningOnTheFarm, world: 'beach', weather: 'storm' }).ambience).toEqual([
      'waves',
      'rain',
    ]);
    expect(musicSceneFor({ ...morningOnTheFarm, season: 'winter', weather: 'snow' }).ambience).toEqual(['wind']);
  });

  it('has no birds or crickets in winter', () => {
    expect(musicSceneFor({ ...morningOnTheFarm, season: 'winter' }).ambience).toEqual([]);
    expect(musicSceneFor({ ...morningOnTheFarm, season: 'winter', phase: 'night' }).ambience).toEqual([]);
  });

  it('keeps the mall and the cinema free of wildlife, apart from the weather', () => {
    expect(musicSceneFor({ ...morningOnTheFarm, world: 'mall' }).ambience).toEqual([]);
    expect(musicSceneFor({ ...morningOnTheFarm, world: 'cinema', weather: 'rain' }).ambience).toEqual(['rain']);
  });
});

describe('composeBar', () => {
  it('writes the same bar every time, so the tune comes round again', () => {
    expect(composeBar('farm', 5)).toEqual(composeBar('farm', 5));
    expect(composeBar('farm', 3)).toEqual(composeBar('farm', 3 + PHRASE_BARS * 2));
  });

  it('gives the bars of a phrase different melodies', () => {
    const lines = Array.from({ length: PHRASE_BARS }, (_, bar) => JSON.stringify(leadOf('farm', bar)));
    expect(new Set(lines).size).toBeGreaterThan(PHRASE_BARS / 2);
  });

  it('keeps the melody in the key, and the bass and chords on the bar’s chord', () => {
    THEME_IDS.forEach((id) => {
      const theme = MUSIC_THEMES[id];
      const scale = theme.scale.map(pitchClass);
      for (let bar = 0; bar < PHRASE_BARS * 2; bar++) {
        const chord = barChord(theme, bar).map(pitchClass);
        composeBar(id, bar).forEach((note) => {
          const pc = pitchClass(note.midi - theme.root);
          expect(note.voice === 'lead' ? scale : chord).toContain(pc);
        });
      }
    });
  });

  it('fits every note inside its 4-beat bar', () => {
    THEME_IDS.forEach((id) => {
      for (let bar = 0; bar < PHRASE_BARS * 2; bar++) {
        composeBar(id, bar).forEach((note) => {
          expect(note.beat).toBeGreaterThanOrEqual(0);
          expect(note.beats).toBeGreaterThan(0);
          expect(note.beat + note.beats).toBeLessThanOrEqual(4);
        });
      }
    });
  });

  it('comes home at the end of every phrase: a long tonic note over the home chord', () => {
    THEME_IDS.forEach((id) => {
      const theme = MUSIC_THEMES[id];
      [PHRASE_BARS - 1, PHRASE_BARS * 2 - 1].forEach((bar) => {
        expect(barChord(theme, bar)).toEqual(theme.chords[0]);
        const last = leadOf(id, bar).at(-1)!;
        expect(pitchClass(last.midi - theme.root)).toBe(0);
        expect(last.beat + last.beats).toBe(4);
        expect(last.beats).toBeGreaterThanOrEqual(2);
      });
    });
  });

  it('starts every bar of the melody on the beat', () => {
    THEME_IDS.forEach((id) => {
      for (let bar = 0; bar < PHRASE_BARS; bar++) expect(leadOf(id, bar)[0].beat).toBe(0);
    });
  });
});
