import { prisma } from '@/lib/prisma';
import { Installations } from '@/utils/auth/shopify';
import { clearCookies } from '@/actions/auth';

export class WebhookQueue {
  private static readonly MAX_ATTEMPTS = 3;
  private static readonly BATCH_SIZE = 5;

  static async enqueue(shop: string, payload: any, topic: string): Promise<void> { 
    await prisma.webhookQueue.create({
      data: {
        shop,
        payload,
        status: 'pending',
        attempts: 0,
        topic
      }
    });
  }

  static async processQueue(): Promise<void> {
    const pendingUninstalls = await prisma.webhookQueue.findMany({
      where: {
        status: 'pending',
        topic: 'APP_UNINSTALLED',
        attempts: {
          lt: this.MAX_ATTEMPTS
        }
      },
      take: this.BATCH_SIZE,
      orderBy: {
        createdAt: 'asc'
      }
    });
    for (const job of pendingUninstalls) {
      try {
        await prisma.webhookQueue.update({
          where: { id: job.id },
          data: {
            status: 'processing',
            attempts: job.attempts + 1
          }
        });
        await Installations.delete(job.shop);
        await prisma.webhookLog.create({
          data: {
            topic: 'APP_UNINSTALLED_COMPLETED',
            shopId: job.shop,
            payload: {
              status: "COMPLETED",
              completedAt: new Date()
            }
          }
        });
        await ShopifySessionManager.clearWebhookRecords(job.shop);
        const thirtyMinutesAgo = new Date();
        thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30);
        await prisma.webhookLog.deleteMany({
          where: {
            shopId: job.shop,
            createdAt: {
              lt: thirtyMinutesAgo
            }
          }
        });
        await prisma.webhookQueue.deleteMany({
          where: {
            shop: job.shop,
            createdAt: {
              lt: thirtyMinutesAgo
            }
          }
        });
        await prisma.webhookQueue.update({
          where: { id: job.id },
          data: {
            status: 'completed',
            processedAt: new Date()
          }
        });

      } catch (error) {
        console.error(`Error processing uninstall for ${job.shop}:`, error);
        const status = job.attempts >= this.MAX_ATTEMPTS - 1 ? 'failed' : 'pending';
        await prisma.webhookQueue.update({
          where: { id: job.id },
          data: {
            status,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        });
        await prisma.webhookLog.create({
          data: {
            topic: 'APP_UNINSTALLED_ERROR',
            shopId: job.shop,
            payload: {
              error: error instanceof Error ? error.message : 'Unknown error',
              stack: error instanceof Error ? error.stack : undefined
            }
          }
        });
      }
    }
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    await prisma.webhookQueue.deleteMany({
      where: {
        status: 'completed',
        processedAt: {
          lt: thirtyDaysAgo
        }
      }
    });
  }
}

