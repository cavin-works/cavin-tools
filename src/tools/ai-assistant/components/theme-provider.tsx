import React, { createContext, useCallback, useContext, useMemo } from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  /** Resolved theme based on document.documentElement class */
  resolvedTheme: Theme;
  /** Toggle dark mode on the root element */
  toggleTheme: () => void;
}

const ThemeProviderContext = createContext<ThemeContextValue | undefined>(
  undefined,
);

function getResolvedTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

/**
 * Simplified ThemeProvider for AI Assistant.
 *
 * CSS variables inherit from :root, and Tailwind `dark:` prefix
 * works via the global `.dark` class on documentElement.
 * This provider only exposes a read helper and toggle for convenience.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const toggleTheme = useCallback(() => {
    document.documentElement.classList.toggle("dark");
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      resolvedTheme: getResolvedTheme(),
      toggleTheme,
    }),
    [toggleTheme],
  );

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeProviderContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
