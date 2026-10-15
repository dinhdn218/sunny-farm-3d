import { WorldId } from '@/types/game';
import { WORLDS } from '@/config/worlds';
import { SEASONS } from '@/config/seasons';
import { seasonOf } from '@/lib/seasons';

// Filled in by the canvas: draws the current view and copies it onto a plain 2D canvas
export const photoCamera: { snap: (() => HTMLCanvasElement | null) | null } = { snap: null };

const pad = (n: number) => String(n).padStart(2, '0');

export const photoFileName = (day: number, at: Date) =>
  `sunny-farm-ngay-${day}-${at.getFullYear()}${pad(at.getMonth() + 1)}${pad(at.getDate())}-` +
  `${pad(at.getHours())}${pad(at.getMinutes())}${pad(at.getSeconds())}.png`;

export const photoCaption = (world: WorldId, day: number) =>
  `🌻 Sunny Farm 3D • ${WORLDS[world].name} • Ngày ${day}, ${SEASONS[seasonOf(day)].name}`;

// Takes the picture, writes the caption in its corner and downloads it as a PNG.
// False when the 3D view isn't ready.
export function takePhoto(caption: string, fileName: string) {
  const shot = photoCamera.snap?.();
  if (!shot) return false;

  const ctx = shot.getContext('2d');
  if (ctx) {
    const size = Math.max(14, Math.round(shot.height * 0.026));
    ctx.font = `800 ${size}px Nunito, "Segoe UI", sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
    ctx.shadowBlur = size * 0.4;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(caption, shot.width - size, shot.height - size * 0.8);
  }

  shot.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }, 'image/png');
  return true;
}
