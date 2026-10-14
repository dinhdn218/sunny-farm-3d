'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useGameStore } from '@/store/useGameStore';
import { useMultiplayerSync } from '@/lib/multiplayer';
import { useCloudSync } from '@/lib/cloudSync';
import { TopBar } from '@/components/hud/TopBar';
import { QuestTracker } from '@/components/hud/QuestTracker';
import { ChatBox } from '@/components/hud/ChatBox';
import { Hotbar } from '@/components/hud/Hotbar';
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

// WebGL canvas only exists in the browser
const GameCanvas = dynamic(() => import('@/components/canvas/GameCanvas'), {
  ssr: false,
});

export default function HomePage() {
  const activeModal = useGameStore((s) => s.activeModal);
  const [mounted, setMounted] = useState(false);

  useMultiplayerSync();
  useCloudSync();

  // The store is persisted in localStorage, so the HUD renders client-side only to avoid hydration mismatches
  useEffect(() => {
    setMounted(true);
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
      <FloatingLabels />
      <Tooltip />

      <TopBar />
      <QuestTracker />
      <ChatBox />
      <MobileDpad />
      <Hotbar />
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
    </main>
  );
}
