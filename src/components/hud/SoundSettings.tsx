'use client';

import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { SYSTEM_BUTTON } from './hudStyles';

function VolumeSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (volume: number) => void;
}) {
  return (
    <label className="mb-2 block">
      <div className="flex justify-between text-[11px] font-extrabold text-amber-900">
        <span>{label}</span>
        <span>{Math.round(value * 100)}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(value * 100)}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        // Hand the keyboard back to the game (WASD) once the slider is let go
        onPointerUp={(e) => e.currentTarget.blur()}
        className="w-full accent-amber-600"
      />
    </label>
  );
}

// Speaker button with sliders for the music and the sound effects (kept on this device)
export function SoundSettings() {
  const musicVolume = useGameStore((s) => s.musicVolume);
  const sfxVolume = useGameStore((s) => s.sfxVolume);
  const setMusicVolume = useGameStore((s) => s.setMusicVolume);
  const setSfxVolume = useGameStore((s) => s.setSfxVolume);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  // Volumes to bring back after "mute all"
  const beforeMute = useRef({ music: 0.5, sfx: 0.8 });
  const silent = musicVolume === 0 && sfxVolume === 0;

  useEffect(() => {
    if (!open) return;
    const closeOutside = (e: PointerEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [open]);

  const toggleMute = () => {
    if (silent) {
      setMusicVolume(beforeMute.current.music);
      setSfxVolume(beforeMute.current.sfx);
    } else {
      beforeMute.current = { music: musicVolume, sfx: sfxVolume };
      setMusicVolume(0);
      setSfxVolume(0);
    }
  };

  return (
    <div ref={boxRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        title="Âm thanh & nhạc nền"
        className={`${SYSTEM_BUTTON} w-8`}
      >
        <i className={`fa-solid ${silent ? 'fa-volume-xmark' : 'fa-volume-high'}`} />
      </button>
      {open && (
        <div className="parchment-panel absolute right-0 top-11 z-30 w-60 rounded-2xl p-3 text-left">
          <VolumeSlider label="🎵 Nhạc nền" value={musicVolume} onChange={setMusicVolume} />
          <VolumeSlider label="🔊 Hiệu ứng & môi trường" value={sfxVolume} onChange={setSfxVolume} />
          <button
            onClick={toggleMute}
            className="mt-1 w-full rounded-lg bg-amber-700 py-1.5 text-xs font-black text-white hover:bg-amber-600"
          >
            {silent ? '🔊 Bật lại âm thanh' : '🔇 Tắt hết âm thanh'}
          </button>
        </div>
      )}
    </div>
  );
}
