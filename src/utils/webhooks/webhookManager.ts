import { prisma } from '@/lib/prisma';
import { Session, DeliveryMethod } from '@shopify/shopify-api';
import { SubscriptionStatus, PaymentStatus } from '@prisma/client';
import { UsageManager } from '@/utils/usage';
import { ShopifySessionManager } from '@/utils/storage';
import { WebhookQueue } from './webhookQueue';
import { SubscriptionManager, PlanManager } from '@/utils/billing';
import { SubscriptionPlan } from '@/types/plan';
import { CreditPaymentInfo } from '@/types/billing';
import { WebhookHandlerConfig, WebhookRegistrationResult, AppSubscriptionPayload, AppUninstallationPayload, AppPurchaseOneTimePayload } from '@/types/webhook';
import { clearCookies } from '@/actions/auth';
import { Installations } from '@/utils/auth/shopify';
import { DOMAIN } from '@/configs/sites';
import { shopify } from "@/lib/shopify";
import { DateTime } from 'luxon';

export class WebhookManager {
  private constructor() {}

  private static readonly webhookTopicMap = new Map<string, string>([
    ['APP_UNINSTALLED', 'app/uninstalled'],
    ['APP_SUBSCRIPTIONS_UPDATE', 'app_subscriptions/update'],
    ['APP_PURCHASES_ONE_TIME_UPDATE', 'app_purchases_one_time/update'],
    ['APP_SUBSCRIPTIONS_APPROACHING_CAPPED_AMOUNT', 'app_subscriptions/approaching_capped_amount']
  ]);

  private static readonly WEBHOOK_URI = "/api/webhooks";
  private static readonly WEBHOOK_ENDPOINT = `${process.env.SHOPIFY_API_URL}/api/webhooks`;
  private static readonly MAX_LOGS = 20;
  private static readonly handlers: WebhookHandlerConfig[] = [
    {
      topic: 'APP_UNINSTALLED',
      handler: async (shop, payload) => await WebhookManager.handleAppUninstalled(shop, payload, 'APP_UNINSTALLED')
    },
    {
      topic: 'APP_SUBSCRIPTIONS_UPDATE',
      handler: async (shop, payload) => await WebhookManager.handleSubscriptionUpdate(shop, payload)
    },
    {
      topic: 'APP_PURCHASES_ONE_TIME_UPDATE',
      handler: async (shop, payload) => await WebhookManager.handleCreditUpdate(shop, payload)
    },
    {
      topic: 'APP_SUBSCRIPTIONS_APPROACHING_CAPPED_AMOUNT',
      handler: async (shop, payload) => await WebhookManager.handleAppSubscriptionsApproachingCappedAmount(shop, payload)
    }
  ];

  private static get handlerWebhookTopics(): string[] {
    return Array.from(this.webhookTopicMap.keys());
  }

  private static get restWebhookTopics(): string[] {
    return Array.from(this.webhookTopicMap.values()).slice(0, 2);
  }

  private static getRestTopic(handlerTopic: string): string | undefined {
    return this.webhookTopicMap.get(handlerTopic);
  }

  private static getHandlerTopic(restTopic: string): string | undefined {
    for (const [handler, rest] of this.webhookTopicMap.entries()) {
      if (rest === restTopic) return handler;
    }
    return undefined;
  }

  private static async validateWebhookEndpoint(): Promise<boolean> {
    try {
      if (!process.env.SHOPIFY_API_URL) {
        throw new Error('SHOPIFY_API_URL environment variable is not defined');
      }
      return true;
    } catch (error) {
      console.error('Webhook endpoint validation failed:', error);
      return false;
    }
  }

  private static async getExistingWebhooks(session: Session): Promise<string[]> {
    try {
      const webhooks = await shopify.rest.Webhook.all({ session });
      return webhooks.data.map(webhook => webhook.topic);
    } catch (error) {
      console.error('Error fetching existing webhooks:', error);
      return [];
    }
  }

  private static async registerSingleWebhook(
    session: Session,
    topic: string
  ): Promise<WebhookRegistrationResult> {
    try {
      const webhook = new shopify.rest.Webhook({session: session});
      webhook.address = this.WEBHOOK_ENDPOINT;
      webhook.topic = topic;
      webhook.format = "json";
      await webhook.save({
        update: true,
      });
      return {
        success: true,
        result: {
          webhookId: webhook.id,
          topic: topic,
          address: this.WEBHOOK_ENDPOINT
        }
      };
    } catch (error) {
      console.error(`Error registering webhook for topic ${topic}:`, error);
      throw error;
    }
  }

