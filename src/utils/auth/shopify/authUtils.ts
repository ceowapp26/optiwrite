import { redirect } from "next/navigation";
import { Installations } from "./installationUtils";
import { ShopifySessionManager } from "@/utils/storage";
import { verifyHmac } from "@/utils/auth/shopify";
import { shopify } from "@/lib/shopify";

const TEST_GRAPHQL_QUERY = `
{
  shop {
    name
  }
}`;

/**
 * @description Redirects the user to the OAuth page. We used to check if the shop was embedded here, but I don't think it matters anymore. Redirect to this page if the app is not installed.
 * @param shop
 * @param host
 * @returns
 */
export async function serverSideRedirect(
  shop: string,
  host: string,
  embedded: string,
) {
  const queryParams = generateQueryParams(shop, host);
  if (embedded === "1") {
    return `${process.env.SHOPIFY_HOST}/api/auth?${queryParams.toString()}`;
  } else {
    redirect(`${process.env.SHOPIFY_HOST}/api/auth?${queryParams.toString()}`);
  }
}

export async function checkInstallation(shop: string) {
  const sanitizedShop = shopify.utils.sanitizeShop(shop);
  if (!sanitizedShop) {
    return false;
  }
  const appInstalled = await Installations.includes(sanitizedShop);
  return appInstalled;
}

export async function checkOnlineSessionAvailable(shop: string) {
  const sanitizedShop = shopify.utils.sanitizeShop(shop);
  if (!sanitizedShop) {
    return false;
  }
  const onlineSessionAvailable = await Installations.hasOnlineSession(sanitizedShop);
  return onlineSessionAvailable;
}

export async function verify(shop: string) {
  const sanitizedShop = shopify.utils.sanitizeShop(shop);
  if (!sanitizedShop) {
    return false;
  }

  const sessionId = shopify.session.getOfflineId(sanitizedShop);
  try {
    const session = await ShopifySessionManager.getSessionFromStorage(sessionId);
    // Check for scope mismatch
    if (!shopify.config.scopes.equals(session.scope)) {
      throw new Error("Scope mismatch");
    }

    const client = new shopify.clients.Graphql({ session });
    client.request(TEST_GRAPHQL_QUERY);
  } catch (err) {
    return false;
  }

  return true;
}

export async function performChecks(
  shop: string,
  host: string,
  embedded: string,
) {
  const queryParams = generateQueryParams(shop, host);
  const isInstalled = await checkInstallation(shop);
  if (!isInstalled) {
    return serverSideRedirect(shop, host, embedded);
  }
}

export const generateQueryParams = (shop: string, host: string): URLSearchParams => {
  const sanitizedShop = shopify.utils.sanitizeShop(shop);
  if (!sanitizedShop) {
    throw new Error("Invalid shop provided: " + shop);
  }
  return new URLSearchParams({
    shop: sanitizedShop,
    host,
  });
};
