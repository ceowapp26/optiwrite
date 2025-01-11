import '@shopify/shopify-api/adapters/web-api';
import { shopifyApi, LATEST_API_VERSION, LogSeverity } from '@shopify/shopify-api';
import Shopify from 'shopify-api-node';
import { restResources } from '@shopify/shopify-api/rest/admin/2024-10';
import { ShopifySessionManager } from '@/utils/storage';

const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY!,
  apiSecretKey: process.env.SHOPIFY_API_SECRET!,
  scopes: [
    'read_products', 
    'write_products',
    'read_content',
    'write_content',
    'read_online_store_pages'
  ],
  hostName: process.env.SHOPIFY_API_URL?.replace(/https?:\/\//, "") || "",
  hostScheme: "https",
  apiVersion: LATEST_API_VERSION,
  isEmbeddedApp: true,
  sessionStorage: {
    storeSession: ShopifySessionManager.storeSessionToStorage,
    loadSession: ShopifySessionManager.getSessionFromStorage,
    deleteSession: ShopifySessionManager.deleteSessionFromStorage,
    deleteSessions: ShopifySessionManager.deleteSessionsFromStorage,
    findSessionsByShop: ShopifySessionManager.findSessionsByShop,
  },
  restResources,
  logger: {
    level:
      process.env.APP_ENV === "development"
        ? LogSeverity.Debug
        : LogSeverity.Error,
  },
});

const initializeShopify = async (shopName: string, accessToken: string): Promise<Shopify> => {
  if (!shopName || !accessToken) {
    throw new Error("Missing credentials");
  }
  const shopify = new Shopify({
    shopName,
    accessToken,
  });
  try {
    await shopify.shop.get();
    return shopify; 
  } catch (error) {
    console.error('Shopify connection validation failed:', error);
    throw new Error(
      error instanceof Error
        ? error.message
        : 'Unable to validate Shopify connection'
    );
  }
};

export { shopify, initializeShopify };