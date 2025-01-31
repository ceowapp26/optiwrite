import { prisma } from '@/lib/prisma';
import { Installations } from '@/utils/auth/shopify';
import { WebhookQueueStatus } from '@prisma/client';
import { SubscriptionManager } from '@/utils/billing';
import { DateTime } from 'luxon';

export class WebhookQueue {
  private static readonly MAX_ATTEMPTS = 3;
  private static readonly BATCH_SIZE = 5;
  private static readonly EXECUTION_TIMEOUT = 25000;
  private static readonly COMPLETED_RETENTION_MS = 5 * 60 * 1000;

  static async enqueueSubscriptionUpdate(
    shopName: string,
    subscriptionId: string,
    payload: any,
    status: string,
    userEmail?: string,
    metadata: any
  ): Promise<void> {
    const existingTask = await prisma.webhookQueue.findFirst({
      where: {
        shopName,
        status: {
          in: [WebhookQueueStatus.PENDING, WebhookQueueStatus.PROCESSING]
        },
        AND: [
          {
            payload: {
              path: ['subscription_id'],
              equals: subscriptionId
            }
          },
          {
            payload: {
              path: ['status'],
              equals: status
            }
          }
        ]
      }
    });
    if (existingTask) {
      console.log(`Duplicate task found for subscription ${subscriptionId} with status ${status}`);
      return;
    }
    await prisma.webhookQueue.create({
      data: {
        shopName,
        topic: 'SUBSCRIPTIONS_UPDATE',
        payload: {
          ...payload,
          subscription_id: subscriptionId,
          status,
          userEmail,
          queuedAt: DateTime.utc().toJSDate()
        },
        metadata,
        status: WebhookQueueStatus.PENDING,
        attempts: 0
      }
    });
  }

  static async processSubscriptionTasks(): Promise<void> {
    const pendingTasks = await prisma.webhookQueue.findMany({
      where: {
        topic: 'SUBSCRIPTIONS_UPDATE',
        status: {
          in: [WebhookQueueStatus.PENDING, WebhookQueueStatus.PROCESSING]
        },
        attempts: {
          lt: this.MAX_ATTEMPTS
        }
      },
      take: this.BATCH_SIZE,
      orderBy: {
        createdAt: 'asc'
      }
    });
    if (!pendingTasks || pendingTasks.length === 0) {
      return;
    }
    for (const task of pendingTasks) {
      const startTime = DateTime.utc().toMillis();
      try {
        await prisma.webhookQueue.update({
          where: { id: task.id },
          data: {
            status: WebhookQueueStatus.PROCESSING,
            attempts: task.attempts + 1
          }
        });
        const { subscription_id, status, userEmail, created_at, updated_at } = task.payload;
        await SubscriptionManager.updateSubscriptionStatus(
          subscription_id,
          task.shopName,
          "Subscription canceled via webhook",
          userEmail,
          false,
          false,
          status,
          created_at,
          updated_at
        );
        await prisma.webhookQueue.update({
          where: { id: task.id },
          data: {
            status: WebhookQueueStatus.COMPLETED,
            completedAt: DateTime.utc().toJSDate()
          }
        });
        setTimeout(async () => {
          try {
            await prisma.webhookQueue.deleteMany({
              where: {
                id: task.id,
                status: WebhookQueueStatus.COMPLETED
              }
            });
          } catch (error) {
            console.error(`Error deleting completed task ${task.id}:`, error);
          }
        }, this.COMPLETED_RETENTION_MS);

        await prisma.webhookLog.create({
          data: {
            topic: 'SUBSCRIPTION_UPDATE_COMPLETED',
            shopName: task.shopName,
            payload: {
              subscription_id,
              status,
              completedAt: DateTime.utc().toJSDate(),
              processingTime: DateTime.utc().toMillis() - startTime
            }
          }
        });

      } catch (error) {
        console.error(`Error processing subscription task for ${task.shopName}:`, error);
        const timeElapsed = DateTime.utc().toMillis() - startTime;
        const status = timeElapsed >= this.EXECUTION_TIMEOUT ? 
          WebhookQueueStatus.PENDING : 
          task.attempts >= this.MAX_ATTEMPTS - 1 ? 
            WebhookQueueStatus.FAILED : 
            WebhookQueueStatus.PENDING;
        await prisma.webhookQueue.update({
          where: { id: task.id },
          data: {
            status,
            error: error instanceof Error ? error.message : 'Unknown error',
            lastAttempt: DateTime.utc().toJSDate()
          }
        });
        await prisma.webhookLog.create({
          data: {
            topic: 'SUBSCRIPTION_UPDATE_ERROR',
            shopName: task.shopName,
            payload: {
              error: error instanceof Error ? error.message : 'Unknown error',
              stack: error instanceof Error ? error.stack : undefined,
              timeElapsed,
              attemptNumber: task.attempts + 1
            }
          }
        });
      }
    }
    const thirtyDaysAgo = DateTime.utc().minus({ days: 30 }).toJSDate();
    await prisma.webhookQueue.deleteMany({
      where: {
        status: WebhookQueueStatus.FAILED,
        updatedAt: {
          lt: thirtyDaysAgo
        }
      }
    });
  }

  static async cleanupOldLogs(daysToKeep: number = 30): Promise<void> {
    const cutoffDate = DateTime.utc().minus({ days: daysToKeep }).toJSDate();
    await prisma.webhookLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate
        }
      }
    });
  }
}