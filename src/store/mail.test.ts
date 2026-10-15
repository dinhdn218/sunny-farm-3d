import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Letter, Order } from '@/types/game';
import { useGameStore } from '@/store/useGameStore';

const initialState = useGameStore.getState();
const store = () => useGameStore.getState();

// No festival runs in early December 2026
beforeEach(() => {
  useGameStore.setState(initialState, true);
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 11, 5, 10, 0));
});
afterEach(() => {
  vi.useRealTimers();
});

const order: Order = { id: 'ord_m', customer: 'Bảo Ngọc 🐱', items: { carrot: 3 }, rewardGold: 180, rewardGems: 0 };
const withMailbox = () =>
  useGameStore.setState({
    ownedCosmetics: [...initialState.ownedCosmetics, 'decor_mailbox'],
    decorPlacements: { decor_mailbox: { x: -3, z: -9, rotY: 0 } },
  });
const letterIds = () => store().mail.map((l) => l.id);

describe('the mailbox', () => {
  it('holds a welcome letter in a new game', () => {
    expect(store().mail).toEqual([expect.objectContaining({ id: 'welcome', read: false })]);
  });

  it("brings a festival's letter on its first morning, and only once", () => {
    vi.setSystemTime(new Date(2026, 11, 20, 10, 0));
    useGameStore.setState({ mail: [] });
    store().nextDay();
    store().nextDay();
    expect(letterIds()).toEqual(['festival_christmas']);
    expect(store().lastDaySummary?.newLetters).toBe(0);
  });

  it('brings a thank-you letter the morning after an order is delivered', () => {
    withMailbox();
    useGameStore.setState({ mail: [], orders: [order], items: { carrot: 3 } });
    store().deliverOrder('ord_m');
    store().nextDay();
    expect(store().mail).toEqual([expect.objectContaining({ from: 'Bảo Ngọc 🐱', read: false })]);
    expect(store().lastDaySummary?.newLetters).toBe(1);
  });

  it('only brings thank-you letters to a farm with a mailbox', () => {
    useGameStore.setState({ mail: [], orders: [order], items: { carrot: 3 } });
    store().deliverOrder('ord_m');
    store().nextDay();
    expect(store().mail).toEqual([]);
  });

  it('thanks only for orders delivered since the last morning', () => {
    withMailbox();
    useGameStore.setState({ mail: [], orders: [order], items: { carrot: 3 } });
    store().deliverOrder('ord_m');
    store().nextDay();
    store().nextDay();
    expect(store().mail).toHaveLength(1);
  });
});

describe('a letter', () => {
  const giftLetter = (gift: Letter['gift']): Letter => ({
    id: 'gift',
    from: 'A',
    title: 'T',
    body: '',
    day: 1,
    read: false,
    gift,
    claimed: false,
  });

  it('is marked read once opened', () => {
    useGameStore.setState({ mail: [giftLetter(undefined)] });
    store().readLetter('gift');
    expect(store().mail[0].read).toBe(true);
  });

  it('hands over its gift once', () => {
    useGameStore.setState({ gold: 0, gems: 0, items: {}, mail: [giftLetter({ gold: 40, gems: 2, items: { tomato: 2 } })] });
    store().claimLetter('gift');
    store().claimLetter('gift');
    expect(store().gold).toBe(40);
    expect(store().gems).toBe(2);
    expect(store().items).toEqual({ tomato: 2 });
    expect(store().mail[0]).toMatchObject({ claimed: true, read: true });
  });

  it("puts a festival's tokens in the festival purse", () => {
    useGameStore.setState({ festivalTokens: { tet: 5 }, mail: [giftLetter({ festival: 'tet', tokens: 10 })] });
    store().claimLetter('gift');
    expect(store().festivalTokens.tet).toBe(15);
  });
});
