import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { credentialsSchema } from "@/lib/validation";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (raw) => {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const { username, password } = parsed.data;
        const [found] = await db
          .select()
          .from(users)
          .where(eq(users.username, username))
          .limit(1);

        if (!found) return null;
        if (!(await compare(password, found.passwordHash))) return null;

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
