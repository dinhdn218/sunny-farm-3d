import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from '@/store/useGameStore';
import { createNewGameSave } from '@/lib/newGame';
import { CloudSave } from '@/lib/cloudSave';
import { fetchCloudSave, uploadCloudSave } from '@/lib/supabase';
import { handleSignedIn, resetCloudSession } from '@/lib/cloudSync';

// Supabase is the network boundary: the cloud is faked, the store and sync logic are real
vi.mock('@/lib/supabase', () => ({
  supabase: null,
  isSupabaseConfigured: false,
  signInWithGoogleOAuth: vi.fn(),
  signOutCloud: vi.fn(),
  fetchCloudSave: vi.fn(),
  uploadCloudSave: vi.fn(),
}));

const user = { id: 'u1', email: 'an@gmail.com', user_metadata: { full_name: 'Nguyễn An' } };
const profile = { id: 'u1', email: 'an@gmail.com', name: 'Nguyễn An', avatarUrl: '', provider: 'google' as const };

const cloudFarm = (): CloudSave => ({
  data: { ...createNewGameSave(), gold: 5000, day: 12 },
  version: 1,
  savedAt: 2000,
});

const initialState = useGameStore.getState();

beforeEach(() => {
  useGameStore.setState(initialState, true);
  // Swapping the whole farm back in counts as a change; start each test with nothing unsynced
  useGameStore.setState({ cloudDirty: false });
  resetCloudSession();
  vi.mocked(fetchCloudSave).mockReset();
  vi.mocked(uploadCloudSave).mockReset().mockResolvedValue(undefined);
});

describe('signing in', () => {
  it('loads the cloud farm when this device only has a new game', async () => {
    vi.mocked(fetchCloudSave).mockResolvedValue(cloudFarm());

    await handleSignedIn(user);

    const s = useGameStore.getState();
    expect(s.gold).toBe(5000);
    expect(s.day).toBe(12);
    expect(s.userProfile?.id).toBe('u1');
    expect(s.cloudLink).toEqual({ userId: 'u1', lastSyncedAt: 2000 });
    expect(s.cloudDirty).toBe(false);
    expect(uploadCloudSave).not.toHaveBeenCalled();
  });

  it('asks before replacing a farm that has been played', async () => {
    useGameStore.setState({ day: 3, gold: 1500 });
    vi.mocked(fetchCloudSave).mockResolvedValue(cloudFarm());

    await handleSignedIn(user);

    const s = useGameStore.getState();
    expect(s.cloudConflict?.cloud.savedAt).toBe(2000);
    expect(s.activeModal).toBe('cloudConflict');
    expect(s.gold).toBe(1500);
    expect(s.userProfile).toBeNull();
    expect(uploadCloudSave).not.toHaveBeenCalled();
  });

  it('uploads this farm to an account without a cloud save', async () => {
    useGameStore.setState({ day: 3, gold: 1500 });
    vi.mocked(fetchCloudSave).mockResolvedValue(null);

    await handleSignedIn(user);

    expect(uploadCloudSave).toHaveBeenCalledTimes(1);
    const [uploadedFor, save] = vi.mocked(uploadCloudSave).mock.calls[0];
    expect(uploadedFor.id).toBe('u1');
    expect(save.gold).toBe(1500);
    expect(save).not.toHaveProperty('userProfile');
    expect(useGameStore.getState().cloudLink?.userId).toBe('u1');
  });

  it('leaves the farm alone when the cloud cannot be reached, and tries again on the next sign-in event', async () => {
    useGameStore.setState({ day: 3, gold: 1500 });
    vi.mocked(fetchCloudSave).mockRejectedValueOnce(new Error('offline'));

    await handleSignedIn(user);

    expect(useGameStore.getState().userProfile).toBeNull();
    expect(useGameStore.getState().gold).toBe(1500);

    vi.mocked(fetchCloudSave).mockResolvedValue(null);
    await handleSignedIn(user);
    expect(useGameStore.getState().cloudLink?.userId).toBe('u1');
  });
});

describe('resolving a save conflict', () => {
  beforeEach(async () => {
    useGameStore.setState({ day: 3, gold: 1500 });
    vi.mocked(fetchCloudSave).mockResolvedValue(cloudFarm());
    await handleSignedIn(user);
  });

  it('loads the cloud farm when the player picks it', () => {
    useGameStore.getState().resolveCloudConflict('cloud');

    const s = useGameStore.getState();
    expect(s.gold).toBe(5000);
    expect(s.cloudConflict).toBeNull();
    expect(s.userProfile?.id).toBe('u1');
  });

  it("overwrites the cloud with this device's farm when the player keeps it", async () => {
    await useGameStore.getState().resolveCloudConflict('local');

    const s = useGameStore.getState();
    expect(s.gold).toBe(1500);
    expect(s.cloudConflict).toBeNull();
    expect(vi.mocked(uploadCloudSave).mock.calls[0][1].gold).toBe(1500);
    expect(s.cloudLink?.userId).toBe('u1');
  });
});

describe('keeping track of unsynced changes', () => {
  it('marks a synced farm as changed when the player spends gold', async () => {
    vi.mocked(fetchCloudSave).mockResolvedValue(cloudFarm());
    await handleSignedIn(user);

    useGameStore.getState().buySeed('carrot', 1);

    expect(useGameStore.getState().cloudDirty).toBe(true);
  });

  it('clears the mark once the farm is uploaded', async () => {
    useGameStore.setState({ userProfile: profile, cloudDirty: true });

    await useGameStore.getState().syncToCloud();

    expect(useGameStore.getState().cloudDirty).toBe(false);
    expect(useGameStore.getState().cloudLink?.userId).toBe('u1');
  });

  it('keeps the mark when the farm changes while it is being uploaded', async () => {
    useGameStore.setState({ userProfile: profile, cloudDirty: true });
    let finishUpload = () => {};
    vi.mocked(uploadCloudSave).mockImplementation(
      () => new Promise<void>((resolve) => (finishUpload = resolve))
    );

    const upload = useGameStore.getState().syncToCloud();
    useGameStore.getState().buySeed('carrot', 1);
    finishUpload();
    await upload;

    expect(useGameStore.getState().cloudDirty).toBe(true);
  });

  it('keeps the mark when the upload fails', async () => {
    useGameStore.setState({ userProfile: profile, cloudDirty: true });
    vi.mocked(uploadCloudSave).mockRejectedValue(new Error('offline'));

    await useGameStore.getState().syncToCloud();

    expect(useGameStore.getState().cloudDirty).toBe(true);
    expect(useGameStore.getState().cloudLink).toBeNull();
  });
});
