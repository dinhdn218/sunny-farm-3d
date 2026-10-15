import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FarmAnimal, TileData } from '@/types/game';
import { useGameStore } from '@/store/useGameStore';
import { ANIMALS, MAX_ANIMALS } from '@/config/animals';
import { ITEMS } from '@/config/items';
import { isWet, weatherOf } from '@/lib/seasons';
import { petMorningGift, shibaFind } from '@/lib/pets';

const initialState = useGameStore.getState();
const store = () => useGameStore.getState();

beforeEach(() => {
  useGameStore.setState(initialState, true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// The day before the first day in 2..60 whose weather passes `test`
const dayBefore = (test: (day: number) => boolean) => {
  for (let day = 2; day <= 60; day++) if (test(day)) return day - 1;
  throw new Error('no such day');
};

const withPet = (pet: string) =>
  useGameStore.setState({
    cosmetics: { ...store().cosmetics, pet },
    ownedCosmetics: [...store().ownedCosmetics, pet],
  });

// Every worked tile dry, with carrots growing on the first few field tiles
const dryField = () =>
  useGameStore.setState({
    tiles: store().tiles.map((t, i): TileData =>
      i < 8 && !t.sprinkler
        ? { ...t, state: 'planted', crop: 'carrot', stage: 1, watered: false, daysWatered: 0 }
        : { ...t, watered: false }
    ),
  });

describe('Shiba', () => {
  it('brings home what it dug up overnight', () => {
    withPet('shiba_inu');
    const day = 5;
    useGameStore.setState({ day, shippingBin: {} });
    const before = store();
    const find = shibaFind(day + 1);

    store().nextDay();

    if (find.kind === 'gold') expect(store().gold).toBe(before.gold + find.amount);
    if (find.kind === 'gems') expect(store().gems).toBe(before.gems + find.amount);
    if (find.kind === 'bread') expect(store().breadCount).toBe(before.breadCount + 1);
    if (find.kind === 'seeds') expect(store().seeds[find.crop]).toBe((before.seeds[find.crop] ?? 0) + find.count);
    expect(store().lastDaySummary?.petNote).toContain('Shiba');
  });

  it('stays home unless it is the pet you are walking', () => {
    withPet('none_pet');
    useGameStore.setState({ day: 5, shippingBin: {} });
    const { gold, gems, breadCount, seeds } = store();

    store().nextDay();

    expect(store()).toMatchObject({ gold, gems, breadCount, seeds });
    expect(store().lastDaySummary?.petNote).toBeNull();
  });
});

describe('Robo Cat', () => {
  it('waters the dry crops on a dry morning', () => {
    withPet('robo_cat');
    dryField();
    useGameStore.setState({ day: dayBefore((d) => !isWet(weatherOf(d))) });

    store().nextDay();

    expect(store().tiles.filter((t) => t.state === 'planted' && t.watered).length).toBeGreaterThan(0);
    expect(store().lastDaySummary?.petNote).toContain('Mèo Máy');
  });

  it('has nothing to do when the rain has watered everything', () => {
    withPet('robo_cat');
    dryField();
    useGameStore.setState({ day: dayBefore((d) => weatherOf(d) === 'rain') });

    store().nextDay();

    expect(store().lastDaySummary?.petNote).toBeNull();
  });
});

describe('new animals', () => {
  it('sells ducks and pigs, whose duck eggs and truffles go in the bag', () => {
    expect(ANIMALS.duck.productId).toBe('duck_egg');
    expect(ANIMALS.pig.productId).toBe('truffle');
    expect(ITEMS.duck_egg.kind).toBe('animal');
    expect(ITEMS.truffle.kind).toBe('animal');
    expect(ANIMALS.pig.productSellPrice).toBeGreaterThan(ANIMALS.cow.productSellPrice);
  });

  it('can be bought like the others', () => {
    useGameStore.setState({ gold: 1000, animals: [] });
    store().buyAnimal('duck');
    store().buyAnimal('pig');
    expect(store().animals.map((a) => a.species)).toEqual(['duck', 'pig']);
    expect(store().gold).toBe(1000 - ANIMALS.duck.buyPrice - ANIMALS.pig.buyPrice);
  });

  it(`fill a ranch of at most ${MAX_ANIMALS}`, () => {
    useGameStore.setState({ gold: 100_000, animals: [] });
    for (let i = 0; i < MAX_ANIMALS + 2; i++) store().buyAnimal('chicken');
    expect(store().animals).toHaveLength(MAX_ANIMALS);
  });
});

describe('collecting from a close friend', () => {
  const animalWithProduct = (affection: number): FarmAnimal => ({
    id: 'a1',
    species: 'cow',
    name: 'Bò',
    fedToday: false,
    hasProduct: true,
    affection,
    x: -11,
    z: 6,
  });

  const collectWith = (affection: number, roll: number) => {
    useGameStore.setState({ animals: [animalWithProduct(affection)], items: {} });
    vi.spyOn(Math, 'random').mockReturnValue(roll);
    store().interactAnimal('a1');
    return store().items.milk ?? 0;
  };

  it('sometimes gives two products when affection is 80% or more', () => {
    expect(collectWith(80, 0.1)).toBe(2);
    expect(collectWith(95, 0.5)).toBe(1);
  });

  it('always gives one below 80%', () => {
    expect(collectWith(79, 0)).toBe(1);
  });
});

describe('bunny, sea turtle and panda', () => {
  it('bring their morning gift home overnight and say so in the day summary', () => {
    for (const pet of ['bunny_pet', 'sea_turtle', 'panda']) {
      useGameStore.setState(initialState, true);
      withPet(pet);
      useGameStore.setState({ day: 9, items: {}, animalFeed: 0, shippingBin: {} });
      const gift = petMorningGift(pet, 10)!;
      store().nextDay();
      expect(store().items).toEqual(gift.items ?? {});
      expect(store().animalFeed).toBe(gift.feed ?? 0);
      expect(store().lastDaySummary?.petNote).toBe(gift.label);
    }
  });
});

describe('reindeer', () => {
  it('brings two loaves of bread home every morning', () => {
    withPet('reindeer_pet');
    useGameStore.setState({ day: 9, breadCount: 0, shippingBin: {} });
    store().nextDay();
    expect(store().breadCount).toBe(2);
    expect(store().lastDaySummary?.petNote).toContain('Bánh Mì');
  });
});

describe('lucky cat', () => {
  it('brings its gold home overnight', () => {
    withPet('lucky_cat');
    useGameStore.setState({ day: 9, gold: 0, shippingBin: {} });
    const gift = petMorningGift('lucky_cat', 10)!;
    store().nextDay();
    expect(store().gold).toBe(gift.gold);
  });
});
