import { SUBSCRIPTION_CREATE, SUBSCRIPTION_CANCEL, SUBSCRIPTION_LINE_ITEM_UPDATE, SUBSCRIPTION_TRIAL_EXTEND } from './schema';
import { BillingEvent } from '@/types/billing';
import { DiscountUnit } from '@prisma/client';

interface PlanInput {
  name: string;
  price: number;
  interval: string;
  cappedAmount?: number;
  terms?: string;
  trialDays?: number;
  discount?: {
    value: {
      amount?: number;
      percentage?: number;
    };
  };
}

export async function handleCreate(
  client: any, 
  plan: PlanInput, 
  returnUrl: string,
) {
  try {
    if (!client) {
      throw new Error('Client is required');
    }
    if (!plan?.name || !plan?.price || !plan?.interval) {
      throw new Error('Plan name, price, and interval are required');
    }
    if (!returnUrl) {
      throw new Error('Return URL is required');
    }
     if (plan.price <= 0) {
      throw new Error('Price must be greater than 0');
    }
    const trialDays = plan.trialDays ? parseInt(String(plan.trialDays)) : undefined;
    if (trialDays && (isNaN(trialDays) || trialDays < 0)) {
      throw new Error('Trial days must be a positive number');
    }
    if (plan.cappedAmount && plan.cappedAmount <= 0) {
      throw new Error('Capped amount must be greater than 0');
    }
    const lineItemInput = {
      plan: {
        appRecurringPricingDetails: {
          price: { 
            amount: parseFloat(plan.price), 
            currencyCode: 'USD' 
          },
          interval: plan.interval.toUpperCase()
        }
      }
    };
    if (plan.cappedAmount || plan.terms) {
      lineItemInput.plan.appUsagePricingDetails = {
        ...(plan.cappedAmount && { 
          cappedAmount: { 
            amount: plan.cappedAmount, 
            currencyCode: 'USD' 
          }
        }),
        ...(plan.terms && { terms: plan.terms })
      };
    }

    if (plan.discount?.value) {
      const discountValue = {
        ...(plan.discount.value.amount && { amount: parseFloat(plan.discount.value.amount) }),
      };

      if (Object.keys(discountValue).length > 0) {
        lineItemInput.plan.appRecurringPricingDetails.discount = {
          durationLimitInIntervals: parseInt(plan?.discount?.durationLimitInIntervals ?? 0),
          value: discountValue
        };
      }
    }  
    const response = await client.request(SUBSCRIPTION_CREATE, {
      variables: {
        name: plan.name.trim(),
        returnUrl,
        test: process.env.APP_ENV !== 'production',
        lineItems: [lineItemInput],
        ...(trialDays && { trialDays }),
        replacementBehavior: 'STANDARD'
      }
    });
    if (response.data.appSubscriptionCreate.userErrors?.length > 0) {
      throw new Error(response.data.appSubscriptionCreate.userErrors[0].message);
    }
    if (!response?.data?.appSubscriptionCreate) {
      throw new Error('Invalid response from subscription creation');
    }
    return {
      success: true,
      confirmationUrl: response.data.appSubscriptionCreate.confirmationUrl,
      subscriptionId: response.data.appSubscriptionCreate.appSubscription.id
    };
   } catch (error) {
    console.error('Subscription creation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

interface ShopifyClient {
  query: (params: { data: any }) => Promise<any>;
}

interface CappedAmount {
  amount: number;
  currencyCode: string;
}

interface SubscriptionResponse {
  subscriptionId: string;
  message?: string;
}

const validateSubscriptionId = (id: string): void => {
  if (!id || typeof id !== 'string') {
    throw new Error('Invalid subscription ID');
  }
  if (!id.match(/^\d+$/)) {
    throw new Error('Subscription ID must contain only numbers');
  }
};

const validateCappedAmount = (cappedAmount: CappedAmount): void => {
  if (!cappedAmount || typeof cappedAmount !== 'object') {
    throw new Error('Invalid capped amount object');
  }
  if (typeof cappedAmount.amount !== 'number' || cappedAmount.amount <= 0) {
    throw new Error('Capped amount must be a positive number');
  }
  if (!cappedAmount.currencyCode || typeof cappedAmount.currencyCode !== 'string') {
    throw new Error('Invalid currency code');
  }
};

const handleShopifyResponse = (response: any, operation: string): any => {
  if (!response?.data) {
    throw new Error(`Invalid response from Shopify for ${operation}`);
  }
  const operationData = response.data[operation];
  const errors = operationData?.userErrors;
  if (errors?.length > 0) {
    throw new Error(errors[0].message || `Unknown error occurred during ${operation}`);
  }
  return operationData;
};

const getSubscriptionGid = (subscriptionId: string): string => {
  return `gid://shopify/AppSubscription/${subscriptionId}`;
};

/**
 * Cancels a Shopify app subscription
 * @param client - Shopify client instance
 * @param subscriptionId - ID of the subscription to cancel
 * @returns Promise resolving to subscription response
 * @throws Error if validation fails or API request fails
 */
export async function handleCancel(
  client: ShopifyClient,
  subscriptionId: string,
  prorate: boolean = false
): Promise<SubscriptionResponse> {
  try {
    validateSubscriptionId(subscriptionId);
    await new Promise(resolve => setTimeout(resolve, 100));
    const response = await client.request(SUBSCRIPTION_CANCEL, {
      variables: {
        id: getSubscriptionGid(subscriptionId),
        prorate
      },
    });
    const data = handleShopifyResponse(response, 'appSubscriptionCancel');
    return {
      subscriptionId,
      message: 'Subscription cancelled successfully',
      createdAt: data.appSubscription.createdAt,
      updatedAt: data.appSubscription.currentPeriodEnd,
      name: data.appSubscription.name,
      price: data.appSubscription.lineItems[0]?.plan?.pricingDetails?.price?.amount 
    };
  } catch (error) {
    console.log('Shopify response:', error.response?.data);
    throw new Error(`Failed to cancel subscription: ${error.message}`);
  }
}

// Updated type definition to include the new fields
interface SubscriptionResponse {
  subscriptionId: string;
  message: string;
  createdAt: string;
  updatedAt: string;
}
/**
 * Updates a subscription line item's capped amount
 * @param client - Shopify client instance
 * @param subscriptionId - ID of the subscription to update
 * @param cappedAmount - New capped amount details
 * @returns Promise resolving to subscription response
 * @throws Error if validation fails or API request fails
 */
export async function handleUpdateLineItem(
  client: ShopifyClient,
  subscriptionId: string,
  cappedAmount: CappedAmount
): Promise<SubscriptionResponse> {
  try {
    validateSubscriptionId(subscriptionId);
    validateCappedAmount(cappedAmount);
    await new Promise(resolve => setTimeout(resolve, 100));
    const response = await client.request(SUBSCRIPTION_LINE_ITEM_UPDATE, {
      variables: {
        id: getSubscriptionGid(subscriptionId),
        cappedAmount
      },
    });
    handleShopifyResponse(response, 'appSubscriptionLineItemUpdate');
    return {
      subscriptionId,
      message: 'Subscription line item updated successfully'
    };
  } catch (error) {
    throw new Error(`Failed to update subscription line item: ${error.message}`);
  }
}

/**
 * Extends the trial period of a subscription
 * @param client - Shopify client instance
 * @param subscriptionId - ID of the subscription to extend
 * @param days - Number of days to extend the trial
 * @returns Promise resolving to subscription response
 * @throws Error if validation fails or API request fails
 */
export async function handleExtendTrial(
  client: ShopifyClient,
  subscriptionId: string,
  days: number
): Promise<SubscriptionResponse> {
  try {
    validateSubscriptionId(subscriptionId);
    if (!Number.isInteger(days)) {
      throw new Error('Trial extension days must be an integer');
    }
    if (days <= 0 || days > 1000) {
      throw new Error('Trial extension days must be between 1 and 1000');
    }
    await new Promise(resolve => setTimeout(resolve, 100));

    const response = await client.request(SUBSCRIPTION_TRIAL_EXTEND, {
      variables: {
        id: getSubscriptionGid(subscriptionId),
        days
      },
    });
    handleShopifyResponse(response, 'appSubscriptionTrialExtend');
    return {
      subscriptionId,
      message: `Trial period extended by ${days} days`
    };
  } catch (error) {
    throw new Error(`Failed to extend trial: ${error.message}`);
  }
}

export async function handleRenew(
  client: any,
  plan: PlanInput,
  returnUrl: string,
) {
  try {
    return await handleCreate(client, plan, returnUrl);
  } catch (error) {
    throw new Error(`Failed to renew subscription: ${error.message}`);
  }
}

export async function handleUpdate(
  client: any,
  plan: PlanInput,
  returnUrl: string,
) {
  try {
    return await handleCreate(client, plan, returnUrl);
  } catch (error) {
    throw new Error(`Failed to update subscription: ${error.message}`);
  }
}

export function calculateDiscountValue({
  appliedPlanDiscount,
  referenceAmount,
}: DiscountCalculationInput): { amount: number; percentage: number } {
  const { value, unit } = appliedPlanDiscount;
  if (unit === DiscountUnit.PERCENTAGE) {
    const amount = (value / 100) * referenceAmount;
    return {
      amount,
      percentage: value,
    };
  } else if (unit === DiscountUnit.AMOUNT) {
    const percentage = (value / referenceAmount) * 100;
    return {
      amount: value,
      percentage,
    };
  } else {
    throw new Error("Invalid discount unit. Only PERCENTAGE and FIXED_AMOUNT are supported.");
  }
}

export function getOperationName(event: BillingEvent): string {
  const operations = {
    [BillingEvent.SUBSCRIBE]: 'appSubscriptionCreate',
    [BillingEvent.UPDATE]: 'appSubscriptionCreate',
    [BillingEvent.CANCEL]: 'appSubscriptionCancel',
    [BillingEvent.RENEW]: 'appSubscriptionCreate'  
  };
  return operations[event];
}

export interface SubscriptionResponse {
  confirmationUrl?: string;
  subscriptionId: string;
}
