import { DefaultSession, DefaultUser } from "next-auth";
import { JWT as DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      accessToken?: string | null;
      refreshToken?: string | null;
      email: string;
      name?: string | null;
      image?: string | null;
    } & DefaultSession["user"];
    expires: string;
  }

  interface User extends DefaultUser {
    id: string;
    accessToken?: string | null;
    refreshToken?: string | null;
    email: string;
    name?: string | null;
    image?: string | null;
    emailVerified?: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    accessToken?: string | null;
    refreshToken?: string | null;
    email: string;
    name?: string | null;
    image?: string | null;
    emailVerified?: number | null;
    accessTokenExpires?: number;
  }
}
