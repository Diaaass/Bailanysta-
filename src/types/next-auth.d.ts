import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      displayName: string;
      avatarSeed: string;
    } & DefaultSession["user"];
  }

  interface User {
    id?: string;
    username: string;
    displayName: string;
    avatarSeed: string;
  }
}

// next-auth/jwt only re-exports @auth/core/jwt, so the augmentation has to
// target the original module or it is silently ignored.
declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    username: string;
    displayName: string;
    avatarSeed: string;
  }
}
