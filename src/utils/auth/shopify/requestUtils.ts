import crypto from 'crypto';
import { Installations } from "@/utils/auth/shopify";
import { ShopifySessionManager } from "@/utils/storage";
import { WebhookManager } from "@/utils/webhooks";
import { shopify } from "@/lib/shopify";
import { SessionNotFoundError as NotFoundDBError } from "@/utils/storage";
import { RequestedTokenType } from "@shopify/shopify-api";

const TEST_GRAPHQL_QUERY = `
{
  shop {
    name
  }
}`;

export class AppNotInstalledError extends Error {
  constructor() {
    super("App not installed");
    this.name = "AppNotInstalledError";
  }
}

export class SessionNotFoundError extends Error {
  isOnline: boolean;
  constructor(isOnline: boolean) {
    super("Session not found");
    this.name = "SessionNotFoundError";
    this.isOnline = isOnline;
  }
}

export class ScopeMismatchError extends Error {
  isOnline: boolean;
  accountOwner: boolean;
  constructor(isOnline: boolean, accountOwner: boolean) {
    super("Scope mismatch");
    this.name = "ScopeMismatchError";
    this.isOnline = isOnline;
    this.accountOwner = accountOwner;
  }
}

export class ExpiredTokenError extends Error {
  isOnline: boolean;
  constructor(isOnline: boolean) {
    super(`Token expired - ${isOnline ? "online" : "offline"}`);
    this.name = "ExpiredTokenError";
    this.isOnline = isOnline;
  }
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export async function verifyAuth(shop: string, sessionId?: string, email?: string, online?: boolean) {
  const sanitizedShop = shopify.utils.sanitizeShop(shop);
  if (!sanitizedShop) {
    throw new AuthError("Invalid shop provided");
  }
  const appInstalled = await Installations.includes(sanitizedShop);
  if (!appInstalled) {
    throw new AppNotInstalledError();
  }
  if (online && (!sessionId || !email)) {
    throw new SessionNotFoundError(true);
  }
  const sessions = await ShopifySessionManager.findSessionsByShop(sanitizedShop);
  if (online && sessionId && email) {
    await ShopifySessionManager.deleteUnusedSessions(sessionId, email);
    const onlineSession = await ShopifySessionManager.getSessionFromStorageWithEmail(sessionId, email);
    if (!onlineSession) {
      throw new SessionNotFoundError(true);
    }
    if (onlineSession.expires && onlineSession.expires.getTime() < Date.now()) {
      await ShopifySessionManager.deleteSessionFromStorage(onlineSession.id);
      throw new ExpiredTokenError(true);
    }
    const client = new shopify.clients.Graphql({
      session: onlineSession,
    });
    try {
      await client.request(TEST_GRAPHQL_QUERY);
    } catch (err) {
      console.error('GraphQL validation failed:', err);
      throw new ExpiredTokenError(true);
    }
    return onlineSession;
  }
  const offlineSession = sessions.find((session) => session.isOnline === false);
  if (!offlineSession) {
    throw new SessionNotFoundError(false);
  }
  await WebhookManager.registerWebhooks(offlineSession);
  return offlineSession;
}

export async function verifyRequest(req: Request, isOnline: boolean) {
  const bearerPresent = headers().get("authorization")?.startsWith("Bearer ");
  const sessionId = await shopify.session.getCurrentId({
    rawRequest: req,
    isOnline,
  });

  if (!sessionId) {
    if (bearerPresent) {
      const token = headers().get("authorization")?.replace("Bearer ", "");
      if (!token) {
        throw new Error("No token present");
      }
      return handleSessionToken(token, isOnline);
    } else {
      throw new SessionNotFoundError(isOnline);
    }
  }

  try {
    const session = await ShopifySessionManager.getSessionFromStorage(sessionId);
    if (
      session.isOnline &&
      session.expires &&
      session.expires.getTime() < Date.now()
    ) {
      throw new ExpiredTokenError(isOnline);
    }
    return session;
  } catch (err) {
    if (err instanceof NotFoundDBError || err instanceof ExpiredTokenError) {
      if (bearerPresent && shopify.config.isEmbeddedApp) {
        const token = headers().get("authorization")?.replace("Bearer ", "");
        if (!token) {
          throw new Error("No token present");
        }
        return handleSessionToken(token, isOnline);
      } else {
        throw new SessionNotFoundError(isOnline);
      }
    }
    throw err;
  }
}

export async function tokenExchange(
  shop: string,
  sessionToken: string,
  online?: boolean,
) {
  const response = await shopify.auth.tokenExchange({
    shop,
    sessionToken,
    requestedTokenType: online
      ? RequestedTokenType.OnlineAccessToken
      : RequestedTokenType.OfflineAccessToken,
  });
  const { session } = response;
  const onlineSession = await ShopifySessionManager.storeSessionToStorage(session);
  return onlineSession;
}

export async function handleSessionToken(
  sessionToken: string,
  sessionId?: string,
  email?: string,
  online?: boolean,
) {
  let payload;
  try {
    payload = await shopify.session.decodeSessionToken(sessionToken);
  } catch (error) {
    console.error('Failed to decode session token:', error);
    throw new AuthError('Invalid session token');
  }
  const shop = payload.dest.replace("https://", "");
  try {
    const validSession = await verifyAuth(shop, sessionId, email, online);
    return validSession;
  } catch (error) {
    if (error instanceof ExpiredTokenError || error instanceof SessionNotFoundError) {
      try {
        const newSession = await tokenExchange(shop, sessionToken, online);
        return await verifyAuth(shop, newSession.sessionId, newSession.email, online);
      } catch (exchangeError) {
        console.error('Token exchange failed:', exchangeError);
        throw new AuthError('Failed to refresh session: ' + exchangeError.message);
      }
    }
    throw error;
  }
}

export function verifyHmac(query: Record<string, string | string[] | undefined>): boolean {
  const { hmac, ...params } = query;
  if (typeof hmac !== 'string' || !hmac) {
    return false;
  }
  const message = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return value.map(v => `${key}=${v}`).join('&');
      }
      return `${key}=${value}`;
    })
    .join('&');

  const generatedHmac = crypto
    .createHmac('sha256', process.env.SHOPIFY_API_SECRET!)
    .update(message)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(generatedHmac, 'utf-8'),
    Buffer.from(hmac, 'utf-8')
  );
}

export async function verifyToken(token: string, shop: string) {
  try {
    const decodedToken = await shopify.session.decodeSessionToken(token);
    if (decodedToken.dest.replace('https://', '') !== shop) {
      throw new Error('Token destination does not match shop');
    }
    return decodedToken;
  } catch (error) {
    throw new Error('Invalid token');
  }
}

/*export async function exchangeToken(host: string, sessionToken: string) {
  try {
    const response = await fetch(`https://${host}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.SHOPIFY_API_KEY!,
        client_secret: process.env.SHOPIFY_API_SECRET!,
        grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
        subject_token: sessionToken,
        subject_token_type: 'urn:ietf:params:oauth:token-type:id_token',
        requested_token_type: 'urn:shopify:params:oauth:token-type:offline-access-token'
      }),
    });
    if (!response.ok) {
      throw new Error('Failed to exchange token');
    }
    const { access_token, scope } = await response.json();
    return { access_token, scope };
  } catch (error) {
    console.error('Error exchanging token:', error);
    throw error;
  }
}*/