  public static async initializeWebhooks(): Promise<void> {
    const isEndpointValid = await this.validateWebhookEndpoint();
    if (!isEndpointValid) {
      throw new Error('Webhook endpoint validation failed');
    }
    try {
      await this.setupGDPRWebhooks();
      const handlers = this.handlerWebhookTopics.map(topic => ({
        [topic]: {
          deliveryMethod: DeliveryMethod.Http,
          callbackUrl: this.WEBHOOK_URI,
          callback: async (topic: string, shop: string, body: string) => {
            try {
              const payload = JSON.parse(body);
              await this.processWebhook(topic, shop, payload);
            } catch (error) {
              console.error(`Error processing webhook ${topic}:`, error);
              throw error;
            }
          }
        }
      }));
      await shopify.webhooks.addHandlers(Object.assign({}, ...handlers));
      console.log('Webhook handlers initialized successfully');
    } catch (error) {
      console.error('Error initializing webhook handlers:', error);
      throw error;
    }
  }

  public static async registerWebhooks(session: Session): Promise<WebhookRegistrationResult[]> {
    if (!session?.accessToken) {
      throw new Error('Invalid session: Missing access token');
    }
    try {
      await this.initializeWebhooks();
      const existingWebhooks = await this.getExistingWebhooks(session);
      const missingTopics = this.restWebhookTopics.filter(
        topic => !existingWebhooks.includes(topic)
      );
      if (missingTopics.length === 0) {
        console.log('All webhooks are properly registered', missingTopics);
        return [];
      }
      console.log(`Registering ${missingTopics.length} missing webhooks using REST API`);
      const registrationResults = await Promise.allSettled(
        missingTopics.map(topic => this.registerSingleWebhook(session, topic))
      );
      const successfulRegistrations = registrationResults.filter(
        result => result.status === 'fulfilled'
      ) as PromiseFulfilledResult<WebhookRegistrationResult>[];

      const failedRegistrations = registrationResults.filter(
        result => result.status === 'rejected'
      );
      if (failedRegistrations.length > 0) {
        console.warn(`${failedRegistrations.length} webhook registrations failed`);
        failedRegistrations.forEach(result => {
          if (result.status === 'rejected') {
            console.error('Failed registration reason:', result.reason);
          }
        });
      }
      console.log(`Successfully registered ${successfulRegistrations.length} webhooks via REST API`);
      return successfulRegistrations.map(result => result.value);
    } catch (error) {
      console.error('Webhook registration error:', error);
      throw error;
    }
  }

  private static async setupGDPRWebhooks(): Promise<void> {
    const gdprTopics = {
      CUSTOMERS_DATA_REQUEST: this.handleCustomersDataRequest,
      CUSTOMERS_REDACT: this.handleCustomersRedact,
      SHOP_REDACT: this.handleShopRedact
    };

    try {
      await shopify.webhooks.addHandlers(
        Object.entries(gdprTopics).reduce((acc, [topic, handler]) => ({
          ...acc,
          [topic]: {
            deliveryMethod: DeliveryMethod.Http,
            callbackUrl: this.WEBHOOK_ENDPOINT,
            callback: async (topic: string, shop: string, body: string) => {
              try {
                const payload = JSON.parse(body);
                await handler(shop, payload);
              } catch (error) {
                console.error(`Error processing GDPR webhook ${topic}:`, error);
                throw error;
              }
            }
          }
        }), {})
      );
      console.log('GDPR webhooks setup successfully');
    } catch (error) {
      console.error('Error setting up GDPR webhooks:', error);
      throw error;
    }
  }

  static async processWebhook(topic: string, shop: string, payload: any) {
    try {
      await this.validateWebhookPayload(topic, shop, payload);
      const handler = this.handlers.find(h => h.topic === topic);
      if (handler) {
        await handler.handler(shop, payload);
      } else {
        console.warn(`Unhandled webhook topic: ${topic}`);
      }
    } catch (error) {
      console.error(`Webhook processing error (${topic}):`, error);
      throw error;
    }
  }

