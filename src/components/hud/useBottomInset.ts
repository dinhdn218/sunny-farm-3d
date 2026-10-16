'use client';

import { RefObject, useEffect, useLayoutEffect } from 'react';

// Before the first paint in the browser (no warning when rendered on the server)
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

// How much of the bottom of the screen the bar takes, its gap to the edge included, kept in --hud-bottom
// while it is up (`active`): the phone's thumbstick, action button and chat sit just above it, moving up
// when the bar grows (a two-line caption, the seed picker) and down when it shrinks or goes (see hudStyles)
export function useBottomInset(ref: RefObject<HTMLElement>, active = true) {
  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el || !active) return;
    const root = document.documentElement.style;
    const update = () =>
      root.setProperty('--hud-bottom', `${Math.round(el.offsetHeight + parseFloat(getComputedStyle(el).bottom))}px`);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      observer.disconnect();
      root.setProperty('--hud-bottom', '0px');
    };
  }, [ref, active]);
}
