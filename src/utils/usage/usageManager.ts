import { PrismaClient, Prisma, Shop, ModelName, Service, ServiceUsage, SubscriptionStatus, PackageStatus, Usage, Payment, PaymentStatus, AIUsageDetails, SubscriptionPlan, Subscription, NotificationType } from '@prisma/client';
import { ShopifySessionManager, ModelManager } from '@/utils/storage';
import { SubscriptionManager, PlanManager } from '@/utils/billing';
import { prisma } from '@/lib/prisma';
import { DateTime } from 'luxon';
import emailService, { EmailServiceError, EmailResponse } from '@/utils/email/emailService';

interface AIDetails {
  modelName: ModelName;
  inputTokens: number;
  outputTokens: number;
  requestsPerMinuteLimit: number;
  requestsPerDayLimit: number;
  remainingRequestsPerMinute: number;
  remainingRequestsPerDay: number;
  resetTimeForMinuteRequests: number;
  resetTimeForDayRequests: number;
}

interface UsageBaseParams {
  tx: Prisma.TransactionClient;
  usage: Usage;
  service: Service;
  totalRequests?: number;
}

interface AIUsageParams extends UsageBaseParams {
  totalTokens?: number;
  aiDetails: AIDetails;
}

interface ServiceUsageState {
  totalRequests: number;
  remainingRequests: number;
  percentageUsed: number;
  rateLimit?: {
    rpm?: number;
    rpd?: number;
    tpm?: number;
    tpd?: number;
    maxTokens?: number;
  };
}

interface UsageState {
  subscription: {
    id: string | null;
    serviceUsage: {
      [Service.AI_API]?: ServiceUsageState;
      [Service.CRAWL_API]?: ServiceUsageState;
    };
    isApproachingLimit: boolean;
  };
  creditPackages: {
    active: Array<{
      id: string;
      name: string;
      creditsUsed: number;
      creditLimit: number;
      percentageUsed: number;
      remainingCredits: number;
      serviceUsage: {
        [Service.AI_API]?: ServiceUsageState;
        [Service.CRAWL_API]?: ServiceUsageState;
      };
      isExpiringSoon: boolean;
      expiresAt?: Date;
    }>;
    expired: Array<{
      id: string;
      name: string;
      expiredAt: Date;
    }>;
  };
  totalUsage: {
    creditsUsed: number;
    creditLimit: number;
    remainingCredits: number;
    percentageUsed: number;
    isOverLimit: boolean;
    isApproachingLimit: boolean;
  };
  serviceDetails: {
    [Service.AI_API]?: {
      totalRequests: number;
      totalTokens: number;
      inputTokens: number;
      outputTokens: number;
      model: ModelName;
      rateLimits: {
        requestsPerMinuteLimit: number;
        requestsPerDayLimit: number;
        remainingRequestsPerMinute: number;
        remainingRequestsPerDay: number;
        resetTimeForMinuteRequests: Date;
        resetTimeForDayRequests: Date;
        tokensPerMinute: number;
        tokensPerDay: number;
      };
    };
    [Service.CRAWL_API]?: {
      totalRequests: number;
    };
  };
}

export class UsageManager {
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY = 1000;
  private static readonly TRANSACTION_TIMEOUT = 50000;
  private static readonly MAX_WAIT = 5000;
  private static readonly TIME_MINUTE_LIMIT = 60000;
  private static readonly TIME_DAY_LIMIT = 60000 * 60 * 24;

  private static readonly CREDIT_CONVERSION = {
    [Service.AI_API]: 0.1, 
    [Service.CRAWL_API]: 1
  };

  static readonly Errors = {
    SHOP_NOT_FOUND: 'Shop not found',
    SUBSCRIPTION_NOT_FOUND: 'No active subscription found',
    PAYMENT_NOT_FOUND: 'No previous payment found for subscription',
    INVALID_PLAN: 'Invalid subscription plan',
    TRANSACTION_FAILED: 'Transaction failed',
    PAYMENT_FAILED: 'Payment processing failed',
    INVALID_DATES: 'Invalid subscription dates',
    MISSING_PARAMETERS: 'Missing required parameters',
    NO_ACTIVATION_EMAIL: 'No email provided for subscription activation notification',
    NO_EXPIRATION_EMAIL: 'No email provided for subscription expiration notification'
  } as const;

