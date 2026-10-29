import { useCallback, useEffect, useSyncExternalStore } from "react";

import {
  applyTheme,
  readThemePreference,
  resolveTheme,
  saveThemePreference,
  watchSystemTheme,
  type ThemePreference,
} from "@/lib/theme";

// One shared preference for every component that shows or changes it.
const listeners = new Set<() => void>();
let preference: ThemePreference = typeof window === "undefined" ? "system" : readThemePreference();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const setStoredPreference = (next: ThemePreference) => {
  preference = next;
  saveThemePreference(next);
  applyTheme(resolveTheme(next));
  listeners.forEach((listener) => listener());
};

export function useTheme() {
  const current = useSyncExternalStore(subscribe, () => preference, () => "system" as ThemePreference);

  // In System mode, follow the device as it changes (for example at sunset).
  useEffect(() => {
    if (current !== "system") return;
    return watchSystemTheme(() => applyTheme(resolveTheme("system")));
  }, [current]);

  const setPreference = useCallback((next: ThemePreference) => setStoredPreference(next), []);
  return { preference: current, setPreference };
}

// Keeps the page in step with the saved preference for the whole app,
// including System changes while no settings screen is open.
export function useApplyThemePreference() {
  const { preference: current } = useTheme();
  useEffect(() => {
    applyTheme(resolveTheme(current));
  }, [current]);
}
