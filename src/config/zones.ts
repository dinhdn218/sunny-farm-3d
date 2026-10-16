// Where the activities in the public zones stand: the 3D scenes put them there and the zone
// panel's shortcuts walk the player to them (see lib/walk for `reach`)
export interface ZoneSpot {
  x: number;
  z: number;
  reach: number;
}

export const ZONE_SPOTS = {
  parkIceCream: { x: 7.5, z: 7, reach: 2.0 },
  parkGazebo: { x: 0, z: -11.5, reach: 3.6 },
  beachCoconut: { x: -10.5, z: 7.5, reach: 2.2 },
  mallBubbleTea: { x: 11.5, z: 5.5, reach: 2.2 },
  mallMarket: { x: -12, z: 4, reach: 2.4 },
  cinemaPopcorn: { x: -10, z: 1.5, reach: 2.2 },
  cinemaClaw: { x: 10.5, z: 2.5, reach: 1.9 },
  casinoWheel: { x: 0, z: -14.5, reach: 2.6 },
  // Set out by the entrance while Tết runs
  casinoBauCua: { x: -4.5, z: 6.5, reach: 2.0 },
} satisfies Record<string, ZoneSpot>;

// Snacks sold around town: each restores stamina (the first snack of the day is free)
export const SNACKS = {
  iceCream: { label: 'Kem ốc quế', icon: '🍦', energy: 20 },
  coconut: { label: 'Nước dừa', icon: '🥥', energy: 25 },
  bubbleTea: { label: 'Trà sữa trân châu', icon: '🧋', energy: 25 },
  popcorn: { label: 'Bắp rang bơ', icon: '🍿', energy: 30 },
};
