import { PrismaClient, Prisma, Shop, ModelName, Service, ServiceUsage, SubscriptionStatus, PackageStatus, Usage, Payment, PaymentStatus, AIUsageDetails } from '@prisma/client';
import { ShopifySessionManager } from '@/utils/storage';
import { SubscriptionManager } from '@/utils/billing';
import { MathUtils } from '@/utils/utilities/mathUtils';
import { prisma } from '@/lib/prisma';

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

interface UserIds {
  googleUserId?: string;
  associatedUserId?: string;
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

  private static readonly TOTAL_CONVERSION_RATE = 1.1;

  private static calculateCreditsNeeded(service: Service, calls: number): number {
    return calls * UsageManager.CREDIT_CONVERSION[service];
  }

  private static calculateCreditsForService(service: Service, totalCredits: number): number {
    const conversionRate = this.CREDIT_CONVERSION[service];
    if (conversionRate === undefined) {
      throw new Error(`Service ${service} not found in CREDIT_CONVERSION.`);
    }
    const result = (totalCredits * conversionRate) / this.TOTAL_CONVERSION_RATE;
    return MathUtils.floor(result, 2);
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
    serviceDetails?: ServiceDetails,
    userId?: string
  ): Promise<void> {
    const shop = await ShopifySessionManager.findShopByName(shopName);
    if (!shop) {
      throw new Error(`Shop not found: ${shopName}`);
    }
    try {
      await prisma.$transaction(async (tx) => {
        const remainingRequests = await this.deductFromSubscription(
          tx,
          shopName,
          shop.id,
          service,
          serviceDetails,
          userId
        );
        if (remainingRequests > 0) {
          await this.deductFromCreditPackages(
            tx,
            shop.id,
            service,
            serviceDetails,
            userId
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
        tokenLimits: service === Service.AI_API ? feature.aiAPI.tokenLimits : undefined,
        creditLimits: service === Service.AI_API ? feature.aiAPI.creditLimits : feature.crawlAPI.creditLimits
      };
      if (feature) {
        await this.findOrCreateServiceUsage(tx, usage.id, service, serviceDetails, limits);
      }
      return usage;
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
      const totalCredits = this.calculateCreditsNeeded(service, limits?.creditLimits);
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
            totalCredits: totalCredits,
            totalCreditsUsed: { increment: creditsToDeduct },
            totalRemainingCredits: totalCredits - newTotalCreditsUsed,
            resetTimeForMinuteRequests: this.convertUnixTimestampToSupabaseDateTime(
              serviceDetails.aiDetails.resetTimeForMinuteRequests
            ),
            resetTimeForDayRequests: this.convertUnixTimestampToSupabaseDateTime(
              serviceDetails.aiDetails.resetTimeForDayRequests
            ),
            lastTokenUsageUpdateTime: timeDiff > this.TIME_MINUTE_LIMIT ? now : existingUsage.aiUsageDetails?.lastTokenUsageUpdateTime,
          },
        });
      } else if (service === Service.CRAWL_API && serviceDetails?.crawlDetails) {
        const newTotalRequestsUsed = (existingUsage.crawlUsageDetails?.totalRequestsUsed ?? 0) + requestsToDeduct;
        await tx.crawlUsageDetails.update({
          where: { id: existingUsage.crawlUsageId },
          data: {
            totalRequests: limits?.requestLimits ?? 0,
            totalRequestsUsed: { increment: requestsToDeduct },
            totalRemainingRequests: (limits?.requestLimits ?? 0) - newTotalRequestsUsed,
            totalCredits: totalCredits,
            totalCreditsUsed: { increment: creditsToDeduct },
            totalRemainingCredits: totalCredits - (existingUsage.crawlUsageDetails?.totalCreditsUsed ?? 0 + creditsToDeduct),
          },
        });
      }
    } catch (error) {
      console.error('Error updating service usage:', error);
      throw new Error('Failed to update service usage: ' + error.message);
    }
  }

  private static async deductFromSubscription(
    tx: Prisma.TransactionClient,
    shopName: stripng,
    shopId: string,
    service: Service,
    serviceDetails?: ServiceDetails,
    userId?: string
  ): Promise<number> {
    const calls = service === Service.AI_API ? serviceDetails.aiDetails.totalRequests : serviceDetails.crawlDetails.totalRequests;
    let remainingCalls = calls;
    const subscription = await SubscriptionManager.getCurrentSubscription(shopName);
    const subscriptionCreditLimits = subscription?.creditBalance || subscription?.plan?.creditAmount;
    if (subscription?.status !== SubscriptionStatus.ACTIVE) {
      return calls;
    }
    const feature = await this.getServiceFeature(tx, subscription.planId, service);
    if (!feature) {
      return calls;
    }
    const limits = {
      requestLimits: service === Service.AI_API ? feature.aiAPI.requestLimits : feature.crawlAPI.requestLimits,
      tokenLimits: service === Service.AI_API ? feature.aiAPI.tokenLimits : undefined,
      creditLimits: service === Service.AI_API ? feature.aiAPI.creditLimits : feature.crawlAPI.creditLimits
    };
    const usage = await this.findOrCreateUsage(tx, shopId, 'subscription', subscription.id, service, serviceDetails);
    const currentUsage = service === Service.AI_API 
      ? usage.serviceUsage.aiUsageDetails.totalRequestsUsed 
      : usage.serviceUsage.crawlUsageDetails.totalRequestsUsed;
    const requestLimit = service === Service.AI_API 
      ? feature.aiAPI.requestLimits 
      : feature.crawlAPI.requestLimits;
    const creditLimit = service === Service.AI_API 
      ? feature.aiAPI.creditLimits 
      : feature.crawlAPI.creditLimits;
    const availableRequests = requestLimit - (currentUsage ?? 0);
    const availableCredits = creditLimit - (usage.totalCreditsUsed ?? 0);
    const requestsToDeduct = Math.min(availableRequests, calls);
    const creditsToDeduct = Math.min(availableCredits, this.calculateCreditsNeeded(service, requestsToDeduct));
    const newTotalCreditsUsed = (usage?.totalCreditsUsed ?? 0) + creditsToDeduct;
    if (userId) {
      await this.updateUserConnections(tx, usage.id, userId);
    }
    if (creditsToDeduct > 0) {
      await tx.usage.update({
        where: { id: usage.id },
        data: {
          totalCreditsUsed: {
            increment: creditsToDeduct
          },
          totalCredits: subscriptionCreditLimits,
          totalRemainingCredits: subscriptionCreditLimits - newTotalCreditsUsed, 
          updatedAt: new Date()
        }
      });
      await this.updateExistingServiceUsage(tx, usage.serviceUsage, service, requestsToDeduct, creditsToDeduct, serviceDetails, limits);
      remainingCalls -= requestsToDeduct;
    }
    if (remainingCalls > 0) {
      throw new Error('Insufficient credits available');
    }
    return remainingCalls;
  }

  private static async deductFromCreditPackages(
    tx: Prisma.TransactionClient,
    shopId: string,
    service: Service,
    serviceDetails?: ServiceDetails,
    userId?: string
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
        }
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
        creditLimits: service === Service.AI_API ? feature.aiAPI.creditLimits : feature.crawlAPI.creditLimits
      };
      const usage = await this.findOrCreateUsage(tx, shopId, 'creditPurchase', pkg.id, service, serviceDetails);
      const currentUsage = service === Service.AI_API
      ? usage.serviceUsage?.aiUsageDetails?.totalRequestsUsed ?? 0
      : usage.serviceUsage?.crawlUsageDetails?.totalRequestsUsed ?? 0;
      const requestLimit = service === Service.AI_API 
      ? feature.aiAPI.requestLimits 
      : feature.crawlAPI.requestLimits;
      const creditLimit = service === Service.AI_API 
      ? feature.aiAPI.creditLimits 
      : feature.crawlAPI.creditLimits;
      const availableRequests = limit - currentUsage;
      const availableCredits = packageCredits - (usage.totalCreditsUsed ?? 0);
      const requestsToDeduct = Math.min(availableRequests, remainingCalls);
      const creditsToDeduct = Math.min(availableCredits, this.calculateCreditsNeeded(service, requestsToDeduct));
      const newTotalCreditsUsed = (usage?.totalCreditsUsed ?? 0) + creditsToDeduct;
      if (requestsToDeduct > 0) {
        await tx.usage.update({
          where: { id: usage.id },
          data: {
            totalCreditsUsed: {
              increment: creditsToDeduct
            },
            totalCredits: packageCredits,
            totalRemainingCredits: packageCredits - newTotalCreditsUsed, 
            updatedAt: new Date()
          }
        });
        await this.updateExistingServiceUsage(tx, usage.serviceUsage, service, requestsToDeduct, creditsToDeduct, serviceDetails, limits);
        if (userId) {
          await this.updateUserConnections(tx, usage.id, userId);
        }
        if (creditsToDeduct > 0) {
          await tx.creditPurchase.update({
            where: { id: pkg.id },
            data: {
              status: PackageStatus.EXPIRED,
              updatedAt: new Date()
            }
          });
        }
        remainingCalls -= requestsToDeduct;
      }
    }
    if (remainingCalls > 0) {
      throw new Error('Insufficient credits available');
    }
    return remainingCalls;
  }

  private static async updateUserConnections(
    tx: Prisma.TransactionClient,
    usageId: string,
    userId: string 
  ): Promise<void> {
    if (!userId) return; 
    await tx.associatedUserToUsage({
      data: {
        usageId,
        associatedUserId: BigInt(userId)
      }
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

  static async getUsageState(shopName: string): Promise<UsageState> {
    const shop = await prisma.shop.findUnique({
      where: { name: shopName },
      include: {
        subscriptions: {
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
    if (!shop) throw new Error('Shop not found');
    let activeSubscription = await SubscriptionManager.getCurrentSubscription(shopName);
    if (!activeSubscription) {
      activeSubscription = await this.createDefaultSubscription(shop?.id);
      if (!activeSubscription) {
        throw new Error('Failed to create a default subscription');
      }
    }
    const feature = activeSubscription?.plan?.feature;
    const creditsUsed = this.calculateCreditsUsed(activeSubscription.usage) ?? activeSubscription.usage.totalCreditsUsed ?? 0;
    const subscriptionState = {
      id: activeSubscription?.id ?? null,
      status: activeSubscription?.status ?? SubscriptionStatus.EXPIRED,
      planName: activeSubscription?.plan?.name ?? 'FREE',
      creditsUsed,
      creditLimit: activeSubscription?.plan?.creditAmount,
      percentageUsed: (creditsUsed / activeSubscription?.plan?.creditAmount) * 100,
      remainingCredits: activeSubscription?.plan?.creditAmount - creditsUsed,
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
        const creditsUsed = this.calculateCreditsUsed(purchase.usage) ?? purchase.usage.totalCreditsUsed ?? 0;
        const remainingCredits = purchaseSnapshot.creditAmount - totalCreditsUsed;
        return {
          id: purchase.id,
          name: purchase.creditPackage?.name ?? 'Unknown Package',
          creditsUsed,
          creditLimit: purchaseSnapshot.creditAmount,
          percentageUsed: (creditsUsed / purchaseSnapshot.creditAmount) * 100,
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
        totalRemainingCredits: aiUsage.totalRemainingCredits ?? 0,
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
        totalRemainingCredits: crawlUsage.totalRemainingCredits ?? 0,
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
        totalRemainingCredits: aiUsage.totalRemainingCredits ?? 0,
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
        totalRemainingCredits: crawlUsage.totalRemainingCredits ?? 0,
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
      percentageUsed: number;
      isApproachingLimit: boolean;
      isOverLimit: boolean;
    }> = {
      [Service.AI_API]: {
        updatedAt: new Date(),
        requests: 0,
        credits: 0,
        requestLimits: 0,
        creditLimits: 0,
        percentageUsed: 0,
        isApproachingLimit: false,
        isOverLimit: false
      },
      [Service.CRAWL_API]: {
        updatedAt: new Date(),
        requests: 0,
        credits: 0,
        requestLimits: 0,
        creditLimits: 0,
        percentageUsed: 0,
        isApproachingLimit: false,
        isOverLimit: false
      }
    };
    Object.entries(subscription.serviceUsage).forEach(([service, usage]) => {
      const serviceKey = service as Service;
      serviceUsage[serviceKey].updatedAt = usage.updatedAt;
      serviceUsage[serviceKey].requests += usage.totalRequestsUsed;
      serviceUsage[serviceKey].requestLimits += usage.totalRequests;
      serviceUsage[serviceKey].creditLimits += usage.totalCredits;
      serviceUsage[serviceKey].credits += usage.totalRequestsUsed * this.CREDIT_CONVERSION[serviceKey];
    });
    packages.forEach(pkg => {
      Object.entries(pkg.serviceUsage).forEach(([service, usage]) => {
        const serviceKey = service as Service;
        serviceUsage[serviceKey].updatedAt = usage.updatedAt;
        serviceUsage[serviceKey].requests += usage.totalRequestsUsed;
        serviceUsage[serviceKey].limit += usage.totalRequests;
        serviceUsage[serviceKey].creditLimits += usage.totalCredits;
        serviceUsage[serviceKey].credits += usage.totalRequestsUsed * this.CREDIT_CONVERSION[serviceKey];
      });
    });
    Object.keys(serviceUsage).forEach(service => {
      const key = service as Service;
      const usage = serviceUsage[key];
      usage.percentageUsed = usage.limit > 0 ? (usage.requests / usage.limit) * 100 : 0;
      usage.isApproachingLimit = usage.percentageUsed >= 80;
      usage.isOverLimit = usage.percentageUsed >= 100;
    });
    const totalCreditsUsed = Object.values(serviceUsage).reduce((sum, usage) => sum + usage.credits, 0);
    const totalCreditLimit = Object.entries(serviceUsage).reduce((sum, [serviceKey, usage]) => 
      sum + (usage.creditLimits * this.CREDIT_CONVERSION[serviceKey as Service]), 0);
    const remainingCredits = totalCreditLimit - totalCreditsUsed;
    const totalPercentageUsed = totalCreditLimit > 0 ? (totalCreditsUsed / totalCreditLimit) * 100 : 0;
    return {
      creditsUsed: totalCreditsUsed,
      creditsLimit: totalCreditLimit,
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
      serviceDetails[Service.CRAWL_API] = {
        updatedAt: crawlUsages[0]?.updatedAt,
        totalCredits: crawlUsages.reduce((sum, usage) => sum + (usage.totalCredits ?? 0), 0),
        totalCreditsUsed: crawlUsages.reduce((sum, usage) => sum + (usage.totalCreditsUsed ?? 0), 0),
        totalRemainingCredits: crawlUsages.reduce((sum, usage) => sum + (usage.totalRemainingCredits ?? 0), 0),
        totalRequests: crawlUsages.reduce((sum, usage) => sum + (usage.totalRequests ?? 0), 0),
        totalRequestsUsed: crawlUsages.reduce((sum, usage) => sum + (usage.totalRequestsUsed ?? 0), 0),
        totalRemainingRequests: crawlUsages.reduce((sum, usage) => 
          sum + ((usage.totalRequests ?? 0) - (usage.totalRequestsUsed ?? 0)), 0),
        percentageUsed: crawlUsages.reduce((sum, usage) => sum + (usage.totalRequestsUsed ?? 0), 0) / crawlUsages.reduce((sum, usage) => sum + (usage.totalRequests ?? 0), 0),
      };
    } else {
      serviceDetails[Service.CRAWL_API] = this.getDefaultCrawlServiceDetails();
    }
    return serviceDetails;
  }

  private static async createDefaultSubscription(
    shopId: string
  ): Promise<Subscription> {
    const freePlan = await PlanManager.getPlanByName(SubscriptionPlan.FREE);
    if (!freePlan) throw new Error('Free plan not found');
    const model = await ModelManager.getLatestModel();
    if (!model) throw new Error('Model not found');
    const now = DateTime.now();
    const aiApiCredits = this.calculateCreditsForService(Service.AI_API, freePlan?.creditAmount);
    const crawlApiCredits = freePlan?.creditAmount - aiApiCredits;
    const startDate = now.startOf('day');
    const endDate = startDate.plus({ months: 1 });
    const usage = await tx.usage.create({
      data: {
        shop: { connect: { id: shop.id } },
        serviceUsage: {
          create: {
            aiUsageDetails: {
              create: {
                service: Service.AI_API,
                modelName: model.name,
                inputTokensCount: 0,
                outputTokensCount: 0,
                totalRequests: freePlan?.feature?.aiAPI?.requestLimits ?? 0,
                totalRemainingRequests: freePlan?.feature?.aiAPI?.requestLimits ?? 0,
                totalRequestsUsed: 0,
                requestsPerMinuteLimit: freePlan?.feature?.aiAPI?.RPM ?? 0,
                requestsPerDayLimit: freePlan?.feature?.aiAPI?.RPD ?? 0,
                remainingRequestsPerMinute: freePlan?.feature?.aiAPI?.RPM ?? 0,
                remainingRequestsPerDay: freePlan?.feature?.aiAPI?.RPD ?? 0,
                resetTimeForMinuteRequests: now,
                resetTimeForDayRequests: now,
                tokensConsumedPerMinute: 0,
                tokensConsumedPerDay: 0,
                totalTokens: freePlan?.feature?.aiAPI?.totalTokens ?? 0,
                totalTokensUsed: freePlan?.feature?.aiAPI?.totalTokens ?? 0,
                totalCredits: aiApiCredits ?? 0,
                totalCreditsUsed: 0,
                totalRemainingCredits: aiApiCredits ?? 0,
                lastTokenUsageUpdateTime: now
              }
            },
            crawlUsageDetails: {
              create: {
                service: Service.CRAWL_API,
                totalRequests: freePlan?.feature?.crawlAPI?.requestLimits ?? 0,
                totalRemainingRequests: freePlan?.feature?.crawlAPI?.requestLimits ?? 0,
                totalRequestsUsed: 0,
                totalCredits: crawlApiCredits ?? 0,
                totalCreditsUsed: 0,
                totalRemainingCredits: crawlApiCredits ?? 0,
              }
            }
          }
        }
      }
    });
    const subscription = await tx.subscription.create({
      data: {
        shop: { connect: { id: shop.id } },
        plan: { connect: { id: freePlan.id } },
        status: SubscriptionStatus.ACTIVE,
        startDate: startDate.toJSDate(),
        endDate: endDate.toJSDate(),
        usage: { connect: { id: usage.id } }
      }
    });
    return subscription;
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

  static async resetUsageCounts(shopName: string): Promise<void> {
    await this.retry(async () => {
      const shop = await prisma.shop.findUnique({
        where: { name: shopName }
      });
      if (!shop) throw new Error('Shop not found');
      let activeSubscription = await SubscriptionManager.getCurrentSubscription(shopName);
      if (!activeSubscription) {
        activeSubscription = await this.createDefaultSubscription(shop?.id);
        if (!activeSubscription) {
          throw new Error('Failed to create a default subscription');
        }
      }
      const associatedUsers = await ShopifySessionManager.findCurrentAssociatedUsersByShop(shopName);
      const feature = activeSubscription?.plan?.feature;
      if (!feature) {
        throw new Error('Invalid or not found plan feature');
      }
      const model = await ModelManager.getLatestModel();
      const now = new Date();
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
                },
                update: {
                  aiUsageDetails: {
                    upsert: {
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
                      },
                      update: {
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
                    }
                  },
                  crawlUsageDetails: {
                    upsert: {
                      create: {
                        service: Service.CRAWL_API,
                        totalRequests: feature?.crawlAPI?.requestLimits ?? 0,
                        totalRemainingRequests: feature?.crawlAPI?.requestLimits ?? 0,
                        totalRequestsUsed: 0
                      },
                      update: {
                        totalRequests: feature?.crawlAPI?.requestLimits ?? 0,
                        totalRemainingRequests: feature?.crawlAPI?.requestLimits ?? 0,
                        totalRequestsUsed: 0
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
  }
}
