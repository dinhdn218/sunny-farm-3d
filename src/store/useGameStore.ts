'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  AnimalSpecies,
  BugCatch,
  BuildPiece,
  BuildPieceId,
  CollectionSetId,
  ResidentId,
  ChatMessage,
  CropId,
  FarmAnimal,
  FishingSession,
  FishingSpotId,
  FloatingLabel,
  HoverTooltip,
  ItemConfig,
  ItemId,
  MachineId,
  QuestItem,
  QuestType,
  RecipeId,
  RemotePlayer,
  SaveData,
  TileData,
  ToolId,
  UserProfile,
  WalkGoal,
  Weather,
  WorldId,
} from '@/types/game';
import { CROPS } from '@/config/crops';
import { ANIMALS, DOUBLE_PRODUCT_AFFECTION, DOUBLE_PRODUCT_CHANCE, MAX_ANIMALS } from '@/config/animals';
import { COSMETICS } from '@/config/cosmetics';
import { ITEMS } from '@/config/items';
import { MACHINES, RECIPES, isMachineId } from '@/config/machines';
import {
  BITE_MS,
  CATCHES,
  FISHING_ENERGY,
  FISHING_SPOTS,
  TREASURE_REWARD,
  fishingSpotIn,
} from '@/config/fish';
import { WORLDS } from '@/config/worlds';
import { TIME_PHASES } from '@/config/time';
import {
  isPlotPurchasable,
  parsePlotKey,
  plotCenter,
  plotOfTile,
  plotPrice,
  tileToWorld,
  worldToTile,
} from '@/config/farm';
import {
  FARM_SITES,
  FarmBands,
  canPlaceBuildPiece,
  canPlaceDecor,
  farmBands,
  farmPoint,
  placeableInfo,
  ranchOffset,
  stretchPoint,
  worldPortal,
  worldSpawn,
} from '@/lib/farmLayout';
import {
  advanceQuests,
  afterClaim,
  createDailyQuests,
  reconcileQuests,
  syncQuestValue,
} from '@/lib/quests';
import {
  addItems,
  countItems,
  instantSellPrice,
  missingItems,
  takeItems,
} from '@/lib/inventory';
import { marketPrice } from '@/lib/market';
import { refillOrders } from '@/lib/orders';
import { BEEHIVE_ID, HIVE_CAPACITY, hiveHoneyToday } from '@/lib/beehive';
import { daysUntilGrown, ripenTrees } from '@/lib/trees';
import { BUGS, BUG_NET_ENERGY } from '@/config/bugs';
import { BUFFS, foodOf } from '@/config/food';
import { BASE_MAX_ENERGY, activeBuff, maxEnergyFor, netBuffScale } from '@/lib/food';
import { bugsInPark, netCaught, netZoneWidth } from '@/lib/bugs';
import { COLLECTION_SETS, setProgress } from '@/lib/collection';
import { RESIDENTS } from '@/config/npcs';
import { addWeekly, weekKey } from '@/lib/leaderboard';
import {
  ORDER_POINTS,
  REACTION_POINTS,
  TALK_POINTS,
  addFriendship,
  giftReaction,
  heartLetter,
  hearts,
  residentByName,
} from '@/lib/friendship';
import { MAILBOX_ID, deliverLetters, festivalLetter, letterGiftLabel, thankYouLetter } from '@/lib/mail';
import { rollCatch, rollSize } from '@/lib/fishing';
import { levelInfo, levelReward, levelTitle, xpFor } from '@/lib/leveling';
import { DAILY_GIFTS, giftDay, giftLabel, localDateKey } from '@/lib/dailyGift';
import { activeFestival, festivalTokensFor } from '@/lib/festivals';
import { FESTIVALS } from '@/config/festivals';
import { isWet, seasonOf, seasonalPrice, weatherOf } from '@/lib/seasons';
import { petMorningGift, roboCatWater, shibaFind, shibaFindLabel } from '@/lib/pets';
import { pieceAt, snapToCell } from '@/lib/build';
import { BUILD_PIECES } from '@/config/build';
import {
  MAX_TOOL_TIER,
  SPRINKLER_PRICE,
  FERTILIZER_PRICE,
  TOOL_NAMES,
  TOOL_UPGRADES,
  UpgradableTool,
  applySprinklers,
  areaTiles,
  energyPerTile,
  waterCapacity,
} from '@/lib/tools';
import { formatCountdown } from '@/lib/format';
import { beachFinds } from '@/lib/forage';
import { BEACH_SPOTS } from '@/config/forage';
import { WHEEL_PRIZES, rollWheel } from '@/config/luckyWheel';
import { CLAW_PRICE, CLAW_PRIZES } from '@/config/claw';
import { createNewGameSave } from '@/lib/newGame';
import {
  SAVE_KEYS,
  SAVE_VERSION,
  migrateSave,
  pickSaveData,
  saveFromCloud,
} from '@/lib/saveData';
import { CloudLink, CloudSave } from '@/lib/cloudSave';
import { soundFX } from '@/lib/audio';
import { spawnParticles } from '@/lib/effects';
import { projectToScreen } from '@/lib/controls';
import { REACH, inReach } from '@/lib/walk';
import { signOutCloud, uploadCloudSave } from '@/lib/supabase';

interface DaySummaryData {
  day: number;
  soldItems: { label: string; icon: string; count: number; gold: number }[];
  totalGoldEarned: number;
  cropsGrownCount: number;
  readyCount: number;
  animalProductsReady: number;
  // Workshop batches the night finished, waiting to be collected
  batchesReady: number;
  // Tiles the sprinklers watered this morning
  sprinklerWatered: number;
  // The new day's weather (rain, storms and snow water the fields) and the next day's forecast
  weather: Weather;
  forecast: Weather;
  rainWatered: number;
  // What the pet you walk with did overnight
  petNote: string | null;
  // Orders posted on the board this morning
  newOrders: number;
  // Jars the bees added to the hive overnight
  honeyMade: number;
  // Letters that came with the morning post
  newLetters: number;
  // Fruit the trees bore overnight
  fruitRipened: number;
}

// Popcorn at the cinema: the first one each day is free
export const SNACK_PRICE = 15;

interface GameState extends SaveData {
  playerId: string;
  // Google account signed in right now (from the Supabase session, never stored)
  userProfile: UserProfile | null;
  cloudLink: CloudLink | null;
  // The farm changed since it was last synced with the cloud
  cloudDirty: boolean;
  cloudSyncing: boolean;
  cloudError: string | null;
  // Both this device and the cloud hold a different farm: the player picks one
  cloudConflict: { profile: UserProfile; cloud: CloudSave } | null;
  networkMode: 'supabase' | 'local';
  useGlbModels: boolean;
  // Device settings, from 0 (silent) to 1
  musicVolume: number;
  sfxVolume: number;
  // The HUD hides and the camera roams freely for screenshots (not saved)
  photoMode: boolean;

  timePhaseIndex: number;
  currentWorld: WorldId;
  activeTool: ToolId;
  // The crop whose seeds the seed slot takes out (not saved)
  lastSeedCrop: CropId;
  selectedPlot: string | null;
  placingDecor: { id: string; rotY: number } | null;
  // Choosing a field tile for a sprinkler
  placingSprinkler: boolean;
  // Laying out building pieces on the farm, or erasing them (not saved)
  buildMode: { kind: BuildPieceId | 'erase'; rotY: number } | null;
  activeModal:
    | 'map'
    | 'quests'
    | 'wardrobe'
    | 'shop'
    | 'inventory'
    | 'ranch'
    | 'auth'
    | 'summary'
    | 'expand'
    | 'cloudConflict'
    | 'workshop'
    | 'market'
    | 'fishJournal'
    | 'dailyGift'
    | 'festivalShop'
    | 'luckyWheel'
    | 'claw'
    | 'orders'
    | 'mail'
    | 'collection'
    | 'resident'
    | 'leaderboard'
    | 'visit'
    | null;
  // Machine shown in the workshop window
  workshopMachine: MachineId | null;
  // The current cast at the Beach fishing jetty (not saved)
  fishing: FishingSession | null;
  // The net swung at a bug in the Park (not saved)
  bugCatch: BugCatch | null;
  lastDaySummary: DaySummaryData | null;
  floatingLabels: FloatingLabel[];
  tooltip: HoverTooltip | null;
  cinemaChannel: number;

  playerPos: { x: number; z: number; rotY: number; actionTime: number };
  // What the player is walking over to use (not saved)
  walkGoal: WalkGoal | null;
  localChatMsg: string;
  localEmote: string;
  remotePlayers: Record<string, RemotePlayer>;
  chatMessages: ChatMessage[];

  setPlayerName: (name: string) => void;
  linkCloudAccount: (profile: UserProfile) => void;
  applyCloudSave: (profile: UserProfile, cloud: CloudSave) => void;
  openCloudConflict: (profile: UserProfile, cloud: CloudSave) => void;
  resolveCloudConflict: (keep: 'cloud' | 'local') => Promise<void>;
  syncToCloud: (manual?: boolean) => Promise<void>;
  logoutCloud: () => Promise<void>;
  endCloudSession: () => void;
  setNetworkMode: (mode: 'supabase' | 'local') => void;
  toggleGlbModels: () => void;
  setMusicVolume: (volume: number) => void;
  setSfxVolume: (volume: number) => void;
  togglePhotoMode: () => void;
  showToast: (
    msg: string,
    color?: string,
    at?: [number, number, number]
  ) => void;
  setTooltip: (tooltip: HoverTooltip | null) => void;
  setWorld: (world: WorldId) => void;
  setActiveTool: (tool: ToolId) => void;
  setActiveModal: (modal: GameState['activeModal']) => void;
  cycleTimeOfDay: () => void;
  cycleCinemaChannel: () => void;
  eatPopcornOrSnack: (label: string, bonusEnergy: number) => void;
  refillWater: () => void;
  // The watering can is filled at the well: walk there first
  fetchWater: () => void;
  eatBread: () => void;
  // Eat or drink a dish from the workshop: stamina back now, and its buff until bedtime (config/food)
  eatFood: (id: ItemId) => void;
  interactTile: (r: number, c: number) => void;
  interactFront: () => void;
  // Walk over to something and do the job there (straight away when already close enough)
  walkTo: (goal: WalkGoal) => void;
  // The player got there: face it and do the job
  reachGoal: () => void;
  cancelWalk: () => void;
  buySeed: (crop: CropId, amount?: number) => void;
  buyBread: () => void;
  buyToolUpgrade: (tool: UpgradableTool) => void;
  buySprinkler: () => void;
  buyFertilizer: (amount: number) => void;
  startPlacingSprinkler: () => void;
  cancelPlacingSprinkler: () => void;
  placeSprinkler: (r: number, c: number) => void;
  sellNow: (id: ItemId, amount?: number) => void;
  sellAllNow: (kind?: ItemConfig['kind']) => void;
  moveToBin: (id: ItemId, amount?: number) => void;
  returnFromBin: (id: ItemId, amount?: number) => void;
  depositAllToBin: () => void;
  sellAtMarket: (id: ItemId, amount?: number) => void;
  deliverOrder: (orderId: string) => void;
  discardOrder: (orderId: string) => void;
  collectHoney: () => void;
  readLetter: (letterId: string) => void;
  claimLetter: (letterId: string) => void;
  // The reward for a complete set in the collection book, paid once
  claimCollection: (setId: CollectionSetId) => void;
  // The resident whose card is open (not saved), and making friends with them
  activeResident: ResidentId | null;
  openResident: (id: ResidentId) => void;
  talkTo: (id: ResidentId) => void;
  giveGift: (id: ResidentId, item: ItemId) => void;

  openWorkshop: (machine?: MachineId) => void;
  buyMachine: (id: MachineId) => void;
  startRecipe: (recipeId: RecipeId) => void;
  collectMachine: (id: MachineId) => void;

  // Cast at a fishing spot (the one in the current zone when not given)
  startFishing: (spot?: FishingSpotId) => void;
  // Walk to the zone's fishing spot, then cast
  goFishing: () => void;
  fishBite: () => void;
  hookFish: () => void;
  landCatch: () => void;
  loseFish: () => void;
  endFishing: () => void;
  // Go after the bug on a spot in the Park, then swing where the marker is on the net's bar
  startBugCatch: (spot: number) => void;
  swingNet: (marker: number) => void;
  endBugCatch: () => void;

