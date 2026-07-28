export type Theme = "light" | "dark"

/**
 * Shared by the inline no-flash script in the root layout and by the theme
 * toggle. An absent value means "follow the OS preference".
 */
export const THEME_STORAGE_KEY = "amakai-theme"

/**
 * Runs in `<head>` before first paint, so the correct theme is already on
 * `<html>` by the time the body renders. Kept dependency-free and wrapped in a
 * try/catch because `localStorage` throws in locked-down browsers.
 */
export const themeInitScript = `(function(){try{var k="${THEME_STORAGE_KEY}",s=localStorage.getItem(k),t=s==="light"||s==="dark"?s:(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"),r=document.documentElement;r.classList.toggle("dark",t==="dark");r.style.colorScheme=t;}catch(e){}})();`

export function getSystemTheme(): Theme {
  // Safe to call during a server render, where there is no OS preference to
  // read: the light token set is the default in `app/globals.css`.
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
  applyTheme(theme)
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Persisting is best-effort; the class is already applied.
  }
}
