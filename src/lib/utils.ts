export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

const RELATIVE = new Intl.RelativeTimeFormat("ru", { numeric: "auto" });

const STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["second", 60],
  ["minute", 60],
  ["hour", 24],
  ["day", 7],
  ["week", 4.34524],
  ["month", 12],
];

export function relativeTime(iso: string) {
  const diffMs = new Date(iso).getTime() - Date.now();
  let value = diffMs / 1000;

  for (const [unit, span] of STEPS) {
    if (Math.abs(value) < span) {
      return RELATIVE.format(Math.round(value), unit);
    }
    value /= span;
  }
  return RELATIVE.format(Math.round(value), "year");
}

export function absoluteTime(iso: string) {
  return new Intl.DateTimeFormat("ru", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(iso));
}

// Deterministic avatar colour so a user keeps the same identity everywhere
// without storing or uploading an image.
const AVATAR_HUES = [188, 205, 224, 262, 318, 12, 34, 152];

export function avatarStyle(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const hue = AVATAR_HUES[hash % AVATAR_HUES.length];
  const shift = (hash >> 3) % 22;
  return {
    background: `linear-gradient(145deg, hsl(${hue} 52% 46%), hsl(${(hue + 26 + shift) % 360} 56% 34%))`,
  };
}

export function initials(displayName: string) {
  const words = displayName.trim().split(/\s+/).slice(0, 2);
  return words.map((w) => [...w][0] ?? "").join("").toUpperCase() || "?";
}

// Russian needs three forms: 1 лайк, 2 лайка, 5 лайков.
export function pluralWord(n: number, one: string, few: string, many: string) {
  const mod100 = Math.abs(n) % 100;
  const mod10 = mod100 % 10;
  if (mod100 >= 11 && mod100 <= 14) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

export function plural(n: number, one: string, few: string, many: string) {
  return `${n} ${pluralWord(n, one, few, many)}`;
}
