import { shopify } from "@/lib/shopify";
import { WebhookManager } from "@/utils/webhooks";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { DOMAIN } from '@/configs/sites';
import { ShopifySessionCache } from '@/utils/cache';
export const maxDuration = 60; 

const MAX_COOKIE_SET_ATTEMPTS = 3;

const RETRY_DELAY_MS = 100;

const shopifyCache = new ShopifySessionCache();

const COOKIE_NAMES = [
  "shopify_verified",
  "shopify_host", 
  "shopify_shop",
  "shopify_embedded",
  "google_session",
  "google_user"
];

interface CookieOptions {
  httpOnly: true;
  secure: true;
  sameSite: 'none';
  maxAge: number;
  path: string;
  domain?: string;
}

async function deleteSessionCookie(
  cookieName: string, 
  response: NextResponse
): Promise<boolean> {
  const cookieOptions: CookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 0,
    path: '/',
    domain: DOMAIN,
  };
  return new Promise((resolve) => {
    let attempts = 0;
    const deleteCookie = async () => {
      try {
        const cookieString = `${cookieName}=''; HttpOnly; Secure; SameSite=None; Max-Age=0; Path=/` + 
          (DOMAIN ? `; Domain=${DOMAIN}` : '');
        response.headers.set('Set-Cookie', cookieString);
        let verificationCookie = response.cookies.get(cookieName);
        if (!verificationCookie) {
          console.log(`Cookie ${cookieName} cleared using method 1`);
          resolve(true);
          return;
        }
        if (attempts >= 1) {
          response.cookies.delete(cookieName, cookieOptions);
          verificationCookie = response.cookies.get(cookieName);
          if (!verificationCookie) {
            console.log(`Cookie ${cookieName} cleared using method 2`);
            resolve(true);
            return;
          }
        }
        if (attempts >= 2) {
          response.cookies.set(cookieName, '', {
            maxAge: 0,
            path: '/',
            domain: DOMAIN
          });
          response.cookies.set(cookieName, '', {
            maxAge: 0,
            path: '/',
          });
          verificationCookie = response.cookies.get(cookieName);
          if (!verificationCookie) {
            console.log(`Cookie ${cookieName} cleared using method 3`);
            resolve(true);
            return;
          }
        }
        attempts++;
        if (attempts < MAX_COOKIE_SET_ATTEMPTS) {
          setTimeout(deleteCookie, RETRY_DELAY_MS);
        } else {
          console.warn(`Failed to clear cookie ${cookieName} after all attempts`);
          resolve(false);
        }
      } catch (error) {
        console.error(`Cookie deletion attempt ${attempts + 1} failed for ${cookieName}:`, error);
        attempts++;
        if (attempts < MAX_COOKIE_SET_ATTEMPTS) {
          setTimeout(deleteCookie, RETRY_DELAY_MS);
        } else {
          resolve(false);
        }
      }
    };
    deleteCookie();
  });
}

async function clearAllSessionCookies(response: NextResponse): Promise<boolean> {
  try {
    const results = await Promise.all(
      COOKIE_NAMES.map(cookieName => deleteSessionCookie(cookieName, response))
    );
    const allCleared = results.every(result => result === true);
    if (!allCleared) {
      console.log('Some cookies remained, trying sequential deletion...');
      for (const cookieName of COOKIE_NAMES) {
        response.cookies.set({
          name: cookieName,
          value: '',
          httpOnly: true,
          secure: true,
          sameSite: 'none',
          maxAge: 0,
          path: '/',
          domain: DOMAIN
        });
      }
    }
    const remainingCookies = COOKIE_NAMES.filter(name => response.cookies.get(name));
    if (remainingCookies.length > 0) {
      console.warn('Cookies still remaining after all attempts:', remainingCookies);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error clearing session cookies:', error);
    return false;
  }
}

export async function POST(req: Request, res: Response) {
  const topic = req.headers.get('X-Shopify-Topic');
  const shop = req.headers.get('X-Shopify-Shop-Domain');
  const hmac = req.headers.get('X-Shopify-Hmac-Sha256');
  if (!topic || !shop || !hmac) {
    console.error('Missing required headers');
    return new Response('Missing required headers', { status: 400 });
  }
  const handlers = shopify.webhooks.getHandlers(topic);
  if (handlers.length === 0) {
    await WebhookManager.initializeWebhooks();
  }
  const rawBody = await req.text();
  try {
    const { valid, topic, domain } = await shopify.webhooks.validate({
      rawBody: rawBody,
      rawRequest: req,
      rawResponse: res,
    });
    if (!valid) {
      console.error('Invalid webhook signature');
      return new Response('Invalid webhook signature', { status: 401 });
    }
    await WebhookManager.processWebhook(
      topic,
      domain,
      JSON.parse(rawBody.toString())
    );
    if (topic === "APP_UNINSTALLED" || topic === "app/uninstalled") {
      shopifyCache.clear();
      try {
        const response = NextResponse.json({ 
          status: "SUCCESSFULLY UNINSTALLED"
        });
        const cookiesCleared = await clearAllSessionCookies(response);
        if (!cookiesCleared) {
          console.warn('Primary cookie clearing failed, applying fallback method');
          const cookieStore = cookies();
          COOKIE_NAMES.forEach(cookieName => {
            cookieStore.delete(cookieName);
            response.cookies.set({
              name: cookieName,
              value: '',
              httpOnly: true,
              secure: true,
              sameSite: 'none',
              maxAge: 0,
              path: '/',
              domain: DOMAIN
            });
            const cookieString = `${cookieName}=''; HttpOnly; Secure; SameSite=None; Max-Age=0; Path=/; Domain=${DOMAIN}`;
            response.headers.append('Set-Cookie', cookieString);
          });
        }
        return response;
      } catch (error) {
        console.error('Error during app uninstallation:', error);
        return new Response('Error clearing cookies', { status: 401 });
      }
    }

    return new Response(`Successfully processed webhook: ${topic}`, { status: 200 });
  } catch (error) {
    console.error(`Error processing webhook: ${topic}`, error);
    return new Response(null, { status: 500 });
  }
}