import { NextRequest, NextResponse } from 'next/server';
import { CreditManager } from '@/utils/billing';
import { generateQueryParams } from '@/utils/auth/shopify';
import { PaymentStatus } from '@/types/billing';
import { shopify } from '@/lib/shopify';

export const maxDuration = 60; 

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pkgParam = decodeURIComponent(searchParams.get('pkg') || '');
    const email = decodeURIComponent(searchParams.get('em') || '');
    const shop = searchParams.get('shop');
    const host = searchParams.get('host');
    const transactionId = searchParams.get('charge_id');
    const status = searchParams.get('status') || PaymentStatus.SUCCEEDED;
    if (!shop || !host || !transactionId || !pkgParam) {
      throw new Error('Missing required parameters');
    }
    const sanitizedShop = shopify.utils.sanitizeShop(shop, true);
    if (!sanitizedShop) {
      return Response.json({ error: 'Invalid shop parameter' }, { status: 400 });
    }
    let packageId = pkgParam;
    const isPackageName = ['SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE', 'CUSTOM'].includes(pkgParam) || 
                        pkgParam.startsWith('CUSTOM_');
    if (isPackageName) {
      const creditPackage = await CreditManager.getPackageByName(pkgParam);
      if (!creditPackage) {
        throw new Error('Invalid package parameter');
      }
      packageId = creditPackage.id;
    }
    await CreditManager.purchaseCreditsWithPromotions(sanitizedShop, packageId, transactionId, email);
    const queryParams = generateQueryParams(shop, host);
    queryParams.set('status', status);
    return NextResponse.redirect(
      `${process.env.SHOPIFY_API_URL}/versions/light?${queryParams.toString()}`
    );
  } catch (error) {
    console.error('Callback error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}