'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  AnimalSpecies,
  ChatMessage,
  CropId,
  FarmAnimal,
  FishingSession,
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
  Weather,
  WorldId,
} from '@/types/game';
import { CROPS } from '@/config/crops';
import { ANIMALS } from '@/config/animals';
import { COSMETICS } from '@/config/cosmetics';
import { ITEMS } from '@/config/items';
import { MACHINES, RECIPES, isMachineId } from '@/config/machines';
import {
  BITE_MS,
  BOBBER_POS,
  CATCHES,
  FISHING_ENERGY,
  FISHING_SPOT,
  TREASURE_REWARD,
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
  FarmBands,
  canPlaceDecor,
  farmBands,
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
import { rollCatch, rollSize } from '@/lib/fishing';
import { levelInfo, levelReward, levelTitle, xpFor } from '@/lib/leveling';
import { DAILY_GIFTS, giftDay, giftLabel, localDateKey } from '@/lib/dailyGift';
import { CANDY_PER_NIGHT_FISH, CANDY_PER_PUMPKIN, isEventActive } from '@/lib/event';
import { isWet, seasonalPrice, weatherOf } from '@/lib/seasons';
import {
  MAX_TOOL_TIER,
  SPRINKLER_PRICE,
  TOOL_NAMES,
  TOOL_UPGRADES,
  UpgradableTool,
  applySprinklers,
  areaTiles,
  energyPerTile,
  waterCapacity,
} from '@/lib/tools';
import { formatCountdown } from '@/lib/format';
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

  maxEnergy: number;
  timePhaseIndex: number;
  currentWorld: WorldId;
  activeTool: ToolId;
  selectedPlot: string | null;
  placingDecor: { id: string; rotY: number } | null;
  // Choosing a field tile for a sprinkler
  placingSprinkler: boolean;
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
    | 'candyShop'
    | null;
  // Machine shown in the workshop window
  workshopMachine: MachineId | null;
  // The current cast at the Beach fishing jetty (not saved)
  fishing: FishingSession | null;
  lastDaySummary: DaySummaryData | null;
  floatingLabels: FloatingLabel[];
  tooltip: HoverTooltip | null;
  cinemaChannel: number;

  playerPos: { x: number; z: number; rotY: number; actionTime: number };
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
  eatBread: () => void;
  interactTile: (r: number, c: number) => void;
  interactFront: () => void;
  buySeed: (crop: CropId, amount?: number) => void;
  buyBread: () => void;
  buyToolUpgrade: (tool: UpgradableTool) => void;
  buySprinkler: () => void;
  startPlacingSprinkler: () => void;
  cancelPlacingSprinkler: () => void;
  placeSprinkler: (r: number, c: number) => void;
  sellNow: (id: ItemId, amount?: number) => void;
  sellAllNow: (kind?: ItemConfig['kind']) => void;
  moveToBin: (id: ItemId, amount?: number) => void;
  returnFromBin: (id: ItemId, amount?: number) => void;
  depositAllToBin: () => void;
  sellAtMarket: (id: ItemId, amount?: number) => void;

  openWorkshop: (machine?: MachineId) => void;
  buyMachine: (id: MachineId) => void;
  startRecipe: (recipeId: RecipeId) => void;
  collectMachine: (id: MachineId) => void;

  startFishing: () => void;
  fishBite: () => void;
  hookFish: () => void;
  landCatch: () => void;
  loseFish: () => void;
  endFishing: () => void;

  openExpand: (plot?: string | null) => void;
  selectPlot: (plot: string) => void;
  buyPlot: (plot: string) => void;

  startPlacingDecor: (id: string) => void;
  rotatePlacingDecor: () => void;
  cancelPlacingDecor: () => void;
  placeDecor: (x: number, z: number) => void;
  storeDecor: (id: string) => void;

  buyAnimal: (species: AnimalSpecies) => void;
  buyAnimalFeed: (amount?: number) => void;
  interactAnimal: (animalId: string) => void;
  feedAllAnimals: () => void;

  nextDay: () => void;
  buyOrEquipCosmetic: (itemId: string) => void;
  incrementQuest: (type: QuestType, amount?: number, crop?: CropId) => void;
  claimQuest: (questId: string) => void;
  claimDailyGift: () => void;
  buyCandyItem: (itemId: string) => void;
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

// Lễ Hội Bí Ngô runs by the device's calendar date
const festivalActive = () => isEventActive(localDateKey(new Date()));

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

        maxEnergy: 100,
        timePhaseIndex: 0,
        currentWorld: 'farm',
        activeTool: 'hoe',
        selectedPlot: null,
        placingDecor: null,
        placingSprinkler: false,
        activeModal: null,
        workshopMachine: null,
        fishing: null,
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
            fishing: null,
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
          set({ activeTool: tool });
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
          const { energy, maxEnergy, gold, day, lastFreeSnackDay } = get();
          if (energy >= maxEnergy) {
            get().showToast('⚡ Thể lực đang đầy 100/100!', 'text-amber-300');
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

        eatBread: () => {
          const { breadCount, energy, maxEnergy } = get();
          if (breadCount <= 0) {
            soundFX.error();
            get().showToast(
              '🥖 Hết Bánh Mì! Hãy ghé Cửa Hàng mua thêm.',
              'text-red-400'
            );
            return;
          }
          if (energy >= maxEnergy) {
            get().showToast('⚡ Thể lực đang đầy 100/100!', 'text-amber-300');
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

            const updatedTiles = tiles.map((t) => {
              if (t.r !== r || t.c !== c) return t;
              if (cropCfg.regrow) {
                return { ...t, stage: 2, watered: false, daysWatered: 0 };
              }
              return {
                ...t,
                state: 'tilled' as const,
                crop: null,
                stage: 0,
                watered: false,
                daysWatered: 0,
              };
            });

            // Every pumpkin brings festival candy while Lễ Hội Bí Ngô runs
            const candy = cropKey === 'pumpkin' && festivalActive() ? CANDY_PER_PUMPKIN : 0;
            set({
              tiles: updatedTiles,
              items: addItems(items, { [cropKey]: 1 }),
              candy: state.candy + candy,
            });
            spawnParticles(tx, 0.45, tz, 0xfacc15, 20);
            get().showToast(
              `${cropCfg.icon} +1 ${cropCfg.name}${candy ? ` +${candy}🍬` : ''}!`,
              'text-yellow-300',
              [tx, 0.65, tz]
            );
            get().incrementQuest('harvest', 1, cropKey);
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

        // Space / E / the mobile "LÀM" button: work the tile in front, or open the map at the portal
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
          }
          const [px, pz] = worldPortal(currentWorld, ownedPlots);
          if (Math.hypot(playerPos.x - px, playerPos.z - pz) < 2.6) {
            set({ activeModal: 'map' });
          }
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
          set({ placingSprinkler: true, placingDecor: null, activeModal: null, tooltip: null });
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

        // Cast from the Beach jetty; what bites is decided now and depends on the time of day
        startFishing: () => {
          const { currentWorld, energy, timePhaseIndex, playerPos, fishing } = get();
          // A cast already in progress is finished first (re-casting is offered on the result card)
          if (fishing && fishing.stage !== 'result') return;
          if (currentWorld !== 'beach') {
            get().showToast('🎣 Hãy đến Bãi Biển để câu cá!', 'text-amber-300');
            return;
          }
          if (energy < FISHING_ENERGY) {
            soundFX.error();
            get().showToast('⚡ Không đủ thể lực để quăng cần!', 'text-red-400');
            return;
          }
          const catchId = rollCatch(TIME_PHASES[timePhaseIndex].id);
          playerPos.x = FISHING_SPOT.x;
          playerPos.z = FISHING_SPOT.z;
          playerPos.rotY = FISHING_SPOT.rotY;
          playerPos.actionTime = Date.now();
          soundFX.cast();
          set({
            energy: energy - FISHING_ENERGY,
            activeModal: null,
            tooltip: null,
            fishing: {
              stage: 'waiting',
              catchId,
              size: rollSize(catchId),
              until: Date.now() + 1500 + Math.random() * 3000,
            },
          });
        },

        fishBite: () => {
          const { fishing } = get();
          if (fishing?.stage !== 'waiting') return;
          soundFX.splash();
          spawnParticles(BOBBER_POS[0], BOBBER_POS[1] + 0.2, BOBBER_POS[2], 0xbae6fd, 16);
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
            // Night fishing: its own quests, plus candy during the festival
            if (TIME_PHASES[get().timePhaseIndex].id === 'night') {
              get().incrementQuest('night_fish', 1);
              if (festivalActive()) {
                set((s) => ({ candy: s.candy + CANDY_PER_NIGHT_FISH }));
                get().showToast(`🌙 Cá đêm hội +${CANDY_PER_NIGHT_FISH}🍬`, 'text-purple-300');
              }
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

        openExpand: (plot = null) =>
          set({ activeModal: 'expand', selectedPlot: plot, tooltip: null }),

        selectPlot: (plot) => set({ selectedPlot: plot }),

        buyPlot: (plot) => {
          const { ownedPlots, gold, decorPlacements, playerPos, currentWorld } = get();
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
            selectedPlot: null,
            activeModal: null,
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
          const { placingDecor, decorPlacements, ownedPlots } = get();
          if (!placingDecor) return;
          const item = placeableInfo(placingDecor.id);
          if (!canPlaceDecor(placingDecor.id, x, z, ownedPlots, decorPlacements)) {
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
          if (animals.length >= 9) {
            soundFX.error();
            get().showToast('🏠 Chuồng trại đã đủ 9 vật nuôi!', 'text-red-400');
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
              items: addItems(items, { [cfg.productId]: 1 }),
            });
            spawnParticles(ax, 0.6, az, 0xfacc15, 16);
            get().showToast(
              `${cfg.productIcon} +1 ${cfg.productName}!`,
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
          const { day, tiles, shippingBin, animals, machines, gold } = get();

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

          soundFX.questClaim();
          set({
            day: day + 1,
            energy: 100,
            timePhaseIndex: 0,
            gold: gold + totalGoldEarned,
            tiles: morningTiles,
            animals: nextAnimals,
            machines: nextMachines,
            shippingBin: {},
            quests: [
              ...get().quests.filter((q) => q.category !== 'daily'),
              ...createDailyQuests(day + 1),
            ],
            dailyDay: day + 1,
            placingDecor: null,
            fishing: null,
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

          // Festival items are only traded for candy at the event shop
          if (item.priceCandy !== undefined) {
            soundFX.error();
            get().showToast('🍬 Đổi bằng Kẹo ở Tiệm Kẹo Ma Quái (Công Viên)!', 'text-purple-300');
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

        // Every gameplay event goes through here: quest progress and farmer experience
        incrementQuest: (type, amount = 1, crop) => {
          if (amount <= 0) return;
          const completed: QuestItem[] = [];
          set((s) => ({ quests: advanceQuests(s.quests, type, amount, crop, completed) }));
          announceCompleted(completed);
          gainXp(xpFor(type, amount));
        },

        claimQuest: (questId) => {
          const { quests, gold, gems, candy, playerPos } = get();
          const q = quests.find((item) => item.id === questId);
          if (!q || q.claimed || q.progress < q.target) return;
          if (q.category === 'event' && !festivalActive()) return;

          const rewardCandy = q.rewardCandy ?? 0;
          soundFX.questClaim();
          set({
            gold: gold + q.rewardGold,
            gems: gems + q.rewardGems,
            candy: candy + rewardCandy,
            quests: quests.map((item) => (item.id === questId ? afterClaim(item) : item)),
          });
          spawnParticles(playerPos.x, 0.6, playerPos.z, 0xfacc15, 25);
          get().showToast(
            `🎉 +${q.rewardGold}🪙 +${q.rewardGems}💎${rewardCandy ? ` +${rewardCandy}🍬` : ''}!`,
            'text-yellow-300',
            [playerPos.x, 1.3, playerPos.z]
          );
          // The next story quest may already be satisfied (e.g. zones visited earlier)
          if (q.category === 'main') syncVisitQuest();
        },

        // Tiệm Kẹo Ma Quái: festival items for candy, at its stall in the Park while the festival runs
        buyCandyItem: (itemId) => {
          const { candy, ownedCosmetics, cosmetics, currentWorld, playerPos } = get();
          const item = cosmeticById(itemId);
          if (!item || item.priceCandy === undefined || ownedCosmetics.includes(itemId)) return;
          if (!festivalActive()) {
            get().showToast('🎃 Lễ Hội Bí Ngô đã kết thúc!', 'text-amber-300');
            return;
          }
          if (currentWorld !== 'park') {
            soundFX.error();
            get().showToast('🌸 Hãy đến Tiệm Kẹo Ma Quái ở Công Viên để đổi quà!', 'text-purple-300');
            return;
          }
          if (candy < item.priceCandy) {
            soundFX.error();
            get().showToast(`Cần ${item.priceCandy}🍬 để đổi ${item.name}!`, 'text-red-400');
            return;
          }
          const isDecor = item.category === 'decor';
          soundFX.questClaim();
          set({
            candy: candy - item.priceCandy,
            ownedCosmetics: [...ownedCosmetics, itemId],
            cosmetics: isDecor ? cosmetics : { ...cosmetics, [item.category]: itemId },
          });
          spawnParticles(playerPos.x, 0.9, playerPos.z, 0xa855f7, 22);
          get().showToast(
            `🎃 Đã đổi ${item.icon} ${item.name}!${isDecor ? ' Về nông trại để đặt.' : ''}`,
            'text-purple-300'
          );
          get().incrementQuest(isDecor ? 'buy_decor' : 'buy_cosmetic', 1);
          get().incrementQuest('event_shop', 1);
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

// A farm that changes after a cloud sync needs uploading again (lib/cloudSync does it in the
// background). Loading or syncing a save sets `cloudLink` in the same update: that is bookkeeping, not play.
useGameStore.subscribe((state, prev) => {
  if (state.cloudDirty || state.cloudLink !== prev.cloudLink) return;
  if (SAVE_KEYS.some((key) => state[key] !== prev[key])) {
    useGameStore.setState({ cloudDirty: true });
  }
});
