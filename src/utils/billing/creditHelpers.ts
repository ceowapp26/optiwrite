import { shopify } from '@/lib/shopify';
import { generateQueryParams } from '@/utils/auth/utilities';
import { ShopifySessionManager } from '@/utils/storage';
import { ONE_TIME_CREATE } from './schema';

interface OneTimePayment {
  name: string;
  price: number;
  currencyCode?: string;
  test?: boolean; 
}

export async function createOneTimePayment(
  client: any,
  payment: OneTimePayment,
  returnUrl: string,
) {
  try {
    const response = await client.request(ONE_TIME_CREATE, {
      variables: {
        name: payment.name,
        returnUrl,
        test: process.env.APP_ENV !== 'production',
        price: {
          amount: payment.price,
          currencyCode: payment.currencyCode || 'USD'
        },
      },
    });
    const { appPurchaseOneTimeCreate } = response.data;
    if (appPurchaseOneTimeCreate.userErrors.length > 0) {
      throw new Error(appPurchaseOneTimeCreate.userErrors[0].message);
    }
    return {
      id: appPurchaseOneTimeCreate.appPurchaseOneTime.id,
      confirmationUrl: appPurchaseOneTimeCreate.confirmationUrl,
      createdAt: appPurchaseOneTimeCreate.appPurchaseOneTime.createdAt
    };
  } catch (error) {
    console.error('Shopify one-time payment creation error:', error);
    throw new Error('Failed to create one-time payment in Shopify');
  }
}

export async function checkOneTimePaymentStatus(
  client: any,
  paymentId: string
) {
  const ONE_TIME_PAYMENT_STATUS = `
    query GetAppPurchaseOneTime($id: ID!) {
      node(id: $id) {
        ... on AppPurchaseOneTime {
          id
          status
          createdAt
        }
      }
    }
  `;
  try {
    const response = await client.request(ONE_TIME_PAYMENT_STATUS, {
      variables: {
        id: paymentId
      },
    });
    return response.data.node;
  } catch (error) {
    console.error('Error checking one-time payment status:', error);
    throw new Error('Failed to check payment status');
  }
}

export async function handleOneTimePaymentCallback(
  paymentId: string,
  shop: string,
  host: string
) {
  const generateReturnUrl = (status: string) => {
    const queryParams = generateQueryParams(shop, host);
    return `${process.env.SHOPIFY_API_URL}/admin/payments${status ? `?status=${status}&` : '?'}${queryParams.toString()}`;
  };
  try {
    if (!paymentId || !shop || !host) {
      throw new Error('Missing required parameters');
    }
    const sanitizedShop = shopify.utils.sanitizeShop(shop, true);
    const offlineSessionId = shopify.session.getOfflineId(sanitizedShop);
    const session = await ShopifySessionManager.getSessionFromStorage(offlineSessionId);
    
    if (!session) {
      throw new Error('No session found');
    }
    const paymentStatus = await checkOneTimePaymentStatus(session, paymentId);
    if (!paymentStatus) {
      throw new Error('No payment found');
    }
    if (paymentStatus.status !== 'COMPLETED') {
      return {
        redirectUrl: generateReturnUrl('error'),
        success: false
      };
    }
    return {
      redirectUrl: generateReturnUrl('success'),
      success: true
    };
  } catch (error) {
    console.error('Payment confirmation error:', error);
    return {
      redirectUrl: generateReturnUrl('error'),
      success: false
    };
  }
}

export function validateOneTimePayment(payment: OneTimePayment): boolean {
  if (!payment.name || typeof payment.name !== 'string') {
    throw new Error('Invalid payment name');
  }

  if (!payment.price || typeof payment.price !== 'number' || payment.price <= 0) {
    throw new Error('Invalid payment price');
  }

  if (payment.currencyCode && typeof payment.currencyCode !== 'string') {
    throw new Error('Invalid currency code');
  }

  return true;
}

export function getOneTimePaymentErrorStatus(errorMessage: string): number {
  if (errorMessage.includes('insufficient_funds')) return 402;
  if (errorMessage.includes('invalid_payment')) return 400;
  if (errorMessage.includes('not found')) return 404;
  return 500;
}