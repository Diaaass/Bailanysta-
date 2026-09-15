import type { Dictionary } from "./dictionaries/ru";

/**
 * Zod carries a dictionary key as its message; anything unrecognised is passed
 * through so a message from elsewhere is still shown rather than swallowed.
 */
export function translateIssue(message: string | undefined, t: Dictionary) {
  if (!message) return t.validation.checkFields;

  const known = t.validation as Record<string, string | undefined>;
  return known[message] ?? message;
}
