import { prisma } from '@/lib/prisma';
import { ShopifySessionManager } from '@/utils/storage';

export const runCleanupWorker = async (shopName: string) => {
  try {
    const shop = await ShopifySessionManager.findShopByName(shopName);
    if (!shop) {
      console.error(`Shop ${shopName} not found`);
      return;
    }
    const now = new Date();
    const latestWebhookLogs = await prisma.webhookLog.findMany({
      where: { shopName },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true }
    });
    const deletedWebhookLogs = await prisma.webhookLog.deleteMany({
      where: {
        shopName,
        id: { notIn: latestWebhookLogs.map(log => log.id) },
        createdAt: {
          lte: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        },
      },
    });
    const latestWebhookQueues = await prisma.webhookQueue.findMany({
      where: { shopName },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true }
    });
    const deletedWebhookQueues = await prisma.webhookQueue.deleteMany({
      where: {
        shopName,
        id: { notIn: latestWebhookQueues.map(queue => queue.id) },
        createdAt: {
          lte: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        },
      },
    });
    const latestNotifications = await prisma.notification.findMany({
      where: { shopId: shop?.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true }
    });
    const deletedNotifications = await prisma.notification.deleteMany({
      where: {
        shopId: shop?.id,
        id: { notIn: latestNotifications.map(notification => notification.id) },
        createdAt: {
          lte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    });
    console.log(`Cleanup results for shop ${shopName}:
      - Deleted ${deletedWebhookLogs.count} webhook logs (keeping latest 20)
      - Deleted ${deletedNotifications.count} notifications (keeping latest 20)`
    );
  } catch (error) {
    console.error('Error in cleanup worker:', error);
    throw error;
  }
};