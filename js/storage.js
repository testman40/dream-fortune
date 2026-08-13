const HISTORY_KEY = "dreamFortune.history.v1";
const FAVORITES_KEY = "dreamFortune.favorites.v1";

function readIds(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function writeIds(key, ids) {
  try { localStorage.setItem(key, JSON.stringify(ids)); return true; }
  catch { return false; }
}

export const getHistory = () => readIds(HISTORY_KEY);
export const addHistory = (id) => writeIds(HISTORY_KEY, [id, ...getHistory().filter((item) => item !== id)].slice(0, 10));
export const clearHistory = () => writeIds(HISTORY_KEY, []);
export const getFavorites = () => readIds(FAVORITES_KEY);
export const isFavorite = (id) => getFavorites().includes(id);
export function toggleFavorite(id) {
  const current = getFavorites();
  const next = current.includes(id) ? current.filter((item) => item !== id) : [id, ...current];
  writeIds(FAVORITES_KEY, next);
  return next.includes(id);
}
