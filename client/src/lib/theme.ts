export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

// Read before React starts by the inline script in index.html; keep in sync.
export const THEME_STORAGE_KEY = "pm-theme";

const DARK_QUERY = "(prefers-color-scheme: dark)";
const THEME_COLORS: Record<ResolvedTheme, string> = { light: "#ea580c", dark: "#1f1f1f" };

export const isThemePreference = (value: unknown): value is ThemePreference =>
  value === "system" || value === "light" || value === "dark";

// Storage can be unavailable (private windows, blocked site data); the
// default is then System, which needs nothing stored.
export const readThemePreference = (): ThemePreference => {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(stored) ? stored : "system";
  } catch {
    return "system";
  }
};

export const saveThemePreference = (preference: ThemePreference) => {
  try {
    if (preference === "system") window.localStorage.removeItem(THEME_STORAGE_KEY);
    else window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // The choice still applies for this visit.
  }
};

export const systemPrefersDark = () =>
  typeof window.matchMedia === "function" && window.matchMedia(DARK_QUERY).matches;

export const resolveTheme = (preference: ThemePreference, prefersDark = systemPrefersDark()): ResolvedTheme =>
  preference === "system" ? (prefersDark ? "dark" : "light") : preference;

// Applies the theme to the page: the .dark class drives the colour tokens,
// color-scheme keeps native controls (scrollbars, date pickers) matching, and
// theme-color tints the browser's own toolbar on phones.
export const applyTheme = (theme: ResolvedTheme) => {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLORS[theme]);
};

// Calls back whenever the operating system switches between light and dark.
export const watchSystemTheme = (onChange: () => void) => {
  if (typeof window.matchMedia !== "function") return () => {};
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
