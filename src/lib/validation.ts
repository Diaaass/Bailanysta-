import { z } from "zod";

/**
 * Messages are dictionary keys, not prose: the person who sees them may be
 * reading the interface in any of three languages, and a schema has no way of
 * knowing which. `translateIssue` resolves them at the point of display.
 */
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "usernameTooShort")
  .max(32, "usernameTooLong")
  .regex(/^[a-z0-9_]+$/, "usernameFormat");

export const passwordSchema = z
  .string()
  .min(8, "passwordTooShort")
  .max(72, "passwordTooLong");

export const credentialsSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
});

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, "displayNameRequired")
  .max(64, "displayNameTooLong");

export const registerSchema = credentialsSchema.extend({
  displayName: displayNameSchema,
});

export const postContentSchema = z
  .string()
  .trim()
  .min(1, "postEmpty")
  .max(500, "postTooLong");

export const commentContentSchema = z
  .string()
  .trim()
  .min(1, "commentEmpty")
  .max(300, "commentTooLong");

export const bioSchema = z.string().trim().max(280, "bioTooLong");

export const profileUpdateSchema = z.object({
  displayName: displayNameSchema,
  bio: bioSchema,
});
