import { ShopifySessionManager } from "@/utils/storage";
import { prisma } from "@/lib/prisma";

const TRANSACTION_TIMEOUT = 20000;

export const Installations = {
  includes: async function (shopDomain: string) {
    const shopSessions = await ShopifySessionManager.findSessionsByShop(shopDomain);
    if (shopSessions.length > 0) {
      for (const session of shopSessions) {
        if (session.accessToken && session.isOnline === false) return true;
      }
    }
    return false;
  },

  hasOnlineSession: async function (shopDomain: string) {
    const shopSessions = await ShopifySessionManager.findSessionsByShop(shopDomain);
    return shopSessions.some(session => 
      session.accessToken && session.isOnline
    );
  },

  delete: async function (shopDomain: string) {
    try {
      const shopSessions = await ShopifySessionManager.findSessionsByShop(shopDomain);
      if (shopSessions.length > 0) {
        await ShopifySessionManager.deleteSessionsFromStorage(shopSessions.map((session) => session.id));
      }
      await ShopifySessionManager.clearRecords(shopDomain);
    } catch (error) {
      console.error('Error during shop deletion:', error);
      throw error;
    }
  }
};