  openExpand: (plot?: string | null) => void;
  selectPlot: (plot: string) => void;
  buyPlot: (plot: string) => void;

  startPlacingDecor: (id: string) => void;
  rotatePlacingDecor: () => void;
  cancelPlacingDecor: () => void;
  placeDecor: (x: number, z: number) => void;
  storeDecor: (id: string) => void;
  buyBuildPieces: (kind: BuildPieceId, count: number) => void;
  startBuilding: (kind: BuildPieceId | 'erase') => void;
  rotateBuildPiece: () => void;
  stopBuilding: () => void;
  // Build (or erase) in the grid cell at this point
  buildAt: (x: number, z: number) => void;
  // Pick the fruit off the tree standing in that cell
  pickFruit: (x: number, z: number) => void;

  buyAnimal: (species: AnimalSpecies) => void;
  buyAnimalFeed: (amount?: number) => void;
  interactAnimal: (animalId: string) => void;
  feedAllAnimals: () => void;

  nextDay: () => void;
  buyOrEquipCosmetic: (itemId: string) => void;
  incrementQuest: (type: QuestType, amount?: number, crop?: CropId) => void;
  claimQuest: (questId: string) => void;
  claimDailyGift: () => void;
  buyFestivalItem: (itemId: string) => void;
  // Pick up one of today's finds on the Beach (a spot of config/forage)
  collectBeachFind: (spot: number) => void;
  // The casino's free daily spin: the slice it lands on (prizes paid at once), or null if already spun today
  spinLuckyWheel: () => number | null;
  // A coin in the cinema's claw machine; false if short of gold
  payClaw: () => boolean;
  winClawPrize: (prize: number) => void;
  // A Tiến Lên game at the casino ended: gold won or lost, and where the player finished
  casinoPayout: (gold: number, place: number) => void;
  // Left a card game in the middle
  casinoForfeit: (gold: number) => void;
  sendChat: (text: string) => void;
  triggerEmote: (emote: string, chatText?: string) => void;
  setRemotePlayers: (players: Record<string, RemotePlayer>) => void;
  addChatMessage: (msg: ChatMessage) => void;
}

const generateUid = () =>
  'farmer_' + Math.random().toString(36).substring(2, 9);

const cosmeticById = (id: string) => COSMETICS.find((c) => c.id === id);

const publicZonesVisited = (visited: WorldId[]) =>
  visited.filter((w) => w !== 'farm').length;

const clampVolume = (volume: number) => Math.min(1, Math.max(0, volume));

// Gameplay events the leaderboards count over the week
const WEEKLY_COUNTERS: Partial<Record<QuestType, 'gold' | 'fish' | 'orders'>> = {
  earn_gold: 'gold',
  fish: 'fish',
  deliver_order: 'orders',
};

