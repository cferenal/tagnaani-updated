const PREFIX = "smartfarm:";

function store() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function cacheSet(key, value) {
  const s = store();
  if (!s) return;
  try {
    s.setItem(PREFIX + key, JSON.stringify({ at: Date.now(), value }));
  } catch {
    /* storage full or blocked */
  }
}

export function cacheGet(key) {
  const s = store();
  if (!s) return null;
  try {
    const raw = s.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function queueGet(key) {
  const cached = cacheGet("queue:" + key);
  return cached?.value || [];
}

export function queueAdd(key, item) {
  const items = queueGet(key);
  cacheSet("queue:" + key, [...items, item]);
}

export function queueReplace(key, items) {
  cacheSet("queue:" + key, items);
}

export function isOnline() {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine !== false;
}