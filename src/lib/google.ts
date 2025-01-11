import { OAuth2Client } from 'google-auth-library';

export const oauth2Client = new OAuth2Client({
  clientId: process.env.AUTH_GOOGLE_CLIENT_ID,
  clientSecret: process.env.AUTH_GOOGLE_CLIENT_SECRET,
  redirectUri: `${process.env.AUTH_URL}/api/auth/google/callback`
});
