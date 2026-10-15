'use client';

import { useEffect } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { ChatMessage, RemotePlayer } from '@/types/game';
import { supabase, isSupabaseConfigured } from './supabase';
import { levelInfo } from './leveling';

// Syncs the local player with real peers: Supabase Realtime when configured, plus other
// tabs via BroadcastChannel. The wandering residents are simulated by <SimulatedPlayers />.
export function useMultiplayerSync() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const livePeers: Record<string, RemotePlayer> = {};
    let lastChatSent = '';

    const sbChannel =
      isSupabaseConfigured && supabase
        ? supabase.channel('sunny_metaverse_global_v3', {
            config: {
              broadcast: { self: false },
              presence: { key: useGameStore.getState().playerId },
            },
          })
        : null;

    if (sbChannel) {
      useGameStore.getState().setNetworkMode('supabase');
      sbChannel
        .on('broadcast', { event: 'player_state' }, ({ payload }) => {
          const myId = useGameStore.getState().playerId;
          if (!payload || payload.uid === myId) return;
          livePeers[payload.uid] = { ...payload, updatedAt: Date.now() };
        })
        .on('broadcast', { event: 'chat_msg' }, ({ payload }) => {
          if (payload) {
            useGameStore.getState().addChatMessage(payload as ChatMessage);
          }
        })
        .subscribe();
    } else {
      useGameStore.getState().setNetworkMode('local');
    }

    const localChannel =
      'BroadcastChannel' in window
        ? new BroadcastChannel('sunny_farm_metaverse_v3_sync')
        : null;

    if (localChannel) {
      localChannel.onmessage = (event) => {
        const data = event.data;
        const myId = useGameStore.getState().playerId;
        if (!data || data.uid === myId) return;

        if (data.type === 'PLAYER_STATE') {
          livePeers[data.uid] = { ...data.payload, updatedAt: Date.now() };
        } else if (data.type === 'CHAT_MSG') {
          useGameStore.getState().addChatMessage(data.payload as ChatMessage);
        }
      };
    }

    const interval = setInterval(() => {
      const state = useGameStore.getState();
      const now = Date.now();

      const myPayload: RemotePlayer = {
        uid: state.playerId,
        name: state.playerName,
        avatarUrl: state.userProfile?.avatarUrl,
        world: state.currentWorld,
        x: state.playerPos.x,
        z: state.playerPos.z,
        rotY: state.playerPos.rotY,
        cosmetics: state.cosmetics,
        level: levelInfo(state.xp).level,
        chatMsg: state.localChatMsg,
        emote: state.localEmote,
        updatedAt: now,
      };

      if (sbChannel) {
        sbChannel.send({
          type: 'broadcast',
          event: 'player_state',
          payload: myPayload,
        });
      }
      if (localChannel) {
        localChannel.postMessage({
          type: 'PLAYER_STATE',
          uid: state.playerId,
          payload: myPayload,
        });
      }

      const latestMsg = state.chatMessages[state.chatMessages.length - 1];
      if (
        latestMsg &&
        latestMsg.uid === state.playerId &&
        latestMsg.id !== lastChatSent
      ) {
        lastChatSent = latestMsg.id;
        if (sbChannel) {
          sbChannel.send({
            type: 'broadcast',
            event: 'chat_msg',
            payload: latestMsg,
          });
        }
        if (localChannel) {
          localChannel.postMessage({
            type: 'CHAT_MSG',
            uid: state.playerId,
            payload: latestMsg,
          });
        }
      }

      Object.keys(livePeers).forEach((uid) => {
        if (now - livePeers[uid].updatedAt > 8000) {
          delete livePeers[uid];
        }
      });

      state.setRemotePlayers({ ...livePeers });
    }, 200);

    return () => {
      clearInterval(interval);
      if (localChannel) localChannel.close();
      if (sbChannel && supabase) {
        supabase.removeChannel(sbChannel);
      }
    };
  }, []);
}
