import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { credentialsSchema } from "@/lib/validation";
import {
  callerAddress,
  checkRateLimit,
  RATE_LIMITS,
  resetRateLimit,
} from "@/lib/rate-limit";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (raw, request) => {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const { username, password } = parsed.data;
        const address = callerAddress(request.headers);

        // Both are limited: the handle stops a targeted attack on one account,
        // the address stops a spray across many. Counted before the password is
        // checked so a wrong guess still costs an attempt.
        for (const subject of [`user:${username}`, `addr:${address}`]) {
          const limit = await checkRateLimit(
            "auth:signin",
            subject,
            RATE_LIMITS.signIn,
          );
          if (!limit.allowed) return null;
        }

        const [found] = await db
          .select()
          .from(users)
          .where(eq(users.username, username))
          .limit(1);

        if (!found) return null;
        if (!(await compare(password, found.passwordHash))) return null;

        // A correct password clears the counter so a person who mistyped twice
        // is not left throttled.
        await resetRateLimit("auth:signin", `user:${username}`);

        return {
          id: found.id,
          username: found.username,
          displayName: found.displayName,
          avatarSeed: found.avatarSeed,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.username = user.username;
        token.displayName = user.displayName;
        token.avatarSeed = user.avatarSeed;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.username = token.username;
      session.user.displayName = token.displayName;
      session.user.avatarSeed = token.avatarSeed;
      return session;
    },
  },
});
