'use client';

import { useGameStore } from '@/store/useGameStore';

// Feedback text that floats up and fades out where the action happened
export function FloatingLabels() {
  const labels = useGameStore((s) => s.floatingLabels);

  return (
    <div className="pointer-events-none fixed inset-0 z-30 overflow-hidden">
      {labels.map((label) => (
        <div
          key={label.id}
          className={`floating-label text-sm font-black sm:text-base ${label.color}`}
          style={{ left: label.x, top: label.y }}
        >
          {label.text}
        </div>
      ))}
    </div>
  );
}
