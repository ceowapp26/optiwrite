import { generateQueryParams } from '@/utils/auth/utilities';
import { shopify } from '@/lib/shopify';
import { PLAN } from '@/types/plan';
import { Plan, Feature, SubscriptionPlan, Interval } from '@prisma/client';
import { PlanManager } from './planManager';
import { ShopifySessionManager } from '@/utils/storage'; 

export async function createShopifyPlanFromLocal(localPlan: PLAN, session: any, shop: string, host: string) {
  const queryParams = generateQueryParams(shop, host);
  const returnUrl = `${process.env.SHOPIFY_API_URL}/admin/plans?shop=${shop}/?${queryParams.toString()}`;
  const recurring_application_charge = new shopify.rest.RecurringApplicationCharge({session: session});
  recurring_application_charge.name = localPlan.name;
  recurring_application_charge.price = localPlan.price.toString();
  recurring_application_charge.return_url = returnUrl;
  recurring_application_charge.trial_days = localPlan.trialDays;
  return await recurring_application_charge.save({
    update: true,
  });
}

export async function revertShopifyPlanUpdate(session: any, shopifyId: string, originalPlan: PLAN) {
  if (!originalPlan) return;
  const recurring_application_charge = new shopify.rest.RecurringApplicationCharge({session: session});
  recurring_application_charge.name = originalPlan.name;
  recurring_application_charge.price = originalPlan.price;
  recurring_application_charge.return_url = originalPlan.return_url;
  recurring_application_charge.trial_days = originalPlan.trial_days;
  await recurring_application_charge.save({
    update: true,
  });
}

export async function deletePlanInShopify(session: any, planId: number) {
  return await shopify.rest.RecurringApplicationCharge.delete({
    session: session,
    id: planId,
  });
}

export async function findPlanFromShopify(session: any, planId: number) {
  return await shopify.rest.RecurringApplicationCharge.find({
    session: session,
    id: planId,
  });
}

export async function restoreShopifyPlan(session: any, originalPlan: PLAN) {
  if (!originalPlan) return;
  const recurring_application_charge = new shopify.rest.RecurringApplicationCharge({session: session});
  Object.assign(recurring_application_charge, {
    name: originalPlan.name,
    price: originalPlan.price,
    return_url: originalPlan.return_url,
    trial_days: originalPlan.trial_days
  });
  return await recurring_application_charge.save({
    update: true,
  });
}

export async function createPlanInShopify(
  session: shopify.Session,
  plan: PLAN,
  shop: string,
  host: string
) {
  const queryParams = generateQueryParams(shop, host);
  const returnUrl = `${process.env.SHOPIFY_API_URL}/api/admin/plans/callback?shop=${shop}&${queryParams.toString()}`;
  
  try {
    const recurring_application_charge = new shopify.rest.RecurringApplicationCharge({session});
    recurring_application_charge.name = plan.name;
    recurring_application_charge.price = plan.price;
    recurring_application_charge.return_url = returnUrl;
    recurring_application_charge.trial_days = plan.trialDays;
    recurring_application_charge.test = true;
    
    await recurring_application_charge.save({
      update: true,
    });

    const planData = {
      ...plan,
      shopifyId: String(recurring_application_charge.id)
    };

    const existingPlan = await PlanManager.getPlanByName(plan.name);
    let resultPlan;

    if (existingPlan) {
      resultPlan = await PlanManager.updatePlan(existingPlan.id, planData);
    } else {
      resultPlan = await PlanManager.createPlan(planData);
    }

    return {
      plan: resultPlan,
      confirmationUrl: recurring_application_charge.confirmation_url
    };
  } catch (error) {
    console.error('Shopify plan creation error:', error);
    throw new Error('Failed to create plan in Shopify');
  }
}

export async function handlePlanActivationCallback(
  chargeId: string,
  shop: string,
  host: string
) {
  const generateReturnUrl = (status: string) => {
    const queryParams = generateQueryParams(shop, host);
    return `${process.env.SHOPIFY_API_URL}/admin/plans${status ? `?status=${status}&` : '?'}${queryParams.toString()}`;
  };

  try {
    if (!chargeId || !shop || !host) {
      throw new Error('Missing required parameters');
    }

    const sanitizedShop = shopify.utils.sanitizeShop(shop, true);
    const offlineSessionId = shopify.session.getOfflineId(sanitizedShop);
    const session = await ShopifySessionManager.getSessionFromStorage(offlineSessionId);
    if (!session) {
      throw new Error('No session found');
    }

    const charge = await shopify.rest.RecurringApplicationCharge.find({
      session,
      id: chargeId
    });

    if (!charge) {
      throw new Error('No charge found');
    }

    const planName = charge.name;
    const existingPlan = await PlanManager.getPlanByName(planName);

    if (charge.status !== 'active') {
      if (existingPlan) {
        await PlanManager.deletePlan(existingPlan.id);
      }
      return {
        redirectUrl: generateReturnUrl('error'),
        success: false
      };
    }

    if (!existingPlan) {
      console.error('No corresponding plan found for charge');
      return {
        redirectUrl: generateReturnUrl('error'),
        success: false
      };
    }

    await PlanManager.updatePlan(existingPlan.id, {
      isActive: true,
      shopifyId: String(chargeId),
    });

    return {
      redirectUrl: generateReturnUrl(''),
      success: true
    };
  } catch (error) {
    console.error('Charge confirmation error:', error);
    return {
      redirectUrl: generateReturnUrl('error'),
      success: false
    };
  }
}

export function validatePlanSync(localPlan: any, shopifyPlan: any) {
  const isInSync = 
    localPlan.shopifyId === shopifyPlan.id &&
    localPlan.name === shopifyPlan.name &&
    localPlan.price === parseFloat(shopifyPlan.price) &&
    localPlan.trialDays === shopifyPlan.trial_days;
  return {
    isInSync,
    localPlan,
    shopifyPlan
  };
}

export function getErrorStatus(errorMessage: string): number {
  if (errorMessage.includes('FREE plan')) return 403;
  if (errorMessage.includes('active subscriptions')) return 400;
  if (errorMessage.includes('not found')) return 404;
  return 500;
}