  private static async executeTransaction<T>(
    operation: (tx: PrismaClient) => Promise<T>,
    errorMessage: string
  ): Promise<T> {
    try {
      return await prisma.$transaction(operation, {
        timeout: this.TRANSACTION_TIMEOUT,
        maxWait: this.MAX_WAIT,
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable
      });
    } catch (error) {
      console.error(`${errorMessage}:`, error);
      throw new Error(`${errorMessage}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private static calculateServiceCreditRate(
    service: Service,
    feature: any,
    creditLimits: number
  ): number {
    const serviceLimit = service === Service.AI_API 
      ? feature.aiAPI.requestLimits 
      : feature.crawlAPI.requestLimits;
    return creditLimits / serviceLimit;
  }

  private static calculateCreditsNeeded(
    service: Service, 
    calls: number,
    feature: any,
    creditLimits: number
  ): number {
    const creditRate = this.calculateServiceCreditRate(service, feature, creditLimits);
    return calls * creditRate;
  }

  private static isValidEmail(email: string): boolean {
    const emailRegex = /^(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$/i;
    return emailRegex.test(email);
  }

  /**
   * Converts a Unix timestamp to an ISO 8601 string format for Supabase.
   * @param {number} unixTimestamp - The Unix timestamp in seconds.
   * @returns {string} - The ISO 8601 formatted date string.
  */
  private static convertUnixTimestampToSupabaseDateTime(unixTimestamp) {
    if (typeof unixTimestamp !== 'number') {
      throw new Error('Input must be a number representing a Unix timestamp.');
    }
    const timestampInMilliseconds = unixTimestamp < 10000000000 ? unixTimestamp * 1000 : unixTimestamp;
    const date = new Date(timestampInMilliseconds);
    return date.toISOString();
  }

  private static async retry<T>(
    operation: () => Promise<T>,
    retries = UsageManager.MAX_RETRIES
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retries > 0 && (error instanceof Prisma.PrismaClientKnownRequestError)) {
        await new Promise(resolve => setTimeout(resolve, UsageManager.RETRY_DELAY));
        return this.retry(operation, retries - 1);
      }
      throw error;
    }
  }

  static async updateServiceUsage(
    shopName: string,
    service: Service,
    usageState: UsageState,
    serviceDetails?: ServiceDetails,
    userId?: string,
    email?: string
  ): Promise<void> {
    const shop = await ShopifySessionManager.findShopByName(shopName);
    if (!shop) {
      throw new Error(this.Errors.SHOP_NOT_FOUND);
    }
    try {
      await this.handleUsageNotification(usageState, shop?.id, shopName, email);
      await prisma.$transaction(async (tx) => {
        const remainingRequests = await this.deductFromSubscription(
          tx,
          shop.id,
          shopName,
          service,
          serviceDetails,
          userId, 
          email
        );
        if (remainingRequests > 0) {
          await this.deductFromCreditPackages(
            tx,
            shop.id,
            shopName,
            service,
            serviceDetails,
            userId,
            email
          );
        }
      }, {
        timeout: this.TRANSACTION_TIMEOUT,
        maxWait: this.MAX_WAIT,
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable
      });
    } catch (error) {
      throw new Error(`Failed to update service usage: ${error.message}`);
    }
  }

  private static async findOrCreateUsage(
    tx: Prisma.TransactionClient,
    shopId: string,
    type: 'subscription' | 'creditPurchase',
    id: string,
    service: Service,
    serviceDetails?: ServiceDetails
  ): Promise<Usage> {
    return await prisma.$transaction(async (tx) => {
      const existingUsage = await tx.usage.findFirst({
        where: {
          shopId,
          ...(type === 'subscription' 
            ? { subscription: { id } }
            : { creditPurchase: { id } })
        },
        include: {
          serviceUsage: {
            include: {
              aiUsageDetails: true,
              crawlUsageDetails: true
            }
          }
        }
      });
      if (existingUsage) return existingUsage;
      const usage = await tx.usage.create({
        data: {
          shopId,
          ...(type === 'subscription'
            ? { subscription: { connect: { id } } }
            : { creditPurchase: { connect: { id } } })
        }
      });
      const feature = await this.getServiceFeature(
        tx,
        type === 'subscription' ? id : null,
        service,
        type === 'creditPurchase' ? id : undefined
      );
      const limits = {
        requestLimits: service === Service.AI_API ? feature.aiAPI.requestLimits : feature.crawlAPI.requestLimits,
        creditLimits: service === Service.AI_API ? feature.aiAPI.creditLimits : feature.crawlAPI.creditLimits,
        tokenLimits: service === Service.AI_API ? feature.aiAPI.tokenLimits : undefined,
        conversionRate: service === Service.AI_API ? feature.aiAPI.conversionRate : feature.crawlAPI.conversionRate,
      };
      if (feature) {
        await this.findOrCreateServiceUsage(tx, usage.id, service, serviceDetails, limits);
      }
      return usage;
    });
  }

  private static async findOrCreateServiceUsage(
    tx: Prisma.TransactionClient,
    usageId: string,
    service: Service,
    serviceDetails?: ServiceDetails,
    limits?: { requestLimits: number; tokenLimits?: number, creditLimits?: number, conversionRate?: number }
  ): Promise<ServiceUsage> {
    const now = new Date();
    if (!limits) {
      throw new Error('Usage limits are required');
    }
    let aiUsageDetailsId: string | undefined;
    let crawlUsageDetailsId: string | undefined;
    if (service === Service.AI_API && serviceDetails?.aiDetails) {
      const aiDetails = await tx.aIUsageDetails.create({
        data: {
          modelName: serviceDetails.aiDetails.modelName,
          inputTokensCount: serviceDetails.aiDetails.inputTokens,
          outputTokensCount: serviceDetails.aiDetails.outputTokens,
          tokensConsumedPerMinute: serviceDetails.aiDetails.inputTokens + serviceDetails.aiDetails.outputTokens,
          tokensConsumedPerDay: serviceDetails.aiDetails.inputTokens + serviceDetails.aiDetails.outputTokens,
          requestsPerMinuteLimit: serviceDetails.aiDetails.requestsPerMinuteLimit,
          requestsPerDayLimit: serviceDetails.aiDetails.requestsPerDayLimit,
          totalRequests: limits?.requestLimits ?? 0,
          totalRequestsUsed: serviceDetails.aiDetails?.totalRequests,
          totalRemainingRequests: (limits?.requestLimits ?? 0) - serviceDetails.aiDetails?.totalRequests,
          totalTokens: limits?.tokenLimits ?? 0,
          totalTokensUsed: serviceDetails.aiDetails.inputTokens + serviceDetails.aiDetails.outputTokens,
          totalRemainingTokens: (limits?.tokenLimits ?? 0) - (serviceDetails.aiDetails.inputTokens + serviceDetails.aiDetails.outputTokens),
          totalCredits: limits.creditLimits ?? 0,
          totalCreditsUsed:  serviceDetails.aiDetails?.totalRequests * limits.conversionRate ?? serviceDetails.aiDetails?.totalRequests * this.CREDIT_CONVERSION[Service.AI_API],
          totalRemainingCredits: Math.min(0, ((limits?.creditLimits ?? 0) - (serviceDetails.aiDetails?.totalRequests * limits.conversionRate ?? serviceDetails.aiDetails?.totalRequests * this.CREDIT_CONVERSION[Service.AI_API]))),
          lastTokenUsageUpdateTime: now
        }
      });
      aiUsageDetailsId = aiDetails.id;
    } else if (service === Service.CRAWL_API) {
      const crawlDetails = await tx.crawlUsageDetails.create({
        data: {
          totalRequests: limits?.requestLimits ?? 0,
          totalRequestsUsed: serviceDetails.crawlDetails?.totalRequests,
          totalRemainingRequests: (limits?.requestLimits ?? 0) - serviceDetails.crawlDetails?.totalRequests,
          totalCredits: limits.creditLimits ?? 0,
          totalCreditsUsed:  serviceDetails.crawlDetails?.totalRequests * limits.conversionRate ?? serviceDetails.crawlDetails?.totalRequests * this.CREDIT_CONVERSION[Service.AI_API],
          totalRemainingCredits: Math.min(0, ((limits?.creditLimits ?? 0) - (serviceDetails.crawlDetails?.totalRequests * limits.conversionRate ?? serviceDetails.crawlDetails?.totalRequests * this.CREDIT_CONVERSION[Service.AI_API]))),
        }
      });
      crawlUsageDetailsId = crawlDetails.id;
    }
    return tx.serviceUsage.create({
      data: {
        usageId,
        ...(aiUsageDetailsId && { aiUsageId: aiUsageDetailsId }),
        ...(crawlUsageDetailsId && { crawlUsageId: crawlUsageDetailsId })
      },
      include: {
        aiUsageDetails: true,
        crawlUsageDetails: true
      }
    });
  }

  private static async updateExistingServiceUsage(
    tx: Prisma.TransactionClient,
    existingUsage: ServiceUsage,
    service: Service,
    requestsToDeduct: number,
    creditsToDeduct: number,
    serviceDetails?: ServiceDetails,
    limits?: { requestLimits: number; tokenLimits?: number; creditLimits: number }
  ): Promise<void> {
    try {
      const now = new Date();
      if (service === Service.AI_API && serviceDetails?.aiDetails) {
        const tokensPerRequest = serviceDetails.aiDetails.inputTokens + serviceDetails.aiDetails.outputTokens;
        const totalTokensUsed = tokensPerRequest * requestsToDeduct;
        const timeDiff = now.getTime() - (existingUsage.aiUsageDetails?.lastTokenUsageUpdateTime?.getTime() ?? now.getTime());
        const newTotalRequestsUsed = (existingUsage.aiUsageDetails?.totalRequestsUsed ?? 0) + requestsToDeduct;
        const newTotalTokensUsed = (existingUsage.aiUsageDetails?.totalTokensUsed ?? 0) + totalTokensUsed;
        const newTotalCreditsUsed = (existingUsage.aiUsageDetails?.totalCreditsUsed ?? 0) + creditsToDeduct;
        await tx.aIUsageDetails.update({
          where: { id: existingUsage.aiUsageId },
          data: {
            modelName: serviceDetails.aiDetails.modelName,
            inputTokensCount: { increment: serviceDetails.aiDetails.inputTokens * requestsToDeduct },
            outputTokensCount: { increment: serviceDetails.aiDetails.outputTokens * requestsToDeduct },
            tokensConsumedPerMinute: timeDiff > this.TIME_MINUTE_LIMIT
              ? totalTokensUsed
              : { increment: totalTokensUsed },
            tokensConsumedPerDay: timeDiff > this.TIME_DAY_LIMIT
              ? totalTokensUsed
              : { increment: totalTokensUsed },
            requestsPerMinuteLimit: serviceDetails.aiDetails.requestsPerMinuteLimit,
            requestsPerDayLimit: serviceDetails.aiDetails.requestsPerDayLimit,
            totalRequests: limits?.requestLimits ?? 0,
            totalRequestsUsed: { increment: requestsToDeduct },
            totalRemainingRequests: (limits?.requestLimits ?? 0) - newTotalRequestsUsed,
            totalTokens: limits?.tokenLimits ?? 0,
            totalTokensUsed: { increment: totalTokensUsed },
            totalRemainingTokens: (limits?.tokenLimits ?? 0) - newTotalTokensUsed,
            totalCredits: limits.creditLimits ?? 0,
            totalCreditsUsed: { increment: creditsToDeduct ?? 0 },
            totalRemainingCredits: (limits?.creditLimits ?? 0) - newTotalCreditsUsed,
            resetTimeForMinuteRequests: this.convertUnixTimestampToSupabaseDateTime(
              serviceDetails.aiDetails.resetTimeForMinuteRequests
            ),
            resetTimeForDayRequests: this.convertUnixTimestampToSupabaseDateTime(
              serviceDetails.aiDetails.resetTimeForDayRequests
            ),
            lastTokenUsageUpdateTime: timeDiff > this.TIME_MINUTE_LIMIT ? now : existingUsage.aiUsageDetails?.lastTokenUsageUpdateTime,
          },
        });
        return newTotalCreditsUsed;
      } else if (service === Service.CRAWL_API && serviceDetails?.crawlDetails) {
        const newTotalRequestsUsed = (existingUsage.crawlUsageDetails?.totalRequestsUsed ?? 0) + requestsToDeduct;
        const newTotalCreditsUsed = (existingUsage.crawlUsageDetails?.totalCreditsUsed ?? 0) + (creditsToDeduct ?? 0);
        await tx.crawlUsageDetails.update({
          where: { id: existingUsage.crawlUsageId },
          data: {
            totalRequests: limits?.requestLimits ?? 0,
            totalRequestsUsed: { increment: requestsToDeduct },
            totalRemainingRequests: (limits?.requestLimits ?? 0) - newTotalRequestsUsed,
            totalCredits: limits.creditLimits ?? 0,
            totalCreditsUsed: { increment: creditsToDeduct ?? 0 },
            totalRemainingCredits: (limits?.creditLimits ?? 0) - newTotalCreditsUsed,
          },
        });
        return newTotalCreditsUsed;
      }
    } catch (error) {
      console.error('Error updating service usage:', error);
      throw new Error('Failed to update service usage: ' + error.message);
    }
  }

  private static async deductFromSubscription(
    tx: Prisma.TransactionClient,
    shopId: string,
    shopName: stripng,
    service: Service,
    serviceDetails?: ServiceDetails,
    userId?: string,
    email?: string
  ): Promise<number> {
    const subscription = await SubscriptionManager.getCurrentSubscription(shopName, email);
    let calls = service === Service.AI_API ? serviceDetails.aiDetails.totalRequests : serviceDetails.crawlDetails.totalRequests;
    const subscriptionCreditLimits = subscription?.creditBalance || subscription?.plan?.creditAmount;
    if (![SubscriptionStatus.ACTIVE, SubscriptionStatus.ON_HOLD, SubscriptionStatus.TRIAL].includes(subscription?.status)) {
      return calls;
    }
    const feature = await this.getServiceFeature(tx, subscription.planId, service);
    if (!feature) {
      return calls;
    }
    const limits = {
      requestLimits: service === Service.AI_API ? feature.aiAPI.requestLimits : feature.crawlAPI.requestLimits,
      tokenLimits: service === Service.AI_API ? feature.aiAPI.tokenLimits : undefined,
      creditLimits: service === Service.AI_API ? feature.aiAPI.creditLimits : feature.crawlAPI.creditLimits,
      conversionRate: service === Service.AI_API ? feature.aiAPI.conversionRate : feature.crawlAPI.conversionRate,
    };
    const usage = await this.findOrCreateUsage(tx, shopId, 'subscription', subscription.id, service, serviceDetails);
    const currentUsedRequests = service === Service.AI_API 
      ? usage.serviceUsage.aiUsageDetails.totalRequestsUsed 
      : usage.serviceUsage.crawlUsageDetails.totalRequestsUsed;
   const currentUsedCredits = service === Service.AI_API 
      ? usage.serviceUsage.aiUsageDetails.totalCreditsUsed 
      : usage.serviceUsage.crawlUsageDetails.totalCreditsUsed;
    const requestLimit = service === Service.AI_API 
      ? feature.aiAPI.requestLimits 
      : feature.crawlAPI.requestLimits;
    const creditLimit = service === Service.AI_API 
      ? feature.aiAPI.creditLimits 
      : feature.crawlAPI.creditLimits;
    const conversionRate = service === Service.AI_API 
      ? feature.aiAPI.conversionRate 
      : feature.crawlAPI.conversionRate;
    const availableRequests = requestLimit - (currentUsedRequests ?? 0);
    const availableCredits = creditLimit - (currentUsedCredits ?? 0);
    const requestsToDeduct = Math.min(availableRequests, calls);
    const creditsToDeduct = Math.min(availableCredits, requestsToDeduct * conversionRate);
    if (userId) {
      await this.updateUserConnections(tx, usage.id, userId);
    }
    let newTotalCreditsUsed;
    if (creditsToDeduct > 0 && requestsToDeduct > 0) {
      newTotalCreditsUsed = await this.updateExistingServiceUsage(tx, usage.serviceUsage, service, requestsToDeduct, creditsToDeduct, serviceDetails, limits);
      calls -= requestsToDeduct;
    }
    if (Math.max(limits?.creditLimits - newTotalCreditsUsed, 0) === 0) {
      await this.handleSubscriptionExpired(shopId, shopName, service, subscription, email);
    }
    return calls - requestsToDeduct;
  }

  private static async deductFromCreditPackages(
    tx: Prisma.TransactionClient,
    shopId: string,
    shopName: string,
    service: Service,
    serviceDetails?: ServiceDetails,
    userId?: string,
    email?: string,
  ): Promise<void> {
    const calls = service === Service.AI_API ? serviceDetails.aiDetails.totalRequests : serviceDetails.crawlDetails.totalRequests;
    const activePackages = await tx.creditPurchase.findMany({
      where: {
        shopId,
        status: PackageStatus.ACTIVE
      },
      orderBy: { createdAt: 'asc' },
      include: {
        usage: {
          include: {
            serviceUsage: {
              include: {
                aiUsageDetails: true,
                crawlUsageDetails: true
              }
            }
          }
        },
        creditPackage: true
      }
    });
    let remainingCalls = calls;
    for (const pkg of activePackages) {
      if (remainingCalls <= 0) break;
      const feature = await this.getServiceFeature(tx, null, service, pkg.id);
      const purchaseSnapshot = pkg.purchaseSnapshot as any;
      const packageCredits = purchaseSnapshot.creditAmount;
      const limits = {
        requestLimits: service === Service.AI_API ? feature.aiAPI.requestLimits : feature.crawlAPI.requestLimits,
        tokenLimits: service === Service.AI_API ? feature.aiAPI.tokenLimits : undefined,
        creditLimits: service === Service.AI_API ? feature.aiAPI.creditLimits : feature.crawlAPI.creditLimits,
        conversionRate: service === Service.AI_API ? feature.aiAPI.conversionRate : feature.crawlAPI.conversionRate,
      };
      const usage = await this.findOrCreateUsage(tx, shopId, 'creditPurchase', pkg.id, service, serviceDetails);
      const currentUsedRequests = service === Service.AI_API 
      ? usage.serviceUsage.aiUsageDetails.totalRequestsUsed 
      : usage.serviceUsage.crawlUsageDetails.totalRequestsUsed;
      const currentUsedCredits = service === Service.AI_API 
      ? usage.serviceUsage.aiUsageDetails.totalCreditsUsed 
      : usage.serviceUsage.crawlUsageDetails.totalCreditsUsed;
      const requestLimit = service === Service.AI_API 
      ? feature.aiAPI.requestLimits 
      : feature.crawlAPI.requestLimits;
      const creditLimit = service === Service.AI_API 
      ? feature.aiAPI.creditLimits 
      : feature.crawlAPI.creditLimits;
      const conversionRate = service === Service.AI_API 
      ? feature.aiAPI.conversionRate 
      : feature.crawlAPI.conversionRate;
      const availableRequests = requestLimit - (currentUsedRequests ?? 0);
      const availableCredits = creditLimit - (currentUsedCredits ?? 0);
      const requestsToDeduct = Math.min(availableRequests, remainingCalls);
      const creditsToDeduct = Math.min(availableCredits, requestsToDeduct * conversionRate);
      const totalCreditsLimit = feature.aiAPI.creditLimits + feature.crawlAPI.creditLimits;
      const totalCreditsUsed = usage.serviceUsage.aiUsageDetails.totalCreditsUsed + usage.serviceUsage.crawlUsageDetails.totalCreditsUsed ;
      if (userId) {
        await this.updateUserConnections(tx, usage.id, userId);
      }
      let newTotalCreditsUsed;
      if (creditsToDeduct > 0 && requestsToDeduct > 0) {
        newTotalCreditsUsed = await this.updateExistingServiceUsage(tx, usage.serviceUsage, service, requestsToDeduct, creditsToDeduct, serviceDetails, limits);
        remainingCalls -= requestsToDeduct;
      }
      const shouldExpirePackage = totalCreditsUsed >= totalCreditsLimit;
      if (shouldExpirePackage) {
        const remainingPackages = activePackages
          .filter(p => p.id !== pkg.id)
          .map(p => {
            const pSnapshot = p.purchaseSnapshot as any;
            const pCredits = totalCreditsLimit;
            const pUsageAI = p.usage?.serviceUsage?.aiUsageDetails?.totalCreditsUsed ?? 0;
            const pUsageCrawl = p.usage?.serviceUsage?.crawlUsageDetails?.totalCreditsUsed ?? 0;
            const pTotalUsage = pUsageAI + pUsageCrawl;
            return {
              ...p,
              packageName: p.creditPackage.name,
              remainingCredits: pCredits - pTotalUsage
            };
          })
          .filter(p => p.remainingCredits > 0);
        await this.handlePackageExpired(
          shopId,
          shopName,
          pkg,
          remainingPackages,
          email
        );
      }
    }
    if (remainingCalls > 0) {
      throw new Error('Insufficient credits available');
    }
  }

  private static async updateUserConnections(
      tx: Prisma.TransactionClient,
      usageId: string,
      userId: string 
  ): Promise<void> {
    if (!userId) return;
    await tx.associatedUserToUsage.upsert({
      where: {
        associatedUserId_usageId: {
          associatedUserId: BigInt(userId),
          usageId
        }
      },
      create: {
        associatedUserId: BigInt(userId),
        usageId
      },
      update: {}
    });
  }

 private static async getServiceFeature(
    tx: Prisma.TransactionClient,
    planId: string | null,
    service: Service,
    packageId?: string
  ) {
    const whereClause = planId 
      ? { planId } 
      : packageId 
      ? { packageId }
      : undefined;

    if (!whereClause) {
      return null;
    }

    return tx.feature.findFirst({
      where: {
        ...whereClause,
        ...(service === Service.AI_API 
          ? { aiAPI: { service: Service.AI_API } }
          : { crawlAPI: { service: Service.CRAWL_API } }
        )
      },
      include: {
        aiAPI: true,
        crawlAPI: true
      }
    });
  }

  static async getUsageState(shopName: string, email: string): Promise<UsageState> {
    const shop = await prisma.shop.findUnique({
      where: { name: shopName },
      include: {
        subscriptions: {
          where: {   
            status: {
              in: [SubscriptionStatus.TRIAL, SubscriptionStatus.ACTIVE, SubscriptionStatus.ON_HOLD]
            }
          },
          where: { status: SubscriptionStatus.ACTIVE },
          include: {
            plan: {
              include: {
                feature: {
                  include: {
                    aiAPI: true,
                    crawlAPI: true
                  }
                }
              }
            },
            usage: {
              include: {
                serviceUsage: {
                  include: {
                    aiUsageDetails: true,
                    crawlUsageDetails: true
                  }
                }
              }
            }
          }
        },
        creditPurchases: {
          where: { status: PackageStatus.ACTIVE },
          include: {
            creditPackage: {
              include: {
                feature: {
                  include: {
                    aiAPI: true,
                    crawlAPI: true
                  }
                }
              }
            },
            usage: {
              include: {
                serviceUsage: {
                  include: {
                    aiUsageDetails: true,
                    crawlUsageDetails: true
                  }
                }
              }
            }
          }
        }
      }
    });
    if (!shop) throw new Error(this.Errors.SHOP_NOT_FOUND);
    const activeSubscription = await SubscriptionManager.getCurrentSubscription(shopName, email);
    const feature = activeSubscription?.plan?.feature;
    const serviceUsage = activeSubscription?.usage?.serviceUsage;
    const subscriptionCreditsUsed = (serviceUsage?.aiUsageDetails?.totalCreditsUsed + serviceUsage?.crawlUsageDetails?.totalCreditsUsed) ?? 0;
    const subscriptionState = {
      id: activeSubscription?.id ?? null,
      status: activeSubscription?.status ?? SubscriptionStatus.EXPIRED,
      planName: activeSubscription?.plan?.name,
      creditsUsed: subscriptionCreditsUsed,
      creditLimit: activeSubscription?.plan?.creditAmount,
      percentageUsed: (subscriptionCreditsUsed / activeSubscription?.plan?.creditAmount) * 100,
      remainingCredits: activeSubscription?.plan?.creditAmount - subscriptionCreditsUsed,
      serviceUsage: this.calculateSubscriptionServiceUsage(
        activeSubscription?.usage?.serviceUsage ?? null, 
        feature ?? null
      ),
      isApproachingLimit: false
    };
    const activePackages = (shop.creditPurchases ?? []).map(purchase => {
      try {
        const packageFeature = purchase?.creditPackage?.feature;
        if (!packageFeature) {
          throw new Error(`Missing feature for package ${purchase.id}`);
        }
        const purchaseSnapshot = purchase.purchaseSnapshot as any;
        if (!purchaseSnapshot?.creditAmount) {
          throw new Error(`Invalid purchase snapshot for package ${purchase.id}`);
        }
        if (!purchase.usage) {
          throw new Error(`Missing usage data for package ${purchase.id}`);
        }
        const purchaseServiceUsage = purchase?.usage?.serviceUsage;
        if (!purchaseServiceUsage) {
          throw new Error(`Missing usage for package ${purchase.id}`);
        }
        const purchaseCreditsUsed = (purchaseServiceUsage?.aiUsageDetails?.totalCreditsUsed + purchaseServiceUsage?.crawlUsageDetails?.totalCreditsUsed) ?? 0;
        const remainingCredits = purchaseSnapshot.creditAmount - purchaseCreditsUsed;
        return {
          id: purchase.id,
          name: purchase.creditPackage?.name ?? 'Unknown Package',
          creditsUsed: purchaseCreditsUsed,
          creditLimit: purchaseSnapshot.creditAmount,
          percentageUsed: (purchaseCreditsUsed / purchaseSnapshot.creditAmount) * 100,
          remainingCredits,
          serviceUsage: this.calculatePackageServiceUsage(
            purchase.usage?.serviceUsage ?? null, 
            packageFeature
          ),
          isExpiringSoon: false,
          expiresAt: undefined
        };
      } catch (error) {
        console.error(`Error processing credit package ${purchase.id}:`, error);
        return {
          id: purchase.id,
          name: 'Error Processing Package',
          creditsUsed: 0,
          creditLimit: 0,
          percentageUsed: 0,
          remainingCredits: 0,
          serviceUsage: {},
          isExpiringSoon: false,
          expiresAt: undefined
        };
      }
    }).filter(pkg => pkg !== null);
    const totalUsage = this.calculateTotalUsage(subscriptionState, activePackages);
    return {
      subscription: subscriptionState,
      creditPackages: {
        active: activePackages,
        expired: []
      },
      totalUsage,
      serviceDetails: this.calculateServiceDetails(
        activeSubscription?.usage?.serviceUsage ?? null,
        (shop.creditPurchases ?? []).map(p => p?.usage?.serviceUsage ?? null)
      )
    };
  }

  private static calculateSubscriptionServiceUsage(
    serviceUsage: ServiceUsage | null,
    feature: any
  ): { [key in Service]?: ServiceUsageState } {
    const usage: { [key in Service]?: ServiceUsageState } = {};
    if (feature?.aiAPI && serviceUsage?.aiUsageDetails) {
      const aiUsage = serviceUsage?.aiUsageDetails;
      usage[Service.AI_API] = {
        updatedAt: aiUsage?.updatedAt,
        totalCredits: aiUsage.totalCredits,
        totalCreditsUsed: aiUsage.totalCreditsUsed ?? 0,
        remainingCredits: aiUsage.totalRemainingCredits ?? 0,
        totalRequests: aiUsage.totalRequests ?? feature.aiAPI.requestLimits,
        totalRequestsUsed: aiUsage.totalRequestsUsed ?? 0,
        remainingRequests: aiUsage.totalRemainingRequests ?? (feature.aiAPI.requestLimits - aiUsage.totalRequestsUsed),
        percentageUsed: ((aiUsage.totalRequestsUsed ?? 0) / feature.aiAPI.requestLimits) * 100,
        isApproachingLimit: (((aiUsage.totalRequestsUsed ?? 0) / feature.aiAPI.requestLimits) * 100) >= 80,
        rateLimit: {
          rpm: feature.aiAPI.RPM,
          rpd: feature.aiAPI.RPD,
          tpm: feature.aiAPI.TPM,
          tpd: feature.aiAPI.TPD ?? 0,
          maxTokens: feature.aiAPI.maxTokens
        }
      };
    }
    if (feature?.crawlAPI && serviceUsage?.crawlUsageDetails) {
      const crawlUsage = serviceUsage.crawlUsageDetails;
      usage[Service.CRAWL_API] = {
        updatedAt: crawlUsage?.updatedAt,
        totalCredits: crawlUsage.totalCredits,
        totalCreditsUsed: crawlUsage.totalCreditsUsed ?? 0,
        remainingCredits: crawlUsage.totalRemainingCredits ?? 0,
        totalRequests: crawlUsage.totalRequests ?? feature.crawlAPI.requestLimits,
        totalRequestsUsed: crawlUsage.totalRequestsUsed ?? 0,
        remainingRequests: crawlUsage.totalRemainingRequests ?? (feature.crawlAPI.requestLimits - crawlUsage.totalRequestsUsed),
        percentageUsed: ((crawlUsage.totalRequestsUsed ?? 0) / feature.crawlAPI.requestLimits) * 100,
        isApproachingLimit: (((crawlUsage.totalRequestsUsed ?? 0) / feature.crawlAPI.requestLimits) * 100) >= 80
      };
    }
    return usage;
  }

  private static calculateCreditsUsed(usage: Usage): number {
    if (!usage.serviceUsage) return 0;
    const aiCredits = usage.serviceUsage.aiUsageDetails?.totalRequestsUsed ?? 0;
    const crawlCredits = usage.serviceUsage.crawlUsageDetails?.totalRequestsUsed ?? 0;
    return (aiCredits * this.CREDIT_CONVERSION[Service.AI_API]) +
           (crawlCredits * this.CREDIT_CONVERSION[Service.CRAWL_API]);
  }

  private static calculatePackageServiceUsage(
    serviceUsage: ServiceUsage | null,
    feature: any
  ): { [key in Service]?: ServiceUsageState } {
    const usage: { [key in Service]?: ServiceUsageState } = {};
    if (feature?.aiAPI && serviceUsage?.aiUsageDetails) {
      const aiUsage = serviceUsage.aiUsageDetails;
      usage[Service.AI_API] = {
        totalCredits: aiUsage.totalCredits,
        totalCreditsUsed: aiUsage.totalCreditsUsed ?? 0,
        remainingCredits: aiUsage.totalRemainingCredits ?? 0,
        updatedAt: aiUsage?.updatedAt,
        totalRequests: aiUsage.totalRequests ?? feature.aiAPI.requestLimits,
        totalRequestsUsed: aiUsage.totalRequestsUsed ?? 0,
        remainingRequests: aiUsage.totalRemainingRequests ?? feature.aiAPI.requestLimits,
        percentageUsed: ((aiUsage.totalRequestsUsed ?? 0) / feature.aiAPI.requestLimits) * 100,
        isApproachingLimit: (((aiUsage.totalRequestsUsed ?? 0) / feature.aiAPI.requestLimits) * 100) >= 80
      };
    }
    if (feature?.crawlAPI && serviceUsage?.crawlUsageDetails) {
      const crawlUsage = serviceUsage.crawlUsageDetails;
      usage[Service.CRAWL_API] = {
        updatedAt: crawlUsage?.updatedAt,
        totalCredits: crawlUsage.totalCredits,
        totalCreditsUsed: crawlUsage.totalCreditsUsed ?? 0,
        remainingCredits: crawlUsage.totalRemainingCredits ?? 0,
        totalRequests: crawlUsage.totalRequests ?? feature.crawlAPI.requestLimits,
        totalRequestsUsed: crawlUsage.totalRequestsUsed ?? 0,
        remainingRequests: crawlUsage.totalRemainingRequests ?? feature.crawlAPI.requestLimits,
        percentageUsed: ((crawlUsage.totalRequestsUsed ?? 0) / feature.crawlAPI.requestLimits) * 100,
        isApproachingLimit: (((crawlUsage.totalRequestsUsed ?? 0) / feature.crawlAPI.requestLimits) * 100) >= 80
      };
    }
    return usage;
  }
  
  private static calculateTotalUsage(
    subscription: UsageState['subscription'],
    packages: PackageState[]
  ): UsageState['totalUsage'] {
    const serviceUsage: Record<Service, {
      updatedAt: Date;
      requests: number;
      credits: number;
      limit: number;
      creditLimit: number;
      percentageUsed: number;
      isApproachingLimit: boolean;
      isOverLimit: boolean;
    }> = {
      [Service.AI_API]: {
        updatedAt: new Date(),
        requests: 0,
        credits: 0,
        limit: 0,
        creditLimit: 0,
        percentageUsed: 0,
        isApproachingLimit: false,
        isOverLimit: false
      },
      [Service.CRAWL_API]: {
        updatedAt: new Date(),
        requests: 0,
        credits: 0,
        limit: 0,
        creditLimit: 0,
        percentageUsed: 0,
        isApproachingLimit: false,
        isOverLimit: false
      }
    };
    Object.entries(subscription.serviceUsage).forEach(([service, usage]) => {
      try {
        const serviceKey = service as Service;
        serviceUsage[serviceKey].updatedAt = usage.updatedAt;
        serviceUsage[serviceKey].requests += usage.totalRequestsUsed;
        serviceUsage[serviceKey].limit += usage.totalRequests;
        serviceUsage[serviceKey].credits += usage.totalCreditsUsed;
        serviceUsage[serviceKey].creditLimit += usage.totalCredits;
      } catch (error) {
        console.error(`Error processing subscription usage for service ${service}:`, error);
      }
    });
    packages.forEach((pkg, index) => {
      try {
        Object.entries(pkg.serviceUsage).forEach(([service, usage]) => {
          const serviceKey = service as Service;
          serviceUsage[serviceKey].updatedAt = usage.updatedAt;
          serviceUsage[serviceKey].requests += usage.totalRequestsUsed;
          serviceUsage[serviceKey].limit += usage.totalRequests;
          serviceUsage[serviceKey].credits += usage.totalCreditsUsed;
          serviceUsage[serviceKey].creditLimit += usage.totalCredits;
        });
      } catch (error) {
        console.error(`Error processing package usage for package index ${index}:`, error);
      }
    });
    Object.keys(serviceUsage).forEach(service => {
      try {
        const key = service as Service;
        const usage = serviceUsage[key];
        usage.percentageUsed = usage.limit > 0 ? (usage.requests / usage.limit) * 100 : 0;
        usage.isApproachingLimit = usage.percentageUsed >= 80;
        usage.isOverLimit = usage.percentageUsed >= 100;
      } catch (error) {
        console.error(`Error calculating percentages for service ${service}:`, error);
      }
    });
    let totalCreditsUsed = 0;
    let totalCreditLimit = 0;
    try {
      Object.values(serviceUsage).forEach(usage => {
        totalCreditsUsed += usage.credits;
        totalCreditLimit += usage.creditLimit;
      });
    } catch (error) {
      console.error('Error calculating total credits:', error);
    }
    const remainingCredits = Math.max(0, totalCreditLimit - totalCreditsUsed);
    const totalPercentageUsed = totalCreditLimit > 0 ? (totalCreditsUsed / totalCreditLimit) * 100 : 0;
    return {
      creditsUsed: totalCreditsUsed,
      creditLimit: totalCreditLimit,
      remainingCredits,
      percentageUsed: totalPercentageUsed,
      isOverLimit: totalPercentageUsed >= 100,
      isApproachingLimit: totalPercentageUsed >= 80,
      serviceUsage
    };
  }

  private static calculateServiceDetails(
    subscriptionUsage: ServiceUsage | null,
    packageUsages: (ServiceUsage | null)[]
  ): UsageState['serviceDetails'] {
    const allUsages = [subscriptionUsage, ...(packageUsages || [])].filter((u): u is ServiceUsage => u !== null);
    const serviceDetails: UsageState['serviceDetails'] = {};
    const aiUsages = allUsages.map(u => u.aiUsageDetails).filter(u => u !== null);
    if (aiUsages.length > 0) {
      const percentageUsed = (aiUsages.reduce((sum, usage) => sum + (usage.totalCreditsUsed ?? 0), 0) / 
        aiUsages.reduce((sum, usage) => sum + (usage.totalCredits ?? 0), 0)) * 100;
      serviceDetails[Service.AI_API] = {
        updatedAt: aiUsages[0]?.updatedAt,
        totalCredits: aiUsages.reduce((sum, usage) => sum + (usage.totalCredits ?? 0), 0),
        totalCreditsUsed: aiUsages.reduce((sum, usage) => sum + (usage.totalCreditsUsed ?? 0), 0),
        totalRemainingCredits: aiUsages.reduce((sum, usage) => sum + (usage.totalRemainingCredits ?? 0), 0),
        totalRequests: aiUsages.reduce((sum, usage) => sum + (usage.totalRequests ?? 0), 0),
        totalRequestsUsed: aiUsages.reduce((sum, usage) => sum + (usage.totalRequestsUsed ?? 0), 0),
        totalRemainingRequests: aiUsages.reduce((sum, usage) => 
          sum + ((usage.totalRequests ?? 0) - (usage.totalRequestsUsed ?? 0)), 0),
        percentageUsed: aiUsages.reduce((sum, usage) => sum + (usage.totalRequestsUsed ?? 0), 0) / aiUsages.reduce((sum, usage) => sum + (usage.totalRequests ?? 0), 0),
        totalTokens: aiUsages.reduce((sum, usage) => sum + (usage.totalTokens ?? 0), 0),
        totalTokensUsed: aiUsages.reduce((sum, usage) => sum + (usage.totalTokensUsed ?? 0), 0),
        totalRemainingTokens: aiUsages.reduce((sum, usage) => 
          sum + ((usage.totalTokens ?? 0) - (usage.totalTokensUsed ?? 0)), 0),
        inputTokens: aiUsages.reduce((sum, usage) => sum + (usage.inputTokensCount ?? 0), 0),
        outputTokens: aiUsages.reduce((sum, usage) => sum + (usage.outputTokensCount ?? 0), 0),
        model: aiUsages[0]?.modelName ?? '',
        percentageUsed,
        isOverLimit: percentageUsed >= 100,
        isApproachingLimit: percentageUsed >= 80,
        rateLimits: {
          requestsPerMinuteLimit: aiUsages.reduce((sum, usage) => sum + (usage.requestsPerMinuteLimit ?? 0), 0),
          requestsPerDayLimit: aiUsages.reduce((sum, usage) => sum + (usage.requestsPerDayLimit ?? 0), 0),
          remainingRequestsPerMinute: aiUsages.reduce((sum, usage) => sum + (usage.remainingRequestsPerMinute ?? 0), 0),
          remainingRequestsPerDay: aiUsages.reduce((sum, usage) => sum + (usage.remainingRequestsPerDay ?? 0), 0),
          resetTimeForMinuteRequests: new Date(Math.min(...aiUsages.map(u => u.resetTimeForMinuteRequests?.getTime() ?? Date.now()))),
          resetTimeForDayRequests: new Date(Math.min(...aiUsages.map(u => u.resetTimeForDayRequests?.getTime() ?? Date.now()))),
          tokensPerMinute: aiUsages.reduce((sum, usage) => sum + (usage.tokensConsumedPerMinute ?? 0), 0),
          tokensPerDay: aiUsages.reduce((sum, usage) => sum + (usage.tokensConsumedPerDay ?? 0), 0)
        }
      };
    } else {
      serviceDetails[Service.AI_API] = this.getDefaultAIServiceDetails();
    }
    const crawlUsages = allUsages.map(u => u.crawlUsageDetails).filter(u => u !== null);
    if (crawlUsages.length > 0) {
      const percentageUsed = (crawlUsages.reduce((sum, usage) => sum + (usage.totalCreditsUsed ?? 0), 0) / 
        crawlUsages.reduce((sum, usage) => sum + (usage.totalCredits ?? 0), 0)) * 100;
      serviceDetails[Service.CRAWL_API] = {
        updatedAt: crawlUsages[0]?.updatedAt,
        totalCredits: crawlUsages.reduce((sum, usage) => sum + (usage.totalCredits ?? 0), 0),
        totalCreditsUsed: crawlUsages.reduce((sum, usage) => sum + (usage.totalCreditsUsed ?? 0), 0),
        totalRemainingCredits: crawlUsages.reduce((sum, usage) => sum + (usage.totalRemainingCredits ?? 0), 0),
        totalRequests: crawlUsages.reduce((sum, usage) => sum + (usage.totalRequests ?? 0), 0),
        totalRequestsUsed: crawlUsages.reduce((sum, usage) => sum + (usage.totalRequestsUsed ?? 0), 0),
        totalRemainingRequests: crawlUsages.reduce((sum, usage) => 
          sum + ((usage.totalRequests ?? 0) - (usage.totalRequestsUsed ?? 0)), 0),
        percentageUsed,
        isOverLimit: percentageUsed >= 100,
        isApproachingLimit: percentageUsed >= 80,
      };
    } else {
      serviceDetails[Service.CRAWL_API] = this.getDefaultCrawlServiceDetails();
    }
    return serviceDetails;
  }

  private static getDefaultAIServiceDetails() {
    return {
      totalRequests: 0,
      totalRequestsUsed: 0,
      totalRemainingRequests: 0,
      totalTokens: 0,
      inputTokens: 0,
      outputTokens: 0,
      totalCredits: 0,
      totalCreditsUsed: 0,
      totalRemainingCredits: 0,
      model: '',
      rateLimits: {
        requestsPerMinuteLimit: 0,
        requestsPerDayLimit: 0,
        remainingRequestsPerMinute: 0,
        remainingRequestsPerDay: 0,
        resetTimeForMinuteRequests: new Date(),
        resetTimeForDayRequests: new Date(),
        tokensPerMinute: 0,
        tokensPerDay: 0
      }
    };
  }

  private static getDefaultCrawlServiceDetails() {
    return {
      totalRequests: 0,
      totalRequestsUsed: 0,
      totalRemainingRequests: 0,
      totalCredits: 0,
      totalCreditsUsed: 0,
      totalRemainingCredits: 0,
      rateLimits: {
        requestsPerMinute: 0,
        requestsPerDay: 0
      }
    };
  }

  static async resetUsageCounts(activeSubscription: Subscription, shopId: string): Promise<void> {
    if (!shopId) {
      throw new Error(this.Errors.MISSING_PARAMETERS);
      return;
    }
    if (!activeSubscription) {
      throw new Error(this.Errors.SUBSCRIPTION_NOT_FOUND);
      return;
    }
    if (!activeSubscription?.plan?.feature) {
      throw new Error('Invalid or not found plan feature');
    }
    try {
      await this.retry(async () => {
        const model = await ModelManager.getLatestModel();
        const associatedUsers = await ShopifySessionManager.findCurrentAssociatedUsersByShop(shopName);
        const feature = activeSubscription?.plan?.feature;
        const now = DateTime.utc().toJSDate();
        if (!activeSubscription.usageId) {
          const usage = await prisma.usage.create({
            data: {
              shop: { connect: { id: shop.id } },
              associatedUsers: {
                create: associatedUsers.map(user => ({
                  associatedUser: {
                    connect: { userId: user.userId }
                  }
                }))
              },
              subscription: { connect: { id: activeSubscription.id } },
              serviceUsage: {
                create: {
                  aiUsageDetails: {
                    create: {
                      service: Service.AI_API,
                      modelName: model.name,
                      inputTokensCount: 0,
                      outputTokensCount: 0,
                      totalRequests: feature?.aiAPI?.requestLimits ?? 0,
                      totalRemainingRequests: feature?.aiAPI?.requestLimits ?? 0,
                      totalRequestsUsed: 0,
                      requestsPerMinuteLimit: feature?.aiAPI?.RPM ?? 0,
                      requestsPerDayLimit: feature?.aiAPI?.RDP ?? 0,
                      remainingRequestsPerMinute: feature?.aiAPI?.RPM ?? 0,
                      remainingRequestsPerDay: feature?.aiAPI?.RPD ?? 0,
                      resetTimeForMinuteRequests: now,
                      resetTimeForDayRequests: now,
                      tokensConsumedPerMinute: 0,
                      tokensConsumedPerDay: 0,
                      totalTokens: feature?.aiAPI?.totalTokens ?? 0,
                      totalTokensUsed: 0,
                      lastTokenUsageUpdateTime: now
                    }
                  },
                  crawlUsageDetails: {
                    create: {
                      service: Service.CRAWL_API,
                      totalRequests: feature?.crawlAPI?.requestLimits ?? 0,
                      totalRemainingRequests: feature?.crawlAPI?.requestLimits ?? 0,
                      totalRequestsUsed: 0
                    }
                  }
                }
              }
            }
          });
          await prisma.subscription.update({
            where: { id: activeSubscription.id },
            data: {
              usage: { connect: { id: usage.id } }
            }
          });
        } else {
          await prisma.usage.update({
            where: { id: activeSubscription.usageId },
            data: {
              serviceUsage: {
                upsert: {
                  create: {
                    aiUsageDetails: {
                      create: {
                        service: Service.AI_API,
                        modelName: model.name,
                        inputTokensCount: 0,
                        outputTokensCount: 0,
                        totalRequests: feature?.aiAPI?.requestLimits 
                        ?? (feature?.aiAPI?.creditLimits / feature?.aiAPI?.conversionRate ?? this.CREDIT_CONVERSION[Service.AI_API]),
                        totalRemainingRequests: feature?.aiAPI?.requestLimits 
                        ?? (feature?.aiAPI?.creditLimits / feature?.aiAPI?.conversionRate ?? this.CREDIT_CONVERSION[Service.AI_API]),
                        totalRequestsUsed: 0,
                        requestsPerMinuteLimit: feature?.aiAPI?.RPM ?? 0,
                        requestsPerDayLimit: feature?.aiAPI?.RDP ?? 0,
                        remainingRequestsPerMinute: feature?.aiAPI?.RPM ?? 0,
                        remainingRequestsPerDay: feature?.aiAPI?.RPD ?? 0,
                        resetTimeForMinuteRequests: now,
                        resetTimeForDayRequests: now,
                        tokensConsumedPerMinute: 0,
                        tokensConsumedPerDay: 0,
                        totalTokens: feature?.aiAPI?.totalTokens ?? 0,
                        totalTokensUsed: 0,
                        totalCredits: feature?.aiAPI?.creditLimits ?? 0,
                        totalCreditsUsed: 0,
                        totalRemainingCredits: feature?.aiAPI?.creditLimits ?? 0,
                        lastTokenUsageUpdateTime: now
                      }
                    },
                    crawlUsageDetails: {
                      create: {
                        service: Service.CRAWL_API,
                        totalRequests: feature?.crawlAPI?.requestLimits 
                        ?? (feature?.crawlAPI?.creditLimits / feature?.crawlAPI?.conversionRate ?? this.CREDIT_CONVERSION[Service.CRAWL_API]),
                        totalRemainingRequests: feature?.crawlAPI?.requestLimits 
                        ?? (feature?.crawlAPI?.creditLimits / feature?.crawlAPI?.conversionRate ?? this.CREDIT_CONVERSION[Service.CRAWL_API]),
                        totalRequestsUsed: 0,
                        totalCredits: feature?.crawlAPI?.creditLimits ?? 0,
                        totalCreditsUsed: 0,
                        totalRemainingCredits: feature?.crawlAPI?.creditLimits ?? 0,
                      }
                    }
                  },
                  update: {
                    aiUsageDetails: {
                      upsert: {
                        create: {
                          service: Service.AI_API,
                          modelName: model.name,
                          inputTokensCount: 0,
                          outputTokensCount: 0,
                          totalRequests: feature?.aiAPI?.requestLimits 
                          ?? (feature?.aiAPI?.creditLimits / feature?.aiAPI?.conversionRate ?? this.CREDIT_CONVERSION[Service.AI_API]),
                          totalRemainingRequests: feature?.aiAPI?.requestLimits 
                          ?? (feature?.aiAPI?.creditLimits / feature?.aiAPI?.conversionRate ?? this.CREDIT_CONVERSION[Service.AI_API]),
                          totalRequestsUsed: 0,
                          requestsPerMinuteLimit: feature?.aiAPI?.RPM ?? 0,
                          requestsPerDayLimit: feature?.aiAPI?.RDP ?? 0,
                          remainingRequestsPerMinute: feature?.aiAPI?.RPM ?? 0,
                          remainingRequestsPerDay: feature?.aiAPI?.RPD ?? 0,
                          resetTimeForMinuteRequests: now,
                          resetTimeForDayRequests: now,
                          tokensConsumedPerMinute: 0,
                          tokensConsumedPerDay: 0,
                          totalTokens: feature?.aiAPI?.totalTokens ?? 0,
                          totalTokensUsed: 0,
                          totalCredits: feature?.aiAPI?.creditLimits ?? 0,
                          totalCreditsUsed: 0,
                          totalRemainingCredits: feature?.aiAPI?.creditLimits ?? 0,
                          lastTokenUsageUpdateTime: now
                        },
                        update: {
                          modelName: model.name,
                          inputTokensCount: 0,
                          outputTokensCount: 0,
                          totalRequests: feature?.aiAPI?.requestLimits 
                          ?? (feature?.aiAPI?.creditLimits / feature?.aiAPI?.conversionRate ?? this.CREDIT_CONVERSION[Service.AI_API]),
                          totalRemainingRequests: feature?.aiAPI?.requestLimits 
                          ?? (feature?.aiAPI?.creditLimits / feature?.aiAPI?.conversionRate ?? this.CREDIT_CONVERSION[Service.AI_API]),
                          totalRequestsUsed: 0,
                          requestsPerMinuteLimit: feature?.aiAPI?.RPM ?? 0,
                          requestsPerDayLimit: feature?.aiAPI?.RDP ?? 0,
                          remainingRequestsPerMinute: feature?.aiAPI?.RPM ?? 0,
                          remainingRequestsPerDay: feature?.aiAPI?.RPD ?? 0,
                          resetTimeForMinuteRequests: now,
                          resetTimeForDayRequests: now,
                          tokensConsumedPerMinute: 0,
                          tokensConsumedPerDay: 0,
                          totalTokens: feature?.aiAPI?.totalTokens ?? 0,
                          totalTokensUsed: 0,
                          totalCredits: feature?.aiAPI?.creditLimits ?? 0,
                          totalCreditsUsed: 0,
                          totalRemainingCredits: feature?.aiAPI?.creditLimits ?? 0,
                          lastTokenUsageUpdateTime: now
                        }
                      }
                    },
                    crawlUsageDetails: {
                      upsert: {
                        create: {
                          service: Service.CRAWL_API,
                          totalRequests: feature?.crawlAPI?.requestLimits 
                          ?? (feature?.crawlAPI?.creditLimits / feature?.crawlAPI?.conversionRate ?? this.CREDIT_CONVERSION[Service.CRAWL_API]),
                          totalRemainingRequests: feature?.crawlAPI?.requestLimits 
                          ?? (feature?.crawlAPI?.creditLimits / feature?.crawlAPI?.conversionRate ?? this.CREDIT_CONVERSION[Service.CRAWL_API]),
                          totalRequestsUsed: 0,
                          totalCredits: feature?.crawlAPI?.creditLimits ?? 0,
                          totalCreditsUsed: 0,
                          totalRemainingCredits: feature?.crawlAPI?.creditLimits ?? 0,
                        },
                        update: {
                          totalRequests: feature?.crawlAPI?.requestLimits 
                          ?? (feature?.crawlAPI?.creditLimits / feature?.crawlAPI?.conversionRate ?? this.CREDIT_CONVERSION[Service.CRAWL_API]),
                          totalRemainingRequests: feature?.crawlAPI?.requestLimits 
                          ?? (feature?.crawlAPI?.creditLimits / feature?.crawlAPI?.conversionRate ?? this.CREDIT_CONVERSION[Service.CRAWL_API]),
                          totalRequestsUsed: 0,
                          totalCredits: feature?.crawlAPI?.creditLimits ?? 0,
                          totalCreditsUsed: 0,
                          totalRemainingCredits: feature?.crawlAPI?.creditLimits ?? 0,
                        }
                      }
                    }
                  }
                }
              }
            }
          });
        }
      }, {
        timeout: UsageManager.TRANSACTION_TIMEOUT,
        maxWait: UsageManager.MAX_WAIT,
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable
      });
    } catch (error) {
      console.error('Failed to reset usage state:', error);
      throw error;
    }
  }
private static async checkLastNotification(
    shopId: string,
    type: NotificationType,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    const lastNotification = await prisma.notification.findFirst({
      where: {
        shopId,
        type,
        ...(metadata && {
          metadata: {
            equals: metadata
          }
        }),
        createdAt: {
          gte: DateTime.utc().minus({ hours: 24 }).toJSDate()
        }
      }
    });
    return !!lastNotification;
  }

  private static getNotificationConfig(type: NotificationType): {
    title: string;
    generateMessage: (data: any) => string;
    recommendations: string[];
  } {
    const configs = {
      [NotificationType.USAGE_OVER_LIMIT]: {
        title: 'Usage Limit Exceeded',
        generateMessage: (usageState: UsageState) => 
          this.generateUsageLimitMessage(usageState, true),
        recommendations: [
          'Consider upgrading your subscription plan to avoid service interruptions',
          'Review your API usage patterns to identify potential optimizations',
          'Contact support for temporary limit extensions if needed'
        ]
      },
      [NotificationType.USAGE_APPROACHING_LIMIT]: {
        title: 'Usage Limit Approaching',
        generateMessage: (usageState: UsageState) => 
          this.generateUsageLimitMessage(usageState, false),
        recommendations: [
          'Monitor your usage closely over the next few days',
          'Consider implementing rate limiting in your application',
          'Review our documentation for usage optimization tips'
        ]
      },
      [NotificationType.PACKAGE_EXPIRED]: {
          title: 'Credit Package Expired',
          generateMessage: (data: { 
              packageName: string;
              currentUsage: number;
              usageLimit: number;
              activePackagesCount: number;
          }) => this.generatePackageExpiredMessage(data),
          recommendations: (activePackagesCount: number) => [
              activePackagesCount === 0 ? 'Purchase credits immediately to avoid service interruption' : 'Purchase additional credits',
              'Upgrade to a higher tier plan',
              'Contact support for custom solutions'
          ]
      },
      [NotificationType.SUBSCRIPTION_EXPIRED]: {
        title: 'Subscription Usage Limit',
        generateMessage: (service) => 
          `Your subscription usage for ${service === Service.CRAWL_API ? 'Crawl API' : 'AI API'} service has reached. Doc2Product will proceed to use your active credit packages (if any)`,
        recommendations: [
          'Purchase additional credits',
          'Upgrade to a higher tier plan',
          'Contact support for custom solutions'
        ]
      }
    };
    return configs[type];
  }

  private static async createNotification(
    data: {
      shopId: string;
      type: NotificationType;
      title: string;
      message: string;
      metadata?: Record<string, any>;
    }
  ): Promise<Notification> {
    return prisma.notification.create({ data });
  }

  private static async handleUsageNotification(
    usageState: UsageState,
    shopId: string,
    shopName: string,
    email: string,
  ): Promise<void> {
    const { totalUsage, serviceDetails } = usageState;
    const isOverLimit = totalUsage.isOverLimit || 
      Object.values(serviceDetails).some(service => service.isOverLimit);
    const isApproachingLimit = totalUsage.isApproachingLimit || 
      Object.values(serviceDetails).some(service => service.isApproachingLimit);
    if (!isOverLimit && !isApproachingLimit) {
      return;
    }
    const notificationType = isOverLimit 
      ? NotificationType.USAGE_OVER_LIMIT 
      : NotificationType.USAGE_APPROACHING_LIMIT;
    try {
      const hasRecentNotification = await this.checkLastNotification(
        shopId,
        notificationType,

      );
      if (hasRecentNotification) return;
      const config = this.getNotificationConfig(notificationType);
      await this.createNotification({
        shopId,
        type: notificationType,
        title: config.title,
        message: config.generateMessage(usageState)
      });
      await this.sendNotificationEmail(email, {
        shopName,
        usageData: this.generateUsageEmailData(usageState),
        notificationType
      });
    } catch (error) {
      console.error('Failed to handle usage notification:', error);
      throw error;
    }
  }

  static async handlePackageExpired(
    shopId: string,
    shopName: string,
    purchase: CreditPurchase,
    activePackages: CreditPurchase[],
    email: string
  ): Promise<void> {
    const hasRecentNotification = await this.checkLastNotification(
      shopId,
      NotificationType.PACKAGE_EXPIRED,
      { packageName: purchase.creditPackage.name }
    );
    if (hasRecentNotification) return;
    await prisma.creditPurchase.update({
      where: { id: purchase.id },
      data: { 
        status: PackageStatus.EXPIRED, 
        updatedAt: DateTime.utc().toJSDate(),
        expiredAt: DateTime.utc().toJSDate()  
      }
    });
    const usageData = {
      packageName: purchase?.creditPackage?.name,
      currentUsage: purchase.usage?.creditsUsed || 0,
      usageLimit: purchase.creditPackage.creditAmount || 0,
      expiredDate: DateTime.utc().toLocal().toFormat('cccc, dd MMMM yyyy'),
      activePackagesCount: activePackages.length
    }
    const config = this.getNotificationConfig(NotificationType.PACKAGE_EXPIRED);
    await this.createNotification({
      shopId,
      type: NotificationType.PACKAGE_EXPIRED,
      title: config.title,
      message: config.generateMessage(usageData),
      metadata: { 
        packageName: purchase.creditPackage.name,
        activePackagesCount: activePackages.length
      }
    });
    await this.sendNotificationEmail(email, {
      shopName,
      usageData,
      activePackages,
      notificationType: NotificationType.PACKAGE_EXPIRED
    });
  }

  static async handleSubscriptionExpired(
    shopId: string,
    shopName: string,
    service: Service,
    subscription: CreditPurchase,
    email: string
  ): Promise<void> {
    const hasRecentNotification = await this.checkLastNotification(
      shopId,
      NotificationType.SUBSCRIPTION_EXPIRED,
      { 
        subscriptionId: subscription.id,
        service: service 
      }
    );
    if (hasRecentNotification) return;
    const config = this.getNotificationConfig(NotificationType.SUBSCRIPTION_EXPIRED);
    await this.createNotification({
      shopId,
      type: NotificationType.SUBSCRIPTION_EXPIRED,
      title: config.title,
      message: config.generateMessage(service),
      metadata: { 
        subscriptionId: subscription.id,
        service
      }
    });
    await this.sendNotificationEmail(email, {
      shopName,
      usageData: {
        nextResetDate: subscription?.endDate 
          ? DateTime.fromJSDate(subscription.endDate).plus({ days: 1 }).toFormat('cccc, dd MMMM yyyy') 
          : 'N/A',
        service
      },           
      notificationType: NotificationType.SUBSCRIPTION_EXPIRED
    });
  }

  private static generateUsageLimitMessage(usageState: UsageState, isOverLimit: boolean): string {
    const messages: string[] = [];
    const { totalUsage, serviceDetails } = usageState;
    if (isOverLimit && totalUsage.isOverLimit) {
      messages.push(`Total usage has exceeded the limit (${(totalUsage.percentageUsed).toFixed(1)}%)`);
    } else if (!isOverLimit && totalUsage.isApproachingLimit) {
      messages.push(`Total usage is approaching the limit (${(totalUsage.percentageUsed).toFixed(1)}%)`);
    }
    Object.entries(serviceDetails).forEach(([service, details]) => {
      if (isOverLimit && details.isOverLimit) {
        messages.push(`${service === Service.CRAWL_API ? 'Crawl API' : 'AI API'} service has exceeded its usage limit (${(details.percentageUsed).toFixed(1)}%)`);
      } else if (!isOverLimit && details.isApproachingLimit) {
        messages.push(`${service === Service.CRAWL_API ? 'Crawl API' : 'AI API'} service is approaching its usage limit (${(details.percentageUsed).toFixed(1)}%)`);
      }
    });
    return messages.join('. ');
  }

  private static generatePackageExpiredMessage(data: {
    packageName: string;
    currentUsage: number;
    usageLimit: number;
    activePackagesCount: number;
  }): string {
    const { packageName, activePackagesCount } = data;
    if (activePackagesCount === 0) {
      return `Your ${packageName} package has expired. You have no active packages remaining. To continue using our services, please purchase additional credits or upgrade your package.`;
    }
    return `Your ${packageName} package has expired. You have ${activePackagesCount} active package${activePackagesCount > 1 ? 's' : ''} remaining. Consider purchasing additional credits to ensure uninterrupted service.`;
  }

  private static generateUsageEmailData(usageState: UsageState): any {
    return {
      totalUsage: {
        creditsUsed: usageState.totalUsage.creditsUsed,
        creditLimit: usageState.totalUsage.creditsLimit,
        percentageUsed: usageState.totalUsage.percentageUsed,
        isOverLimit: usageState.totalUsage.isOverLimit,
        isApproachingLimit: usageState.totalUsage.isApproachingLimit
      },
      serviceDetails: Object.entries(usageState.serviceDetails).map(([service, details]) => ({
        service,
        totalRequests: details.totalRequests,
        totalRequestsUsed: details.totalRequestsUsed,
        percentageUsed: details.percentageUsed,
        isOverLimit: details.isOverLimit,
        isApproachingLimit: details.isApproachingLimit,
        remainingRequests: details.totalRemainingRequests
      }))
    };
  }

  private static async sendNotificationEmail(
    email: string,
    data: {
      shopName: string;
      usageData?: any;
      activePackages?: CreditPurchase[];
      notificationType: NotificationType;
    }
  ): Promise<void> {
    const isEmailValid = email && this.isValidEmail(email);
    if (!isEmailValid) {
      console.log(this.Errors.NO_EMAIL_PROVIDED);
      return;
    }
    const { shopName, usageData, activePackages, notificationType } = data;
    try {
    const config = this.getNotificationConfig(notificationType);
    const emailData = {
      shopName,
      ...(usageData && { usageDetails: usageData }),
      ...(activePackages && { activePackages: activePackages }),
    };
    await emailService.initialize();
    await emailService.sendUsageEmail(email, emailData, notificationType);
    } catch (error) {
      console.error('Failed to send usage email:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email,
        shopName,
        notificationType
      });
      if (error instanceof EmailServiceError) {
        switch (error.code) {
          case 'DATA_ERROR':
              console.error('Invalid email data:', error.details);
              break;
          case 'TEMPLATE_ERROR':
              console.error('Email template error:', error.message);
              break;
          case 'SEND_ERROR':
              console.error('Email sending failed:', error.details);
              break;
          default:
              console.error('Unexpected email service error:', error);
        }
      }
      throw error;
    }
  }
}


