export type Theme = "light" | "dark"
export type ThemePreference = Theme | "system"

/**
 * Shared by the inline no-flash script in the root layout and by the theme
 * toggle. An absent value means "follow the OS preference".
 */
export const THEME_STORAGE_KEY = "amakai-theme"

const THEME_TRANSITION_MS = 200
const THEME_TRANSITION_CLASS = "theme-transition"

function runWithThemeTransition(apply: () => void) {
  if (typeof document === "undefined") {
    apply()
    return
  }

  const root = document.documentElement

  if (typeof document.startViewTransition === "function") {
    document.startViewTransition(apply)
    return
  }

  root.classList.add(THEME_TRANSITION_CLASS)
  apply()
  window.setTimeout(
    () => root.classList.remove(THEME_TRANSITION_CLASS),
    THEME_TRANSITION_MS
  )
}

/**
 * Runs before first paint via `next/script` `beforeInteractive`, so the
 * correct theme is already on `<html>` by the time the body renders. Kept
 * dependency-free and wrapped in a try/catch because `localStorage` throws in
 * locked-down browsers.
 *
 * Prefer injecting this with `<Script id="amakai-theme-init" strategy="beforeInteractive">`
 * rather than a raw `<script>` in JSX — React 19 skips executing script tags
 * rendered inside components on the client.
 */
export const themeInitScript = `(function(){try{var k="${THEME_STORAGE_KEY}",s=localStorage.getItem(k),t=s==="light"||s==="dark"?s:(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"),r=document.documentElement;r.classList.toggle("dark",t==="dark");r.style.colorScheme=t;}catch(e){}})();`

export function getSystemTheme(): Theme {
  // Safe to call during a server render, where there is no OS preference to
  // read: the light token set is the default in each app's `globals.css`.
  if (typeof window === "undefined") return "light"

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light"
}

export function getStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return stored === "light" || stored === "dark" ? stored : null
  } catch {
    return null
  }
}

/** The theme the inline script will have applied on this page load. */
export function resolveInitialTheme(): Theme {
  return getStoredTheme() ?? getSystemTheme()
}

/**
 * Applies a theme to the document. Mirrors the inline script exactly: the
 * `.dark` class drives the token set, `color-scheme` drives native UI
 * (scrollbars, form controls).
 */
export function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.classList.toggle("dark", theme === "dark")
  root.style.colorScheme = theme
}

/** Applies a theme and remembers the choice for subsequent visits. */
export function setTheme(theme: Theme) {
  runWithThemeTransition(() => {
    applyTheme(theme)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      // Persisting is best-effort; the class is already applied.
    }
  })
}

/** Returns the stored preference, or `"system"` when following the OS. */
export function getThemePreference(): ThemePreference {
  return getStoredTheme() ?? "system"
}

/** Clears the stored preference and applies the OS theme. */
export function setSystemTheme() {
  runWithThemeTransition(() => {
    try {
      localStorage.removeItem(THEME_STORAGE_KEY)
    } catch {
      // Clearing is best-effort.
    }
    applyTheme(getSystemTheme())
  })
}

/** Applies a theme preference, including `"system"`. */
export function setThemePreference(preference: ThemePreference) {
  if (preference === "system") {
    setSystemTheme()
    return
  }
  setTheme(preference)
}
