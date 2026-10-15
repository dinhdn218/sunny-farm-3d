import { beforeEach, describe, expect, it } from 'vitest';
import { FishingSession } from '@/types/game';
import { useGameStore } from '@/store/useGameStore';
import { pickSaveData } from '@/lib/saveData';

const STORAGE_KEY = 'sunny-farm-3d-v3';
const initialState = useGameStore.getState();
const store = () => useGameStore.getState();
const savedOnThisDevice = () => JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}').state ?? {};

beforeEach(() => {
  localStorage.clear();
  useGameStore.setState(initialState, true);
});

describe('volume settings', () => {
  it('start with music a little quieter than the sound effects', () => {
    expect(store().musicVolume).toBeGreaterThan(0);
    expect(store().musicVolume).toBeLessThan(store().sfxVolume);
  });

  it('keep each volume between silent (0) and full (1)', () => {
    store().setMusicVolume(0.3);
    store().setSfxVolume(1.7);
    expect(store().musicVolume).toBe(0.3);
    expect(store().sfxVolume).toBe(1);

    store().setMusicVolume(-2);
    expect(store().musicVolume).toBe(0);
  });

  it('are remembered on this device but never uploaded with the farm', () => {
    store().setMusicVolume(0.25);
    store().setSfxVolume(0.6);

    expect(savedOnThisDevice()).toMatchObject({ musicVolume: 0.25, sfxVolume: 0.6 });
    expect(pickSaveData(store())).not.toHaveProperty('musicVolume');
    expect(pickSaveData(store())).not.toHaveProperty('sfxVolume');
  });

  it('do not count as farm changes that need a cloud upload', () => {
    useGameStore.setState({ cloudDirty: false });
    store().setMusicVolume(0.1);
    expect(store().cloudDirty).toBe(false);
  });
});

describe('photo mode', () => {
  it('opens over the game and closes any open window', () => {
    store().setActiveModal('shop');
    store().togglePhotoMode();

    expect(store().photoMode).toBe(true);
    expect(store().activeModal).toBeNull();
  });

  it('closes again on the second toggle', () => {
    store().togglePhotoMode();
    store().togglePhotoMode();
    expect(store().photoMode).toBe(false);
  });

  it('waits while a fish is on the line or a sprinkler is being placed', () => {
    useGameStore.setState({ fishing: { stage: 'waiting', catchId: 'anchovy', size: 10, until: 0 } as FishingSession });
    store().togglePhotoMode();
    expect(store().photoMode).toBe(false);

    useGameStore.setState({ fishing: null, placingSprinkler: true });
    store().togglePhotoMode();
    expect(store().photoMode).toBe(false);
  });

  it('is not remembered after a reload', () => {
    store().togglePhotoMode();
    expect(savedOnThisDevice()).not.toHaveProperty('photoMode');
  });
});
