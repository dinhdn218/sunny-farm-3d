// Node has no localStorage; the game store persists to `window.localStorage`, so give tests an in-memory one
if (typeof globalThis.localStorage === 'undefined') {
  const items = new Map<string, string>();
  globalThis.localStorage = {
    get length() {
      return items.size;
    },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (index) => Array.from(items.keys())[index] ?? null,
    removeItem: (key) => {
      items.delete(key);
    },
    setItem: (key, value) => {
      items.set(key, String(value));
    },
  };
}

if (typeof globalThis.window === 'undefined') {
  globalThis.window = { localStorage: globalThis.localStorage } as Window & typeof globalThis;
}
