import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { shopify } from '@/lib/shopify';
import { generateQueryParams } from '@/utils/auth/shopify';
import { ShopifySessionManager } from '@/utils/storage';
import { PlanManager, SubscriptionManager } from '@/utils/billing';
import { handleCreate, handleRenew, handleUpdate, handleCancel, calculateDiscountValue } from '@/utils/billing/subscriptionHelpers';
import { PaymentStatus, SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import { DateTime } from 'luxon';
import { BillingEvent } from '@/types/billing';

export const maxDuration = 60;

const terminatedStatuses = {
  [SubscriptionStatus.CANCELLED]: SubscriptionStatus.CANCELLED,
  [SubscriptionStatus.DECLINED]: SubscriptionStatus.DECLINED,
  [SubscriptionStatus.EXPIRED]: SubscriptionStatus.CANCELLED,
} ;

export async function POST(req: NextRequest) {
  try {
    const { event, planName, cancelReason, prorate = false, status: subscriptionStatus, subscriptionId = undefined, email, shop, host } = await req.json();
    if (!event || !shop || !host) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }
    const sanitizedShop = shopify.utils.sanitizeShop(shop, true);
    if (!sanitizedShop) {
      return Response.json({ error: 'Invalid shop parameter' }, { status: 400 });
    }
    const onlineSessionId = await shopify.session.getCurrentId({
      isOnline: true,
      rawRequest: req,
    });
    const session = await ShopifySessionManager.getSessionFromStorage(onlineSessionId);
    const shopifyShop = await ShopifySessionManager.findShopByName(shop);
    if (!shopifyShop) {
      return Response.json({ error: 'Shop not found' }, { status: 404 });
    }
    const plan = await PlanManager.getPlanByName(planName);
    if (!plan) {
      return Response.json({ error: 'Invalid plan' }, { status: 400 });
    }
    const { finalPrice, durationLimitInIntervals, appliedPlanDiscount } = await SubscriptionManager.calculateDiscountMetrics(plan, shopifyShop.id);
    let finalPlan = { ...plan };
    if (appliedPlanDiscount) {
      const discountValue = calculateDiscountValue({
        appliedPlanDiscount: appliedPlanDiscount?.discount,
        referenceAmount: plan.totalPrice
      });
      const planDiscount = {
        discount: {
          durationLimitInIntervals,
          value: {
            amount: discountValue.amount,
            percentage: discountValue.percentage,
          },
        },
      };
      finalPlan = { ...finalPlan, ...planDiscount };
    }
    const client = new shopify.clients.Graphql({ session });
    const queryParams = generateQueryParams(shop, host);
    const baseParams = `ev=${encodeURIComponent(event)}&pn=${encodeURIComponent(planName)}`;
    const emailParams = `&&em=${encodeURIComponent(email)}`;
    const baseUrl = `${process.env.SHOPIFY_API_URL}/api/billing/callback`;
    const queryString = queryParams.toString();
    let returnUrl = `${baseUrl}?${baseParams}&${queryString}`;
    if ((returnUrl + emailParams).length <= 255) {
        returnUrl += emailParams;
    }
    let response;
    let confirmationUrl;
    switch (event) {
      case BillingEvent.SUBSCRIBE:
        response = await handleCreate(client, finalPlan, returnUrl);
        if (response?.confirmationUrl && response?.subscriptionId) {
          confirmationUrl = response.confirmationUrl;
        } else {
          throw new Error('Failed to create subscription with Shopify');
        }
        break;
      case BillingEvent.UPDATE:
        response = await handleUpdate(client, finalPlan, returnUrl);
        if (response?.confirmationUrl) {
          confirmationUrl = response.confirmationUrl;
        } else {
          throw new Error('Failed to update subscription with Shopify');
        }
        break;
      case BillingEvent.CANCEL:
        if (!subscriptionId) {
          throw new Error('Missing subscription ID');
          return null;
        }
        if (Object.keys(terminatedStatuses).includes(subscriptionStatus)) {
          throw new Error('This subscription is already canceled.');
          return null;
        }  
        response = await handleCancel(client, subscriptionId, prorate);
        if (response?.subscriptionId) {
          await SubscriptionManager.updateSubscriptionStatus(
            response?.subscriptionId, 
            sanitizedShop, 
            cancelReason, 
            email, 
            prorate, 
            true,
            SubscriptionStatus.CANCELLED, 
            response?.createdAt, 
            response?.updatedAt,
            response?.price
          );
          confirmationUrl = `${process.env.SHOPIFY_API_URL}/billing?${queryParams.toString()}`;
        } else {
          throw new Error('Failed to cancel subscription with Shopify');
        }
        break;
      case BillingEvent.RENEW:
        response = await handleRenew(client, finalPlan, returnUrl);
        if (response?.confirmationUrl) {
          confirmationUrl = response.confirmationUrl;
        } else {
          throw new Error('Failed to renew subscription with Shopify');
        }
        break;
      default:
        return Response.json({ error: 'Invalid event type' }, { status: 400 });
    }
    if (!confirmationUrl) {
      throw new Error('Failed to process subscription request');
    }
    return Response.json({ confirmationUrl });
  } catch (error) {
    console.error('Subscription error:', error);
    return Response.json({ 
      error: error.message || 'An error occurred while processing the subscription'
    }, { status: 500 });
  }
}