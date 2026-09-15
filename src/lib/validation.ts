import { z } from "zod";

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Username must be at least 3 characters")
  .max(32, "Username must be at most 32 characters")
  .regex(/^[a-z0-9_]+$/, "Only latin letters, digits and underscore");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters");

export const credentialsSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
});

export const registerSchema = credentialsSchema.extend({
  displayName: z.string().trim().min(1, "Display name is required").max(64),
});

export const postContentSchema = z
  .string()
  .trim()
  .min(1, "Post cannot be empty")
  .max(500, "Post must be at most 500 characters");

export const commentContentSchema = z
  .string()
  .trim()
  .min(1, "Comment cannot be empty")
  .max(300, "Comment must be at most 300 characters");

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, "Имя не может быть пустым")
  .max(64, "Имя не длиннее 64 символов");

export const bioSchema = z
  .string()
  .trim()
  .max(280, "О себе — не длиннее 280 символов");

export const profileUpdateSchema = z.object({
  displayName: displayNameSchema,
  bio: bioSchema,
});
