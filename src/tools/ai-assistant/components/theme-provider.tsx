import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type Theme = "light" | "dark" | "system";

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: "light" | "dark";
}

const ThemeProviderContext = createContext<ThemeContextValue | undefined>(
  undefined,
);

/**
 * ThemeProvider for AI Assistant
 * 
 * When running inside Mnemosyne, we observe the parent app's theme
 * by watching the `dark` class on document.documentElement.
 * We don't actively modify the theme - we follow the main app's theme.
 */
export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "cc-switch-theme",
}: ThemeProviderProps) {
  // Observe the current theme from document.documentElement
  const getResolvedTheme = (): "light" | "dark" => {
    if (typeof window === "undefined") return "light";
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
  };

  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(getResolvedTheme);
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return defaultTheme;
    const stored = localStorage.getItem(storageKey) as Theme | null;
    return stored || defaultTheme;
  });

  // Watch for theme changes from the main app
  useEffect(() => {
    if (typeof window === "undefined") return;

    const observer = new MutationObserver(() => {
      setResolvedTheme(getResolvedTheme());
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    // Also listen for system preference changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => setResolvedTheme(getResolvedTheme());
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  // Save theme preference (for AI Assistant's own settings)
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(storageKey, theme);
  }, [theme, storageKey]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme: setThemeState,
      resolvedTheme,
    }),
    [theme, resolvedTheme],
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
