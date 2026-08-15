export const defaultSave = Object.freeze({ best: {}, stars: {}, avatar: {} });

function cleanNumberMap(value, maximum = Number.MAX_SAFE_INTEGER) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([key, number]) => {
    const parsed = Number(number);
    return key.length < 80 && Number.isFinite(parsed) && parsed >= 0;
  }).map(([key, number]) => [key, Math.min(maximum, Math.floor(Number(number)))]));
}

function cleanObjectMap(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export function readSave(storage, key, legacyKey) {
  try {
    const raw = storage.getItem(key) || storage.getItem(legacyKey) || "{}";
    const parsed = JSON.parse(raw);
    return {
      best: cleanNumberMap(parsed?.best),
      stars: cleanNumberMap(parsed?.stars, 5),
      avatar: cleanObjectMap(parsed?.avatar)
    };
  } catch {
    try { storage.removeItem(key); } catch {}
    return { best: {}, stars: {}, avatar: {} };
  }
}

export function writeSave(storage, key, save) {
  try {
    storage.setItem(key, JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
}
