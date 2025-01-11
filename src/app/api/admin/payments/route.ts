import { NextRequest, NextResponse } from 'next/server';
import { PaymentManager } from '@/utils/billing';
import { shopify } from '@/lib/shopify';
import { withErrorHandler, NotFoundError, ValidationError } from '@/utils/api/customAPIErrorHandlers';

export function getShopAndHostFromReferer(referer: string | null) {
  if (!referer) return { shop: null, host: null };
  const url = new URL(referer);
  const shop = url.searchParams.get('shop');
  const host = url.searchParams.get('host');
  return { shop, host };
}

export const GET = withErrorHandler(async (req: NextRequest) => {
  const referer = req.headers.get('referer');
  const searchParams = req.nextUrl.searchParams;
  const { shop, host } = getShopAndHostFromReferer(referer);
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '10');
   if (!shop || !page || !pageSize) {
    return NextResponse.json({ error: 'Missing shop parameter' }, { status: 400 });
  }
  const sanitizedShop = shopify.utils.sanitizeShop(shop, true);
  if (!sanitizedShop) {
    return NextResponse.json({ error: 'Invalid shop parameter' }, { status: 400 });
  }
  const data = await PaymentManager.getPaymentHistory(shop, page, pageSize);
  return Response.json(data);
});

export const POST = withErrorHandler(async (
  req: NextRequest,
  { params }: { params: { paymentId: string } }
) => {
  const { paymentId } = params;
  const payment = await PaymentManager.refundPayment(paymentId);
  return Response.json(payment);
});

