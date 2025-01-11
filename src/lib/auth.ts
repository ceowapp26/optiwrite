import NextAuth from 'next-auth';
import { authConfig } from "@/config/auth.config";
import { decrypt } from '@/utils/auth/google';

export const authOptions = {
  ...authConfig,
  pages: {
    signIn: '/auth-popup',
  },
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, 
  },
  callbacks: {
    async signIn({ account, profile, user }) {
      return true;
    },
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      return session;
    },
    async redirect({ url, baseUrl }) {
      const urlObj = new URL(url);
      const state = urlObj.searchParams.get('state');
      if (state) {
        try {
          const { shop, host } = JSON.parse(decrypt(state));
          return `/auth-popup/callback?shop=${shop}&host=${host}`;
        } catch (error) {
          console.error('Error processing redirect:', error);
        }
      }
      return '/auth-popup/callback';
    },
  },
};

export const { handlers: { GET, POST }, signIn, signOut, auth } = NextAuth(authOptions);