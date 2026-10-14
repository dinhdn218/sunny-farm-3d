'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  AnimalSpecies,
  ChatMessage,
  CropId,
  FarmAnimal,
  FloatingLabel,
  HoverTooltip,
  QuestItem,
  QuestType,
  RemotePlayer,
  SaveData,
  ToolId,
  UserProfile,
  WorldId,
} from '@/types/game';
import { CROPS } from '@/config/crops';
import { ANIMALS } from '@/config/animals';
import { COSMETICS } from '@/config/cosmetics';
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
  ranchOffset,
  stretchPoint,
  worldPortal,
  worldSpawn,
} from '@/lib/farmLayout';
import {
  advanceQuests,
  afterClaim,
  createDailyQuests,
  syncQuestValue,
} from '@/lib/quests';
import { EMPTY_CROPS, createNewGameSave } from '@/lib/newGame';
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
}

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
  maxWater: number;
  timePhaseIndex: number;
  currentWorld: WorldId;
  activeTool: ToolId;
  selectedPlot: string | null;
  placingDecor: { id: string; rotY: number } | null;
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
    | null;
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
  sellAllInInventory: () => void;
  depositToShippingBin: () => void;
  moveCropToBin: (crop: CropId, amount?: number) => void;
  returnCropFromBin: (crop: CropId, amount?: number) => void;

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
        maxWater: 10,
        timePhaseIndex: 0,
        currentWorld: 'farm',
        activeTool: 'hoe',
        selectedPlot: null,
        placingDecor: null,
        activeModal: null,
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
          const { energy, maxEnergy } = get();
          soundFX.coin();
          set({ energy: Math.min(maxEnergy, energy + bonusEnergy) });
          get().showToast(`🍿 ${label} thơm lừng (+${bonusEnergy}⚡)!`);
          get().incrementQuest('eat', 1);
        },

        refillWater: () => {
          const { playerPos } = get();
          soundFX.water();
          set({ water: 10 });
          get().showToast('💧 Bình tưới đã đầy (10/10)!', 'text-sky-300', [
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
          const { activeTool, tiles, energy, water, seeds, harvested, playerPos } =
            state;
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

            set({
              tiles: updatedTiles,
              harvested: {
                ...harvested,
                [cropKey]: (harvested[cropKey] || 0) + 1,
              },
            });
            spawnParticles(tx, 0.45, tz, 0xfacc15, 20);
            get().showToast(
              `${cropCfg.icon} +1 ${cropCfg.name}!`,
              'text-yellow-300',
              [tx, 0.65, tz]
            );
            get().incrementQuest('harvest', 1, cropKey);
            return;
          }

          if (energy < 2) {
            soundFX.error();
            get().showToast('⚡ Hết thể lực! Hãy ăn Bánh Mì hoặc đi ngủ!', 'text-red-400', [
              tx,
              0.5,
              tz,
            ]);
            return;
          }

          if (activeTool === 'hoe') {
            if (targetTile.state === 'empty') {
              soundFX.till();
              set({
                energy: Math.max(0, energy - 2),
                tiles: tiles.map((t) =>
                  t.r === r && t.c === c ? { ...t, state: 'tilled' } : t
                ),
              });
              spawnParticles(tx, 0.1, tz, 0x78350f, 12);
              get().incrementQuest('till', 1);
            }
            return;
          }

          if (activeTool === 'water') {
            if (targetTile.state === 'empty') {
              soundFX.error();
              get().showToast('Cần cuốc đất trước!', 'text-amber-300', [
                tx,
                0.4,
                tz,
              ]);
              return;
            }
            if (water < 1) {
              soundFX.error();
              get().showToast('💧 Hết nước! Hãy ra Giếng múc nước!', 'text-sky-400', [
                tx,
                0.5,
                tz,
              ]);
              return;
            }
            if (!targetTile.watered) {
              soundFX.water();
              set({
                energy: Math.max(0, energy - 2),
                water: Math.max(0, water - 1),
                tiles: tiles.map((t) =>
                  t.r === r && t.c === c ? { ...t, watered: true } : t
                ),
              });
              spawnParticles(tx, 0.2, tz, 0x38bdf8, 14);
              get().incrementQuest('water', 1);
            }
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

        sellAllInInventory: () => {
          const { harvested, shippingBin, animalProducts, gold } = get();
          let earned = 0;
          let count = 0;

          (Object.keys(CROPS) as CropId[]).forEach((k) => {
            const qty = (harvested[k] || 0) + (shippingBin[k] || 0);
            if (qty > 0) {
              earned += qty * CROPS[k].sellPrice;
              count += qty;
            }
          });

          (Object.keys(ANIMALS) as AnimalSpecies[]).forEach((sp) => {
            const cfg = ANIMALS[sp];
            const qty = animalProducts[cfg.productId] || 0;
            if (qty > 0) {
              earned += qty * cfg.productSellPrice;
              count += qty;
            }
          });

          if (count === 0) {
            soundFX.error();
            get().showToast('🎒 Kho nông sản đang trống!', 'text-red-400');
            return;
          }

          soundFX.coin();
          set({
            gold: gold + earned,
            harvested: { ...EMPTY_CROPS },
            shippingBin: { ...EMPTY_CROPS },
            animalProducts: { egg: 0, wool: 0, milk: 0 },
          });
          get().showToast(`🪙 +${earned} Vàng!`);
          get().incrementQuest('earn_gold', earned);
        },

        depositToShippingBin: () => {
          const { harvested, shippingBin } = get();
          let total = 0;
          const nextBin = { ...shippingBin };

          (Object.keys(harvested) as CropId[]).forEach((k) => {
            const qty = harvested[k] || 0;
            if (qty > 0) {
              nextBin[k] = (nextBin[k] || 0) + qty;
              total += qty;
            }
          });

          if (total === 0) return;

          soundFX.plant();
          set({
            shippingBin: nextBin,
            harvested: { ...EMPTY_CROPS },
          });
        },

        moveCropToBin: (crop, amount = 1) => {
          const { harvested, shippingBin } = get();
          if ((harvested[crop] || 0) < amount) return;
          soundFX.plant();
          set({
            harvested: { ...harvested, [crop]: harvested[crop] - amount },
            shippingBin: {
              ...shippingBin,
              [crop]: (shippingBin[crop] || 0) + amount,
            },
          });
        },

        returnCropFromBin: (crop, amount = 1) => {
          const { harvested, shippingBin } = get();
          if ((shippingBin[crop] || 0) < amount) return;
          set({
            shippingBin: { ...shippingBin, [crop]: shippingBin[crop] - amount },
            harvested: { ...harvested, [crop]: (harvested[crop] || 0) + amount },
          });
        },

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

        startPlacingDecor: (id) => {
          const { currentWorld, decorPlacements, ownedCosmetics } = get();
          const item = cosmeticById(id);
          if (!item || item.category !== 'decor' || !ownedCosmetics.includes(id)) return;
          if (currentWorld !== 'farm') {
            get().showToast(`🏡 Về Nông Trại để đặt ${item.name}!`, 'text-amber-300');
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
          const item = cosmeticById(placingDecor.id);
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
          if (firstTime) get().incrementQuest('place_decor', 1);
        },

        storeDecor: (id) => {
          const { decorPlacements } = get();
          if (!decorPlacements[id]) return;
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
          const { animals, animalFeed, animalProducts, playerPos, ownedPlots } = get();
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
              animalProducts: {
                ...animalProducts,
                [cfg.productId]: (animalProducts[cfg.productId] || 0) + 1,
              },
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
          const {
            day,
            tiles,
            shippingBin,
            harvested,
            animals,
            animalProducts,
            gold,
          } = get();
          const soldItems: {
            label: string;
            icon: string;
            count: number;
            gold: number;
          }[] = [];
          let totalGoldEarned = 0;

          (Object.keys(CROPS) as CropId[]).forEach((cropKey) => {
            const count = (shippingBin[cropKey] || 0) + (harvested[cropKey] || 0);
            if (count > 0) {
              const revenue = count * CROPS[cropKey].sellPrice;
              soldItems.push({
                label: CROPS[cropKey].name,
                icon: CROPS[cropKey].icon,
                count,
                gold: revenue,
              });
              totalGoldEarned += revenue;
            }
          });

          (Object.keys(ANIMALS) as AnimalSpecies[]).forEach((sp) => {
            const cfg = ANIMALS[sp];
            const count = animalProducts[cfg.productId] || 0;
            if (count > 0) {
              const revenue = count * cfg.productSellPrice;
              soldItems.push({
                label: cfg.productName,
                icon: cfg.productIcon,
                count,
                gold: revenue,
              });
              totalGoldEarned += revenue;
            }
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
            tiles: nextTiles,
            animals: nextAnimals,
            shippingBin: { ...EMPTY_CROPS },
            harvested: { ...EMPTY_CROPS },
            animalProducts: { egg: 0, wool: 0, milk: 0 },
            quests: [
              ...get().quests.filter((q) => q.category !== 'daily'),
              ...createDailyQuests(day + 1),
            ],
            dailyDay: day + 1,
            placingDecor: null,
            lastDaySummary: {
              day,
              soldItems,
              totalGoldEarned,
              cropsGrownCount,
              readyCount,
              animalProductsReady,
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

        incrementQuest: (type, amount = 1, crop) => {
          if (amount <= 0) return;
          const completed: QuestItem[] = [];
          set((s) => ({ quests: advanceQuests(s.quests, type, amount, crop, completed) }));
          announceCompleted(completed);
        },

        claimQuest: (questId) => {
          const { quests, gold, gems, playerPos } = get();
          const q = quests.find((item) => item.id === questId);
          if (!q || q.claimed || q.progress < q.target) return;

          soundFX.questClaim();
          set({
            gold: gold + q.rewardGold,
            gems: gems + q.rewardGems,
            quests: quests.map((item) => (item.id === questId ? afterClaim(item) : item)),
          });
          spawnParticles(playerPos.x, 0.6, playerPos.z, 0xfacc15, 25);
          get().showToast(
            `🎉 +${q.rewardGold}🪙 +${q.rewardGems}💎!`,
            'text-yellow-300',
            [playerPos.x, 1.3, playerPos.z]
          );
          // The next story quest may already be satisfied (e.g. zones visited earlier)
          if (q.category === 'main') syncVisitQuest();
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
      // The signed-in account always comes from the Supabase session, never from an old save
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Partial<GameState>),
        userProfile: null,
      }),
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
