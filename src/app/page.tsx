'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useGameStore } from '@/store/useGameStore';
import { useMultiplayerSync } from '@/lib/multiplayer';
import { useCloudSync } from '@/lib/cloudSync';
import { useBackgroundMusic } from '@/lib/music';
import { useCasinoSync } from '@/lib/casinoNet';
import { TopBar } from '@/components/hud/TopBar';
import { QuestTracker } from '@/components/hud/QuestTracker';
import { ChatBox } from '@/components/hud/ChatBox';
import { Hotbar } from '@/components/hud/Hotbar';
import { BuildBar } from '@/components/hud/BuildBar';
import { MobileDpad } from '@/components/hud/MobileDpad';
import { Tooltip } from '@/components/hud/Tooltip';
import { FloatingLabels } from '@/components/hud/FloatingLabels';
import { WorldMapModal } from '@/components/hud/modals/WorldMapModal';
import { QuestModal } from '@/components/hud/modals/QuestModal';
import { WardrobeModal } from '@/components/hud/modals/WardrobeModal';
import { SeedShopModal } from '@/components/hud/modals/SeedShopModal';
import { InventoryModal } from '@/components/hud/modals/InventoryModal';
import { RanchModal } from '@/components/hud/modals/RanchModal';
import { AuthModal } from '@/components/hud/modals/AuthModal';
import { DaySummaryModal } from '@/components/hud/modals/DaySummaryModal';
import { ExpandModal } from '@/components/hud/modals/ExpandModal';
import { CloudConflictModal } from '@/components/hud/modals/CloudConflictModal';
import { WorkshopModal } from '@/components/hud/modals/WorkshopModal';
import { MarketModal } from '@/components/hud/modals/MarketModal';
import { FishJournalModal } from '@/components/hud/modals/FishJournalModal';
import { FishingOverlay } from '@/components/hud/FishingOverlay';
import { PhotoOverlay } from '@/components/hud/PhotoOverlay';
import { DailyGiftModal } from '@/components/hud/modals/DailyGiftModal';
import { FestivalShopModal } from '@/components/hud/modals/FestivalShopModal';
import { LuckyWheelModal } from '@/components/hud/modals/LuckyWheelModal';
import { ClawModal } from '@/components/hud/modals/ClawModal';
import { OrderBoardModal } from '@/components/hud/modals/OrderBoardModal';
import { MailModal } from '@/components/hud/modals/MailModal';
import { TienLenTable } from '@/components/hud/casino/TienLenTable';
import { giftDay, localDateKey } from '@/lib/dailyGift';

// WebGL canvas only exists in the browser
const GameCanvas = dynamic(() => import('@/components/canvas/GameCanvas'), {
  ssr: false,
});

export default function HomePage() {
  const activeModal = useGameStore((s) => s.activeModal);
  const photoMode = useGameStore((s) => s.photoMode);
  const [mounted, setMounted] = useState(false);

  useMultiplayerSync();
  useCasinoSync();
  useCloudSync();
  useBackgroundMusic();

  // The store is persisted in localStorage, so the HUD renders client-side only to avoid hydration mismatches
  useEffect(() => {
    setMounted(true);
    // Greet the player with today's gift if it has not been claimed yet
    const s = useGameStore.getState();
    if (!s.activeModal && giftDay(s.lastGiftDate, s.loginStreak, localDateKey(new Date())) !== null) {
      s.setActiveModal('dailyGift');
    }
  }, []);

  if (!mounted) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#0f172a] text-lg font-extrabold text-white">
        🌱 Đang tải Nông Trại 3D...
      </div>
    );
  }

  return (
    <main>
      <GameCanvas />
      {photoMode ? <PhotoOverlay /> : <Hud activeModal={activeModal} />}
    </main>
  );
}

// Everything drawn over the 3D view; photo mode swaps it for the camera controls
function Hud({ activeModal }: { activeModal: ReturnType<typeof useGameStore.getState>['activeModal'] }) {
  const building = useGameStore((s) => !!s.buildMode);

  return (
    <>
      <FloatingLabels />
      <Tooltip />

      <TopBar />
      <QuestTracker />
      <ChatBox />
      <MobileDpad />
      {building ? <BuildBar /> : <Hotbar />}
      <FishingOverlay />

      {activeModal === 'map' && <WorldMapModal />}
      {activeModal === 'quests' && <QuestModal />}
      {activeModal === 'wardrobe' && <WardrobeModal />}
      {activeModal === 'shop' && <SeedShopModal />}
      {activeModal === 'inventory' && <InventoryModal />}
      {activeModal === 'ranch' && <RanchModal />}
      {activeModal === 'auth' && <AuthModal />}
      {activeModal === 'summary' && <DaySummaryModal />}
      {activeModal === 'expand' && <ExpandModal />}
      {activeModal === 'cloudConflict' && <CloudConflictModal />}
      {activeModal === 'workshop' && <WorkshopModal />}
      {activeModal === 'market' && <MarketModal />}
      {activeModal === 'fishJournal' && <FishJournalModal />}
      {activeModal === 'dailyGift' && <DailyGiftModal />}
      {activeModal === 'festivalShop' && <FestivalShopModal />}
      {activeModal === 'luckyWheel' && <LuckyWheelModal />}
      {activeModal === 'claw' && <ClawModal />}
      {activeModal === 'orders' && <OrderBoardModal />}
      {activeModal === 'mail' && <MailModal />}
      <TienLenTable />
    </>
  );
}
