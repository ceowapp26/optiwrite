import { NextRequest, NextResponse } from 'next/server';
import { shopify } from '@/lib/shopify';
import { generateQueryParams } from '@/utils/auth/shopify';
import { ShopifySessionManager, SessionNotFoundError } from '@/utils/storage';
import { beginAuth } from './shopify/auth';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const shop = searchParams.get('shop');
  const host = searchParams.get('host');
  if (!shop) {
    return NextResponse.json({ error: 'Missing shop parameter' }, { status: 400 });
  }
  const sanitizedShop = shopify.utils.sanitizeShop(shop as string);
  if (!sanitizedShop) {
    return NextResponse.json({ error: 'Invalid shop parameter' }, { status: 400 });
  }
  const offlineSessionId = shopify.session.getOfflineId(sanitizedShop);
  try {
    const offlineSession = await ShopifySessionManager.getSessionFromStorage(offlineSessionId);
    if (!offlineSession || !shopify.config.scopes.equals(offlineSession.scope)) {
      return beginAuth(sanitizedShop, req, false);
    }
  } catch (err) {
    if (err instanceof SessionNotFoundError) {
      return beginAuth(sanitizedShop, req, false);
    }
    return NextResponse.json({ error: 'An error occurred during authentication' }, { status: 500 });
  }
  return beginAuth(sanitizedShop, req, true);
}