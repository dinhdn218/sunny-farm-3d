import { ThreeEvent } from '@react-three/fiber';
import { useGameStore } from '@/store/useGameStore';

// Hover tooltip + click handlers for clickable props (the HTML version's interactableMeshes)
export function interactable(
  title: string,
  onClick: () => void,
  desc = 'Click chuột để tương tác'
) {
  return {
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      // Ignore the click that ends a camera drag
      if (e.delta > 8) return;
      onClick();
    },
    onPointerMove: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      useGameStore.getState().setTooltip({
        title,
        desc,
        x: e.nativeEvent.clientX,
        y: e.nativeEvent.clientY,
      });
    },
    onPointerOut: () => useGameStore.getState().setTooltip(null),
  };
}
