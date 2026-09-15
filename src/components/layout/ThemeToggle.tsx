"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

const noopSubscribe = () => () => {};

const OPTIONS = [
  { value: "light", label: "Светлая" },
  { value: "system", label: "Системная" },
  { value: "dark", label: "Тёмная" },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  // The active theme only exists in the browser, so the server snapshot is
  // false and the control renders inert until hydration instead of flashing
  // the wrong selection.
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

  return (
    <div
      role="radiogroup"
      aria-label="Тема оформления"
      className="inline-flex rounded-full border border-line p-0.5"
    >
      {OPTIONS.map((option) => {
        const active = mounted && theme === option.value;
        return (
          <button
            key={option.value}
            role="radio"
            aria-checked={active}
            title={option.label}
            onClick={() => setTheme(option.value)}
            className={cn(
              "rounded-full px-2.5 py-1 text-[0.6875rem] font-medium transition-colors",
              active
                ? "bg-accent text-white"
                : "text-ink-faint hover:text-ink",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
