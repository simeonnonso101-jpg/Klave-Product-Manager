import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = mounted ? (resolvedTheme === "dark") : false;

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`h-10 w-10 rounded-full bg-white/60 dark:bg-white/10 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-lg shadow-black/5 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/80 dark:hover:bg-white/15 transition-all active:scale-95 ${className}`}
      title={isDark ? "Switch to light" : "Switch to dark"}
      aria-label="Toggle theme"
      suppressHydrationWarning
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}
