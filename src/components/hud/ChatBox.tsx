'use client';

import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { WORLDS } from '@/config/worlds';

const EMOTES = [
  { emote: '👋', label: 'Chào', text: 'Chào mọi người nha!', color: 'bg-slate-800/90 hover:bg-slate-700' },
  { emote: '💃', label: 'Nhảy', text: 'Nhảy vui quá đi!', color: 'bg-pink-600/90 hover:bg-pink-500' },
  { emote: '❤️', label: 'Tim', text: 'Thả tim nè!', color: 'bg-rose-600/90 hover:bg-rose-500' },
  { emote: '🎉', label: 'Hò reo', text: 'Tuyệt vời ông mặt trời!', color: 'bg-amber-600/90 hover:bg-amber-500' },
];

export function ChatBox() {
  const chatMessages = useGameStore((s) => s.chatMessages);
  const playerId = useGameStore((s) => s.playerId);
  const sendChat = useGameStore((s) => s.sendChat);
  const triggerEmote = useGameStore((s) => s.triggerEmote);
  const [text, setText] = useState('');
  const [minimized, setMinimized] = useState(false);
  // Phones start with just a chat button so the zone's panels and the D-pad stay clear
  const [tucked, setTucked] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640);
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = messagesRef.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [chatMessages, minimized]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    sendChat(text);
    setText('');
  };

  if (tucked) {
    return (
      <aside className="pointer-events-auto fixed bottom-24 right-3 z-20">
        <button
          onClick={() => setTucked(false)}
          className="glass-panel game-btn rounded-2xl px-3 py-2 text-xs font-black text-emerald-300"
        >
          <i className="fa-solid fa-comments" /> Chat
        </button>
      </aside>
    );
  }

  return (
    <aside className="pointer-events-auto fixed bottom-24 right-3 z-20 flex w-72 flex-col gap-1.5 sm:w-80">
      <div className="flex items-center justify-end gap-1">
        {EMOTES.map((e) => (
          <button
            key={e.label}
            onClick={() => triggerEmote(e.emote, e.text)}
            className={`game-btn flex items-center gap-1 rounded-xl border border-white/20 px-2.5 py-1 text-xs font-bold text-white ${e.color}`}
          >
            {e.emote} {e.label}
          </button>
        ))}
      </div>

      <div className="glass-panel flex flex-col gap-2 rounded-2xl p-2.5 text-white">
        <div className="flex items-center justify-between border-b border-white/15 pb-1">
          <span className="flex items-center gap-1.5 text-xs font-black text-emerald-300">
            <i className="fa-solid fa-comments" /> Kênh Chat Thế Giới
          </span>
          <span className="flex items-center gap-2">
            <button
              onClick={() => setMinimized(!minimized)}
              className="text-[10px] font-bold text-slate-300 hover:text-white"
            >
              {minimized ? 'Mở rộng' : 'Thu gọn'}
            </button>
            <button
              onClick={() => setTucked(true)}
              aria-label="Ẩn khung chat"
              className="text-xs font-black text-slate-300 hover:text-white sm:hidden"
            >
              ✕
            </button>
          </span>
        </div>

        {!minimized && (
          <div
            ref={messagesRef}
            className="h-28 space-y-1 overflow-y-auto pr-1 text-xs"
          >
            {chatMessages.map((m) => (
              <div key={m.id} className="break-words leading-snug">
                <span className="mr-1 text-[10px]">
                  {WORLDS[m.world]?.icon ?? '🌐'}
                </span>
                <b className={m.uid === playerId ? 'text-amber-300' : 'text-sky-300'}>
                  {m.sender}:
                </b>{' '}
                <span className="text-slate-100">{m.text}</span>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
          <input
            type="text"
            maxLength={80}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Nhập tin nhắn giao lưu..."
            className="flex-1 rounded-xl border border-white/25 bg-slate-900/90 px-2.5 py-1.5 text-xs text-white focus:border-amber-400 focus:outline-none"
          />
          <button
            type="submit"
            className="game-btn rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-black text-white hover:bg-emerald-500"
          >
            Gửi
          </button>
        </form>
      </div>
    </aside>
  );
}
