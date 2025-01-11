import { shopify } from "@/lib/shopify";
import {
  CookieNotFound,
  InvalidOAuthError,
  InvalidSession,
  Session,
} from "@shopify/shopify-api";
import { NextRequest, NextResponse } from "next/server";
import { generateQueryParams } from '@/utils/auth/shopify';
import { ShopifySessionManager, SessionNotFoundError } from '@/utils/storage';
import { initializeAppBridge } from '@/utils/utilities';
import { WebhookManager } from '@/utils/webhooks';
import { getSessionToken } from "@shopify/app-bridge/utilities";
import { allowedOrigins, corsHeaders, DOMAIN } from '@/configs/sites';
import { beginAuth } from "../auth";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const shop = url.searchParams.get("shop");
  const host = url.searchParams.get("host");
  if (!shop) {
    return NextResponse.json({ error: "No shop provided" }, { status: 400 });
  }
  try {
    const callbackResponse = await shopify.auth.callback({
      rawRequest: req,
    });
    const { session } = callbackResponse;
    if (!session || !session.accessToken) {
      throw new Error("Could not validate auth callback");
    }
    const onlineSession = await ShopifySessionManager.storeSessionToStorage(session);
    await WebhookManager.registerWebhooks(session);
    let redirectUrl;
    const baseUrl = `${process.env.SHOPIFY_HOST}/versions`;
    const queryParams = generateQueryParams(shop, host);
    if (onlineSession) {
      const encodedEmail = encodeURIComponent(onlineSession.email);
      const encodedSessionId = encodeURIComponent(onlineSession.sessionId);
      redirectUrl = `${baseUrl}?ssid=${encodedEmail}&sml=${encodedSessionId}&${queryParams.toString()}`;
    } else {
      redirectUrl = `${baseUrl}/light?${queryParams.toString()}`;
    }
    const response = NextResponse.redirect(redirectUrl);
    const existingCookies = response.headers.get('Set-Cookie')?.split(', ') || [];
    const newCookieString = `shopify_verified=true; HttpOnly; Secure; SameSite=None; Max-Age=${48 * 60 * 60}; Path=/` + 
      (DOMAIN ? `; Domain=${DOMAIN}` : '');
    existingCookies.push(newCookieString);
    response.headers.set('Set-Cookie', existingCookies.join(', '));
    return response;
  } catch (e: any) {
    console.warn(e);
    switch (true) {
      case e instanceof InvalidOAuthError:
        return new NextResponse(e.message, { status: 403 });
      case e instanceof CookieNotFound:
      case e instanceof InvalidSession:
        return beginAuth(shop!, req, false);
      default:
        return new NextResponse("An error occurred", { status: 500 });
    }
  }
}