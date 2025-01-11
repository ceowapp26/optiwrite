"use server";
import {
  handleSessionToken,
  tokenExchange,
  verifyAuth,
} from "@/utils/auth/shopify/requestUtils";
import { ConnectToShop } from '@/utils/auth/google';
import { Session } from '@shopify/shopify-api';
import { cookies } from 'next/headers';
import { ShopifySessionManager } from '@/utils/storage';
import { ShopConnectionParams, ShopConnectionResult } from '@/types/auth';

interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  maxAge: number;
  sameSite: 'none' | 'lax' | 'strict';
  path: string;
  domain?: string;
}

const COOKIE_NAMES = [
  "shopify_verified",
  "shopify_host",
  "shopify_shop",
  "shopify_embedded",
  "google_session"
];

const DEFAULT_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: true,
  maxAge: 0,
  sameSite: 'none',
  path: '/',
};

export async function getOfflineSession(shop: string): Promise<Session | null> {
  try {
    const offlineSession = await verifyAuth(shop);
    return JSON.parse(JSON.stringify(offlineSession));
  } catch (error) {
    return null;
  }
}

export async function getOnlineSession(sessionIdToken: string, sessionId?: string, email?: string): Promise<Session | null> {
  try {
    const onlineSession = await handleSessionToken(sessionIdToken, sessionId, email, true);
    return JSON.parse(JSON.stringify(onlineSession, (_, value) =>
      typeof value === 'bigint' ? Number(value) : value
    ));
  } catch (error) {
    console.error("Failed to get online session:", error);
    return null;
  }
}

export async function doTokenExchange(
  shop: string,
  sessionToken: string,
  online?: boolean,
) {
  return tokenExchange(shop, sessionToken, online);
}

export async function findShopByName(
  shop: string
) {
  return await ShopifySessionManager.findShopByName(shop);
}

const MAX_RETRY_ATTEMPTS = 3;

const RETRY_DELAY_MS = 1000;

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const clearCookiesWithRetry = async (domain?: string): Promise<boolean> => {
  const cookieStore = cookies();
  const clearSingleCookie = async (cookieName: string): Promise<boolean> => {
    try {
      cookieStore.set(cookieName, '', {
        ...DEFAULT_COOKIE_OPTIONS,
        domain,
      });
      cookieStore.delete(cookieName);
      return true;
    } catch (error) {
      console.error(`Failed to clear cookie ${cookieName}:`, error);
      return false;
    }
  };
  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      console.log(`Attempt ${attempt} of ${MAX_RETRY_ATTEMPTS} to clear cookies`);
      const specificCookieResults = await Promise.all(
        COOKIE_NAMES.map(async (cookieName) => {
          return clearSingleCookie(cookieName);
        })
      );
      const allCookies = cookieStore.getAll();
      const remainingCookieResults = await Promise.all(
        allCookies.map(async (cookie) => {
          if (!COOKIE_NAMES.includes(cookie.name)) {
            return clearSingleCookie(cookie.name);
          }
          return true;
        })
      );
      const allResults = [...specificCookieResults, ...remainingCookieResults];
      const success = allResults.every(result => result === true);
      if (success) {
        console.log('Successfully cleared all cookies');
        return true;
      }
      if (attempt < MAX_RETRY_ATTEMPTS) {
        console.log(`Some cookies failed to clear. Waiting ${RETRY_DELAY_MS}ms before retry...`);
        await wait(RETRY_DELAY_MS);
      }
    } catch (error) {
      console.error(`Cookie clearing attempt ${attempt} failed:`, error);
      if (attempt < MAX_RETRY_ATTEMPTS) {
        await wait(RETRY_DELAY_MS);
      }
    }
  }
  console.error('Failed to clear cookies after all retry attempts');
  return false;
};

export const clearCookies = async (domain?: string): Promise<boolean> => {
  try {
    const success = await clearCookiesWithRetry(domain);
    return success;
  } catch (error) {
    console.error('Fatal error in clearCookies:', error);
    return false;
  }
};

export const setAuthCookies = async (domain: string, verified: boolean) => {
  const cookieStore = await cookies();
  const COOKIE_NAME = "shopify_verified";
  cookieStore.set(COOKIE_NAME, verified.toString(), {
    httpOnly: true,
    secure: true,
    sameSite: 'none' as const,
    path: '/',
    domain,
  });
};

export async function checkSessionExpires(expiryDate: Date | undefined): boolean {
  if (!expiryDate) return true;
  const bufferTime = 5 * 60 * 1000;
  return Date.now() + bufferTime > new Date(expiryDate).getTime();
}