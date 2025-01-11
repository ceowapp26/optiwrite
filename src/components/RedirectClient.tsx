"use client"
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function RedirectClient() {
  const pathName = usePathname();
  const searchParams = useSearchParams();
  const host = searchParams.get("host");
  const shop = searchParams.get("shop");
  useEffect(() => {
    const queryParams = new URLSearchParams({
      shop: shop || '',
      host: host || ''
    }).toString();
    const redirectUrl = `${process.env.SHOPIFY_HOST}/versions/light?${queryParams}`;
    if (!pathName.includes("shops")) {
      setTimeout(() => {
        window.open(redirectUrl, "_top");
      }, 3500);
    }
  }, [pathName, host, shop]);

  return null;
}