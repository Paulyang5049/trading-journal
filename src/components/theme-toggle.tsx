"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  // Avoid SSR/client theme mismatch: only resolve the icon after mount.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  const isLight = mounted && resolvedTheme === "light";
  return (
    <button
      aria-label="Toggle theme"
      onClick={() => setTheme(isLight ? "dark" : "light")}
      className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius)] text-muted hover:bg-surface-2 hover:text-foreground"
    >
      {isLight ? <Moon size={18} /> : <Sun size={18} />}
    </button>
  );
}