// Festivals run by the device's calendar date
const runningFestival = () => activeFestival(localDateKey(new Date()));

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => {
      const announceCompleted = (completed: QuestItem[]) => {
        if (completed.length === 0) return;
        const { playerPos } = get();
        soundFX.questClaim();
        completed.forEach((q) =>
          get().showToast(`📜 Hoàn thành: ${q.title}!`, 'text-yellow-300', [
            playerPos.x,
            1.4,
            playerPos.z,
          ])
        );
      };

      // Experience from gameplay events; every level reached pays its reward once
      const gainXp = (amount: number) => {
        if (amount <= 0) return;
        const { xp, gold, gems, playerPos } = get();
        const before = levelInfo(xp).level;
        const after = levelInfo(xp + amount).level;
        let bonusGold = 0;
        let bonusGems = 0;
        for (let level = before + 1; level <= after; level++) {
          const reward = levelReward(level);
          bonusGold += reward.gold;
          bonusGems += reward.gems;
        }
        set({ xp: xp + amount, gold: gold + bonusGold, gems: gems + bonusGems });
        if (after > before) {
          soundFX.questClaim();
          [0xfacc15, 0xf472b6, 0x38bdf8].forEach((color) =>
            spawnParticles(playerPos.x, 1.2, playerPos.z, color, 16)
          );
          get().showToast(
            `⭐ Lên cấp ${after}: ${levelTitle(after)}! +${bonusGold}🪙 +${bonusGems}💎`,
            'text-amber-300',
            [playerPos.x, 1.8, playerPos.z]
          );
        }
      };

      // Friendship moves by `delta`; every heart it fills brings a letter from them with a gift
      const befriend = (id: ResidentId, delta: number) => {
        const { friendship, mail, day, playerPos } = get();
        const before = friendship[id] ?? 0;
        const after = addFriendship(before, delta);
        const resident = RESIDENTS[id];
        const letters = [];
        for (let heart = hearts(before) + 1; heart <= hearts(after); heart++) {
          letters.push(heartLetter(resident, heart, day));
        }
        set({ friendship: { ...friendship, [id]: after }, mail: deliverLetters(mail, letters) });
        if (letters.length) {
          soundFX.questClaim();
          get().showToast(`💖 Thân với ${resident.name} ${hearts(after)} tim! Có thư mới ✉️`, 'text-pink-300', [
            playerPos.x,
            1.9,
            playerPos.z,
          ]);
        }
      };

      // Who was talked to and given a gift today: a new day clears both
      const residentsToday = () => {
        const { residentDay, talkedTo, giftedTo, day } = get();
        return residentDay === day ? { talkedTo, giftedTo } : { talkedTo: [], giftedTo: [] };
      };

      // "Visit N zones" depends on where you have been, not on a single event
      const syncVisitQuest = () => {
        const completed: QuestItem[] = [];
        set((s) => ({
          quests: syncQuestValue(
            s.quests,
            'visit_worlds',
            publicZonesVisited(s.visitedWorlds),
            completed
          ),
        }));
        announceCompleted(completed);
      };

      return {
        ...createNewGameSave(),
        playerId: generateUid(),
        userProfile: null,
        cloudLink: null,
        cloudDirty: false,
        cloudSyncing: false,
        cloudError: null,
        cloudConflict: null,
        networkMode: 'local',
        useGlbModels: false,
        musicVolume: 0.5,
        sfxVolume: 0.8,
        photoMode: false,

        timePhaseIndex: 0,
        currentWorld: 'farm',
        activeTool: 'hoe',
        lastSeedCrop: 'carrot',
        selectedPlot: null,
        placingDecor: null,
        placingSprinkler: false,
        buildMode: null,
        activeModal: null,
        workshopMachine: null,
        fishing: null,
        bugCatch: null,
        activeResident: null,
        lastDaySummary: null,
        floatingLabels: [],
        tooltip: null,
        cinemaChannel: 0,

        playerPos: {
          x: WORLDS.farm.spawn[0],
          z: WORLDS.farm.spawn[1],
          rotY: Math.PI,
          actionTime: 0,
        },
        walkGoal: null,
        localChatMsg: '',
        localEmote: '',
        remotePlayers: {},
        chatMessages: [
          {
            id: 'welcome_system',
            uid: 'system',
            sender: 'Hệ Thống',
            world: 'farm',
            text: 'Chào mừng bạn đến với Nông Trại & Thế Giới Ảo 3D Online! Hãy mở Bản Đồ (phím M) để khám phá 5 khu vực!',
            createdAt: Date.now(),
          },
        ],

        setPlayerName: (name) => set({ playerName: name.trim() || 'Nông Dân' }),

        linkCloudAccount: (profile) => {
          const { playerName } = get();
          set({
            userProfile: profile,
            playerId: profile.id,
            // A farmer still going by the random starter name takes their Google name
            playerName: /^Nông Dân \d+$/.test(playerName) ? profile.name : playerName,
            cloudConflict: null,
          });
        },

        applyCloudSave: (profile, cloud) => {
          const save = saveFromCloud(cloud.data, cloud.version);
          const [x, z] = worldSpawn('farm', save.ownedPlots);
          set({
            ...save,
            userProfile: profile,
            playerId: profile.id,
            cloudLink: { userId: profile.id, lastSyncedAt: cloud.savedAt },
            cloudDirty: false,
            cloudError: null,
            cloudConflict: null,
            currentWorld: 'farm',
            playerPos: { x, z, rotY: Math.PI, actionTime: 0 },
            walkGoal: null,
            activeModal: null,
            placingDecor: null,
            selectedPlot: null,
            lastDaySummary: null,
            tooltip: null,
          });
          get().showToast(`☁️ Đã tải nông trại từ Cloud (Ngày ${save.day})`, 'text-sky-300');
        },

        openCloudConflict: (profile, cloud) =>
          set({ cloudConflict: { profile, cloud }, activeModal: 'cloudConflict', tooltip: null }),

        resolveCloudConflict: async (keep) => {
          const conflict = get().cloudConflict;
          if (!conflict) return;
          if (keep === 'cloud') {
            get().applyCloudSave(conflict.profile, conflict.cloud);
            return;
          }
          get().linkCloudAccount(conflict.profile);
          set({ activeModal: null });
          await get().syncToCloud(true);
        },

        syncToCloud: async (manual = false) => {
          const s = get();
          const profile = s.userProfile;
          if (!profile || s.cloudSyncing) return;
          const save = pickSaveData(s);
          const savedAt = Date.now();
          set({ cloudSyncing: true });
          try {
            await uploadCloudSave(profile, save, savedAt);
          } catch (err) {
            const firstFailure = !get().cloudError;
            set({
              cloudSyncing: false,
              cloudError: err instanceof Error ? err.message : String(err),
            });
            if (manual || firstFailure) {
              get().showToast('⚠️ Đồng bộ Cloud thất bại, sẽ thử lại sau.', 'text-red-400');
            }
            return;
          }
          set((cur) => ({
            cloudSyncing: false,
            cloudError: null,
            cloudLink: { userId: profile.id, lastSyncedAt: savedAt },
            // Changes made while the upload was on its way still need syncing
            cloudDirty: SAVE_KEYS.some((key) => cur[key] !== save[key]),
          }));
          if (manual) get().showToast('☁️ Đã đồng bộ lên Cloud!', 'text-sky-300');
        },

        logoutCloud: async () => {
          get().endCloudSession();
          await signOutCloud();
          get().showToast('👋 Đã đăng xuất khỏi tài khoản Google.', 'text-sky-300');
        },

        // The farm stays on this device, still remembered as synced with that account
        endCloudSession: () =>
          set((s) => ({
            userProfile: null,
            cloudConflict: null,
            cloudError: null,
            activeModal: s.activeModal === 'cloudConflict' ? null : s.activeModal,
          })),

        setNetworkMode: (mode) => set({ networkMode: mode }),

        setMusicVolume: (volume) => set({ musicVolume: clampVolume(volume) }),
        setSfxVolume: (volume) => set({ sfxVolume: clampVolume(volume) }),

        togglePhotoMode: () =>
          set((s) => {
            if (s.photoMode) return { photoMode: false };
            // A cast, a placement or the save-conflict question has to finish first
            if (s.fishing || s.bugCatch || s.placingDecor || s.placingSprinkler || s.activeModal === 'cloudConflict') return s;
            return { photoMode: true, activeModal: null, tooltip: null, buildMode: null, walkGoal: null };
          }),

        toggleGlbModels: () => {
          const next = !get().useGlbModels;
          soundFX.coin();
          set({ useGlbModels: next });
          get().showToast(
            next
              ? '🎨 Đã bật nạp mô hình .GLB 3D!'
              : '🧱 Đã bật chế độ Stylized Low-Poly 3D!'
          );
        },

        // Floating label that drifts up from a world position, like the HTML version's spawnFloatingLabel
        showToast: (msg, color = 'text-yellow-300', at) => {
          const { playerPos } = get();
          const [x, y, z] = at ?? [playerPos.x, 1.2, playerPos.z];
          const screen = projectToScreen(x, y + 0.8, z);
          if (!screen) return;
          const label: FloatingLabel = {
            id: 'lbl_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            text: msg,
            color,
            x: screen.x,
            y: screen.y,
          };
          set((s) => ({ floatingLabels: [...s.floatingLabels, label] }));
          setTimeout(() => {
            set((s) => ({
              floatingLabels: s.floatingLabels.filter((l) => l.id !== label.id),
            }));
          }, 1450);
        },

        setTooltip: (tooltip) => set({ tooltip }),

        setWorld: (world) => {
          const { visitedWorlds, playerPos, ownedPlots } = get();
          const worldCfg = WORLDS[world];
          const [spawnX, spawnZ] = worldSpawn(world, ownedPlots);
          playerPos.x = spawnX;
          playerPos.z = spawnZ;
          playerPos.rotY = Math.PI;

          const nextVisited = visitedWorlds.includes(world)
            ? visitedWorlds
            : [...visitedWorlds, world];

          soundFX.teleport();
          set({
            currentWorld: world,
            visitedWorlds: nextVisited,
            activeModal: null,
            tooltip: null,
            placingDecor: null,
            buildMode: null,
            fishing: null,
            bugCatch: null,
            walkGoal: null,
          });

          if (world !== 'farm') get().incrementQuest('visit_world', 1);
          syncVisitQuest();
          spawnParticles(playerPos.x, 0.6, playerPos.z, 0x38bdf8, 24);
          get().showToast(
            `${worldCfg.icon} Đã đến ${worldCfg.name}!`,
            'text-sky-300'
          );
        },

        setActiveTool: (tool) => {
          if (tool === 'bread') {
            get().eatBread();
            return;
          }
          set(
            tool.startsWith('seed_')
              ? { activeTool: tool, lastSeedCrop: tool.replace('seed_', '') as CropId }
              : { activeTool: tool }
          );
        },

        setActiveModal: (modal) => set({ activeModal: modal }),

        cycleTimeOfDay: () =>
          set((s) => ({
            timePhaseIndex: (s.timePhaseIndex + 1) % TIME_PHASES.length,
          })),

        cycleCinemaChannel: () => {
          soundFX.coin();
          set((s) => ({ cinemaChannel: (s.cinemaChannel + 1) % 3 }));
          get().showToast(
            `🎬 Đã chuyển sang Kênh Phim ${get().cinemaChannel + 1}!`,
            'text-pink-300'
          );
          get().incrementQuest('cinema_channel', 1);
        },

        eatPopcornOrSnack: (label, bonusEnergy) => {
          const { energy, buff, gold, day, lastFreeSnackDay } = get();
          const maxEnergy = maxEnergyFor(buff, day);
          if (energy >= maxEnergy) {
            get().showToast(`⚡ Thể lực đang đầy ${maxEnergy}/${maxEnergy}!`, 'text-amber-300');
            return;
          }
          const free = lastFreeSnackDay !== day;
          if (!free && gold < SNACK_PRICE) {
            soundFX.error();
            get().showToast(`Cần ${SNACK_PRICE} Vàng 🪙 để mua thêm ${label}!`, 'text-red-400');
            return;
          }
          soundFX.coin();
          set({
            energy: Math.min(maxEnergy, energy + bonusEnergy),
            ...(free ? { lastFreeSnackDay: day } : { gold: gold - SNACK_PRICE }),
          });
          get().showToast(
            `🍿 ${label} thơm lừng (+${bonusEnergy}⚡${free ? ', miễn phí hôm nay' : `, -${SNACK_PRICE}🪙`})!`
          );
          get().incrementQuest('eat', 1);
        },

        refillWater: () => {
          const { playerPos, toolTiers } = get();
          const capacity = waterCapacity(toolTiers.water);
          soundFX.water();
          set({ water: capacity });
          get().showToast(`💧 Bình tưới đã đầy (${capacity}/${capacity})!`, 'text-sky-300', [
            playerPos.x,
            0.8,
            playerPos.z,
          ]);
        },

        fetchWater: () => {
          const { ownedPlots, refillWater } = get();
          const [x, z] = farmPoint(FARM_SITES.well[0], FARM_SITES.well[1], ownedPlots);
          get().walkTo({ x, z, reach: REACH.well, act: refillWater });
        },

        eatBread: () => {
          const { breadCount, energy, buff, day } = get();
          const maxEnergy = maxEnergyFor(buff, day);
          if (breadCount <= 0) {
            soundFX.error();
            get().showToast(
              '🥖 Hết Bánh Mì! Hãy ghé Cửa Hàng mua thêm.',
              'text-red-400'
            );
            return;
          }
          if (energy >= maxEnergy) {
            get().showToast(`⚡ Thể lực đang đầy ${maxEnergy}/${maxEnergy}!`, 'text-amber-300');
            return;
          }
          soundFX.coin();
          set({
            breadCount: breadCount - 1,
            energy: Math.min(maxEnergy, energy + 45),
          });
          get().showToast('🥖 Bánh mì nóng giòn (+45⚡)!');
          get().incrementQuest('eat', 1);
        },

        // Eaten even on a full stomach: the buff is the point. A new dish's buff replaces the old one.
        eatFood: (id) => {
          const { items, energy, buff, day, playerPos } = get();
          const food = foodOf(id);
          const rest = food && takeItems(items, { [id]: 1 });
          if (!food || !rest) return;
          const before = activeBuff(buff, day);
          const next = { id: food.buff, food: id, day };
          soundFX.coin();
          set({ items: rest, buff: next, energy: Math.min(maxEnergyFor(next, day), energy + food.energy) });
          const item = ITEMS[id];
          const effect = BUFFS[food.buff];
          spawnParticles(playerPos.x, 1.2, playerPos.z, 0xfde68a, 10);
          get().showToast(
            `${item.icon} ${item.name} +${food.energy}⚡ • ${effect.icon} ${effect.name}${
              before && before !== food.buff ? ` thay ${BUFFS[before].name}` : ''
            }!`,
            'text-lime-300',
            [playerPos.x, 1.8, playerPos.z]
          );
          get().incrementQuest('eat', 1);
        },

        interactTile: (r, c) => {
          const state = get();
          const { activeTool, tiles, energy, water, seeds, items, playerPos } = state;
          const targetTile = tiles.find((t) => t.r === r && t.c === c);
          if (!targetTile) return;

          const { x: tx, z: tz } = tileToWorld(r, c);
          if (!state.ownedPlots.includes(plotOfTile(r, c))) {
            soundFX.error();
            get().showToast('🔒 Lô đất chưa mở khóa!', 'text-amber-300', [tx, 0.4, tz]);
            return;
          }

          // Face the tile and swing the tool, like the HTML version
          const dx = tx - playerPos.x;
          const dz = tz - playerPos.z;
          if (Math.hypot(dx, dz) > 0.1) {
            playerPos.rotY = Math.atan2(dx, dz);
          }
          playerPos.actionTime = Date.now();

          // A sprinkler stands here: the basket picks it back up, other tools leave it be
          if (targetTile.sprinkler) {
            if (activeTool === 'basket') {
              soundFX.plant();
              set({
                tiles: tiles.map((t) => (t.id === targetTile.id ? { ...t, sprinkler: false } : t)),
                sprinklers: state.sprinklers + 1,
              });
              get().showToast('💦 Đã cất Bình Phun vào kho', 'text-sky-300', [tx, 0.6, tz]);
            } else {
              get().showToast(
                '💦 Bình Phun tưới 8 ô xung quanh mỗi sáng • dùng Giỏ (phím 3) để cất',
                'text-sky-300',
                [tx, 0.6, tz]
              );
            }
            return;
          }

          if (
            targetTile.state === 'planted' &&
            targetTile.stage === 3 &&
            targetTile.crop &&
            (activeTool === 'basket' ||
              activeTool === 'hoe' ||
              activeTool.startsWith('seed_'))
          ) {
            const cropKey = targetTile.crop;
            const cropCfg = CROPS[cropKey];
            soundFX.harvest();

            // Fertilized soil gives a double harvest, and the fertilizer is used up
            const count = targetTile.fertilized ? 2 : 1;
            const updatedTiles = tiles.map((t) => {
              if (t.r !== r || t.c !== c) return t;
              if (cropCfg.regrow) {
                return { ...t, stage: 2, watered: false, daysWatered: 0, fertilized: false };
              }
              return {
                ...t,
                state: 'tilled' as const,
                crop: null,
                stage: 0,
                watered: false,
                daysWatered: 0,
                fertilized: false,
              };
            });

            set({ tiles: updatedTiles, items: addItems(items, { [cropKey]: count }) });
            spawnParticles(tx, 0.45, tz, 0xfacc15, 20);
            get().showToast(`${cropCfg.icon} +${count} ${cropCfg.name}!`, 'text-yellow-300', [tx, 0.65, tz]);
            get().incrementQuest('harvest', count, cropKey);
            return;
          }

          // Fertilizer on worked soil (no energy needed): the next harvest from the tile is doubled
          if (activeTool === 'fertilizer') {
            const at: [number, number, number] = [tx, 0.4, tz];
            if (targetTile.state === 'empty') {
              soundFX.error();
              get().showToast('Cần cuốc đất trước!', 'text-amber-300', at);
              return;
            }
            if (targetTile.fertilized) {
              get().showToast('🪴 Ô này đã bón phân rồi!', 'text-amber-300', at);
              return;
            }
            if (state.fertilizer <= 0) {
              soundFX.error();
              get().showToast('Hết Phân Bón! Mua ở Cửa Hàng Hạt Giống.', 'text-red-300', at);
              return;
            }
            soundFX.plant();
            set({
              fertilizer: state.fertilizer - 1,
              tiles: tiles.map((t) => (t.id === targetTile.id ? { ...t, fertilized: true } : t)),
            });
            spawnParticles(tx, 0.15, tz, 0x84cc16, 12);
            get().showToast('🪴 Đã bón phân: lần thu hoạch tới được gấp đôi!', 'text-lime-300', at);
            return;
          }

          // Upgraded hoes and cans cost 1 energy per tile, everything else 2
          const tier =
            activeTool === 'hoe' ? state.toolTiers.hoe : activeTool === 'water' ? state.toolTiers.water : 0;
          const perTile = energyPerTile(tier);
          if (energy < perTile) {
            soundFX.error();
            get().showToast('⚡ Hết thể lực! Hãy ăn Bánh Mì hoặc đi ngủ!', 'text-red-400', [
              tx,
              0.5,
              tz,
            ]);
            return;
          }

          // Owned tiles in the tool's reach that pass `fits`, the clicked tile first
          const owned = new Set(state.ownedPlots);
          const byId = new Map(tiles.map((t) => [t.id, t]));
          const reach = (fits: (t: TileData) => boolean) =>
            areaTiles(r, c, tier)
              .map(([rr, cc]) => byId.get(`${rr}-${cc}`))
              .filter(
                (t): t is TileData =>
                  !!t && !t.sprinkler && owned.has(plotOfTile(t.r, t.c)) && fits(t)
              );
          const burst = (worked: TileData[], y: number, color: number) =>
            worked.forEach((t) => {
              const p = tileToWorld(t.r, t.c);
              spawnParticles(p.x, y, p.z, color, worked.length > 1 ? 8 : 12);
            });

          if (activeTool === 'hoe') {
            const worked = reach((t) => t.state === 'empty').slice(0, Math.floor(energy / perTile));
            if (worked.length === 0) return;
            const ids = new Set(worked.map((t) => t.id));
            soundFX.till();
            set({
              energy: energy - worked.length * perTile,
              tiles: tiles.map((t) => (ids.has(t.id) ? { ...t, state: 'tilled' } : t)),
            });
            burst(worked, 0.1, 0x78350f);
            get().incrementQuest('till', worked.length);
            return;
          }

          if (activeTool === 'water') {
            if (water < 1) {
              soundFX.error();
              get().showToast('💧 Hết nước! Hãy ra Giếng múc nước!', 'text-sky-400', [
                tx,
                0.5,
                tz,
              ]);
              return;
            }
            const worked = reach((t) => t.state !== 'empty' && !t.watered).slice(
              0,
              Math.min(water, Math.floor(energy / perTile))
            );
            if (worked.length === 0) {
              if (targetTile.state === 'empty') {
                soundFX.error();
                get().showToast('Cần cuốc đất trước!', 'text-amber-300', [tx, 0.4, tz]);
              }
              return;
            }
            const ids = new Set(worked.map((t) => t.id));
            soundFX.water();
            set({
              energy: energy - worked.length * perTile,
              water: water - worked.length,
              tiles: tiles.map((t) => (ids.has(t.id) ? { ...t, watered: true } : t)),
            });
            burst(worked, 0.2, 0x38bdf8);
            get().incrementQuest('water', worked.length);
            return;
          }

          if (activeTool.startsWith('seed_')) {
            const cropKey = activeTool.replace('seed_', '') as CropId;
            const cropCfg = CROPS[cropKey];

            if (targetTile.state !== 'tilled') {
              soundFX.error();
              get().showToast('Hãy chọn ô đất đã cuốc trống!', 'text-amber-300', [
                tx,
                0.4,
                tz,
              ]);
              return;
            }
            if ((seeds[cropKey] || 0) <= 0) {
              soundFX.error();
              get().showToast(`Hết Hạt ${cropCfg.name}!`, 'text-red-300', [
                tx,
                0.4,
                tz,
              ]);
              return;
            }

            soundFX.plant();
            set({
              energy: Math.max(0, energy - 2),
              seeds: {
                ...seeds,
                [cropKey]: seeds[cropKey] - 1,
              },
              tiles: tiles.map((t) =>
                t.r === r && t.c === c
                  ? {
                      ...t,
                      state: 'planted',
                      crop: cropKey,
                      stage: 1,
                      daysWatered: 0,
                    }
                  : t
              ),
            });
            get().incrementQuest('plant', 1, cropKey);
            return;
          }

          if (activeTool === 'basket') {
            if (targetTile.state === 'planted' && targetTile.stage < 3) {
              get().showToast('⏳ Cây chưa chín! Tưới nước rồi Qua Ngày.', 'text-amber-300', [
                tx,
                0.4,
                tz,
              ]);
            }
          }
        },

        // Space / E / the mobile "LÀM" button: work the tile in front, draw water at the well,
        // or open the map at the portal
        interactFront: () => {
          const { currentWorld, playerPos, ownedPlots } = get();
          const fx = playerPos.x + Math.sin(playerPos.rotY) * 1.25;
          const fz = playerPos.z + Math.cos(playerPos.rotY) * 1.25;
          if (currentWorld === 'farm') {
            const tile = worldToTile(fx, fz);
            if (tile && ownedPlots.includes(plotOfTile(tile.r, tile.c))) {
              get().interactTile(tile.r, tile.c);
              return;
            }
            const [wx, wz] = farmPoint(FARM_SITES.well[0], FARM_SITES.well[1], ownedPlots);
            if (Math.hypot(playerPos.x - wx, playerPos.z - wz) < REACH.well + 0.5) {
              get().refillWater();
              return;
            }
          }
          const [px, pz] = worldPortal(currentWorld, ownedPlots);
          if (Math.hypot(playerPos.x - px, playerPos.z - pz) < 2.6) {
            set({ activeModal: 'map' });
          }
        },

        walkTo: (goal) => {
          set({ walkGoal: goal });
          const { playerPos } = get();
          if (inReach(playerPos.x, playerPos.z, goal)) get().reachGoal();
        },

        reachGoal: () => {
          const { walkGoal: goal, playerPos } = get();
          if (!goal) return;
          const dx = goal.x - playerPos.x;
          const dz = goal.z - playerPos.z;
          if (Math.hypot(dx, dz) > 0.1) playerPos.rotY = Math.atan2(dx, dz);
          set({ walkGoal: null });
          goal.act();
        },

        cancelWalk: () => {
          if (get().walkGoal) set({ walkGoal: null });
        },

        buySeed: (crop, amount = 1) => {
          const { gold, seeds } = get();
          const cfg = CROPS[crop];
          const cost = cfg.seedPrice * amount;
          if (gold < cost) {
            soundFX.error();
            get().showToast('Không đủ Vàng 🪙!', 'text-red-400');
            return;
          }
          soundFX.coin();
          set({
            gold: gold - cost,
            seeds: {
              ...seeds,
              [crop]: (seeds[crop] || 0) + amount,
            },
          });
        },

        buyBread: () => {
          const { gold, breadCount } = get();
          if (gold < 25) {
            soundFX.error();
            get().showToast('Cần 25 Vàng 🪙 để mua Bánh Mì!', 'text-red-400');
            return;
          }
          soundFX.coin();
          set({ gold: gold - 25, breadCount: breadCount + 1 });
        },

        buyToolUpgrade: (tool) => {
          const { toolTiers, gold, gems } = get();
          const tier = toolTiers[tool];
          if (tier >= MAX_TOOL_TIER) return;
          const price = TOOL_UPGRADES[tool][tier];
          if (gold < price.gold || gems < price.gems) {
            soundFX.error();
            get().showToast(
              `Cần ${price.gold}🪙${price.gems ? ` + ${price.gems}💎` : ''} để nâng cấp!`,
              'text-red-400'
            );
            return;
          }
          const next = tier + 1;
          soundFX.questClaim();
          set({
            gold: gold - price.gold,
            gems: gems - price.gems,
            toolTiers: { ...toolTiers, [tool]: next },
            // A new watering can comes full
            ...(tool === 'water' ? { water: waterCapacity(next) } : {}),
          });
          get().showToast(`🛠️ Đã nâng cấp lên ${TOOL_NAMES[tool][next]}!`, 'text-lime-300');
        },

        buyFertilizer: (amount) => {
          const { gold, fertilizer } = get();
          const cost = FERTILIZER_PRICE * amount;
          if (gold < cost) {
            soundFX.error();
            get().showToast(`Cần ${cost} Vàng 🪙 để mua ${amount} Phân Bón!`, 'text-red-400');
            return;
          }
          soundFX.coin();
          set({ gold: gold - cost, fertilizer: fertilizer + amount });
          get().showToast(`🪴 +${amount} Phân Bón`, 'text-lime-300');
        },

        buySprinkler: () => {
          const { gold, sprinklers } = get();
          if (gold < SPRINKLER_PRICE) {
            soundFX.error();
            get().showToast(`Cần ${SPRINKLER_PRICE} Vàng 🪙 để mua Bình Phun!`, 'text-red-400');
            return;
          }
          soundFX.coin();
          set({ gold: gold - SPRINKLER_PRICE, sprinklers: sprinklers + 1 });
          get().showToast('💦 +1 Bình Phun Tự Động!', 'text-sky-300');
        },

        startPlacingSprinkler: () => {
          const { sprinklers, currentWorld } = get();
          if (sprinklers <= 0) {
            get().showToast('💦 Hãy mua Bình Phun ở Tạp Hóa trước!', 'text-amber-300');
            return;
          }
          if (currentWorld !== 'farm') {
            get().showToast('🏡 Về Nông Trại để đặt Bình Phun!', 'text-amber-300');
            return;
          }
          set({
            placingSprinkler: true,
            placingDecor: null,
            buildMode: null,
            walkGoal: null,
            activeModal: null,
            tooltip: null,
          });
        },

        cancelPlacingSprinkler: () => set({ placingSprinkler: false }),

        // A sprinkler takes up a field tile that has no crop on it
        placeSprinkler: (r, c) => {
          const { tiles, sprinklers, ownedPlots, placingSprinkler } = get();
          if (!placingSprinkler) return;
          const tile = tiles.find((t) => t.r === r && t.c === c);
          const { x, z } = tileToWorld(r, c);
          if (
            !tile ||
            !ownedPlots.includes(plotOfTile(r, c)) ||
            tile.state === 'planted' ||
            tile.sprinkler
          ) {
            soundFX.error();
            get().showToast('🚫 Chỉ đặt Bình Phun trên ô ruộng trống của bạn!', 'text-red-400', [
              x,
              0.5,
              z,
            ]);
            return;
          }
          if (sprinklers <= 0) {
            set({ placingSprinkler: false });
            return;
          }
          soundFX.plant();
          set({
            tiles: tiles.map((t) =>
              t.id === tile.id ? { ...t, sprinkler: true, state: 'empty', watered: false } : t
            ),
            sprinklers: sprinklers - 1,
            placingSprinkler: false,
          });
          spawnParticles(x, 0.4, z, 0x38bdf8, 16);
          get().showToast('💦 Đã đặt Bình Phun!', 'text-sky-300', [x, 0.8, z]);
        },

        // Selling on the spot pays 70%; the shipping bin pays full price overnight
        sellNow: (id, amount = 1) => {
          const { items, gold } = get();
          const qty = Math.min(amount, items[id] ?? 0);
          if (qty <= 0) return;
          const earned = instantSellPrice(id) * qty;
          soundFX.coin();
          set({ gold: gold + earned, items: takeItems(items, { [id]: qty }) ?? items });
          get().showToast(`🪙 +${earned} Vàng!`);
          get().incrementQuest('earn_gold', earned);
        },

        sellAllNow: (kind) => {
          const { items, gold } = get();
          const sold = (Object.entries(items) as [ItemId, number][]).filter(
            ([id, n]) => n > 0 && (!kind || ITEMS[id].kind === kind)
          );
          if (sold.length === 0) {
            soundFX.error();
            get().showToast('🎒 Không có gì để bán!', 'text-red-400');
            return;
          }
          const earned = sold.reduce((sum, [id, n]) => sum + instantSellPrice(id) * n, 0);
          soundFX.coin();
          set({
            gold: gold + earned,
            items: takeItems(items, Object.fromEntries(sold)) ?? items,
          });
          get().showToast(`🪙 +${earned} Vàng!`);
          get().incrementQuest('earn_gold', earned);
        },

        moveToBin: (id, amount = 1) => {
          const { items, shippingBin } = get();
          const rest = takeItems(items, { [id]: amount });
          if (!rest) return;
          soundFX.plant();
          set({ items: rest, shippingBin: addItems(shippingBin, { [id]: amount }) });
        },

        returnFromBin: (id, amount = 1) => {
          const { items, shippingBin } = get();
          const rest = takeItems(shippingBin, { [id]: amount });
          if (!rest) return;
          set({ shippingBin: rest, items: addItems(items, { [id]: amount }) });
        },

        depositAllToBin: () => {
          const { items, shippingBin } = get();
          if (countItems(items) === 0) return;
          soundFX.plant();
          set({ shippingBin: addItems(shippingBin, items), items: {} });
        },

        // Today's market price, and only at the Mall's market stall
        sellAtMarket: (id, amount = 1) => {
          const { items, gold, day, currentWorld } = get();
          if (currentWorld !== 'mall') {
            soundFX.error();
            get().showToast('🛍️ Hãy đến Trung Tâm Thương Mại để bán ở Chợ Phiên!', 'text-amber-300');
            return;
          }
          const qty = Math.min(amount, items[id] ?? 0);
          if (qty <= 0) return;
          const earned = marketPrice(id, day) * qty;
          soundFX.coin();
          set({ gold: gold + earned, items: takeItems(items, { [id]: qty }) ?? items });
          get().showToast(`🧺 +${earned} Vàng ở Chợ Phiên!`);
          get().incrementQuest('earn_gold', earned);
          get().incrementQuest('market_sell', earned);
        },

        // A resident's order from the order board: the goods leave the bag and the reward is paid at once
        deliverOrder: (orderId) => {
          const { orders, items, gold, gems, playerPos } = get();
          const order = orders.find((o) => o.id === orderId);
          if (!order) return;
          const rest = takeItems(items, order.items);
          if (!rest) {
            soundFX.error();
            get().showToast('📦 Chưa đủ hàng để giao đơn này!', 'text-red-400');
            return;
          }
          soundFX.questClaim();
          set({
            items: rest,
            gold: gold + order.rewardGold,
            gems: gems + order.rewardGems,
            orders: orders.filter((o) => o.id !== orderId),
            pendingThanks: order.customer,
          });
          spawnParticles(playerPos.x, 0.6, playerPos.z, 0xfacc15, 20);
          get().showToast(
            `📦 Đã giao đơn cho ${order.customer}! +${order.rewardGold}🪙${
              order.rewardGems ? ` +${order.rewardGems}💎` : ''
            }`,
            'text-yellow-300'
          );
          get().incrementQuest('earn_gold', order.rewardGold);
          get().incrementQuest('deliver_order', 1);
          const customer = residentByName(order.customer);
          if (customer) befriend(customer.id, ORDER_POINTS);
        },

        // The slot stays empty until the next morning brings a new order
        discardOrder: (orderId) => {
          const order = get().orders.find((o) => o.id === orderId);
          if (!order) return;
          set((s) => ({ orders: s.orders.filter((o) => o.id !== orderId) }));
          get().showToast(`Đã từ chối đơn của ${order.customer}. Sáng mai sẽ có đơn mới.`, 'text-amber-300');
        },

        // Honey waiting in the hive goes to the bag
        collectHoney: () => {
          const { beehiveHoney, items, decorPlacements } = get();
          const hive = decorPlacements[BEEHIVE_ID];
          const at: [number, number, number] | undefined = hive ? [hive.x, 1.3, hive.z] : undefined;
          if (beehiveHoney <= 0) {
            get().showToast('🐝 Ong đang làm mật, sáng mai quay lại nhé!', 'text-amber-300', at);
            return;
          }
          soundFX.harvest();
          set({ beehiveHoney: 0, items: addItems(items, { honey: beehiveHoney }) });
          if (hive) spawnParticles(hive.x, 0.9, hive.z, 0xfacc15, 18);
          get().showToast(`🍯 +${beehiveHoney} Mật Ong!`, 'text-yellow-300', at);
          get().incrementQuest('collect_animal', beehiveHoney);
        },

        readLetter: (letterId) =>
          set((s) =>
            s.mail.some((l) => l.id === letterId && !l.read)
              ? { mail: s.mail.map((l) => (l.id === letterId ? { ...l, read: true } : l)) }
              : s
          ),

        claimCollection: (setId) => {
          const { collected, collectionClaimed, gold, gems, playerPos } = get();
          const group = COLLECTION_SETS.find((s) => s.id === setId);
          if (!group || collectionClaimed.includes(setId) || !setProgress(group, collected).complete) return;
          soundFX.questClaim();
          set({
            gold: gold + group.reward.gold,
            gems: gems + group.reward.gems,
            collectionClaimed: [...collectionClaimed, setId],
          });
          spawnParticles(playerPos.x, 0.8, playerPos.z, 0xfacc15, 25);
          get().showToast(
            `📖 Hoàn thành bộ ${group.icon} ${group.name}! +${group.reward.gold}🪙 +${group.reward.gems}💎`,
            'text-yellow-300'
          );
        },

        openResident: (id) => set({ activeResident: id, activeModal: 'resident', tooltip: null }),

        talkTo: (id) => {
          const today = residentsToday();
          if (today.talkedTo.includes(id)) return;
          set({ residentDay: get().day, talkedTo: [...today.talkedTo, id], giftedTo: today.giftedTo });
          befriend(id, TALK_POINTS);
        },

        // One gift a day: liked gifts make better friends, hated ones cost friendship
        giveGift: (id, item) => {
          const today = residentsToday();
          const { items, giftLog } = get();
          const resident = RESIDENTS[id];
          if (today.giftedTo.includes(id)) {
            get().showToast(`Hôm nay đã tặng quà cho ${resident.name} rồi!`, 'text-amber-300');
            return;
          }
          const rest = takeItems(items, { [item]: 1 });
          if (!rest) return;
          const reaction = giftReaction(resident, item);
          set({
            items: rest,
            residentDay: get().day,
            talkedTo: today.talkedTo,
            giftedTo: [...today.giftedTo, id],
            giftLog: { ...giftLog, [id]: Array.from(new Set([...(giftLog[id] ?? []), item])) },
          });
          if (reaction === 'hate') soundFX.error();
          else soundFX.coin();
          get().showToast(
            {
              love: `😍 ${resident.name} cực kỳ thích ${ITEMS[item].icon}!`,
              like: `😊 ${resident.name} thích ${ITEMS[item].icon}`,
              neutral: `🙂 ${resident.name} cảm ơn bạn`,
              hate: `😣 ${resident.name} không thích ${ITEMS[item].icon}...`,
            }[reaction],
            reaction === 'hate' ? 'text-red-300' : 'text-pink-300'
          );
          befriend(id, REACTION_POINTS[reaction]);
          get().incrementQuest('give_gift', 1);
        },

        // The gift that came with a letter, handed over once
        claimLetter: (letterId) => {
          const { mail, gold, gems, items, festivalTokens, playerPos } = get();
          const letter = mail.find((l) => l.id === letterId);
          if (!letter?.gift || letter.claimed) return;
          const { gift } = letter;
          soundFX.questClaim();
          set({
            gold: gold + (gift.gold ?? 0),
            gems: gems + (gift.gems ?? 0),
            items: gift.items ? addItems(items, gift.items) : items,
            festivalTokens:
              gift.festival && gift.tokens
                ? { ...festivalTokens, [gift.festival]: (festivalTokens[gift.festival] ?? 0) + gift.tokens }
                : festivalTokens,
            mail: mail.map((l) => (l.id === letterId ? { ...l, claimed: true, read: true } : l)),
          });
          spawnParticles(playerPos.x, 0.8, playerPos.z, 0xfacc15, 18);
          get().showToast(
            `✉️ ${letterGiftLabel(gift, gift.festival ? FESTIVALS[gift.festival].token.icon : '')}`,
            'text-yellow-300'
          );
        },

        openWorkshop: (machine) =>
          set((s) => ({
            activeModal: 'workshop',
            workshopMachine: machine ?? s.workshopMachine,
            tooltip: null,
          })),

        buyMachine: (id) => {
          const { gold, machines } = get();
          const cfg = MACHINES[id];
          if (machines[id]) return;
          if (gold < cfg.price) {
            soundFX.error();
            get().showToast(`Cần ${cfg.price} Vàng 🪙 để mua ${cfg.name}!`, 'text-red-400');
            return;
          }
          soundFX.questClaim();
          set({
            gold: gold - cfg.price,
            machines: { ...machines, [id]: { job: null } },
            workshopMachine: id,
          });
          get().showToast(`🏭 Đã mua ${cfg.icon} ${cfg.name}! Hãy đặt ra nông trại.`, 'text-lime-300');
          get().incrementQuest('buy_machine', 1);
          get().startPlacingDecor(id);
        },

        startRecipe: (recipeId) => {
          const { machines, items, decorPlacements } = get();
          const recipe = RECIPES[recipeId];
          const cfg = MACHINES[recipe.machine];
          const machine = machines[recipe.machine];
          if (!machine) return;
          const placement = decorPlacements[recipe.machine];
          if (!placement) {
            soundFX.error();
            get().showToast(`🏡 Hãy đặt ${cfg.name} ra nông trại trước!`, 'text-amber-300');
            return;
          }
          if (machine.job) {
            soundFX.error();
            get().showToast(`⏳ ${cfg.name} đang làm mẻ khác!`, 'text-amber-300');
            return;
          }
          const rest = takeItems(items, recipe.inputs);
          if (!rest) {
            soundFX.error();
            const missing = (Object.entries(missingItems(items, recipe.inputs)) as [ItemId, number][])
              .map(([id, n]) => `${n} ${ITEMS[id].icon} ${ITEMS[id].name}`)
              .join(', ');
            get().showToast(`Thiếu ${missing}!`, 'text-red-400');
            return;
          }
          soundFX.plant();
          set({
            items: rest,
            machines: {
              ...machines,
              [recipe.machine]: { job: { recipeId, readyAt: Date.now() + recipe.seconds * 1000 } },
            },
          });
          spawnParticles(placement.x, 1.0, placement.z, 0xfde68a, 12);
        },

        collectMachine: (id) => {
          const { machines, items, breadCount, decorPlacements } = get();
          const job = machines[id]?.job;
          if (!job) return;
          const placement = decorPlacements[id];
          const at: [number, number, number] | undefined = placement
            ? [placement.x, 1.4, placement.z]
            : undefined;
          const left = job.readyAt - Date.now();
          if (left > 0) {
            get().showToast(`⏳ Còn ${formatCountdown(left)} nữa mới xong!`, 'text-amber-300', at);
            return;
          }
          const { output } = RECIPES[job.recipeId];
          soundFX.harvest();
          set({
            machines: { ...machines, [id]: { job: null } },
            ...(output.id === 'bread'
              ? { breadCount: breadCount + output.count }
              : { items: addItems(items, { [output.id]: output.count }) }),
          });
          const label =
            output.id === 'bread' ? '🥖 Bánh Mì' : `${ITEMS[output.id].icon} ${ITEMS[output.id].name}`;
          if (placement) spawnParticles(placement.x, 1.0, placement.z, 0xfacc15, 18);
          get().showToast(`+${output.count} ${label}!`, 'text-yellow-300', at);
          get().incrementQuest('craft', 1);
        },

        // Cast at the Beach jetty or the Park pond; what bites is decided now, by the waters, the time of day
        // and the season
        startFishing: (spotId) => {
          const { currentWorld, energy, timePhaseIndex, day, playerPos, fishing } = get();
          // A cast already in progress is finished first (re-casting is offered on the result card)
          if (fishing && fishing.stage !== 'result') return;
          const spot = spotId ? FISHING_SPOTS[spotId] : fishingSpotIn(currentWorld);
          if (!spot || spot.world !== currentWorld) {
            get().showToast('🎣 Hãy ra Cầu Câu ở Bãi Biển hoặc Hồ Sen ở Công Viên!', 'text-amber-300');
            return;
          }
          if (energy < FISHING_ENERGY) {
            soundFX.error();
            get().showToast('⚡ Không đủ thể lực để quăng cần!', 'text-red-400');
            return;
          }
          const catchId = rollCatch(TIME_PHASES[timePhaseIndex].id, spot.waters, seasonOf(day));
          playerPos.x = spot.x;
          playerPos.z = spot.z;
          playerPos.rotY = spot.rotY;
          playerPos.actionTime = Date.now();
          soundFX.cast();
          set({
            energy: energy - FISHING_ENERGY,
            activeModal: null,
            tooltip: null,
            walkGoal: null,
            fishing: {
              spot: spot.id,
              stage: 'waiting',
              catchId,
              size: rollSize(catchId),
              until: Date.now() + 1500 + Math.random() * 3000,
            },
          });
        },

        goFishing: () => {
          const spot = fishingSpotIn(get().currentWorld);
          if (!spot) {
            get().startFishing();
            return;
          }
          get().walkTo({ x: spot.x, z: spot.z, reach: 0.4, act: () => get().startFishing(spot.id) });
        },

        fishBite: () => {
          const { fishing } = get();
          if (fishing?.stage !== 'waiting') return;
          const [bx, by, bz] = FISHING_SPOTS[fishing.spot].bobber;
          soundFX.splash();
          spawnParticles(bx, by + 0.2, bz, 0xbae6fd, 16);
          set({ fishing: { ...fishing, stage: 'bite', until: Date.now() + BITE_MS } });
        },

        // Strike while the float is down: junk comes straight up, fish start the reeling fight
        hookFish: () => {
          const { fishing, playerPos } = get();
          if (fishing?.stage !== 'bite') return;
          playerPos.actionTime = Date.now();
          if (CATCHES[fishing.catchId].difficulty === 0) {
            get().landCatch();
            return;
          }
          set({ fishing: { ...fishing, stage: 'reeling' } });
        },

        landCatch: () => {
          const { fishing, items, fishLog, gold, gems, playerPos } = get();
          if (fishing?.stage !== 'reeling' && fishing?.stage !== 'bite') return;
          const cfg = CATCHES[fishing.catchId];
          soundFX.harvest();
          spawnParticles(playerPos.x, 0.9, playerPos.z, 0x38bdf8, 22);

          if (fishing.catchId === 'treasure') {
            set({
              gold: gold + TREASURE_REWARD.gold,
              gems: gems + TREASURE_REWARD.gems,
              fishing: { ...fishing, stage: 'result', escaped: false, firstOfKind: false },
            });
            get().showToast(
              `🎁 Rương kho báu: +${TREASURE_REWARD.gold}🪙 +${TREASURE_REWARD.gems}💎!`,
              'text-yellow-300'
            );
            return;
          }

          const id = fishing.catchId;
          const logged = fishLog[id];
          set({
            items: addItems(items, { [id]: 1 }),
            fishLog: {
              ...fishLog,
              [id]: {
                caught: (logged?.caught ?? 0) + 1,
                best: Math.max(logged?.best ?? 0, fishing.size),
              },
            },
            fishing: { ...fishing, stage: 'result', escaped: false, firstOfKind: !logged },
          });
          get().showToast(`${cfg.icon} +1 ${cfg.name} (${fishing.size} cm)!`, 'text-sky-300');
          if (cfg.rarity !== 'junk') {
            get().incrementQuest('fish', 1);
            // Night fishing has its own quests (and festival rewards)
            if (TIME_PHASES[get().timePhaseIndex].id === 'night') {
              get().incrementQuest('night_fish', 1);
            }
          }
        },

        loseFish: () => {
          const { fishing } = get();
          if (fishing?.stage !== 'reeling' && fishing?.stage !== 'bite') return;
          soundFX.error();
          set({ fishing: { ...fishing, stage: 'result', escaped: true } });
        },

        endFishing: () => set({ fishing: null }),

        startBugCatch: (spot) => {
          const { currentWorld, day, timePhaseIndex, bugDay, bugsTaken, energy, bugCatch, fishing, buff } = get();
          if (currentWorld !== 'park' || bugCatch || fishing) return;
          const phase = TIME_PHASES[timePhaseIndex].id;
          const found = bugsInPark(day, phase).find((b) => b.spot === spot);
          const taken = bugDay === day ? bugsTaken : [];
          if (!found || taken.includes(`${phase}:${spot}`)) return;
          if (energy < BUG_NET_ENERGY) {
            soundFX.error();
            get().showToast('⚡ Hết thể lực để vung vợt!', 'text-red-400');
            return;
          }
          // A sweet dish today widens the zone
          const width = netZoneWidth(BUGS[found.bug].difficulty, netBuffScale(buff, day));
          set({
            bugCatch: { spot, bug: found.bug, zone: width / 2 + Math.random() * (1 - width), width, stage: 'aim' },
            walkGoal: null,
            tooltip: null,
          });
        },

        // One swing: in the zone the bug is netted, otherwise it flies off; either way the spot is empty till later
        swingNet: (marker) => {
          const { bugCatch, energy, items, day, bugDay, bugsTaken, timePhaseIndex } = get();
          if (!bugCatch || bugCatch.stage !== 'aim') return;
          const cfg = BUGS[bugCatch.bug];
          const caught = netCaught(marker, bugCatch.zone, bugCatch.width);
          const phase = TIME_PHASES[timePhaseIndex].id;
          const taken = bugDay === day ? bugsTaken : [];
          set({
            energy: Math.max(0, energy - BUG_NET_ENERGY),
            bugDay: day,
            bugsTaken: [...taken, `${phase}:${bugCatch.spot}`],
            items: caught ? addItems(items, { [bugCatch.bug]: 1 }) : items,
            bugCatch: { ...bugCatch, stage: 'result', caught },
          });
          if (caught) {
            soundFX.harvest();
            get().showToast(`${cfg.icon} +1 ${cfg.name}!`, 'text-lime-300');
            get().incrementQuest('catch_bug', 1);
          } else {
            soundFX.error();
          }
        },

        endBugCatch: () => set({ bugCatch: null }),

        openExpand: (plot = null) =>
          set({ activeModal: 'expand', selectedPlot: plot, tooltip: null }),

        selectPlot: (plot) => set({ selectedPlot: plot }),

        buyPlot: (plot) => {
          const { ownedPlots, gold, decorPlacements, buildPieces, playerPos, currentWorld } = get();
          if (!isPlotPurchasable(plot, ownedPlots)) return;
          const price = plotPrice(ownedPlots.length);
          if (gold < price) {
            soundFX.error();
            get().showToast(`Cần ${price} Vàng 🪙 để mở khóa lô đất!`, 'text-red-400');
            return;
          }

          const nextOwned = [...ownedPlots, plot];
          const before = farmBands(ownedPlots);
          const after = farmBands(nextOwned);
          // A newly inserted strip of land pushes placed decor (and the player) outward with the buildings
          const added: FarmBands = {
            west: after.west - before.west,
            east: after.east - before.east,
            north: after.north - before.north,
            south: after.south - before.south,
          };
          const nextPlacements = Object.fromEntries(
            Object.entries(decorPlacements).map(([id, p]) => {
              const [x, z] = stretchPoint(p.x, p.z, added);
              return [id, { ...p, x, z }];
            })
          );
          const nextPieces = buildPieces.map((p) => {
            const [x, z] = stretchPoint(p.x, p.z, added);
            return { ...p, x, z };
          });
          if (currentWorld === 'farm') {
            const [x, z] = stretchPoint(playerPos.x, playerPos.z, added);
            playerPos.x = x;
            playerPos.z = z;
          }

          soundFX.questClaim();
          set({
            gold: gold - price,
            ownedPlots: nextOwned,
            decorPlacements: nextPlacements,
            buildPieces: nextPieces,
            selectedPlot: null,
            activeModal: null,
            // Whatever the player was heading for may have moved with the new land
            walkGoal: null,
          });

          const { px, pz } = parsePlotKey(plot);
          const center = plotCenter(px, pz);
          if (currentWorld === 'farm') {
            spawnParticles(center.x, 0.3, center.z, 0x84cc16, 30);
            spawnParticles(center.x, 0.3, center.z, 0xfacc15, 20);
          }
          get().showToast(
            '🎉 Mở khóa lô đất mới! Nông trại đã mở rộng.',
            'text-lime-300',
            currentWorld === 'farm' ? [center.x, 0.6, center.z] : undefined
          );
          get().incrementQuest('buy_plot', 1);
        },

        // Decor and workshop machines are placed the same way
        startPlacingDecor: (id) => {
          const { currentWorld, decorPlacements, ownedCosmetics, machines } = get();
          const info = placeableInfo(id);
          const owned = isMachineId(id) ? !!machines[id] : ownedCosmetics.includes(id);
          if (!info || !owned) return;
          if (currentWorld !== 'farm') {
            get().showToast(`🏡 Về Nông Trại để đặt ${info.name}!`, 'text-amber-300');
            return;
          }
          set({
            placingDecor: { id, rotY: decorPlacements[id]?.rotY ?? 0 },
            buildMode: null,
            walkGoal: null,
            activeModal: null,
            tooltip: null,
          });
        },

        rotatePlacingDecor: () =>
          set((s) =>
            s.placingDecor
              ? { placingDecor: { ...s.placingDecor, rotY: s.placingDecor.rotY + Math.PI / 4 } }
              : {}
          ),

        cancelPlacingDecor: () => set({ placingDecor: null }),

        placeDecor: (x, z) => {
          const { placingDecor, decorPlacements, ownedPlots, buildPieces } = get();
          if (!placingDecor) return;
          const item = placeableInfo(placingDecor.id);
          if (!canPlaceDecor(placingDecor.id, x, z, ownedPlots, decorPlacements, buildPieces)) {
            soundFX.error();
            get().showToast('🚫 Không đặt được ở đây!', 'text-red-400', [x, 0.5, z]);
            return;
          }

          const firstTime = !decorPlacements[placingDecor.id];
          soundFX.plant();
          set({
            decorPlacements: {
              ...decorPlacements,
              [placingDecor.id]: { x, z, rotY: placingDecor.rotY },
            },
            placingDecor: null,
          });
          spawnParticles(x, 0.3, z, 0xfacc15, 18);
          get().showToast(`✨ Đã đặt ${item?.icon} ${item?.name}!`, 'text-yellow-300', [
            x,
            1.2,
            z,
          ]);
          if (firstTime && !isMachineId(placingDecor.id)) get().incrementQuest('place_decor', 1);
        },

        // Back into storage (decor only: machines stay on the farm and can just be moved)
        storeDecor: (id) => {
          const { decorPlacements } = get();
          if (!decorPlacements[id] || isMachineId(id)) return;
          const next = { ...decorPlacements };
          delete next[id];
          soundFX.plant();
          set({ decorPlacements: next });
          get().showToast(`📦 Đã cất ${cosmeticById(id)?.name} vào kho`, 'text-amber-300');
        },

        buyBuildPieces: (kind, count) => {
          const { gold, buildStock } = get();
          const piece = BUILD_PIECES[kind];
          const cost = piece.price * count;
          if (gold < cost) {
            soundFX.error();
            get().showToast(`Cần ${cost} Vàng 🪙 để mua ${count} ${piece.name}!`, 'text-red-400');
            return;
          }
          soundFX.coin();
          set({ gold: gold - cost, buildStock: { ...buildStock, [kind]: (buildStock[kind] ?? 0) + count } });
          get().showToast(`${piece.icon} +${count} ${piece.name}`, 'text-amber-300');
        },

        // Building goes on piece after piece until the player is done
        startBuilding: (kind) => {
          if (get().currentWorld !== 'farm') {
            get().showToast('🏡 Về Nông Trại để xây dựng!', 'text-amber-300');
            return;
          }
          set((s) => ({
            buildMode: { kind, rotY: s.buildMode?.rotY ?? 0 },
            placingDecor: null,
            placingSprinkler: false,
            walkGoal: null,
            activeModal: null,
            tooltip: null,
          }));
        },

        rotateBuildPiece: () =>
          set((s) => (s.buildMode ? { buildMode: { ...s.buildMode, rotY: s.buildMode.rotY + Math.PI / 2 } } : {})),

        stopBuilding: () => set({ buildMode: null }),

        buildAt: (x, z) => {
          const { buildMode, buildPieces, buildStock, ownedPlots, decorPlacements } = get();
          if (!buildMode) return;
          const cx = snapToCell(x);
          const cz = snapToCell(z);

          // The eraser puts a piece back into the stock
          if (buildMode.kind === 'erase') {
            const piece = pieceAt(buildPieces, cx, cz);
            if (!piece) return;
            soundFX.till();
            set({
              buildPieces: buildPieces.filter((p) => p !== piece),
              buildStock: { ...buildStock, [piece.kind]: (buildStock[piece.kind] ?? 0) + 1 },
            });
            return;
          }

          const { kind, rotY } = buildMode;
          const cfg = BUILD_PIECES[kind];
          if ((buildStock[kind] ?? 0) <= 0) {
            soundFX.error();
            get().showToast(`Hết ${cfg.icon} ${cfg.name}! Mua thêm trên thanh xây dựng.`, 'text-red-400');
            return;
          }
          if (!canPlaceBuildPiece(cx, cz, ownedPlots, decorPlacements, buildPieces)) {
            soundFX.error();
            get().showToast('🚫 Không đặt được ở đây!', 'text-red-400', [cx, 0.5, cz]);
            return;
          }
          soundFX.plant();
          // A fruit tree starts growing the day it is planted
          const piece: BuildPiece = cfg.fruit
            ? { kind, x: cx, z: cz, rotY, planted: get().day, fruit: 0 }
            : { kind, x: cx, z: cz, rotY };
          set({
            buildPieces: [...buildPieces, piece],
            buildStock: { ...buildStock, [kind]: (buildStock[kind] ?? 0) - 1 },
          });
        },

        pickFruit: (x, z) => {
          const { buildPieces, items, day } = get();
          const tree = pieceAt(buildPieces, snapToCell(x), snapToCell(z));
          const fruit = tree && BUILD_PIECES[tree.kind].fruit;
          if (!tree || !fruit) return;
          const at: [number, number, number] = [tree.x, 1.6, tree.z];
          const count = tree.fruit ?? 0;
          if (count <= 0) {
            const growing = daysUntilGrown(tree, day) ?? 0;
            get().showToast(
              growing > 0 ? `🌱 Cây còn non, ${growing} ngày nữa mới ra trái` : '🌳 Sáng mai cây sẽ ra trái mới',
              'text-amber-300',
              at
            );
            return;
          }
          const item = ITEMS[fruit.item];
          soundFX.harvest();
          set({
            buildPieces: buildPieces.map((p) => (p === tree ? { ...p, fruit: 0 } : p)),
            items: addItems(items, { [fruit.item]: count }),
          });
          spawnParticles(tree.x, 1.2, tree.z, 0xfacc15, 18);
          get().showToast(`${item.icon} +${count} ${item.name}!`, 'text-yellow-300', at);
          get().incrementQuest('harvest', count);
        },

        buyAnimal: (species) => {
          const { gold, animals } = get();
          const cfg = ANIMALS[species];
          if (gold < cfg.buyPrice) {
            soundFX.error();
            get().showToast(
              `Cần ${cfg.buyPrice} Vàng 🪙 để mua ${cfg.name}!`,
              'text-red-400'
            );
            return;
          }
          if (animals.length >= MAX_ANIMALS) {
            soundFX.error();
            get().showToast(`🏠 Chuồng trại đã đủ ${MAX_ANIMALS} vật nuôi!`, 'text-red-400');
            return;
          }

          soundFX.animalHappy();
          const countSame =
            animals.filter((a) => a.species === species).length + 1;
          const newAnimal: FarmAnimal = {
            id: `ani_${species}_${Date.now()}`,
            species,
            name: `${cfg.name} #${countSame}`,
            fedToday: false,
            hasProduct: false,
            affection: 25,
            x: -11.2 + (Math.random() * 3.4 - 1.7),
            z: 6.2 + (Math.random() * 3.0 - 1.5),
          };

          set({
            gold: gold - cfg.buyPrice,
            animals: [...animals, newAnimal],
          });
          get().showToast(`🎉 Đã đón ${cfg.icon} ${newAnimal.name} về chuồng!`);
          get().incrementQuest('buy_animal', 1);
        },

        buyAnimalFeed: (amount = 5) => {
          const { gold, animalFeed } = get();
          const cost = amount * 10;
          if (gold < cost) {
            soundFX.error();
            get().showToast(
              `Cần ${cost} Vàng 🪙 để mua ${amount} phần Thức Ăn!`,
              'text-red-400'
            );
            return;
          }
          soundFX.coin();
          set({
            gold: gold - cost,
            animalFeed: animalFeed + amount,
          });
          get().showToast(`🌾 +${amount} phần Thức Ăn Chăn Nuôi!`);
        },

        interactAnimal: (animalId) => {
          const { animals, animalFeed, items, playerPos, ownedPlots } = get();
          const target = animals.find((a) => a.id === animalId);
          if (!target) return;

          playerPos.actionTime = Date.now();
          const cfg = ANIMALS[target.species];
          const [ox, oz] = ranchOffset(ownedPlots);
          const ax = target.x + ox;
          const az = target.z + oz;

          if (target.hasProduct) {
            // Close friends sometimes give two
            const count =
              target.affection >= DOUBLE_PRODUCT_AFFECTION && Math.random() < DOUBLE_PRODUCT_CHANCE ? 2 : 1;
            soundFX.harvest();
            set({
              animals: animals.map((a) =>
                a.id === animalId
                  ? {
                      ...a,
                      hasProduct: false,
                      affection: Math.min(100, a.affection + 10),
                    }
                  : a
              ),
              items: addItems(items, { [cfg.productId]: count }),
            });
            spawnParticles(ax, 0.6, az, 0xfacc15, 16);
            get().showToast(
              `${cfg.productIcon} +${count} ${cfg.productName}!${count > 1 ? ' 💕 Quà thân thiết!' : ''}`,
              'text-yellow-300',
              [ax, 0.8, az]
            );
            get().incrementQuest('collect_animal', 1);
            return;
          }

          if (!target.fedToday) {
            if (animalFeed <= 0) {
              soundFX.error();
              get().showToast(
                '🌾 Hết Thức Ăn! Mở Chuồng Trại (phím R) để mua thêm.',
                'text-red-400'
              );
              return;
            }
            soundFX.animalHappy();
            set({
              animalFeed: animalFeed - 1,
              animals: animals.map((a) =>
                a.id === animalId
                  ? {
                      ...a,
                      fedToday: true,
                      affection: Math.min(100, a.affection + 15),
                    }
                  : a
              ),
            });
            get().incrementQuest('feed_animal', 1);
            get().showToast(`❤️ ${target.name} đã ăn no!`, 'text-pink-300', [ax, 0.8, az]);
            return;
          }

          soundFX.animalHappy();
          get().showToast(
            `💕 ${target.name} (Thân thiết ${target.affection}%)`,
            'text-pink-300',
            [ax, 0.8, az]
          );
        },

        feedAllAnimals: () => {
          const { animals, animalFeed } = get();
          const hungry = animals.filter((a) => !a.fedToday);
          if (hungry.length === 0) {
            get().showToast('❤️ Cả đàn đã được ăn no hôm nay!', 'text-pink-300');
            return;
          }
          if (animalFeed < hungry.length) {
            soundFX.error();
            get().showToast(
              `🌾 Cần ${hungry.length} phần Thức Ăn để cho cả đàn ăn!`,
              'text-red-400'
            );
            return;
          }
          soundFX.animalHappy();
          set({
            animalFeed: animalFeed - hungry.length,
            animals: animals.map((a) => ({
              ...a,
              fedToday: true,
              affection: Math.min(100, a.affection + 15),
            })),
          });
          get().incrementQuest('feed_animal', hungry.length);
          get().showToast(`🌾 Đã cho ${hungry.length} vật nuôi ăn no!`, 'text-pink-300');
        },

        nextDay: () => {
          const { day, tiles, shippingBin, animals, machines, gold, gems, breadCount, seeds, cosmetics, items, animalFeed } =
            get();

          // The shipping bin sells overnight at full price; the bag is kept
          const soldItems = (Object.entries(shippingBin) as [ItemId, number][])
            .filter(([, count]) => count > 0)
            .map(([id, count]) => ({
              label: ITEMS[id].name,
              icon: ITEMS[id].icon,
              count,
              gold: count * seasonalPrice(id, day),
            }));
          const totalGoldEarned = soldItems.reduce((sum, item) => sum + item.gold, 0);

          // A night's sleep finishes every batch in the workshop
          const now = Date.now();
          let batchesReady = 0;
          const nextMachines: SaveData['machines'] = {};
          (Object.keys(machines) as MachineId[]).forEach((id) => {
            const job = machines[id]?.job ?? null;
            if (job) batchesReady++;
            nextMachines[id] = { job: job && { ...job, readyAt: Math.min(job.readyAt, now) } };
          });

          let cropsGrownCount = 0;
          const nextTiles = tiles.map((t) => {
            if (t.state === 'planted' && t.crop && t.watered && t.stage < 3) {
              const cfg = CROPS[t.crop];
              const nextDaysWatered = t.daysWatered + 1;
              if (nextDaysWatered >= cfg.daysPerStage) {
                cropsGrownCount++;
                return {
                  ...t,
                  stage: Math.min(3, t.stage + 1),
                  watered: false,
                  daysWatered: 0,
                };
              }
              return {
                ...t,
                watered: false,
                daysWatered: nextDaysWatered,
              };
            }
            return { ...t, watered: false };
          });
          const readyCount = nextTiles.filter(
            (t) => t.state === 'planted' && t.stage >= 3
          ).length;
          // Sprinklers water their neighbours for the new day (so those crops grow tonight)
          const sprinkledTiles = applySprinklers(nextTiles);
          const sprinklerWatered = sprinkledTiles.filter((t) => t.watered).length;
          // Rain, storms and snow water every worked tile
          const weather = weatherOf(day + 1);
          const morningTiles = isWet(weather)
            ? sprinkledTiles.map((t) =>
                t.state !== 'empty' && !t.sprinkler && !t.watered ? { ...t, watered: true } : t
              )
            : sprinkledTiles;
          const rainWatered = morningTiles.filter((t) => t.watered).length - sprinklerWatered;

          // The pet you walk with lends a hand overnight
          const cat = cosmetics.pet === 'robo_cat' ? roboCatWater(morningTiles) : null;
          const find = cosmetics.pet === 'shiba_inu' ? shibaFind(day + 1) : null;
          const gift = petMorningGift(cosmetics.pet, day + 1);
          const petNote = find
            ? shibaFindLabel(find)
            : cat?.watered
            ? `🤖 Mèo Máy đã tưới giúp ${cat.watered} ô ruộng`
            : gift?.label ?? null;

          let animalProductsReady = 0;
          const nextAnimals = animals.map((a) => {
            const ready = a.fedToday || a.hasProduct;
            if (ready) animalProductsReady++;
            return {
              ...a,
              hasProduct: ready,
              fedToday: false,
            };
          });

          // Overnight sales and the night's sleep count before the daily quests roll over
          get().incrementQuest('earn_gold', totalGoldEarned);
          get().incrementQuest('sleep', 1);

          // Residents post new orders in the board's empty slots
          const orders = refillOrders({ ...get(), day: day + 1 });
          const newOrders = orders.length - get().orders.length;

          // The fruit trees bear overnight
          const trees = ripenTrees(get().buildPieces, day + 1);

          // The bees fill the hive overnight, up to what it holds
          const { decorPlacements, ownedCosmetics, buildPieces, beehiveHoney, mail, pendingThanks } = get();
          const hiveHoney = Math.min(
            HIVE_CAPACITY,
            beehiveHoney + hiveHoneyToday(decorPlacements, ownedCosmetics, buildPieces)
          );
          // The morning post: the running festival's letter, and thanks for yesterday's orders to a farm with a mailbox
          const festival = runningFestival();
          const hasMailbox = !!decorPlacements[MAILBOX_ID] && ownedCosmetics.includes(MAILBOX_ID);
          const nextMail = deliverLetters(mail, [
            ...(festival ? [festivalLetter(festival, day + 1)] : []),
            ...(pendingThanks && hasMailbox ? [thankYouLetter(pendingThanks, day + 1)] : []),
          ]);
          const newLetters = nextMail.filter((l) => !mail.includes(l)).length;

          soundFX.questClaim();
          set({
            day: day + 1,
            energy: BASE_MAX_ENERGY,
            // Yesterday's dish has worn off
            buff: null,
            timePhaseIndex: 0,
            gold: gold + totalGoldEarned + (find?.kind === 'gold' ? find.amount : 0) + (gift?.gold ?? 0),
            gems: gems + (find?.kind === 'gems' ? find.amount : 0),
            breadCount: breadCount + (find?.kind === 'bread' ? 1 : 0) + (gift?.bread ?? 0),
            seeds: find?.kind === 'seeds' ? { ...seeds, [find.crop]: (seeds[find.crop] ?? 0) + find.count } : seeds,
            items: gift?.items ? addItems(items, gift.items) : items,
            animalFeed: animalFeed + (gift?.feed ?? 0),
            tiles: cat ? cat.tiles : morningTiles,
            animals: nextAnimals,
            machines: nextMachines,
            shippingBin: {},
            quests: [
              ...get().quests.filter((q) => q.category !== 'daily'),
              ...createDailyQuests(day + 1),
            ],
            dailyDay: day + 1,
            orders,
            buildPieces: trees.pieces,
            beehiveHoney: hiveHoney,
            mail: nextMail,
            pendingThanks: null,
            placingDecor: null,
            buildMode: null,
            fishing: null,
            walkGoal: null,
            lastDaySummary: {
              day,
              soldItems,
              totalGoldEarned,
              cropsGrownCount,
              readyCount,
              animalProductsReady,
              batchesReady,
              sprinklerWatered,
              weather,
              forecast: weatherOf(day + 2),
              rainWatered,
              petNote,
              newOrders,
              honeyMade: hiveHoney - beehiveHoney,
              fruitRipened: trees.ripened,
              newLetters,
            },
            activeModal: 'summary',
          });

          get().syncToCloud();
        },

        buyOrEquipCosmetic: (itemId) => {
          const { ownedCosmetics, cosmetics, gold, gems, playerPos } = get();
          const item = cosmeticById(itemId);
          if (!item) return;

          if (ownedCosmetics.includes(itemId)) {
            if (item.category === 'decor') {
              get().startPlacingDecor(itemId);
              return;
            }
            soundFX.plant();
            set({
              cosmetics: {
                ...cosmetics,
                [item.category]: itemId,
              },
            });
            spawnParticles(playerPos.x, 0.8, playerPos.z, 0xf472b6, 18);
            return;
          }

          // Festival items are only traded for that festival's tokens at its stall
          if (item.festival) {
            const { token, shop } = FESTIVALS[item.festival];
            soundFX.error();
            get().showToast(`${token.icon} Đổi bằng ${token.name} ở ${shop.name} (Công Viên)!`, 'text-purple-300');
            return;
          }

          if (gold < item.priceGold) {
            soundFX.error();
            get().showToast('Không đủ Vàng 🪙!', 'text-red-400');
            return;
          }
          if (gems < item.priceGems) {
            soundFX.error();
            get().showToast(
              'Không đủ Kim Cương 💎! Hãy làm Nhiệm Vụ!',
              'text-sky-300'
            );
            return;
          }

          soundFX.questClaim();
          set({
            gold: gold - item.priceGold,
            gems: gems - item.priceGems,
            ownedCosmetics: [...ownedCosmetics, itemId],
            cosmetics:
              item.category !== 'decor'
                ? { ...cosmetics, [item.category]: itemId }
                : cosmetics,
          });
          if (item.category === 'decor') {
            get().incrementQuest('buy_decor', 1);
            get().startPlacingDecor(itemId);
          } else {
            spawnParticles(playerPos.x, 0.8, playerPos.z, 0xf472b6, 18);
            get().incrementQuest('buy_cosmetic', 1);
          }
        },

        // Every gameplay event goes through here: quest progress, farmer experience and festival tokens
        incrementQuest: (type, amount = 1, crop) => {
          if (amount <= 0) return;
          const festival = runningFestival();
          const completed: QuestItem[] = [];
          set((s) => ({
            quests: advanceQuests(s.quests, type, amount, crop, completed, festival?.id ?? null),
          }));
          announceCompleted(completed);
          gainXp(xpFor(type, amount));
          // This week's counters for the leaderboards
          const counter = WEEKLY_COUNTERS[type];
          if (counter) set((s) => ({ weekly: addWeekly(s.weekly, weekKey(new Date()), { [counter]: amount }) }));
          const tokens = festival ? festivalTokensFor(festival, type, amount, crop) : 0;
          if (festival && tokens > 0) {
            const { playerPos } = get();
            set((s) => ({
              festivalTokens: { ...s.festivalTokens, [festival.id]: (s.festivalTokens[festival.id] ?? 0) + tokens },
            }));
            get().showToast(`${festival.token.icon} +${tokens} ${festival.token.name}`, 'text-purple-300', [
              playerPos.x,
              1.7,
              playerPos.z,
            ]);
          }
        },

        claimQuest: (questId) => {
          const { quests, gold, gems, festivalTokens, playerPos } = get();
          const q = quests.find((item) => item.id === questId);
          if (!q || q.claimed || q.progress < q.target) return;
          // A festival's quests pay out only while it runs
          if (q.category === 'event' && (!q.festival || runningFestival()?.id !== q.festival)) return;

          const rewardTokens = q.festival ? q.rewardTokens ?? 0 : 0;
          soundFX.questClaim();
          set({
            gold: gold + q.rewardGold,
            gems: gems + q.rewardGems,
            festivalTokens:
              q.festival && rewardTokens
                ? { ...festivalTokens, [q.festival]: (festivalTokens[q.festival] ?? 0) + rewardTokens }
                : festivalTokens,
            quests: quests.map((item) => (item.id === questId ? afterClaim(item) : item)),
          });
          spawnParticles(playerPos.x, 0.6, playerPos.z, 0xfacc15, 25);
          const tokenIcon = q.festival ? FESTIVALS[q.festival].token.icon : '';
          get().showToast(
            `🎉 +${q.rewardGold}🪙 +${q.rewardGems}💎${rewardTokens ? ` +${rewardTokens}${tokenIcon}` : ''}!`,
            'text-yellow-300',
            [playerPos.x, 1.3, playerPos.z]
          );
          // The next story quest may already be satisfied (e.g. zones visited earlier)
          if (q.category === 'main') syncVisitQuest();
        },

        // A festival's items for its tokens, at its stall in the Park while it runs
        buyFestivalItem: (itemId) => {
          const { festivalTokens, ownedCosmetics, cosmetics, currentWorld, playerPos } = get();
          const item = cosmeticById(itemId);
          if (!item?.festival || item.priceTokens === undefined || ownedCosmetics.includes(itemId)) return;
          const festival = FESTIVALS[item.festival];
          if (runningFestival()?.id !== festival.id) {
            get().showToast(`${festival.icon} ${festival.name} đã kết thúc!`, 'text-amber-300');
            return;
          }
          if (currentWorld !== 'park') {
            soundFX.error();
            get().showToast(`🌸 Hãy đến ${festival.shop.name} ở Công Viên để đổi quà!`, 'text-purple-300');
            return;
          }
          const balance = festivalTokens[festival.id] ?? 0;
          if (balance < item.priceTokens) {
            soundFX.error();
            get().showToast(`Cần ${item.priceTokens}${festival.token.icon} để đổi ${item.name}!`, 'text-red-400');
            return;
          }
          const isDecor = item.category === 'decor';
          soundFX.questClaim();
          set({
            festivalTokens: { ...festivalTokens, [festival.id]: balance - item.priceTokens },
            ownedCosmetics: [...ownedCosmetics, itemId],
            cosmetics: isDecor ? cosmetics : { ...cosmetics, [item.category]: itemId },
          });
          spawnParticles(playerPos.x, 0.9, playerPos.z, Number.parseInt(festival.stall.trim.slice(1), 16), 22);
          get().showToast(
            `${festival.icon} Đã đổi ${item.icon} ${item.name}!${isDecor ? ' Về nông trại để đặt.' : ''}`,
            'text-purple-300'
          );
          get().incrementQuest(isDecor ? 'buy_decor' : 'buy_cosmetic', 1);
          get().incrementQuest('event_shop', 1);
        },

        collectBeachFind: (spot) => {
          const { currentWorld, day, beachDay, beachTaken, items, playerPos } = get();
          if (currentWorld !== 'beach') return;
          const taken = beachDay === day ? beachTaken : [];
          const find = beachFinds(day).find((f) => f.spot === spot);
          if (!find || taken.includes(spot)) return;
          const cfg = ITEMS[find.item];
          const [x, z] = BEACH_SPOTS[spot];
          playerPos.actionTime = Date.now();
          soundFX.harvest();
          set({ items: addItems(items, { [find.item]: 1 }), beachDay: day, beachTaken: [...taken, spot] });
          spawnParticles(x, 0.3, z, 0xfde68a, 14);
          get().showToast(`${cfg.icon} +1 ${cfg.name}!`, 'text-yellow-300', [x, 0.6, z]);
          get().incrementQuest('forage', 1);
        },

        spinLuckyWheel: () => {
          const { lastWheelDate, gold, gems, breadCount, seeds } = get();
          const today = localDateKey(new Date());
          if (lastWheelDate === today) return null;
          const index = rollWheel();
          const prize = WHEEL_PRIZES[index];
          const nextSeeds = { ...seeds };
          (Object.entries(prize.seeds ?? {}) as [CropId, number][]).forEach(([crop, n]) => {
            nextSeeds[crop] = (nextSeeds[crop] ?? 0) + n;
          });
          set({
            lastWheelDate: today,
            gold: gold + (prize.gold ?? 0),
            gems: gems + (prize.gems ?? 0),
            breadCount: breadCount + (prize.bread ?? 0),
            seeds: nextSeeds,
          });
          return index;
        },

        payClaw: () => {
          const { gold } = get();
          if (gold < CLAW_PRICE) {
            soundFX.error();
            get().showToast(`Cần ${CLAW_PRICE} Vàng 🪙 cho một lượt gắp!`, 'text-red-400');
            return false;
          }
          soundFX.coin();
          set({ gold: gold - CLAW_PRICE });
          return true;
        },

        winClawPrize: (index) => {
          const prize = CLAW_PRIZES[index];
          if (!prize) return;
          const { gold, gems, breadCount, animalFeed, seeds } = get();
          const nextSeeds = { ...seeds };
          (Object.entries(prize.seeds ?? {}) as [CropId, number][]).forEach(([crop, n]) => {
            nextSeeds[crop] = (nextSeeds[crop] ?? 0) + n;
          });
          soundFX.harvest();
          set({
            gold: gold + (prize.gold ?? 0),
            gems: gems + (prize.gems ?? 0),
            breadCount: breadCount + (prize.bread ?? 0),
            animalFeed: animalFeed + (prize.feed ?? 0),
            seeds: nextSeeds,
          });
          get().showToast(`${prize.toy} Gắp trúng: ${prize.label}!`, 'text-yellow-300');
        },

        casinoPayout: (gold, place) => {
          set((s) => ({ gold: Math.max(0, s.gold + gold) }));
          if (gold > 0) soundFX.questClaim();
          get().showToast(
            gold >= 0 ? `🃏 Tiến Lên: +${gold}🪙` : `🃏 Tiến Lên: −${-gold}🪙`,
            gold >= 0 ? 'text-yellow-300' : 'text-red-400'
          );
          get().incrementQuest('card_game', 1);
          if (place === 0) get().incrementQuest('card_win', 1);
        },

        casinoForfeit: (gold) => {
          set((s) => ({ gold: Math.max(0, s.gold - gold) }));
          soundFX.error();
          get().showToast(`🚪 Bỏ bàn giữa ván: −${gold}🪙`, 'text-red-400');
        },

        // One gift per real calendar day, following the 7-day login streak
        claimDailyGift: () => {
          const { loginStreak, lastGiftDate, gold, gems, breadCount, animalFeed, seeds, playerPos } =
            get();
          const today = localDateKey(new Date());
          const day = giftDay(lastGiftDate, loginStreak, today);
          if (day === null) return;
          const gift = DAILY_GIFTS[day - 1];
          const nextSeeds = { ...seeds };
          (Object.entries(gift.seeds ?? {}) as [CropId, number][]).forEach(([crop, n]) => {
            nextSeeds[crop] = (nextSeeds[crop] ?? 0) + n;
          });
          soundFX.questClaim();
          set({
            gold: gold + (gift.gold ?? 0),
            gems: gems + (gift.gems ?? 0),
            breadCount: breadCount + (gift.bread ?? 0),
            animalFeed: animalFeed + (gift.feed ?? 0),
            seeds: nextSeeds,
            loginStreak: day,
            lastGiftDate: today,
          });
          spawnParticles(playerPos.x, 1.0, playerPos.z, 0xfacc15, 24);
          get().showToast(`🎁 Quà ngày ${day}: ${giftLabel(gift)}!`, 'text-yellow-300');
        },

        sendChat: (text) => {
          const clean = text.trim();
          if (!clean) return;
          const { playerId, playerName, currentWorld, chatMessages } = get();
          soundFX.chat();

          const newMsg: ChatMessage = {
            id: 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            uid: playerId,
            sender: playerName,
            world: currentWorld,
            text: clean,
            createdAt: Date.now(),
          };

          set({
            localChatMsg: clean,
            chatMessages: [...chatMessages.slice(-35), newMsg],
          });
          get().incrementQuest('chat', 1);

          setTimeout(() => {
            if (get().localChatMsg === clean) {
              set({ localChatMsg: '' });
            }
          }, 5500);
        },

        triggerEmote: (emote, chatText) => {
          const { playerPos } = get();
          soundFX.chat();
          set({ localEmote: emote });
          spawnParticles(playerPos.x, 1.1, playerPos.z, 0xf472b6, 16);
          if (chatText) {
            get().sendChat(`${emote} ${chatText}`);
          } else {
            get().incrementQuest('chat', 1);
          }
          setTimeout(() => {
            if (get().localEmote === emote) {
              set({ localEmote: '' });
            }
          }, 2600);
        },

        setRemotePlayers: (players) => set({ remotePlayers: players }),

        addChatMessage: (msg) =>
          set((state) => {
            if (state.chatMessages.some((m) => m.id === msg.id)) return state;
            return {
              chatMessages: [...state.chatMessages.slice(-35), msg],
            };
          }),
      };
    },
    {
      name: 'sunny-farm-3d-v3',
      version: SAVE_VERSION,
      partialize: (state) => ({
        ...pickSaveData(state),
        playerId: state.playerId,
        useGlbModels: state.useGlbModels,
        musicVolume: state.musicVolume,
        sfxVolume: state.sfxVolume,
        cloudLink: state.cloudLink,
        cloudDirty: state.cloudDirty,
      }),
      migrate: (persisted, version) =>
        migrateSave(persisted as Record<string, unknown>, version) as unknown as GameState,
      // The signed-in account always comes from the Supabase session, never from an old save;
      // quests added to the game since the save was written join it
      merge: (persisted, current) => {
        // Nothing saved yet (a first visit): zustand still merges, with `undefined`
        if (!persisted) return current;
        const saved = persisted as Partial<GameState>;
        return {
          ...current,
          ...saved,
          quests: reconcileQuests(saved.quests ?? current.quests, saved.day ?? current.day),
          userProfile: null,
        };
      },
    }
  )
);

// Anything new in the bag goes in the collection book (lib/collection)
useGameStore.subscribe((state, prev) => {
  if (state.items === prev.items) return;
  const fresh = (Object.keys(state.items) as ItemId[]).filter(
    (id) => (state.items[id] ?? 0) > 0 && !state.collected.includes(id)
  );
  if (fresh.length) useGameStore.setState({ collected: [...state.collected, ...fresh] });
});

// A farm that changes after a cloud sync needs uploading again (lib/cloudSync does it in the
// background). Loading or syncing a save sets `cloudLink` in the same update: that is bookkeeping, not play.
useGameStore.subscribe((state, prev) => {
  if (state.cloudDirty || state.cloudLink !== prev.cloudLink) return;
  if (SAVE_KEYS.some((key) => state[key] !== prev[key])) {
    useGameStore.setState({ cloudDirty: true });
  }
});
