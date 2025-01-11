import { shopify } from "@/lib/shopify";
import { NextRequest, NextResponse } from 'next/server';

export function beginAuth(
  shop: string, 
  req: NextRequest, 
  isOnline: boolean,
) {
  return shopify.auth.begin({
    shop,
    callbackPath: "/api/auth/shopify/callback",
    isOnline,
    rawRequest: req,
  });
}
