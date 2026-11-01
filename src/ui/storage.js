import { cloneBinds, sanitizeBinds } from "../core/inputmap.js";

const SETTINGS_KEY = "graveyardgrab.settings";
const BINDS_KEY = "graveyardgrab.binds";

export const DEFAULT_SETTINGS = { volume: 0.7, muted: false, roundCount: 3 };
const ROUND_CHOICES = [1, 3, 5];

export function loadSettings() {
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null");
    const volume = Number(raw?.volume);
    const roundCount = ROUND_CHOICES.includes(raw?.roundCount) ? raw.roundCount : 3;
    return {
      volume: Number.isFinite(volume) ? Math.max(0, Math.min(1, volume)) : DEFAULT_SETTINGS.volume,
      muted: !!raw?.muted,
      roundCount,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        volume: settings.volume,
        muted: !!settings.muted,
        roundCount: settings.roundCount,
      }),
    );
  } catch {
    /* private mode and similar — the match still runs */
  }
}

export function loadBinds() {
  try {
    const raw = JSON.parse(localStorage.getItem(BINDS_KEY) || "null");
    return sanitizeBinds(raw);
  } catch {
    return cloneBinds();
  }
}

export function saveBinds(binds) {
  try {
    localStorage.setItem(BINDS_KEY, JSON.stringify(sanitizeBinds(binds)));
  } catch {
    /* ignore quota / private mode */
  }
}
