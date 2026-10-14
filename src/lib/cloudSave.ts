import { UserProfile } from '@/types/game';

export type CloudDecision = 'upload' | 'download' | 'ask';

// The account this farm was last synced with and the time stamp of that cloud save
export interface CloudLink {
  userId: string;
  lastSyncedAt: number;
}

// What this device knows about its own save when an account signs in
export interface LocalSaveState {
  // Account this farm was last synced with (null: never synced)
  linkedUserId: string | null;
  // Time stamp of the cloud save this device last wrote or loaded
  lastSyncedAt: number | null;
  // The farm changed since that sync
  dirty: boolean;
  // A new game nobody has played yet
  fresh: boolean;
}

// Which farm to keep when an account signs in. A cloud save counts as unchanged only if it carries
// exactly the time stamp this device last synced: comparing clocks across devices is unreliable.
export function decideCloudSync(
  userId: string,
  local: LocalSaveState,
  cloudSavedAt: number | null
): CloudDecision {
  if (cloudSavedAt === null) return 'upload';
  if (local.fresh) return 'download';
  if (local.linkedUserId === userId) {
    if (cloudSavedAt === local.lastSyncedAt) return 'upload';
    if (!local.dirty) return 'download';
  }
  return 'ask';
}

export interface CloudSave {
  data: Record<string, unknown>;
  version: number;
  savedAt: number;
}

// A row of the `profiles` table; `game_state` holds the save plus the version it was written with
export function parseCloudRow(
  row: { game_state: unknown; updated_at: string | null } | null
): CloudSave | null {
  if (!row || !row.game_state || typeof row.game_state !== 'object') return null;
  const { saveVersion, ...data } = row.game_state as Record<string, unknown>;
  if (Object.keys(data).length === 0) return null;
  return {
    data,
    version: typeof saveVersion === 'number' ? saveVersion : 1,
    savedAt: row.updated_at ? Date.parse(row.updated_at) : 0,
  };
}

export function profileFromUser(user: {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}): UserProfile {
  const meta = user.user_metadata ?? {};
  const text = (value: unknown) => (typeof value === 'string' ? value : '');
  const email = user.email ?? '';
  return {
    id: user.id,
    email,
    name: text(meta.full_name) || text(meta.name) || email.split('@')[0] || 'Nông Dân',
    avatarUrl: text(meta.avatar_url) || text(meta.picture),
    provider: 'google',
  };
}
