'use client'
import { checkSession } from "@/actions/session";
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from "react";
import { useCookies } from 'react-cookie';

export function useShopifyCookies() {
  const searchParams = useSearchParams();
  const [cookies] = useCookies(['shopify-host', 'shopify-shop']);
  const hostFromParams = searchParams?.get('host');
  const hostFromCookies = cookies['shopify-host'];
  const shopFromParams = searchParams?.get('shop'); 
  const shopFromCookies = cookies['shopify-shop'];
  const embeddedFromParams = searchParams?.get('embedded'); 
  const embeddedFromCookies = cookies['shopify-embedded']; 
 
  return {
    host: hostFromParams || hostFromCookies || '',
    shop: shopFromParams || shopFromCookies || '',
    embedded: embeddedFromParams || embeddedFromCookies || ''

  };
}