import { NextRequest, NextResponse } from 'next/server';
import { SubscriptionManager } from '@/utils/billing';
import { generateQueryParams } from '@/utils/auth/shopify';
import { PaymentStatus } from '@/types/billing';
import { shopify } from '@/lib/shopify';
import { BillingEvent } from '@/types/billing';

export const maxDuration = 60; 
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const event = decodeURIComponent(searchParams.get('ev') || '');
    const plan = decodeURIComponent(searchParams.get('pn') || '');
    const email = decodeURIComponent(searchParams.get('em') || '');
    const shop = searchParams.get('shop');
    const host = searchParams.get('host');
    const transactionId = searchParams.get('charge_id');
    const status = searchParams.get('status') || PaymentStatus.SUCCEEDED;
    if (!shop || !host || !transactionId || !event) {
      throw new Error('Missing required parameters');
    }
    const sanitizedShop = shopify.utils.sanitizeShop(shop, true);
    if (!sanitizedShop) {
      return Response.json({ error: 'Invalid shop parameter' }, { status: 400 });
    }
    switch (event) {
      case BillingEvent.SUBSCRIBE:
        await SubscriptionManager.subscribeWithPromotionStrategy(sanitizedShop, plan, transactionId, email);
        break;
      case BillingEvent.UPDATE:
        await SubscriptionManager.update(sanitizedShop, plan, transactionId, email);
        break;
      case BillingEvent.RENEW:
        await SubscriptionManager.renew(sanitizedShop, transactionId, email);
        break;
      default:
        return Response.json({ error: 'Invalid event type' }, { status: 400 });
    }
    const queryParams = generateQueryParams(shop, host);
    queryParams.set('status', encodeURIComponent(status));
    return NextResponse.redirect(
      `${process.env.SHOPIFY_API_URL}/versions/light?${queryParams.toString()}`
    );
  } catch (error) {
    console.error('Callback error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}