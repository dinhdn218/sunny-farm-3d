import { ItemId, Letter, SaveData, Weather } from '@/types/game';
import { ITEMS } from '@/config/items';
import { BASE_MAX_ENERGY } from '@/lib/food';
import { dayStartMs, todayKey } from '@/lib/clock';
import { autoWater, refreshStages } from '@/lib/growth';
import { isWet, seasonalPrice, weatherOf } from '@/lib/seasons';
import { petMorningGift, roboCatWater, shibaFind, shibaFindLabel } from '@/lib/pets';
import { ripenTrees } from '@/lib/trees';
import { HIVE_CAPACITY, hiveHoneyToday } from '@/lib/beehive';
import { MAILBOX_ID, deliverLetters, festivalLetter, thankYouLetter } from '@/lib/mail';
import { activeFestival } from '@/lib/festivals';
import { refillOrders } from '@/lib/orders';
import { addItems } from '@/lib/inventory';

// Days made up for when the farm was left alone longer
export const MAX_CATCH_UP_DAYS = 7;

// The morning report
export interface DaySummaryData {
  // The new day, and how many days went by since the farm was last played
  day: number;
  daysPassed: number;
  soldItems: { label: string; icon: string; count: number; gold: number }[];
  totalGoldEarned: number;
  // Crops ripe and waiting to be picked
  readyCount: number;
  animalProductsReady: number;
  // Today's weather (rain, storms and snow water the fields) and tomorrow's forecast
  weather: Weather;
  forecast: Weather;
  rainWatered: number;
  // What the pet you walk with did
  petNote: string | null;
  newOrders: number;
  honeyMade: number;
  newLetters: number;
  fruitRipened: number;
}

// The night(s) from the day the farm was last played to the morning of `today`. Quests are left to the store, which
// counts the day's events before the daily quests roll over.
export function advanceDays(
  save: SaveData,
  today: number,
  now: number
): { save: SaveData; summary: DaySummaryData } | null {
  if (today <= save.day) return null;
  const first = Math.max(save.day + 1, today - MAX_CATCH_UP_DAYS + 1);

  // The shipping bin sells once, at the prices of the day the goods went in
  const soldItems = (Object.entries(save.shippingBin) as [ItemId, number][])
    .filter(([, count]) => count > 0)
    .map(([id, count]) => ({
      label: ITEMS[id].name,
      icon: ITEMS[id].icon,
      count,
      gold: count * seasonalPrice(id, save.day),
    }));
  const totalGoldEarned = soldItems.reduce((sum, item) => sum + item.gold, 0);

  // Animals fed on the day played have their product in the morning
  let animalProductsReady = 0;
  const animals = save.animals.map((a) => {
    const ready = a.fedToday || a.hasProduct;
    if (ready) animalProductsReady++;
    return { ...a, hasProduct: ready, fedToday: false };
  });

  let { tiles, gold, gems, breadCount, seeds, items, animalFeed, buildPieces, beehiveHoney } = save;
  gold += totalGoldEarned;
  let rainWatered = 0;
  let fruitRipened = 0;
  const notes: string[] = [];
  const letters: Letter[] = [];
  const pet = save.cosmetics.pet;
  for (let day = first; day <= today; day++) {
    const midnight = dayStartMs(day);
    // Sprinklers, and on a wet day the rain, water the dry soil from midnight
    const wet = isWet(weatherOf(day));
    const watering = autoWater(tiles, midnight, wet);
    tiles = watering.tiles;
    if (wet) rainWatered += watering.watered;
    // The pet you walk with lends a hand
    if (pet === 'robo_cat') {
      const cat = roboCatWater(tiles, midnight);
      tiles = cat.tiles;
      if (cat.watered) notes.push(`🤖 Mèo Máy đã tưới giúp ${cat.watered} ô ruộng`);
    }
    if (pet === 'shiba_inu') {
      const find = shibaFind(day);
      if (find.kind === 'gold') gold += find.amount;
      if (find.kind === 'gems') gems += find.amount;
      if (find.kind === 'bread') breadCount += 1;
      if (find.kind === 'seeds') seeds = { ...seeds, [find.crop]: (seeds[find.crop] ?? 0) + find.count };
      notes.push(shibaFindLabel(find));
    }
    const gift = petMorningGift(pet, day);
    if (gift) {
      gold += gift.gold ?? 0;
      breadCount += gift.bread ?? 0;
      animalFeed += gift.feed ?? 0;
      if (gift.items) items = addItems(items, gift.items);
      notes.push(gift.label);
    }
    // The fruit trees bear and the bees fill the hive
    const trees = ripenTrees(buildPieces, day);
    buildPieces = trees.pieces;
    fruitRipened += trees.ripened;
    beehiveHoney = Math.min(
      HIVE_CAPACITY,
      beehiveHoney + hiveHoneyToday(save.decorPlacements, save.ownedCosmetics, buildPieces)
    );
    // The festival running that day sends its letter (each only once)
    const festival = activeFestival(todayKey(midnight));
    if (festival) letters.push(festivalLetter(festival, day));
  }
  // Thanks for the orders delivered on the day played, to a farm with a mailbox
  const hasMailbox = !!save.decorPlacements[MAILBOX_ID] && save.ownedCosmetics.includes(MAILBOX_ID);
  if (save.pendingThanks && hasMailbox) letters.push(thankYouLetter(save.pendingThanks, first));
  const mail = deliverLetters(save.mail, letters);
  tiles = refreshStages(tiles, now);
  // The day's dish wears off: stamina above the plain most comes down to it
  const energy = Math.min(save.energy, BASE_MAX_ENERGY);

  const next: SaveData = {
    ...save,
    day: today,
    energy,
    energyAt: energy < save.energy ? now : save.energyAt,
    buff: null,
    gold,
    gems,
    breadCount,
    seeds,
    items,
    animalFeed,
    tiles,
    animals,
    shippingBin: {},
    buildPieces,
    beehiveHoney,
    mail,
    pendingThanks: null,
  };
  // Residents post new orders in the board's empty slots
  const orders = refillOrders(next);
  return {
    save: { ...next, orders },
    summary: {
      day: today,
      daysPassed: today - save.day,
      soldItems,
      totalGoldEarned,
      readyCount: tiles.filter((t) => t.state === 'planted' && t.stage >= 3).length,
      animalProductsReady,
      weather: weatherOf(today),
      forecast: weatherOf(today + 1),
      rainWatered,
      petNote: notes.length ? notes.join(' • ') : null,
      newOrders: orders.length - save.orders.length,
      honeyMade: beehiveHoney - save.beehiveHoney,
      newLetters: mail.filter((l) => !save.mail.includes(l)).length,
      fruitRipened,
    },
  };
}
