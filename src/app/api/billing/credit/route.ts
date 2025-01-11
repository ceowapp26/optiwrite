import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { shopify } from '@/lib/shopify';
import { cookies } from 'next/headers';
import { generateQueryParams } from '@/utils/auth/shopify';
import { ShopifySessionManager } from '@/utils/storage';
import { CreditManager } from '@/utils/billing';
import { createOneTimePayment } from '@/utils/billing/creditHelpers';
import { Package, PaymentStatus } from '@prisma/client';
import { DateTime } from 'luxon';
import { BillingEvent } from '@/types/billing';

export const maxDuration = 60;

interface PaymentResponse {
  confirmationUrl: string;
  id?: string;
}

interface CreditPurchaseRequest {
  packageId?: string;
  shop: string;
  host: string;
  isCustom?: boolean;
  paymentData?: any;
}

function extractGidNumber(gid: string): string | null {
  try {
    const parts = gid.split('/');
    const id = parts[parts.length - 1];
    if (id && /^\d+$/.test(id)) {
      return id;
    }
    console.warn('Invalid GID format:', gid);
    return null;
  } catch (error) {
    console.error('Error extracting GID number:', error);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const requestData: CreditPurchaseRequest = await req.json();
    const shop = requestData?.shop;
    const host = requestData?.host;
    if (!shop || !host) {
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
    if (!session) {
      return Response.json({ error: 'Invalid session' }, { status: 401 });
    }
    const shopifyShop = await ShopifySessionManager.findShopByName(sanitizedShop);
    if (!shopifyShop) {
      return Response.json({ error: 'Shop not found' }, { status: 404 });
    }
    let creditPackage;
    if (requestData.isCustom && requestData.paymentData) {
      creditPackage = await CreditManager.createCustomCreditPackage(requestData.paymentData);
    } else if (requestData.packageId) {
      creditPackage = await CreditManager.getPackageById(requestData.packageId);
    } else {
      return Response.json({ error: 'Invalid package configuration' }, { status: 400 });
    }
    const client = new shopify.clients.Graphql({ session });
    const queryParams = generateQueryParams(sanitizedShop, host);
    const baseUrl = `${process.env.SHOPIFY_API_URL}/api/billing/credit/callback`;
    const queryString = queryParams.toString();
    let pkgParam = encodeURIComponent(creditPackage?.id);
    let emailParam = `&&em=${encodeURIComponent(requestData?.email)}`;
    let returnUrl = `${baseUrl}?pkg=${pkgParam}&${queryString}${emailParam}`;
    if (returnUrl.length > 255) {
      pkgParam = encodeURIComponent(creditPackage?.name);
      returnUrl = `${baseUrl}?pkg=${pkgParam}&${queryString}${emailParam}`;
      if (returnUrl.length > 255) {
        pkgParam = encodeURIComponent(creditPackage?.id);
        returnUrl = `${baseUrl}?pkg=${pkgParam}&${queryString}`;
        if (returnUrl.length > 255) {
          pkgParam = encodeURIComponent(creditPackage?.name);
          returnUrl = `${baseUrl}?pkg=${pkgParam}&${queryString}`;
        }
      }
    }
    const { finalPrice } = await CreditManager.calculateFinalPrice(creditPackage?.id, shopifyShop?.id);
    const packageDetails = {
      name: creditPackage.name,
      price: finalPrice,
      currencyCode: creditPackage.currency || 'USD'
    };
    const paymentResponse: PaymentResponse = await createOneTimePayment(client, packageDetails, returnUrl);
    if (!paymentResponse) {
      throw new Error('No payment response received from Shopify');
    }
    let shopifyChargeId = paymentResponse.id ? extractGidNumber(paymentResponse.id) : null;
    if (!shopifyChargeId) {
      console.error('Payment Response:', {
        id: paymentResponse.id,
        confirmationUrl: paymentResponse.confirmationUrl
      });
      throw new Error('Unable to obtain charge ID from payment response');
    }
    return Response.json({ 
      confirmationUrl: paymentResponse.confirmationUrl,
    });
  } catch (error) {
    console.error('Credit purchase error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    const statusCode = error.statusCode || 500;
    return Response.json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: statusCode });
  }
}

