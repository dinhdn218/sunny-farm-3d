'use client';

import { PointerEvent, useEffect, useRef } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { touchMove } from '@/lib/controls';
import { PHONE_ACTION_BOTTOM, PHONE_CONTROLS_BOTTOM, PHONE_CONTROLS_GLIDE } from './hudStyles';

// How far the knob travels from the centre (px), and how far it has to go before the farmer sets off
const TRAVEL = 36;
const DEAD_ZONE = 0.2;

function stop(knob: HTMLDivElement | null) {
  touchMove.x = 0;
  touchMove.z = 0;
  if (knob) {
    knob.style.transition = 'transform 120ms ease-out';
    knob.style.transform = '';
  }
}

// Phones (hidden from md up): a thumbstick on the left, dragged to walk (the further out, the faster) and let
// go to stop, and on the right the action button, which works whatever is in front of the farmer. Both sit
// just above the bar at the bottom (--hud-bottom), and step aside while fishing or netting a bug, when the
// farmer stands still and the minigame's card takes the bottom of the screen.
export function MobileControls() {
  const interactFront = useGameStore((s) => s.interactFront);
  const busy = useGameStore((s) => !!s.fishing || !!s.bugCatch);
  const knobRef = useRef<HTMLDivElement>(null);
  // The finger on the stick, so a second one can tap the action button meanwhile
  const finger = useRef<number | null>(null);

  // Never leave the farmer walking on if the controls go away mid-drag
  useEffect(() => () => stop(null), []);

  const steer = (e: PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    let dx = e.clientX - (rect.left + rect.width / 2);
    let dy = e.clientY - (rect.top + rect.height / 2);
    const dist = Math.hypot(dx, dy);
    if (dist > TRAVEL) {
      dx *= TRAVEL / dist;
      dy *= TRAVEL / dist;
    }
    const knob = knobRef.current;
    if (knob) {
      knob.style.transition = 'none';
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
    }
    const moving = dist / TRAVEL > DEAD_ZONE;
    touchMove.x = moving ? dx / TRAVEL : 0;
    touchMove.z = moving ? dy / TRAVEL : 0;
  };

  const release = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== finger.current) return;
    finger.current = null;
    stop(knobRef.current);
  };

  // Let go of the stick if a minigame starts mid-drag: the controls go away, and the finger with them
  useEffect(() => {
    if (!busy) return;
    finger.current = null;
    stop(knobRef.current);
  }, [busy]);

  if (busy) return null;

  return (
    <>
      <div
        aria-label="Cần điều khiển: kéo để đi"
        onPointerDown={(e) => {
          if (finger.current !== null) return;
          finger.current = e.pointerId;
          e.currentTarget.setPointerCapture(e.pointerId);
          steer(e);
        }}
        onPointerMove={(e) => e.pointerId === finger.current && steer(e)}
        onPointerUp={release}
        onPointerCancel={release}
        onLostPointerCapture={release}
        className={`pointer-events-auto fixed left-4 z-20 flex h-28 w-28 touch-none select-none items-center justify-center rounded-full border-4 border-amber-200/80 bg-amber-950/35 shadow-lg md:hidden ${PHONE_CONTROLS_BOTTOM} ${PHONE_CONTROLS_GLIDE}`}
      >
        {/* Marks for the four ways round the ring */}
        <span aria-hidden className="absolute top-1 text-[10px] text-amber-100/80">▲</span>
        <span aria-hidden className="absolute bottom-1 text-[10px] text-amber-100/80">▼</span>
        <span aria-hidden className="absolute left-1.5 text-[10px] text-amber-100/80">◀</span>
        <span aria-hidden className="absolute right-1.5 text-[10px] text-amber-100/80">▶</span>
        <div
          ref={knobRef}
          className="h-12 w-12 rounded-full border-4 border-white bg-gradient-to-b from-amber-300 to-amber-500 shadow-[0_4px_0_#92400e]"
        />
      </div>
      {/* The glide goes on a wrapper, leaving the button its own press animation */}
      <div className={`pointer-events-auto fixed right-4 z-20 md:hidden ${PHONE_ACTION_BOTTOM} ${PHONE_CONTROLS_GLIDE}`}>
        <button
          onClick={interactFront}
          aria-label="Làm việc với thứ ở trước mặt"
          className="game-btn flex h-16 w-16 flex-col items-center justify-center gap-0.5 rounded-full border-4 border-white bg-emerald-600 text-white"
        >
          <i className="fa-solid fa-hand text-lg leading-none" />
          <span className="text-[10px] font-black leading-none">LÀM</span>
        </button>
      </div>
    </>
  );
}
