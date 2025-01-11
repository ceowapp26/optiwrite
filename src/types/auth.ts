import { Session } from '@shopify/shopify-api';

export type Role = "user" | "admin";

export type AuthErrorType = 'GOOGLE' | 'SHOPIFY' | 'UNKNOWN';

export interface ValidationOptions {
  requireGoogle?: boolean;
  requireShopify?: boolean;
  requireAll?: boolean;
}

export interface User {
  userId: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  emailVerified?: boolean;
  image?: string;
  role?: Role;
  sessions: GoogleSession[];
  shops?: Shop[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UserIds {
  googleUserId?: string;
  shopifyUserId?: string;
}

export interface GoogleSession {
  sessionToken: string;
  userId: string;
  expires: Date;
  accessToken: string;
  refreshToken: string;
  accessTokenExpires: Date;
  user?: User;
}

export interface ShopifySession {
  online: Session | null;
  offline: Session | null;
  verified: boolean;
}

export interface SessionContextValue {
  shopify: ShopifySession;
  google: GoogleSession | null;
  loading: boolean;
  error: string | null;
}

export interface AuthError {
  type: AuthErrorType;
  message: string;
}

export interface AppSession {
  shopName?: string;
  shopifyOfflineAccessToken?: string;
  shopifyOnlineAccessToken?: string;
  googleAccessToken?: string;
  shopifyUserId?: string;
  googleUserId?: string;
  userIds: UserIds;
}

export interface ShopConnectionParams {
  shop: string;
  userId: string;
}

export interface ShopConnectionResult {
  success: boolean;
  connected?: boolean;
  error?: string;
}
