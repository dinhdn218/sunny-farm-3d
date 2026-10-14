'use client';

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SaveData, UserProfile } from '@/types/game';
import { SAVE_VERSION } from '@/lib/saveData';
import { CloudSave, parseCloudRow } from '@/lib/cloudSave';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('http') &&
    supabaseAnonKey.length > 20
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null;

function requireClient() {
  if (!supabase) throw new Error('SUPABASE_NOT_CONFIGURED');
  return supabase;
}

export async function signInWithGoogleOAuth() {
  const redirectTo =
    typeof window !== 'undefined' ? window.location.origin : undefined;

  const { data, error } = await requireClient().auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) throw error;
  return data;
}

export async function signOutCloud() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

// The account's farm as last uploaded, or null if it has none yet
export async function fetchCloudSave(userId: string): Promise<CloudSave | null> {
  const { data, error } = await requireClient()
    .from('profiles')
    .select('game_state, updated_at')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return parseCloudRow(data);
}

// Everyone can read `profiles` rows, so only the farm and its public face go there (no email)
export async function uploadCloudSave(profile: UserProfile, save: SaveData, savedAt: number) {
  const { error } = await requireClient()
    .from('profiles')
    .upsert(
      {
        id: profile.id,
        email: null,
        full_name: save.playerName,
        avatar_url: profile.avatarUrl,
        gold: save.gold,
        gems: save.gems,
        day: save.day,
        game_state: { saveVersion: SAVE_VERSION, ...save },
        updated_at: new Date(savedAt).toISOString(),
      },
      { onConflict: 'id' }
    );
  if (error) throw error;
}
