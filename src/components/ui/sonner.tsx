import { Toaster as SonnerToaster } from "sonner"

/**
 * Detect current theme from document root class.
 * Falls back to system preference if no explicit class is set.
 */
function getResolvedTheme(): "light" | "dark" {
  if (typeof document === "undefined") return "light"
  return document.documentElement.classList.contains("dark") ? "dark" : "light"
}

export function Toaster() {
  const theme = getResolvedTheme()

  return (
    <SonnerToaster
      position="top-center"
      richColors
      theme={theme}
      toastOptions={{
        duration: 2000,
        classNames: {
          toast:
            "group rounded-md border bg-background text-foreground shadow-lg",
          title: "text-sm font-semibold",
          description: "text-sm text-muted-foreground",
          closeButton:
            "absolute right-2 top-2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
          actionButton:
            "rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90",
        },
      }}
    />
  )
}
