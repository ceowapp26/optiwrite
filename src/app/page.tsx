import { performChecks } from "@/utils/auth/shopify";
import { shopify } from "@/lib/shopify";
import { generateQueryParams } from '@/utils/auth/utilities';
import { headers } from "next/headers";
import ExitClient from "@/components/ExitClient";
import RedirectClient from "@/components/RedirectClient";

function isValidString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

interface PageProps {
  params: Record<string, unknown>;
  searchParams: Record<string, string | string[] | undefined>;
}

export default async function Page({ searchParams }: PageProps) {
  const { shop, host, hmac, embedded, ...otherParams } = searchParams;
  if (!isValidString(shop) || !isValidString(host)) {
    throw new Error("Missing or invalid 'shop' or 'host' parameters");
  }
  const redirectUri = await performChecks(shop, host, embedded);
  const queryParams = generateQueryParams(shop, host);
  if (redirectUri) {
    return <ExitClient redirectUri={redirectUri} />;
  } else {
    return <RedirectClient />
  }
}