  static async logWebhook(topic: string, shop: string, payload: any) {
    try {
      await prisma.$transaction(async (tx) => {
        console.log('Transaction context:', tx);
        await tx.webhookLog.create({
            data: { 
              topic, 
              shopName: shop, 
              payload,
              createdAt: DateTime.utc().toJSDate()
            }
        });
      });
    } catch (error) {
      console.error('Error in logWebhook:', error);
      throw error; 
    }
  }

  // GDPR webhook handlers
  private static async handleCustomersDataRequest(shop: string, payload: any): Promise<void> {
    // Implement customers data request handling
  }

  private static async handleCustomersRedact(shop: string, payload: any): Promise<void> {
    // Implement customers redact handling
  }

  private static async handleShopRedact(shop: string, payload: any): Promise<void> {
    // Implement shop redact handling
  }

  static async handleAppInstalled(shop: string) {
    console.log(`${shop} has successfully completed the installation of doc2product!`);
  }

  static async handleAppUninstalled(shop: string, payload: AppUninstallPayload, topic: string) {
    try {
      if (!shop || !payload) {
        throw new Error('Unable to determine shop identifier from parameters or payload');
      }
      const completedUninstallEvent = await prisma.webhookLog.findFirst({
        where: {
          shopName: shop,
          topic: 'APP_UNINSTALLED_COMPLETED',
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      if (completedUninstallEvent) {
        console.warn(`Ignoring uninstall webhook - shop ${shop} was already uninstalled successfully`);
        return;
      }
      try {
        await Installations.delete(shop);
        await prisma.webhookLog.create({
          data: {
            topic: 'APP_UNINSTALLED_COMPLETED',
            shopName: shop,
            createdAt: DateTime.utc().toJSDate(),
            payload: {
              status: "COMPLETED",
              completedAt: DateTime.utc().toJSDate()
            }
          }
        });
      } catch (deleteError) {
        await prisma.webhookLog.create({
          data: {
            topic: 'APP_UNINSTALLED_ERROR',
            shopName: shop,
            createdAt: DateTime.utc().toJSDate(),
            payload: {
              error: deleteError.message,
              stack: deleteError.stack
            }
          }
        });
      }
    } catch (error) {
      console.error('Error handling uninstall:', {
        shop,
        error: error.message,
        stack: error.stack
      });
      await prisma.webhookLog.create({
        data: {
          topic: 'APP_UNINSTALLED_ERROR',
          shopName: shop,
          createdAt: DateTime.utc().toJSDate(),
          payload: {
            error: error.message,
            stack: error.stack
          }
        }
      });
      throw error;
    } finally {
      await ShopifySessionManager.clearWebhookRecords(shop);
      console.log("All records are successfully cleared!!!")
    }
  }

  static async handleSubscriptionUpdate(shop: string, payload: AppSubscriptionPayload) {
    if (!payload?.app_subscription) {
      throw new Error('Invalid subscription payload');
    }
    const { 
      app_subscription: {
        name: planName,
        status,
        admin_graphql_api_id,
        created_at,
        updated_at,
      }
    } = payload;
    if (!planName) {
      throw new Error('Plan name is required in subscription payload');
    }
    const subscription_id = admin_graphql_api_id.split('/').pop() || '';
    try {
      const existingWebhook = await this.checkExistingUpateEvent(shop, subscription_id, status);
      if (existingWebhook) {
        console.log('Subscription event already processed');
        return;
      }
      await this.logWebhook('SUBSCRIPTIONS_UPDATE', shop, {
        status,
        payload
      });
      const currentSubscription = await SubscriptionManager.getSubscriptionByShopifySubscriptionId(subscription_id);
      if (!currentSubscription) {
        console.log('No subscription found in webhook handler');
        return;
      }
      if (currentSubscription.shopifySubscriptionId !== subscription_id) {
        console.log('Subscription ID mismatch in webhook handler');
        return;
      }
      const lastAssociatedUser = currentSubscription.associatedUsers?.[currentSubscription.associatedUsers.length - 1];
      const userEmail = lastAssociatedUser?.associatedUser?.email;
      await WebhookQueue.enqueueSubscriptionUpdate(
        shop,
        subscription_id,
        payload.app_subscription,
        status,
        userEmail,
        payload
      );
    } catch (error) {
      console.error('Error in handleSubscriptionUpdate:', error);
      throw error;
    }
  }

  static async handleCreditUpdate(shop: string, payload: AppPurchaseOneTimePayload) {
    if (!payload?.app_purchase_one_time) {
      throw new Error('Invalid one-time purchase payload');
    }
    const {
      app_purchase_one_time: {
        id,
        name,
        status,
        amount,
        currency_code,
        created_at,
        updated_at
      }
    } = payload;

    if (!name || !amount) {
      throw new Error('Missing required fields in purchase payload');
    }
    try {
      const paymentId = id.split('/').pop() || '';
      switch (status) {
        case 'ACTIVE':
          await this.logWebhook('CREDIT_PURCHASE_COMPLETED', shop, {
            paymentId,
            name,
            amount,
            currency_code,
            status
          });
          break;

        case 'DECLINED':
        case 'CANCELLED':
        case 'PENDING':
          await this.logWebhook('CREDIT_PURCHASE_PENDING', shop, {
            paymentId,
            service,
            creditAmount,
            amount,
            currency_code,
            status
          });
          break;

        default:
          console.log(`Unhandled credit purchase status: ${status}`);
          await this.logWebhook('UNHANDLED_CREDIT_PURCHASE_STATUS', shop, {
            status,
            payload
          });
      }
      const newBalance = await CreditManager.getCreditsBalance(shop, service);
      return {
        success: status === 'ACTIVE',
        creditBalance: newBalance,
        purchaseStatus: status
      };

    } catch (error) {
      console.error('Error in handleCreditUpdate:', error);
      throw error;
    }
  }

  static async handleAppSubscriptionsApproachingCappedAmount(shop: string, payload: any) {
    try {
      const usageState = await UsageManager.getUsageState(shop);
      if (usageState.isApproachingLimit) {
        const subscription = await prisma.subscription.findFirst({
          where: { 
            shopName: shop,
            status: SubscriptionStatus.ACTIVE 
          },
          include: {
            plan: true
          }
        });
        await prisma.webhookLog.create({
          data: {
            topic: 'APP_SUBSCRIPTIONS_APPROACHING_CAPPED_AMOUNT',
            shopName: shop,
            payload: {
              ...payload,
              usageState,
              currentPlan: subscription?.plan.name,
              aiApiUsagePercentage: usageState.percentageUsed.aiApi,
              crawlApiUsagePercentage: usageState.percentageUsed.crawlApi,
              timestamp: new Date().toISOString()
            }
          }
        });
      }
    } catch (error) {
      console.error('Error in handleAppSubscriptionsApproachingCappedAmount:', error);
      throw error;
    }
  }

  static isValidStatusTransition(currentStatus: string, newStatus: string): boolean {
    const validTransitions = {
      'ACTIVE': ['INACTIVE', 'FROZEN', 'CANCELLED', 'EXPIRED'],
      'INACTIVE': ['ACTIVE', 'CANCELLED', 'EXPIRED'],
      'FROZEN': ['ACTIVE', 'CANCELLED', 'EXPIRED'],
      'CANCELLED': [], 
      'EXPIRED': []  
    };
    return validTransitions[currentStatus]?.includes(newStatus) ?? false;
  }

  static async checkExistingUpateEvent(shop: string, subscription_id: string, status: string): boolean {
    const existingWebhook = await prisma.webhookLog.findFirst({
      where: {
        topic: 'SUBSCRIPTIONS_UPDATE',
        shopName: shop,
        createdAt: {
          gt: new Date(Date.now() - 30 * 60 * 1000) 
        },
        AND: [
          {
            payload: {
              path: ['subscription_id'],
              equals: subscription_id
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
    return !!existingWebhook;
  }

  static async validateWebhookPayload(topic: string, shop: string, payload: any) {
    if (!shop || typeof shop !== 'string') {
      throw new Error('Missing parameters');
    }
    const sanitizedShop = shopify.utils.sanitizeShop(shop, true);
    if (!sanitizedShop) {
      throw new Error('Invalid shop identifier');
    }
    if (!payload) {
      throw new Error('Empty webhook payload');
    }
    const shopExists = await prisma.shop.findUnique({
      where: { name: shop }
    });
    if (!shopExists) {
      throw new Error('Shop not found');
    }
    return true;
  }
}
