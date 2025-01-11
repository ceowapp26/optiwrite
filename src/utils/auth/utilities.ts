import { NextRequest, NextResponse } from "next/server";

export function redirectToLogin(request: NextRequest, response: NextResponse) {
  const isRedirecting = request.headers.get('x-redirecting');
  if (isRedirecting) {
    return response;
  }
  const searchParams = new URLSearchParams(request.nextUrl.search);
  const shop = searchParams.get('shop');
  const host = searchParams.get('host');
  const queryParams = generateQueryParams(shop, host);
  const redirectResponse = NextResponse.redirect(
    new URL(`/login?${queryParams.toString()}`, request.url)
  );
  redirectResponse.headers.set('x-redirecting', 'true');
  return redirectResponse;
}

export const generateQueryParams = (shop: string | null, host: string | null): URLSearchParams => {
  const params = new URLSearchParams({
    shop,
    host,
  });
  return params;
};

export const sanitizeShop = (shop: string): string | null => {
  if (!shop) return null;
  const regex = /^[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com$/;
  return regex.test(shop) ? shop : null;
};