import { NextRequest } from 'next/server';
import { shopify } from '@/lib/shopify';
import { ShopifySessionManager } from '@/utils/storage';
import { SubscriptionManager } from '@/utils/billing';
import { BillingEvent } from '@/types/billing';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const shop = searchParams.get('shop');
    const planName = searchParams.get('planName');
    const email = searchParams.get('email');
    const canceled = searchParams.get('canceled') === 'true';
    if (!shop || !planName) {
      return Response.json({ 
        error: 'Missing required parameters' 
      }, { status: 400 });
    }
    const sanitizedShop = shopify.utils.sanitizeShop(shop, true);
    if (!sanitizedShop) {
      return Response.json({ 
        error: 'Invalid shop parameter' 
      }, { status: 400 });
    }
    const sessionId = await shopify.session.getCurrentId({
      isOnline: true,
      rawRequest: req,
    });
    const session = await ShopifySessionManager.getSessionFromStorage(sessionId);
    if (!session) {
      return Response.json({ 
        error: 'Invalid session' 
      }, { status: 401 });
    }
    const event = await SubscriptionManager.checkSubscriptionStatus(
      planName,
      shop,
      canceled,
      email
    );
    return Response.json({ 
      status: event,
      requiresAction: event !== BillingEvent.RENEW && event !== BillingEvent.CANCEL
    });
  } catch (error) {
    console.error('Subscription status check error:', error);
    return Response.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 });
  }
}