import { NextRequest, NextResponse } from 'next/server';
import { PlanManager } from '@/utils/billing';
import { 
  validatePlanConsistency, 
  createShopifyPlanFromLocal, 
  revertShopifyPlanUpdate,
  validatePlanSync,
  getErrorStatus,
  findPlanFromShopify,
  deletePlanInShopify,
  createPlanInShopify,
} from '@/utils/billing/planHelpers';
import { shopify } from '@/lib/shopify';
import { generateQueryParams } from '@/utils/auth/shopify';
import { ShopifySessionManager } from '@/utils/storage';
import { SubscriptionPlan, Interval } from '@prisma/client';

export const dynamic = 'force-dynamic';

export function getShopAndHostFromReferer(referer: string | null) {
  if (!referer) return { shop: null, host: null };
  const url = new URL(referer);
  const shop = url.searchParams.get('shop');
  const host = url.searchParams.get('host');
  return { shop, host };
}

export async function GET(
  req: NextRequest,
  { params }: { params: { planId: string } }
) {
  try {
    const referer = req.headers.get('referer');
    const { shop, host } = getShopAndHostFromReferer(referer);
    if (!shop) {
      return NextResponse.json({ error: 'Missing shop parameter' }, { status: 400 });
    }
    const sanitizedShop = shopify.utils.sanitizeShop(shop, true);
    const offlineSessionId = shopify.session.getOfflineId(sanitizedShop);
    const session = await ShopifySessionManager.getSessionFromStorage(offlineSessionId);
    let localPlan = null;
    let shopifyPlan = null;
    try {
      localPlan = await PlanManager.getPlan(params.planId);
    } catch (dbError) {
      console.error('Database plan fetch error:', dbError);
    }
    try {
      shopifyPlan = await shopify.rest.RecurringApplicationCharge.find({
        session: session,
        id: params.planId,
      });
    } catch (shopifyError) {
      console.error('Shopify plan fetch error:', shopifyError);
    }
    if (!localPlan && !shopifyPlan) {
      return NextResponse.json(
        { error: 'Plan not found in both database and Shopify' },
        { status: 404 }
      );
    }
    if (localPlan && shopifyPlan) {
      const syncResult = validatePlanSync(localPlan, shopifyPlan);
      if (!syncResult.isInSync) {
        try {
          const syncedPlan = await PlanManager.syncPlanWithShopify(localPlan.id, shopifyPlan);
          return NextResponse.json({
            plan: syncedPlan,
            status: 'synchronized',
            shopifyPlan: shopifyPlan
          });
        } catch (syncError) {
          console.error('Plan sync error:', syncError);
          return NextResponse.json({
            plan: localPlan,
            warning: 'Plan synchronization failed',
            shopifyPlan: shopifyPlan
          });
        }
      }
      return NextResponse.json({
        ...validationResult.validatedPlan,
        status: 'active',
      });
    }
    if (!localPlan) {
      try {
        const syncedPlan = await PlanManager.createPlanFromShopify(shopifyPlan);
        return NextResponse.json({
          plan: syncedPlan,
          status: 'synchronized_from_shopify'
        });
      } catch (syncError) {
        console.error('Plan sync error:', syncError);
        return NextResponse.json({
          plan: shopifyPlan,
          warning: 'Plan only exists in Shopify and sync failed',
          status: 'shopify_only'
        });
      }
    }
    try {
      const createdShopifyPlan = await createShopifyPlanFromLocal(localPlan, session, shop, host);
      return NextResponse.json({
        plan: localPlan,
        status: 'synchronized_to_shopify',
        shopifyPlan: createdShopifyPlan
      });
    } catch (syncError) {
      console.error('Shopify sync error:', syncError);
      return NextResponse.json({
        plan: localPlan,
        warning: 'Plan only exists in local database and Shopify sync failed',
        status: 'local_only'
      });
    }
  } catch (error) {
    console.error('Plan fetch error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { planId: string } }
) {
  try {
    const referer = req.headers.get('referer');
    const { shop, host } = getShopAndHostFromReferer(referer);
    
    if (!shop) {
      return NextResponse.json({ error: 'Missing shop parameter' }, { status: 400 });
    }

    const { planId, shopifyId, planData: data } = await req.json();
    
    if (!planId || !shopifyId || !data) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const sanitizedShop = shopify.utils.sanitizeShop(shop, true);
    if (!sanitizedShop) {
      return NextResponse.json({ error: 'Invalid shop parameter' }, { status: 400 });
    }

    const offlineSessionId = shopify.session.getOfflineId(sanitizedShop);
    const session = await ShopifySessionManager.getSessionFromStorage(offlineSessionId);
    
    if (!session) {
      return NextResponse.json({ error: 'No active session found' }, { status: 401 });
    }
    try {
      const existingCharge = await findPlanFromShopify(session, parseInt(shopifyId));
      if (existingCharge) {
        await deletePlanInShopify(session, parseInt(existingCharge.id));
        const { confirmationUrl } = await createPlanInShopify(
          session, 
          data, 
          shop, 
          host
        );
        return NextResponse.json({ confirmationUrl });
      } else {
        return NextResponse.json({ error: 'Plan not found in Shopify' }, { status: 404 });
      }
    } catch (shopifyError) {
      console.error('Shopify plan update error:', shopifyError);
      return NextResponse.json(
        { error: 'Failed to update plan in Shopify' }, 
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Plan update error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update plan';
    
    if (errorMessage.includes('FREE plan')) {
      return NextResponse.json({ error: errorMessage }, { status: 403 });
    }
    return NextResponse.json(
      { error: errorMessage },
      { status: errorMessage.includes('not found') ? 404 : 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { planId: string } }
) {
  let shopifyDeleted = false;
  let localDeleted = false;

  try {
    const url = new URL(req.url);
    const shopifyId = url.searchParams.get('shopifyId');
    const referer = req.headers.get('referer');
    const { shop, host } = getShopAndHostFromReferer(referer);
    if (!shop) {
      return NextResponse.json({ error: 'Missing shop parameter' }, { status: 400 });
    }
    const sanitizedShop = shopify.utils.sanitizeShop(shop, true);
    if (!sanitizedShop) {
      return NextResponse.json({ error: 'Invalid shop parameter' }, { status: 400 });
    }
    const offlineSessionId = shopify.session.getOfflineId(sanitizedShop);
    const session = await ShopifySessionManager.getSessionFromStorage(offlineSessionId);
    if (!session) {
      return NextResponse.json({ error: 'No active session found' }, { status: 401 });
    }
    if (shopifyId) {
      try {
        const existingCharge = await findPlanFromShopify(session, parseInt(shopifyId));
        if (existingCharge) {
          await deletePlanInShopify(session, parseInt(shopifyId));
          shopifyDeleted = true;
        }
      } catch (shopifyError) {
        console.error('Shopify deletion error:', shopifyError);
        throw new Error('Failed to delete plan from Shopify');
      }
    }
    try {
      await PlanManager.deletePlan(params.planId);
      localDeleted = true;
    } catch (dbError) {
      console.error('Database deletion error:', dbError);
      if (shopifyDeleted) {
        try {
          await restoreShopifyPlan(session, existingCharge);
        } catch (restoreError) {
          console.error('Shopify restore error:', restoreError);
        }
      }
      throw dbError;
    }
    return NextResponse.json(
      { message: 'Plan deleted successfully', shopifyDeleted, localDeleted },
      { status: 200 }
    );
  } catch (error) {
    console.error('Plan deletion error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete plan';
    return NextResponse.json({ 
      error: errorMessage,
      shopifyDeleted,
      localDeleted
    }, { 
      status: getErrorStatus(errorMessage)
    });
  }
}




