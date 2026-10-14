'use client';

import { createClient, SupabaseClient } from '@supabase/supabase-js';

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

export async function signInWithGoogleOAuth() {
  if (!supabase) {
    throw new Error('SUPABASE_NOT_CONFIGURED');
  }
  const redirectTo =
    typeof window !== 'undefined' ? window.location.origin : undefined;

  const { data, error } = await supabase.auth.signInWithOAuth({
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

export async function syncGameToSupabaseCloud(
  userId: string,
  email: string,
  fullName: string,
  avatarUrl: string,
  payload: Record<string, unknown>
) {
  if (!supabase) return false;
  const { error } = await supabase.from('profiles').upsert(
    {
      id: userId,
      email,
      full_name: fullName,
      avatar_url: avatarUrl,
      gold: payload.gold,
      gems: payload.gems,
      day: payload.day,
      game_state: payload,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );
  return !error;
}
