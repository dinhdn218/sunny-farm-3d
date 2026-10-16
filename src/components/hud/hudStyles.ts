// The small square buttons at the end of the bars: players online, mail, leaderboards, photos, sound
export const SYSTEM_BUTTON =
  'game-btn relative flex h-8 min-w-7 items-center justify-center rounded-xl border-2 border-amber-700/50 bg-amber-50 text-sm text-amber-900 hover:bg-white sm:min-w-8';

// Phones: the thumbstick, the action button (level with the stick's middle) and the chat button (over the
// action button) sit just above the bar at the bottom of the screen, whatever its height: --hud-bottom
// (useBottomInset) is 0 where there is none, out in the zones. The chat opens as a sheet at the stick's
// height; the quest tracker stops short of the stick (QuestTracker).
export const PHONE_CONTROLS_BOTTOM = 'bottom-[calc(var(--hud-bottom,0px)+12px)]';
export const PHONE_ACTION_BOTTOM = 'bottom-[calc(var(--hud-bottom,0px)+36px)]';
export const PHONE_CHAT_BUTTON_BOTTOM = 'bottom-[calc(var(--hud-bottom,0px)+112px)]';
// Gliding up and down as the bar grows and shrinks
export const PHONE_CONTROLS_GLIDE = 'transition-[bottom] duration-200 ease-out';
