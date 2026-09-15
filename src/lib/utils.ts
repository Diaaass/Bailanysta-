export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
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

/**
 * Only a same-origin path may be followed after sign-in. Without this a crafted
 * /login?callbackUrl=https://evil.example sends the visitor off-site the moment
 * their password is accepted - on the real domain, which is what makes it a
 * usable phishing step. Protocol-relative "//host" is rejected too: the browser
 * treats it as absolute.
 */
export function safeCallbackUrl(raw: string | null | undefined) {
  if (!raw) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) {
    return "/";
  }
  return raw;
}
