// Lễ Hội Bí Ngô (Halloween), by the device's calendar date (YYYY-MM-DD keys, see lib/dailyGift)
export const HALLOWEEN = {
  name: 'Lễ Hội Bí Ngô',
  start: '2026-10-15',
  end: '2026-11-02',
};

// Candy earned during the festival
export const CANDY_PER_PUMPKIN = 3;
export const CANDY_PER_NIGHT_FISH = 2;

export const isEventActive = (today: string) => today >= HALLOWEEN.start && today <= HALLOWEEN.end;

const dayNumber = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
};

// Days of the festival still to play, today included
export const eventDaysLeft = (today: string) =>
  Math.max(0, dayNumber(HALLOWEEN.end) - dayNumber(today) + 1);
