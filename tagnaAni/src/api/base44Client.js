const API_BASE = import.meta.env.DEV ? "http://127.0.0.1:8000/api" : "";

const HEADERS = {
  "Content-Type": "application/json",
  "X-Bantay-Local": "1",
};

const SESSION_KEY = "tagna:session_user";
export function getSessionUser() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(window.localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

export function setSessionUser(user) {
  if (user) window.localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  else window.localStorage.removeItem(SESSION_KEY);
}

export async function tagnaRequest(path, data) {
  const response = await fetch(`/__tagna${path}`, data === undefined ? {} : {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(result.error || "Could not reach Tagna-Ani."), { status: response.status });
  return result;
}

export async function refreshSession() {
  try {
    const { user } = await tagnaRequest("/me");
    setSessionUser(user);
    return user;
  } catch (error) {
    if (error.status === 401) {
      const previous = getSessionUser();
      setSessionUser(null);
      if (previous?.id) {
        for (const key of Object.keys(window.localStorage)) {
          if (key.includes(`:${previous.id}:`) || key.endsWith(`:${previous.id}`)) {
            window.localStorage.removeItem(key);
          }
        }
      }
      return null;
    }
    if (getSessionUser()?.role === "user") return getSessionUser();
    throw error;
  }
}

if (typeof window !== "undefined") {
  for (const key of ["tagna:users", "bantay:ntfyTopic", "bantay:replyWebhook", "bantay:subscribers"]) {
    window.localStorage.removeItem(key);
  }
}

async function authenticate(path, username, password) {
  const { user } = await tagnaRequest(path, { username, password });
  setSessionUser(user);
  return user;
}

export const registerSimple = (username, password) => authenticate("/register", username, password);
export const loginSimple = (username, password) => authenticate("/login", username, password);

export async function syncFarmProfile(profile) {
  if (!profile?.onboarded) return;
  try {
    await tagnaRequest("/profile", {
      name: profile.farmer_name, city: profile.city, crop: profile.crops?.[0], problem: profile.problems?.[0],
      patchVersion: profile.patchVersion, crops: profile.crops, problems: profile.problems,
      location: { name: profile.city, province: profile.province, region: profile.region,
        lat: profile.latitude, lon: profile.longitude },
    });
  } catch {
    // Retain the browser's farm profile while the server is unreachable.
  }
}

export async function syncFarmName(profile) {
  if (!profile?.farmer_name) return;
  try {
    await tagnaRequest("/profile/name", { name: profile.farmer_name });
  } catch {
    // Keep the local name available offline.
  }
}

function readLocalStore(entityName) {
  if (typeof window === "undefined") return [];
  try {
    const uid = getSessionUser()?.id || "anon";
    const raw = window.localStorage.getItem(`bantay:entity:${uid}:${entityName}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeLocalStore(entityName, items) {
  if (typeof window === "undefined") return;
  try {
    const uid = getSessionUser()?.id || "anon";
    window.localStorage.setItem(`bantay:entity:${uid}:${entityName}`, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

async function applyFarmPatch(items) {
  if (!getSessionUser()) return items;
  try {
    const { patch } = await tagnaRequest("/profile");
    if (!patch) return items;
    const [profile = { onboarded: false }, ...rest] = items;
    const { location } = patch;
    const crops = patch.crops || (patch.crop && [patch.crop, ...(profile.crops || []).slice(1).filter((crop) => crop !== patch.crop)]);
    const problems = patch.problems || (patch.problem && [patch.problem, ...(profile.problems || []).slice(1).filter((problem) => problem !== patch.problem)]);
    const updated = { ...profile, patchVersion: patch.version,
      ...(location && { city: location.name, province: location.province, region: location.region,
        latitude: location.lat, longitude: location.lon }),
      ...(crops && { crops }),
      ...(problems && { problems }),
    };
    const result = [updated, ...rest];
    if (items.length) writeLocalStore("FarmProfile", result);
    return result;
  } catch {
    return items;
  }
}

function createEntityClient(entityName) {
  return {
    async list() {
      const localItems = readLocalStore(entityName);
      if (localItems.length > 0) {
        return { items: entityName === "FarmProfile" ? await applyFarmPatch(localItems) : localItems };
      }
      try {
        if (!API_BASE) throw new Error("Local backend is disabled.");
        const res = await fetch(`${API_BASE}/entities/${entityName}`, { headers: HEADERS });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const uid = getSessionUser()?.id;
        const allItems = data.items || [];
        const userItems = uid ? allItems.filter((x) => x.user_id === uid) : [];
        writeLocalStore(entityName, userItems);
        return { items: entityName === "FarmProfile" ? await applyFarmPatch(userItems) : userItems };
      } catch {
        return { items: entityName === "FarmProfile" ? await applyFarmPatch(localItems) : localItems };
      }
    },
    async filter() {
      const { items } = await this.list();
      return items;
    },
    async get(id) {
      const { items } = await this.list();
      return items.find((item) => String(item.id) === String(id)) || null;
    },
    async create(payload) {
      const uid = getSessionUser()?.id || "anon";
      const enriched = { ...payload, user_id: uid };
      try {
        if (!API_BASE) throw new Error("Local backend is disabled.");
        const res = await fetch(`${API_BASE}/entities/${entityName}`, {
          method: "POST",
          headers: HEADERS,
          body: JSON.stringify(enriched),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const created = await res.json();
        const current = readLocalStore(entityName).filter((x) => x.id !== created.id);
        writeLocalStore(entityName, [created, ...current]);
        return created;
      } catch {
        const fallback = {
          ...enriched,
          id: payload?.id || `local-${Date.now()}`,
          created_date: new Date().toISOString(),
        };
        const current = readLocalStore(entityName);
        writeLocalStore(entityName, [fallback, ...current]);
        return fallback;
      }
    },
    async update(id, payload) {
      const uid = getSessionUser()?.id || "anon";
      const enriched = { ...payload, user_id: uid };
      try {
        if (!API_BASE) throw new Error("Local backend is disabled.");
        const res = await fetch(`${API_BASE}/entities/${entityName}/${id}`, {
          method: "PUT",
          headers: HEADERS,
          body: JSON.stringify(enriched),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const updated = await res.json();
        const current = readLocalStore(entityName);
        const next = current.some((x) => String(x.id) === String(id))
          ? current.map((x) => (String(x.id) === String(id) ? updated : x))
          : [updated, ...current];
        writeLocalStore(entityName, next);
        return updated;
      } catch {
        const updated = { ...enriched, id, updated_date: new Date().toISOString() };
        const current = readLocalStore(entityName);
        const next = current.some((x) => String(x.id) === String(id))
          ? current.map((x) => (String(x.id) === String(id) ? updated : x))
          : [updated, ...current];
        writeLocalStore(entityName, next);
        return updated;
      }
    },
    async delete(id) {
      try {
        if (API_BASE) await fetch(`${API_BASE}/entities/${entityName}/${id}`, {
          method: "DELETE",
          headers: HEADERS,
        });
      } catch {
        /* continue to local removal */
      }
      const current = readLocalStore(entityName).filter((x) => String(x.id) !== String(id));
      writeLocalStore(entityName, current);
      return { deleted: true, id };
    },
  };
}

export const db = {
  auth: {
    hasToken: () => Boolean(getSessionUser()),
    isAuthenticated: async () => Boolean(getSessionUser()),
    me: refreshSession,
    login: async (username, password) => loginSimple(username, password),
    register: async ({ username, password }) => registerSimple(username, password),
    logout: async () => {
      await tagnaRequest("/logout", {});
      setSessionUser(null);
      window.location.href = "/";
    },
    redirectToLogin: () => {
      window.location.href = "/login";
    },
  },
  entities: new Proxy(
    {},
    {
      get: (_, entityName) => createEntityClient(String(entityName)),
    },
  ),
  integrations: {
    Core: { UploadFile: async () => ({ file_url: "" }) },
  },
};

if (typeof globalThis !== "undefined") {
  globalThis.__B44_DB__ = db;
}

export const base44 = db;
export default db;