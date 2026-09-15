import { describe, expect, it } from "vitest";
import {
  bioSchema,
  commentContentSchema,
  credentialsSchema,
  displayNameSchema,
  postContentSchema,
  usernameSchema,
} from "@/lib/validation";

describe("usernameSchema", () => {
  it("lowercases and trims", () => {
    expect(usernameSchema.parse("  AiGeRiM  ")).toBe("aigerim");
  });

  it.each(["ab", "aigerim!", "айгерим", "a".repeat(33), ""])(
    "rejects %j",
    (value) => {
      expect(usernameSchema.safeParse(value).success).toBe(false);
    },
  );

  it.each(["demo", "a_b_c", "user123", "a".repeat(32)])(
    "accepts %j",
    (value) => {
      expect(usernameSchema.safeParse(value).success).toBe(true);
    },
  );
});

describe("credentialsSchema", () => {
  it("requires at least 8 characters of password", () => {
    expect(
      credentialsSchema.safeParse({ username: "demo", password: "short" })
        .success,
    ).toBe(false);
  });

  it("caps the password at the bcrypt input limit", () => {
    expect(
      credentialsSchema.safeParse({
        username: "demo",
        password: "a".repeat(73),
      }).success,
    ).toBe(false);
  });
});

describe("postContentSchema", () => {
  it("trims surrounding whitespace", () => {
    expect(postContentSchema.parse("  привет  ")).toBe("привет");
  });

  it("rejects whitespace-only content", () => {
    expect(postContentSchema.safeParse("   \n  ").success).toBe(false);
  });

  it("counts characters, not bytes, so Kazakh text is not truncated early", () => {
    expect(postContentSchema.safeParse("ә".repeat(500)).success).toBe(true);
    expect(postContentSchema.safeParse("ә".repeat(501)).success).toBe(false);
  });
});

describe("commentContentSchema", () => {
  it("allows up to 300 characters", () => {
    expect(commentContentSchema.safeParse("a".repeat(300)).success).toBe(true);
    expect(commentContentSchema.safeParse("a".repeat(301)).success).toBe(false);
  });
});

describe("profile fields", () => {
  it("rejects an empty display name", () => {
    expect(displayNameSchema.safeParse("   ").success).toBe(false);
  });

  it("allows an empty bio", () => {
    expect(bioSchema.safeParse("").success).toBe(true);
  });

  it("caps the bio at 280 characters", () => {
    expect(bioSchema.safeParse("a".repeat(281)).success).toBe(false);
  });
});
