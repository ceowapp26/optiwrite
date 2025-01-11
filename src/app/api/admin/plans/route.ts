import { NextRequest, NextResponse } from 'next/server';
import { shopify } from '@/lib/shopify';
import { generateQueryParams } from '@/utils/auth/shopify';
import { getErrorStatus, createPlanInShopify } from '@/utils/billing/planHelpers';
import { PlanManager } from '@/utils/billing';
import { ShopifySessionManager } from '@/utils/storage'; 

export function getShopAndHostFromReferer(referer: string | null) {
  if (!referer) return { shop: null, host: null };
  const url = new URL(referer);
  const shop = url.searchParams.get('shop');
  const host = url.searchParams.get('host');
  return { shop, host };
}

export async function GET(req: NextRequest) {
  const referer = req.headers.get('referer');
  const { shop, host } = getShopAndHostFromReferer(referer);
  if (!shop) {
    return NextResponse.json({ error: 'Missing shop parameter' }, { status: 400 });
  }
  const sanitizedShop = shopify.utils.sanitizeShop(shop, true);
  if (!sanitizedShop) {
    return NextResponse.json({ error: 'Invalid shop parameter' }, { status: 400 });
  }
  try {
    const offlineSessionId = shopify.session.getOfflineId(sanitizedShop);
    const offlineSession = await ShopifySessionManager.getSessionFromStorage(offlineSessionId);
    if (!offlineSession) {
      return NextResponse.json({ error: 'No offline session found' }, { status: 401 });
    }
    let localPlans: any[] = [];
    try {
      localPlans = await PlanManager.getAllPlans();
      localPlans = localPlans.filter(plan => plan.isActive === true);
    } catch (dbError) {
      console.error('Database fetch error:', dbError);
      return NextResponse.json({ error: 'Failed to fetch local plans' }, { status: 500 });
    }
    let shopifyPlans: any[] = [];
    try {
      const shopifyResponse = await shopify.rest.RecurringApplicationCharge.all({
        session: offlineSession,
      });
      shopifyPlans = (shopifyResponse.data || []);
    } catch (shopifyError) {
      console.error('Shopify API Error:', shopifyError);
      return NextResponse.json({ error: 'Failed to fetch Shopify plans' }, { status: 500 });
    }
    const matchedPlans = localPlans.filter(localPlan => 
      shopifyPlans.some(shopifyPlan => 
        String(shopifyPlan.id) === localPlan.shopifyId
      )
    );
    return NextResponse.json({
      plans: matchedPlans
    });
  } catch (error) {
    console.error("Plan fetch error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const referer = req.headers.get('referer');
  const { shop, host } = getShopAndHostFromReferer(referer);
  if (!shop) {
    return NextResponse.json({ error: 'Missing shop parameter' }, { status: 400 });
  }
  try {
    const planData = await req.json();
    const sanitizedShop = shopify.utils.sanitizeShop(shop, true);
    if (!sanitizedShop) {
      return NextResponse.json({ error: 'Invalid shop parameter' }, { status: 400 });
    }
    const offlineSessionId = shopify.session.getOfflineId(sanitizedShop);
    const session = await ShopifySessionManager.getSessionFromStorage(offlineSessionId);
    if (!session) {
      return NextResponse.json({ error: 'No active session found' }, { status: 401 });
    }
    const { confirmationUrl } = await createPlanInShopify(
      session, 
      planData, 
      shop, 
      host
    );
    return Response.json({ confirmationUrl });
  } catch (error) {
    console.error('Plan creation error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}