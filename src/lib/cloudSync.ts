'use client';

import { useEffect } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { isFreshSave } from '@/lib/saveData';
import { CloudSave, decideCloudSync, profileFromUser } from '@/lib/cloudSave';
import { fetchCloudSave, fetchFarmVisits, supabase } from '@/lib/supabase';

const AUTOSAVE_MS = 30_000;
// How often to look for other players' visits to this farm
const VISITS_MS = 60_000;

// Account whose sign-in has been handled. Supabase repeats SIGNED_IN (e.g. when the tab regains focus).
let handledUserId: string | null = null;

export function resetCloudSession() {
  handledUserId = null;
}

// Visits other players paid this farm since it last looked. Quietly tried again later when the cloud can't
// be reached, or when the farm_visits table hasn't been set up yet (supabase/schema.sql).
export async function checkNeighborVisits() {
  const s = useGameStore.getState();
  // Only once this farm is the account's own (not while the player is choosing between two farms)
  if (!s.userProfile || s.cloudLink?.userId !== s.userProfile.id) return;
  try {
    const visits = await fetchFarmVisits(s.userProfile.id, s.neighborVisitsSeen);
    if (visits.length) useGameStore.getState().receiveNeighborVisits(visits);
  } catch {
    // Next round
  }
}

// When an account signs in: upload this farm, load the cloud one, or let the player pick
export async function handleSignedIn(user: Parameters<typeof profileFromUser>[0]) {
  if (handledUserId === user.id) return;
  handledUserId = user.id;
  const profile = profileFromUser(user);

  let cloud: CloudSave | null;
  try {
    cloud = await fetchCloudSave(user.id);
  } catch {
    handledUserId = null;
    useGameStore
      .getState()
      .showToast('⚠️ Không tải được nông trại trên Cloud, hãy thử lại.', 'text-red-400');
    return;
  }

  const store = useGameStore.getState();
  const decision = decideCloudSync(
    user.id,
    {
      linkedUserId: store.cloudLink?.userId ?? null,
      lastSyncedAt: store.cloudLink?.lastSyncedAt ?? null,
      dirty: store.cloudDirty,
      fresh: isFreshSave(store),
    },
    cloud?.savedAt ?? null
  );

  if (cloud && decision === 'download') {
    store.applyCloudSave(profile, cloud);
  } else if (cloud && decision === 'ask') {
    store.openCloudConflict(profile, cloud);
  } else {
    store.linkCloudAccount(profile);
    await useGameStore.getState().syncToCloud();
  }
  void checkNeighborVisits();
}

// Follows the Supabase session and keeps the signed-in farm uploaded
export function useCloudSync() {
  useEffect(() => {
    const client = supabase;
    if (!client) return;

    const { data } = client.auth.onAuthStateChange((event, session) => {
      // Supabase calls made inside this callback can deadlock its auth lock, so act on the next tick
      setTimeout(() => {
        if (session?.user) {
          void handleSignedIn(session.user);
        } else if (event === 'SIGNED_OUT' || event === 'INITIAL_SESSION') {
          resetCloudSession();
          useGameStore.getState().endCloudSession();
        }
      }, 0);
    });

    const flush = () => {
      const s = useGameStore.getState();
      if (s.userProfile && (s.cloudDirty || s.cloudLink?.userId !== s.userProfile.id)) {
        void s.syncToCloud();
      }
    };
    const timer = window.setInterval(flush, AUTOSAVE_MS);
    const visitsTimer = window.setInterval(() => void checkNeighborVisits(), VISITS_MS);
    // Best effort when the tab is hidden or closed
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      data.subscription.unsubscribe();
      window.clearInterval(timer);
      window.clearInterval(visitsTimer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);
}
