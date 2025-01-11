import { NextRequest, NextResponse } from 'next/server';
import { handlePlanActivationCallback } from '@/utils/billing/planHelpers';
import { generateQueryParams } from '@/utils/auth/utilities';
import { shopify } from '@/lib/shopify';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const chargeId = searchParams.get('charge_id');
  const shop = searchParams.get('shop');
  const host = searchParams.get('host');
  const generateReturnUrl = (status: string) => {
    const queryParams = generateQueryParams(shop, host);
    return `${process.env.SHOPIFY_API_URL}/admin/plans${status ? `?status=${status}&` : '?'}${queryParams.toString()}`;
  };
  if (!chargeId || !shop) {
    return NextResponse.json({ error: 'Missing charge_id or shop' }, { status: 400 });
  }
  try {
    const { redirectUrl } = await handlePlanActivationCallback(
      chargeId, 
      shop, 
      host,
    );
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    return NextResponse.redirect(generateReturnUrl("error"));
  }
}