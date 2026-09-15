"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

const noopSubscribe = () => () => {};

const ICONS = {
  light: "M12 17a5 5 0 100-10 5 5 0 000 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4",
  system: "M3 5.5A2.5 2.5 0 015.5 3h13A2.5 2.5 0 0121 5.5v8a2.5 2.5 0 01-2.5 2.5h-13A2.5 2.5 0 013 13.5v-8zM8 21h8M12 16v5",
  dark: "M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z",
} as const;

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
            aria-label={option.label}
            onClick={() => setTheme(option.value)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-2 py-1.5 text-[0.6875rem] font-medium transition-colors sm:px-2.5 sm:py-1",
              active ? "bg-accent text-white" : "text-ink-faint hover:text-ink",
            )}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
              className="h-[0.95rem] w-[0.95rem] sm:hidden"
            >
              <path
                d={ICONS[option.value]}
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {/* The icon stands in for the label on a phone so the control does
                not eat half the header; aria-label carries the meaning at every
                width, so the label is never duplicated in the accessible name. */}
            <span className="hidden sm:inline">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
