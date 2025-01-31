import { NextRequest, NextResponse } from 'next/server';
import { shopify } from '@/lib/shopify';
import { ShopifySessionManager, SessionNotFoundError } from '@/utils/storage';
import { beginAuth } from '../auth';
import { verifyToken, exchangeToken, generateQueryParams, ExpiredTokenError } from '@/utils/auth/shopify';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
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
  try {
    const sessions = await ShopifySessionManager.findSessionsByShop(sanitizedShop);
    const onlineSession = sessions.find((session) => session.isOnline === true);
    if (!onlineSession) {
      return beginAuth(sanitizedShop, req, true);
    }
    return onlineSession;
  } catch (err) {
    if (err instanceof SessionNotFoundError) {
      return beginAuth(sanitizedShop, req, true);
    }
    return NextResponse.json(
      { error: 'An error occurred during authentication' }, 
      { status: 500 }
    );
  }
}
