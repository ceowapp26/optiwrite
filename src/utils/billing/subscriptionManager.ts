import { Prisma, PrismaClient, Plan, Shop, SubscriptionPlan, Usage, NotificationType, Service, SubscriptionStatus, PaymentStatus, BillingType, BillingEventType, Promotion, Discount } from '@prisma/client';
import { ShopifySessionManager, ModelManager } from '@/utils/storage';
import { UsageManager } from '@/utils/usage';
import { BillingEvent, CycleStatus, TrialStatus } from '@/types/billing';
import { PlanManager } from '@/utils/billing';
import { BillingOperationsService } from './billingOperationsService';
import { PaymentManager } from '@/utils/billing';
import { prisma } from '@/lib/prisma';
import { DateTime } from 'luxon';
import { v4 as uuidv4 } from "uuid";
import { WebhookManager } from '@/utils/webhooks';
import emailService, { EmailServiceError, EmailResponse } from '@/utils/email/emailService';
import { format } from 'date-fns';

interface TrialSubscriptionConfig {
  trialDays: number;
  planPrice: number;
  startDate: DateTime;
}

interface SubscriptionOptions {
  shopName: string;
  planName: string;
  transactionId: string;
  email: string;
}

interface CancellationOptions {
  shopName: string;
  cancelReason?: string;
  email: string;
}

interface SubscriptionDetails {
  status: string;
  plan: {
    name: string;
    price: number;
    feature: any;
  };
  startDate: Date;
  endDate: Date;
  daysUntilExpiration: number;
  isCycleTransition: boolean;
  nextCycleStart: Date | null;
  nextCycleEnd: Date | null;
  billingAdjustments: any;
  cancellation?: {
    canceledAt: Date | null;
    cancelReason: string | null;
  };
  latestPayment?: {
    status: PaymentStatus;
    amount: number;
    adjustedAmount?: number;
    currency: string;
    createdAt: Date;
    billingType: BillingType;
    billingPeriodStart: Date;
    billingPeriodEnd: Date;
  };
}

type PromotionOrDiscount = Promotion | Discount;

export class SubscriptionManager {

  private prisma: PrismaClient;

  private billingOps: BillingOperationsService;

  private static readonly TRANSACTION_TIMEOUT = 100000;

  private static readonly MAX_WAIT = 15000;

  private static readonly SHARE_REVENUE = 1;

  static readonly TRIAL_NOTIFICATION_DAYS = [4, 2] as const;

  private static readonly CREDIT_CONVERSION = {
    [Service.AI_API]: 0.1, 
    [Service.CRAWL_API]: 1
  };

  private static readonly subscriptionInclude = {
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
        associatedUsers: true,
        serviceUsage: {
          include: {
            aiUsageDetails: true,
            crawlUsageDetails: true
          }
        }
      }
    },
    associatedUsers: {
      include: {
        associatedUser: true
      }
    },
    billingEvents: {
      include: {
        promotion: true,
        discount: true
      }
    },
    payments: {
      include: {
        billingEvents: {
          include: {
            promotion: true,
            discount: true
          }
        }
      }
    }
  };

  private static readonly paymentInclude = {
    billingEvents: true
  };

  static readonly Errors = {
    SHOP_NOT_FOUND: 'Shop not found',
    SUBSCRIPTION_NOT_FOUND: 'No active subscription found',
    PAYMENT_NOT_FOUND: 'No previous payment found for subscription',
    INVALID_PLAN: 'Invalid subscription plan',
    TRANSACTION_FAILED: 'Transaction failed',
    SUBSCRIPTION_ID_MISMATCH: 'Subscription ID mismatch detected',
    PAYMENT_FAILED: 'Payment processing failed',
    INVALID_DATES: 'Invalid subscription dates',
    MISSING_PARAMETERS: 'Missing required parameters',
    NO_EMAIL_PROVIDED: 'No email provided for subscription notification',
  } as const;

  static readonly activeStatuses = {
    [SubscriptionStatus.ACTIVE]: SubscriptionStatus.ACTIVE,
    [SubscriptionStatus.ACCEPTED]: SubscriptionStatus.ACCEPTED,
  } as const;

  static readonly terminatedStatuses = {
    [SubscriptionStatus.CANCELLED]: SubscriptionStatus.CANCELLED,
    [SubscriptionStatus.DECLINED]: SubscriptionStatus.DECLINED,
    [SubscriptionStatus.EXPIRED]: SubscriptionStatus.CANCELLED,
    [SubscriptionStatus.ON_HOLD]: SubscriptionStatus.ON_HOLD,
  } as const;

  static readonly inactiveStatuses = {
    [SubscriptionStatus.FROZEN]: SubscriptionStatus.FROZEN,
    [SubscriptionStatus.PENDING]: SubscriptionStatus.PENDING,
    [SubscriptionStatus.CANCELLED]: SubscriptionStatus.CANCELLED,
    [SubscriptionStatus.EXPIRED]: SubscriptionStatus.EXPIRED,
    [SubscriptionStatus.DECLINED]: SubscriptionStatus.DECLINED
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

  private static isValidEmail(email: string): boolean {
    const emailRegex = /^(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$/i;
    return emailRegex.test(email);
  }

  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    delay = 1000
  ): Promise<T> {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (error?.code === 'P2028') {
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }
    }
    throw lastError;
  }

  private static formatShopifyDate(dateString: string): string {
    const date = new Date(dateString);
    return format(date, 'eeee, dd MMMM yyyy');
  }

  static async getSubscriptionDetails(shopName: string, email?: string): Promise<SubscriptionDetails> {
    try {
      const subscription = await this.getCurrentSubscription(shopName, email);
      if (!subscription) return null;
      const cycleStatus = await this.checkAndManageCycle(subscription, shopName);
      const latestPayment = subscription.payments[subscription.payments.length - 1];
      const billingAdjustments = await this.calculateBillingAdjustments(latestPayment?.billingEvents || []);
      return {
        status: subscription.status,
        shopifySubscriptionId: subscription.shopifySubscriptionId,
        plan: {
          name: subscription.plan.name,
          price: subscription.plan.totalPrice,
          feature: subscription.plan.feature
        },
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        daysUntilExpiration: cycleStatus.daysUntilExpiration,
        isCycleTransition: cycleStatus.isExpired,
        nextCycleStart: cycleStatus.nextCycleStart,
        nextCycleEnd: cycleStatus.nextCycleEnd,
        trialStatus: cycleStatus.trialStatus,
        billingAdjustments,
        cancellation: subscription?.status === SubscriptionStatus.ON_HOLD ? {
          canceledAt: subscription?.canceledAt,
          cancelReason: subscription?.cancelReason
        } : undefined,
        latestPayment: latestPayment ? {
          status: latestPayment.status,
          amount: latestPayment.amount,
          adjustedAmount: latestPayment.adjustedAmount,
          currency: latestPayment.currency,
          createdAt: latestPayment.updatedAt,
          billingType: latestPayment.billingType,
          billingPeriodStart: latestPayment.billingPeriodStart,
          billingPeriodEnd: latestPayment.billingPeriodEnd
        } : undefined
      };
    } catch (error) {
      console.error('Error getting subscription details:', error);
      throw new Error(`Failed to get subscription details: ${error.message}`);
    }
  }

  static async calculateBillingAdjustments(billingEvents: BillingEvent[]) {
    return billingEvents.reduce((acc, event) => {
      if (event.type === BillingEventType.PROMOTION) {
        acc.promotions.push({
          code: event.promotion?.code,
          value: event.promotion?.value,
          description: event.promotion?.description,
          unit: event.promotion?.unit
        });
      } else if (event.type === BillingEventType.DISCOUNT) {
        acc.discounts.push({
          code: event.discount?.code,
          value: event.discount?.value,
          description: event.discount?.description,
          unit: event.discount?.unit
        });
      }
      return acc;
    }, { promotions: [], discounts: [] });
  }

  static async checkBillingCycle(shopName: string) {
    const subscription = await this.getCurrentSubscription(shopName);
    if (!subscription) {
      throw new Error('No active subscription found');
    }
    const now = DateTime.utc();
    const endDate = DateTime.fromJSDate(subscription.endDate);
    return {
      plan: subscription?.plan,
      status: now < endDate ? 'ACTIVE' : 'EXPIRED',
      startDate: subscription.startDate,
      endDate: subscription.endDate,
    };
  }

  static async calculateDiscountMetrics(
    plan: Plan,
    shopId: string,
  ): Promise<{
    finalPrice: number;
    adjustedAmount: number;
    durationLimitInIntervals: number;
    appliedPlanDiscount: { discount: PromotionOrDiscount; type: 'promotion' | 'discount' } | null;
  }> {
    if (!plan?.totalPrice) {
      throw new Error('Plan price is required');
    }
    let finalPrice = plan.totalPrice;
    let adjustedAmount = 0;
    let durationLimitInIntervals = 0;
    const promotionOrDiscount = await BillingOperationsService.findSingleApplicablePromotion(shopId, plan.id);
    const earlyAdapterPromotion = await BillingOperationsService.getEarlyAdapterPromotion();
    let shopifyDiscount: PromotionOrDiscount | null = earlyAdapterPromotion ? earlyAdapterPromotion : promotionOrDiscount;
    if (!shopifyDiscount) {
      return {
        finalPrice,
        adjustedAmount,
        durationLimitInIntervals: 0,
        appliedPlanDiscount: null
      };
    }
    const { finalPrice: adjustedPrice, adjustedAmount: discountAmount } = await BillingOperationsService.calculateAdjustedPrice(
      plan.totalPrice,
      'discountType' in shopifyDiscount && shopifyDiscount.discountType === 'promotion' ? [shopifyDiscount as Promotion] : [],
      'discountType' in shopifyDiscount && shopifyDiscount.discountType === 'discount' ? [shopifyDiscount as Discount] : []
    );
    let appliedPlanDiscount: { discount: PromotionOrDiscount; type: 'promotion' | 'discount' } | null = null;
    if ('discountType' in shopifyDiscount) {
      appliedPlanDiscount = { discount: shopifyDiscount, type: shopifyDiscount?.discountType };
      finalPrice = adjustedPrice;
      adjustedAmount = discountAmount;
      durationLimitInIntervals = shopifyDiscount.validUntil && shopifyDiscount.validFrom
        ? Math.floor((shopifyDiscount.validUntil.getTime() - shopifyDiscount.validFrom.getTime()) / (1000 * 60 * 60 * 24))
        : 0;
    }
    return {
      finalPrice,
      adjustedAmount,
      durationLimitInIntervals,
      appliedPlanDiscount: appliedPlanDiscount || null
    };
  }

  static async calculateTrialDates(config: TrialSubscriptionConfig) {
    const { trialDays, startDate } = config;
    return {
      trialStartDate: startDate.toJSDate(),
      trialEndDate: startDate.plus({ days: trialDays }).toJSDate(),
      firstBillingDate: startDate.plus({ days: trialDays }).toJSDate(),
      firstBillingEndDate: startDate.plus({ days: trialDays, months: 1 }).toJSDate()
    };
  }

  static async checkExistingTrialSubscription(shopId: string, planName: tring) {
    const previousTrial = await prisma.subscription.findFirst({
      where: {
        shopId: shopId,
        plan: {
          name: planName
        },
        metadata: {
          path: ['hasTrial'],
          equals: true
        }
      }
    });
    return previousTrial;
  }

  static async handleCancelSubscriptions(
    tx: PrismaTransaction, 
    shopId: string
  ) {
    await tx.subscription.updateMany({
      where: {
        shopId: shopId,
        status: { in: [
          SubscriptionStatus.ACTIVE, 
          SubscriptionStatus.PENDING, 
          SubscriptionStatus.ON_HOLD, 
          SubscriptionStatus.FROZEN,
          SubscriptionStatus.TRIAL
        ] },
      },
      data: {
        status: SubscriptionStatus.CANCELLED,
        endDate: DateTime.utc().toJSDate(),
        updatedAt: DateTime.utc().toJSDate(),
      },
    });
  }

  private static async handleSubscriptionFallback(
    shopId: string,
    subscriptionId: string,
    tx: PrismaTransaction 
  ): Promise<void> {
    try {
      if (subscriptionId) {
        await this.handleCancelSubscriptions(tx, shopId);
        await tx.subscription.update({
          where: { 
            id: subscriptionId,
            shopId: shopId 
          },
          data: {
            status: SubscriptionStatus.ACTIVE,
            updatedAt: DateTime.utc().toJSDate()
          }
        });
      }
    } catch (fallbackError) {
      console.error('Fallback handling failed:', fallbackError);
      throw new Error(`Subscription failed and recovery failed: ${fallbackError.message}`);
    }
  }

  static async subscribeWithPromotionStrategy(
    shopName: string,
    planName: string,
    transactionId: string,
    email?: string
  ): Promise<Shop> {    
    if (!shopName?.trim() || !transactionId || !planName) {
      throw new Error(this.Errors.MISSING_PARAMETERS);
    }
    const shop = await ShopifySessionManager.findShopByName(shopName);
    if (!shop) throw new Error('Shop not found');
    const plan = await PlanManager.getPlanByName(planName);
    if (!plan) throw new Error('Plan not found');
    const model = await ModelManager.getLatestModel();
    if (!model) throw new Error('Model not found');
    const existingTrialSubscription = await this.checkExistingTrialSubscription(shop.id, planName);
    const associatedUsers = await ShopifySessionManager.findCurrentAssociatedUsersByShop(shopName);
    const currentSubscription = await this.getCurrentSubscription(shopName, email);
    const isEmailValid = email && this.isValidEmail(email);
    let associatedUser;
    if (isEmailValid) {
      associatedUser = await ShopifySessionManager.findAssociatedUserByEmail(email);
      if (!associatedUser?.userId) {
        throw new Error(`Associated user not found for email: ${email}`);
      }
    }
    const isTrialPlan = plan?.trialDays && plan?.trialDays > 0 && !existingTrialSubscription;
    const { finalPrice, adjustedAmount, appliedPlanDiscount, durationLimitInIntervals } = await this.calculateDiscountMetrics(plan, shop?.id);
    const startDate = DateTime.utc();
    const endDate = isTrialPlan 
        ? startDate.plus({ days: plan.trialDays })
        : startDate.plus({ months: 1 });
    try {
      return await prisma.$transaction(async (tx) => {
        await this.handleCancelSubscriptions(tx, shop?.id);
        const usage = await tx.usage.create({
          data: {
            shop: { connect: { id: shop.id } },
            ...(associatedUsers?.length > 0 && {
              associatedUsers: {
                create: associatedUsers.map(user => ({
                  associatedUser: {
                    connect: { userId: user.userId }
                  }
                }))
              },
            }),
            serviceUsage: {
              create: {
                aiUsageDetails: {
                  create: {
                    service: Service.AI_API,
                    modelName: model.name,
                    inputTokensCount: 0,
                    outputTokensCount: 0,
                    totalRequests: plan?.feature?.aiAPI?.requestLimits 
                    ?? (plan?.feature?.aiAPI?.creditLimits / plan?.feature?.aiAPI?.conversionRate ?? this.CREDIT_CONVERSION[Service.AI_API]),
                    totalRemainingRequests: plan?.feature?.aiAPI?.requestLimits 
                    ?? (plan?.feature?.aiAPI?.creditLimits / plan?.feature?.aiAPI?.conversionRate ?? this.CREDIT_CONVERSION[Service.AI_API]),
                    totalRequestsUsed: 0,
                    requestsPerMinuteLimit: plan?.feature?.aiAPI?.RPM ?? 0,
                    requestsPerDayLimit: plan?.feature?.aiAPI?.RPD ?? 0,
                    remainingRequestsPerMinute: plan?.feature?.aiAPI?.RPM ?? 0,
                    remainingRequestsPerDay: plan?.feature?.aiAPI?.RPD ?? 0,
                    resetTimeForMinuteRequests: startDate.toJSDate(),
                    resetTimeForDayRequests: startDate.toJSDate(),
                    tokensConsumedPerMinute: 0,
                    tokensConsumedPerDay: 0,
                    totalTokens: plan?.feature?.aiAPI?.totalTokens ?? 0,
                    totalRemainingTokens: plan?.feature?.aiAPI?.totalTokens ?? 0,
                    totalTokensUsed: 0,
                    totalCredits: plan?.feature?.aiAPI?.creditLimits ?? 0,
                    totalCreditsUsed: 0,
                    totalRemainingCredits: plan?.feature?.aiAPI?.creditLimits ?? 0,
                    lastTokenUsageUpdateTime: startDate.toJSDate()
                  }
                },
                crawlUsageDetails: {
                  create: {
                    service: Service.CRAWL_API,
                    totalRequests: plan?.feature?.crawlAPI?.requestLimits 
                    ?? (plan?.feature?.crawlAPI?.creditLimits / plan?.feature?.crawlAPI?.conversionRate ?? this.CREDIT_CONVERSION[Service.CRAWL_API]),
                    totalRemainingRequests: plan?.feature?.crawlAPI?.requestLimits 
                    ?? (plan?.feature?.crawlAPI?.creditLimits / plan?.feature?.crawlAPI?.conversionRate ?? this.CREDIT_CONVERSION[Service.CRAWL_API]),
                    totalRequestsUsed: 0,
                    totalCredits: plan?.feature?.crawlAPI?.creditLimits ?? 0,
                    totalCreditsUsed: 0,
                    totalRemainingCredits: plan?.feature?.crawlAPI?.creditLimits ?? 0,
                  }
                }
              }
            }
          }
        });
        const subscription = await tx.subscription.create({
          data: {
            shop: { connect: { id: shop.id } },
            plan: { connect: { id: plan.id } },
            status: isTrialPlan ? SubscriptionStatus.TRIAL : SubscriptionStatus.ACTIVE,
            startDate: startDate.toJSDate(),
            endDate: endDate.toJSDate(),
            usage: { connect: { id: usage.id } },
            shopifySubscriptionId: transactionId,
            ...(associatedUser?.userId && isEmailValid && {
              associatedUsers: {
                create: {
                  associatedUser: {
                    connect: { userId: associatedUser.userId }
                  }
                }
              }
            }),
            metadata: {
              hasTrial: isTrialPlan ? true : false,
              trialStartDate: isTrialPlan ? startDate.toJSDate() : null,
              trialEndDate: isTrialPlan ? endDate.toJSDate() : null,
              hasTrialEnded: false,
              trialDays: isTrialPlan ? plan?.trialDays : 0
            }
          },
          include: this.subscriptionInclude
        });
        let subscriptionPayment;
        switch(appliedPlanDiscount?.type) {
          case 'promotion': {
            const promotion = appliedPlanDiscount.discount as Promotion;
            subscriptionPayment = await tx.payment.create({
              data: {
                shop: { connect: { id: shop.id } },
                subscription: { connect: { id: subscription.id } },
                amount: finalPrice,
                adjustedAmount: adjustedAmount,
                currency: 'USD',
                billingType: BillingType.SUBSCRIPTION,
                status: isTrialPlan ? PaymentStatus.SCHEDULED : PaymentStatus.SUCCEEDED,
                billingPeriodStart: startDate.toJSDate(),
                billingPeriodEnd: endDate.toJSDate(),
                shopifyTransactionId: transactionId,
                billingEvents: {
                  create: {
                    type: BillingEventType.PROMOTION,
                    amount: promotion.value,
                    description: `Applied promotion: ${promotion.code}`,
                    subscription: { connect: { id: subscription.id } },
                    promotion: { connect: { id: promotion.id } },
                  }
                }
              },
              include: this.paymentInclude
            });
            await tx.promotion.update({
              where: { id: promotion.id },
              data: { usedCount: { increment: 1 } },
            });
            break;
          }
          case 'discount': {
            const discount = appliedPlanDiscount.discount as Discount;
            subscriptionPayment = await tx.payment.create({
              data: {
                shop: { connect: { id: shop.id } },
                subscription: { connect: { id: subscription.id } },
                amount: finalPrice,
                adjustedAmount: adjustedAmount,
                currency: 'USD',
                billingType: BillingType.SUBSCRIPTION,
                status: isTrialPlan ? PaymentStatus.SCHEDULED : PaymentStatus.SUCCEEDED,
                billingPeriodStart: startDate.toJSDate(),
                billingPeriodEnd: endDate.toJSDate(),
                shopifyTransactionId: transactionId,
                billingEvents: {
                  create: {
                    type: BillingEventType.DISCOUNT,
                    amount: discount.value,
                    description: `Applied discount: ${discount.code}`,
                    subscription: { connect: { id: subscription.id } },
                    discount: { connect: { id: discount.id } },
                  }
                }
              },
              include: this.paymentInclude
            });
            await tx.discount.update({
              where: { id: discount.id },
              data: { usedCount: { increment: 1 } }
            });
            break;
          }
          default: {
            subscriptionPayment = await tx.payment.create({
              data: {
                shop: { connect: { id: shop.id } },
                subscription: { connect: { id: subscription.id } },
                amount: finalPrice,
                adjustedAmount: adjustedAmount,
                currency: 'USD',
                billingType: BillingType.SUBSCRIPTION,
                status: isTrialPlan ? PaymentStatus.SCHEDULED : PaymentStatus.SUCCEEDED,
                billingPeriodStart: startDate.toJSDate(),
                billingPeriodEnd: endDate.toJSDate(),
                shopifyTransactionId: transactionId,
              },
              include: this.paymentInclude
            });
          }
        }
        await tx.notification.create({
          data: {
            shopId: shop.id,
            type: NotificationType.BILLING,
            createdAt: DateTime.utc().toJSDate(),
            title: `Subscription Successful: Doc2Product's ${planName} Plan`,
            message: `Thank you for subscribing to ${planName} plan! Your subscription is now active, and you can enjoy all the features included in this plan. If you have any questions, feel free to contact support.`,
          },
        });
        await this.sendSubscriptionEmail(
          {
            ...subscription,
            payment: subscriptionPayment,
          },
          shopName,
          email,
          startDate,
          endDate,
          subscription.status
        );
        return tx.shop.findUniqueOrThrow({
          where: { id: shop.id },
          include: {
            subscriptions: {
              include: {
                associatedUsers: true,
                payments: true,
                plan: true,
              },
              orderBy: { createdAt: 'desc' },
            },
          },
        });
      }, { 
        timeout: this.TRANSACTION_TIMEOUT,
        maxWait: this.MAX_WAIT,
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable 
      });
    } catch (error) {
      console.error('Subscription creation error:', error);
      if (currentSubscription?.id) {
        await prisma.$transaction(async (tx) => {
          await this.handleSubscriptionFallback(
            currentSubscription.shopId,
            currentSubscription.id,
            tx
          );
        });
      }
      throw new Error(`Failed to create subscription: ${error.message}. Please try again!.`);
    }
  }

  static async subscribe(shopName: string, planName: string, transactionId: string): Promise<Shop> {
    const shop = await ShopifySessionManager.findShopByName(shopName);
    if (!shop) throw new Error('Shop not found');
    const plan = await PlanManager.getPlanByName(planName);
    if (!plan) throw new Error('Invalid subscription plan');
    const startDate = DateTime.utc();
    const endDate = startDate.plus({ months: 1 });
    try {
      return await prisma.$transaction(async (tx) => {
        await tx.subscription.updateMany({
          where: { 
            shopId: shop.id,
            status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.FROZEN] }
          },
          data: { 
            status: SubscriptionStatus.EXPIRED,
            endDate: startDate.toJSDate(),
            updatedAt: DateTime.utc().startOf('day').toJSDate()
          }
        });
        const newSubscription = await tx.subscription.create({
          data: {
            shopId: shop.id,
            planId: plan.id,
            status: SubscriptionStatus.ACTIVE,
            startDate: startDate.toJSDate(),
            endDate: endDate.toJSDate(),
            payments: {
              create: {
                amount: plan.totalPrice,
                currency: 'USD',
                transactionId,
                status: PaymentStatus.SUCCEEDED,
                billingPeriodStart: startDate.toJSDate(),
                billingPeriodEnd: endDate.toJSDate(),
              }
            }
          }
        });
        return tx.shop.findUniqueOrThrow({
          where: { id: shop.id },
          include: {
            subscriptions: {
              include: {
                payments: true,
                plan: true
              },
              orderBy: { createdAt: 'desc' }
            }
          }
        });
      }, { 
        timeout: this.TRANSACTION_TIMEOUT,
        maxWait: this.MAX_WAIT,
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable 
      });
    } catch (error) {
      console.error('Subscription creation error:', error);
      throw new Error(`Failed to create subscription: ${error.message}`);
    }
  }

  static async update(shopName: string, newPlanName: string, transactionId: string, email: string): Promise<Shop> {
    if (!shopName?.trim() || !transactionId || !newPlanName) {
      throw new Error(this.Errors.MISSING_PARAMETERS);
    }
    try {
      const now = DateTime.utc().toJSDate();
      const currentSubscription = await this.getCurrentSubscription(shopName, email);
      if (!currentSubscription) {
        throw new Error(this.Errors.SUBSCRIPTION_NOT_FOUND);
      }
      await prisma.subscription.update({
        where: { id: currentSubscription.id },
        data: { 
          status: SubscriptionStatus.CANCELLED,
          endDate: now,
          updatedAt: now
        }
      });
      return await this.subscribeWithPromotionStrategy(shopName, newPlanName, transactionId, email);
    } catch (error) {
      console.error('Subscription update error:', error);
      throw new Error(`Failed to update subscription: ${error.message}`);
    }
  }

  private static async createDefaultSubscription(
    shopId: string,
    shopName: string,
    email?: string
  ): Promise<Subscription> {
    if (!shopId) throw new Error(this.Errors.SHOP_NOT_FOUND);
    const plan = await PlanManager.getPlanByName(SubscriptionPlan.FREE);
    if (!plan) throw new Error('Free plan not found');
    const model = await ModelManager.getLatestModel();
    if (!model) throw new Error('Model not found');
    const associatedUsers = await ShopifySessionManager.findCurrentAssociatedUsersByShop(shopName);
    const isEmailValid = email && this.isValidEmail(email);
    let associatedUser;
    if (isEmailValid) {
      associatedUser = await ShopifySessionManager.findAssociatedUserByEmail(email);
      if (!associatedUser?.userId) {
        throw new Error(`Associated user not found for email: ${email}`);
      }
    }
    try {
      return await this.executeWithRetry(async () => {
        return prisma.$transaction(async (tx) => {
          const startDate = DateTime.utc();
          const endDate = startDate.plus({ months: 1 });
          await this.handleCancelSubscriptions(tx, shopId);
          const usage = await tx.usage.create({
            data: {
              shop: { connect: { id: shopId } },
              ...(associatedUsers?.length > 0 && {
                 associatedUsers: {
                  create: associatedUsers.map(user => ({
                    associatedUser: {
                      connect: { userId: user.userId }
                    }
                  }))
                },
              }),
              serviceUsage: {
                create: {
                  aiUsageDetails: {
                    create: {
                      service: Service.AI_API,
                      modelName: model.name,
                      inputTokensCount: 0,
                      outputTokensCount: 0,
                      totalRequests: plan?.feature?.aiAPI?.requestLimits 
                      ?? (plan?.feature?.aiAPI?.creditLimits / plan?.feature?.aiAPI?.conversionRate ?? this.CREDIT_CONVERSION[Service.AI_API]),
                      totalRemainingRequests: plan?.feature?.aiAPI?.requestLimits 
                      ?? (plan?.feature?.aiAPI?.creditLimits / plan?.feature?.aiAPI?.conversionRate ?? this.CREDIT_CONVERSION[Service.AI_API]),
                      totalRequestsUsed: 0,
                      requestsPerMinuteLimit: plan?.feature?.aiAPI?.RPM ?? 0,
                      requestsPerDayLimit: plan?.feature?.aiAPI?.RPD ?? 0,
                      remainingRequestsPerMinute: plan?.feature?.aiAPI?.RPM ?? 0,
                      remainingRequestsPerDay: plan?.feature?.aiAPI?.RPD ?? 0,
                      resetTimeForMinuteRequests: startDate.toJSDate(),
                      resetTimeForDayRequests: startDate.toJSDate(),
                      tokensConsumedPerMinute: 0,
                      tokensConsumedPerDay: 0,
                      totalTokens: plan?.feature?.aiAPI?.totalTokens ?? 0,
                      totalRemainingTokens: plan?.feature?.aiAPI?.totalTokens ?? 0,
                      totalTokensUsed: 0,
                      totalCredits: plan?.feature?.aiAPI?.creditLimits ?? 0,
                      totalCreditsUsed: 0,
                      totalRemainingCredits: plan?.feature?.aiAPI?.creditLimits ?? 0,
                      lastTokenUsageUpdateTime: startDate.toJSDate()
                    }
                  },
                  crawlUsageDetails: {
                    create: {
                      service: Service.CRAWL_API,
                      totalRequests: plan?.feature?.crawlAPI?.requestLimits 
                      ?? (plan?.feature?.crawlAPI?.creditLimits / plan?.feature?.crawlAPI?.conversionRate ?? this.CREDIT_CONVERSION[Service.CRAWL_API]),
                      totalRemainingRequests: plan?.feature?.crawlAPI?.requestLimits 
                      ?? (plan?.feature?.crawlAPI?.creditLimits / plan?.feature?.crawlAPI?.conversionRate ?? this.CREDIT_CONVERSION[Service.CRAWL_API]),
                      totalRequestsUsed: 0,
                      totalCredits: plan?.feature?.crawlAPI?.creditLimits ?? 0,
                      totalCreditsUsed: 0,
                      totalRemainingCredits: plan?.feature?.crawlAPI?.creditLimits ?? 0,
                    }
                  }
                }
              }
            }
          });
          const subscription = await tx.subscription.create({
            data: {
              shop: { connect: { id: shopId } },
              plan: { connect: { id: plan.id } },
              status: SubscriptionStatus.ACTIVE,
              startDate: startDate.toJSDate(),
              endDate: endDate.toJSDate(),
              usage: { connect: { id: usage.id } },
              shopifySubscriptionId: uuidv4(),
              ...(associatedUser?.userId && isEmailValid && {
                associatedUsers: {
                  create: {
                    associatedUser: {
                      connect: { userId: associatedUser.userId }
                    }
                  }
                }
              }),
              metadata: {
                hasTrial: false,
                trialStartDate: null,
                trialEndDate: null,
                hasTrialEnded: false
              }
            },
            include: this.subscriptionInclude
          });
          await tx.notification.create({
            data: {
              shopId,
              type: NotificationType.BILLING,
              createdAt: DateTime.utc().toJSDate(),
              title: `Free Plan Activated: Doc2Product's ${SubscriptionPlan.FREE} Plan`,
              message: `Thank you for subscribing to ${SubscriptionPlan.FREE} plan! Your subscription is now active, and you can enjoy all the features included in this plan. If you have any questions, feel free to contact support.`,
            },
          });
          await this.sendSubscriptionEmail(
            {
              ...subscription,
            },
            shopName,
            email,
            startDate,
            endDate,
            subscription.status
          );
          return subscription;
        }, {
          maxWait: this.MAX_WAIT,
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          timeout: this.TRANSACTION_TIMEOUT
        });
      });
    } catch (error) {
      console.error('Free subscription creation error:', error);
      throw new Error(`Failed to create free subscription: ${error.message}`);
    }
  }

  static async renew(shopName: string, transactionId: string, email?: string): Promise<Shop> {
    if (!shopName?.trim() || !transactionId) {
      throw new Error(this.Errors.MISSING_PARAMETERS);
    }
    const shop = await ShopifySessionManager.findShopByName(shopName);
    if (!shop) throw new Error('Shop not found');
    const currentSubscription = await this.getCurrentSubscription(shopName, email);
    if (!currentSubscription) throw new Error('No subscription found');
    if (currentSubscription.plan.name === SubscriptionPlan.FREE) {
      throw new Error('Cannot renew a free plan');
    }
    const model = await ModelManager.getLatestModel();
    if (!model) throw new Error('Model not found');
    const associatedUsers = await ShopifySessionManager.findCurrentAssociatedUsersByShop(shopName);
    const isEmailValid = email && this.isValidEmail(email);
    let associatedUser;
    if (isEmailValid) {
      associatedUser = await ShopifySessionManager.findAssociatedUserByEmail(email);
      if (!associatedUser?.userId) {
        throw new Error(`Associated user not found for email: ${email}`);
      }
    }
    const isTrialPlan = currentSubscription?.plan?.trialDays && currentSubscription?.plan?.trialDays > 0;
    let trialStatus;
    if (isTrialPlan) {
      trialStatus = await this.checkTrialStatus(currentSubscription);
    }
    const { finalPrice, adjustedAmount, appliedPlanDiscount, durationLimitInIntervals } = await this.calculateDiscountMetrics(currentSubscription?.plan, shop?.id);
    const startDate = DateTime.utc();
    const endDate = startDate.plus({ months: 1 });
    try {
      return await prisma.$transaction(async (tx) => {
        const usage = await tx.usage.upsert({
          where: {
            id: currentSubscription.usageId
          },
          create: {
            shop: { connect: { id: shop.id } },
            ...(associatedUsers?.length > 0 && {
              associatedUsers: {
                connectOrCreate: associatedUsers.map(user => ({
                  where: {
                    associatedUserId_usageId: {
                      associatedUserId: user.userId,
                      usageId: currentSubscription.usageId
                    }
                  },
                  create: {
                    associatedUser: {
                      connect: { userId: user.userId }
                    }
                  }
                }))
              },
            }),
            serviceUsage: {
              create: {
                aiUsageDetails: {
                  create: {
                    service: Service.AI_API,
                    modelName: model.name,
                    inputTokensCount: 0,
                    outputTokensCount: 0,
                    totalRequests: currentSubscription?.plan?.feature?.aiAPI?.requestLimits 
                    ?? (currentSubscription?.plan?.feature?.aiAPI?.creditLimits / currentSubscription?.plan?.feature?.aiAPI?.conversionRate ?? this.CREDIT_CONVERSION[Service.AI_API]),
                    totalRemainingRequests: currentSubscription?.plan?.feature?.aiAPI?.requestLimits 
                    ?? (currentSubscription?.plan?.feature?.aiAPI?.creditLimits / currentSubscription?.plan?.feature?.aiAPI?.conversionRate ?? this.CREDIT_CONVERSION[Service.AI_API]),
                    totalRequestsUsed: 0,
                    requestsPerMinuteLimit: currentSubscription?.plan?.feature?.aiAPI?.RPM ?? 0,
                    requestsPerDayLimit: currentSubscription?.plan?.feature?.aiAPI?.RPD ?? 0,
                    remainingRequestsPerMinute: currentSubscription?.plan?.feature?.aiAPI?.RPM ?? 0,
                    remainingRequestsPerDay: currentSubscription?.plan?.feature?.aiAPI?.RPD ?? 0,
                    resetTimeForMinuteRequests: startDate.toJSDate(),
                    resetTimeForDayRequests: startDate.toJSDate(),
                    tokensConsumedPerMinute: 0,
                    tokensConsumedPerDay: 0,
                    totalTokens: currentSubscription?.plan?.feature?.aiAPI?.totalTokens ?? 0,
                    totalRemainingTokens: currentSubscription?.plan?.feature?.aiAPI?.totalTokens ?? 0,
                    totalTokensUsed: 0,
                    totalCredits: currentSubscription?.plan?.feature?.aiAPI?.creditLimits ?? 0,
                    totalCreditsUsed: 0,
                    totalRemainingCredits: currentSubscription?.plan?.feature?.aiAPI?.creditLimits ?? 0,
                    lastTokenUsageUpdateTime: startDate.toJSDate()
                  }
                },
                crawlUsageDetails: {
                  create: {
                    service: Service.CRAWL_API,
                    totalRequests: currentSubscription?.plan?.feature?.crawlAPI?.requestLimits 
                    ?? (currentSubscription?.plan?.feature?.crawlAPI?.creditLimits / currentSubscription?.plan?.feature?.crawlAPI?.conversionRate ?? this.CREDIT_CONVERSION[Service.CRAWL_API]),
                    totalRemainingRequests: currentSubscription?.plan?.feature?.crawlAPI?.requestLimits 
                    ?? (currentSubscription?.plan?.feature?.crawlAPI?.creditLimits / currentSubscription?.plan?.feature?.crawlAPI?.conversionRate ?? this.CREDIT_CONVERSION[Service.CRAWL_API]),
                    totalRequestsUsed: 0,
                    totalCredits: currentSubscription?.plan?.feature?.crawlAPI?.creditLimits ?? 0,
                    totalCreditsUsed: 0,
                    totalRemainingCredits: currentSubscription?.plan?.feature?.crawlAPI?.creditLimits ?? 0,
                  }
                }
              }
            }
          },
          update: {
            serviceUsage: {
              update: {
                aiUsageDetails: {
                  create: {
                    service: Service.AI_API,
                    modelName: model.name,
                    inputTokensCount: 0,
                    outputTokensCount: 0,
                    totalRequests: currentSubscription?.plan?.feature?.aiAPI?.requestLimits 
                    ?? (currentSubscription?.plan?.feature?.aiAPI?.creditLimits / currentSubscription?.plan?.feature?.aiAPI?.conversionRate ?? this.CREDIT_CONVERSION[Service.AI_API]),
                    totalRemainingRequests: currentSubscription?.plan?.feature?.aiAPI?.requestLimits 
                    ?? (currentSubscription?.plan?.feature?.aiAPI?.creditLimits / currentSubscription?.plan?.feature?.aiAPI?.conversionRate ?? this.CREDIT_CONVERSION[Service.AI_API]),
                    totalRequestsUsed: 0,
                    requestsPerMinuteLimit: currentSubscription?.plan?.feature?.aiAPI?.RPM ?? 0,
                    requestsPerDayLimit: currentSubscription?.plan?.feature?.aiAPI?.RPD ?? 0,
                    remainingRequestsPerMinute: currentSubscription?.plan?.feature?.aiAPI?.RPM ?? 0,
                    remainingRequestsPerDay: currentSubscription?.plan?.feature?.aiAPI?.RPD ?? 0,
                    resetTimeForMinuteRequests: startDate.toJSDate(),
                    resetTimeForDayRequests: startDate.toJSDate(),
                    tokensConsumedPerMinute: 0,
                    tokensConsumedPerDay: 0,
                    totalTokens: currentSubscription?.plan?.feature?.aiAPI?.totalTokens ?? 0,
                    totalRemainingTokens: currentSubscription?.plan?.feature?.aiAPI?.totalTokens ?? 0,
                    totalTokensUsed: 0,
                    totalCredits: currentSubscription?.plan?.feature?.aiAPI?.creditLimits ?? 0,
                    totalCreditsUsed: 0,
                    totalRemainingCredits: currentSubscription?.plan?.feature?.aiAPI?.creditLimits ?? 0,
                    lastTokenUsageUpdateTime: startDate.toJSDate()
                  }
                },
                crawlUsageDetails: {
                  update: {
                    service: Service.CRAWL_API,
                    totalRequests: currentSubscription?.plan?.feature?.crawlAPI?.requestLimits 
                    ?? (currentSubscription?.plan?.feature?.crawlAPI?.creditLimits / currentSubscription?.plan?.feature?.crawlAPI?.conversionRate ?? this.CREDIT_CONVERSION[Service.CRAWL_API]),
                    totalRemainingRequests: currentSubscription?.plan?.feature?.crawlAPI?.requestLimits 
                    ?? (currentSubscription?.plan?.feature?.crawlAPI?.creditLimits / currentSubscription?.plan?.feature?.crawlAPI?.conversionRate ?? this.CREDIT_CONVERSION[Service.CRAWL_API]),
                    totalRequestsUsed: 0,
                    totalCredits: currentSubscription?.plan?.feature?.crawlAPI?.creditLimits ?? 0,
                    totalCreditsUsed: 0,
                    totalRemainingCredits: currentSubscription?.plan?.feature?.crawlAPI?.creditLimits ?? 0,
                  }
                }
              }
            }
          }
        });
        const subscription = await tx.subscription.update({
          where: { id: currentSubscription.id },
          data: {
            shop: { connect: { id: shop.id } },
            plan: { connect: { id: currentSubscription?.plan.id } },
            status: SubscriptionStatus.ACTIVE,
            startDate: startDate.toJSDate(),
            endDate: endDate.toJSDate(),
            usage: { connect: { id: usage.id } },
            shopifySubscriptionId: transactionId,
            ...(associatedUser?.userId && isEmailValid && {
              associatedUsers: {
                upsert: {
                  where: {
                    associatedUserId_subscriptionId: {
                      associatedUserId: associatedUser.userId,
                      subscriptionId: currentSubscription.id
                    }
                  },
                  create: {
                    associatedUser: {
                      connect: { userId: associatedUser.userId }
                    }
                  },
                  update: {
                    associatedUser: {
                      connect: { userId: associatedUser.userId }
                    }
                  }
                }
              }
            })
          },
          include: this.subscriptionInclude
        });
        let subscriptionPayment;
        switch(appliedPlanDiscount?.type) {
          case 'promotion': {
            const promotion = appliedPlanDiscount.discount as Promotion;
            subscriptionPayment = await tx.payment.create({
              data: {
                shop: { connect: { id: shop.id } },
                subscription: { connect: { id: subscription.id } },
                amount: finalPrice,
                adjustedAmount: adjustedAmount,
                currency: 'USD',
                billingType: BillingType.SUBSCRIPTION,
                status: PaymentStatus.SUCCEEDED,
                billingPeriodStart: startDate.toJSDate(),
                billingPeriodEnd: endDate.toJSDate(),
                shopifyTransactionId: transactionId,
                billingEvents: {
                  create: {
                    type: BillingEventType.PROMOTION,
                    amount: promotion.value,
                    description: `Applied promotion: ${promotion.code}`,
                    subscription: { connect: { id: subscription.id } },
                    promotion: { connect: { id: promotion.id } },
                  }
                }
              },
              include: this.paymentInclude
            });
            await tx.promotion.update({
              where: { id: promotion.id },
              data: { usedCount: { increment: 1 } },
            });
            break;
          }
          case 'discount': {
            const discount = appliedPlanDiscount.discount as Discount;
            subscriptionPayment = await tx.payment.create({
              data: {
                shop: { connect: { id: shop.id } },
                subscription: { connect: { id: subscription.id } },
                amount: finalPrice,
                adjustedAmount: adjustedAmount,
                currency: 'USD',
                billingType: BillingType.SUBSCRIPTION,
                status: PaymentStatus.SUCCEEDED,
                billingPeriodStart: startDate.toJSDate(),
                billingPeriodEnd: endDate.toJSDate(),
                shopifyTransactionId: transactionId,
                billingEvents: {
                  create: {
                    type: BillingEventType.DISCOUNT,
                    amount: discount.value,
                    description: `Applied discount: ${discount.code}`,
                    subscription: { connect: { id: subscription.id } },
                    discount: { connect: { id: discount.id } },
                  }
                }
              },
              include: this.paymentInclude
            });
            await tx.discount.update({
              where: { id: discount.id },
              data: { usedCount: { increment: 1 } }
            });
            break;
          }
          default: {
            subscriptionPayment = await tx.payment.create({
              data: {
                shop: { connect: { id: shop.id } },
                subscription: { connect: { id: subscription.id } },
                amount: finalPrice,
                adjustedAmount: adjustedAmount,
                currency: 'USD',
                billingType: BillingType.SUBSCRIPTION,
                status: PaymentStatus.SUCCEEDED,
                billingPeriodStart: startDate.toJSDate(),
                billingPeriodEnd: endDate.toJSDate(),
                shopifyTransactionId: transactionId,
                metadata: {
                  hasTrial: isTrialPlan,
                  trialStartDate: isTrialPlan ? trialStatus?.trialStartDate : null,
                  trialEndDate: isTrialPlan ? trialStatus?.trialEndDate : null,
                  hasTrialEnded: isTrialPlan ? !!trialStatus?.needsConversion : true,
                  trialDays: isTrialPlan ? (trialStatus?.daysUntilTrialEnds || 0) : 0
                }
              },
              include: this.paymentInclude
            });
          }
        }
        await tx.notification.create({
          data: {
            shopId: shop.id,
            type: NotificationType.BILLING,
            createdAt: DateTime.utc().toJSDate(),
            title: `Plan Renewed: Doc2Product's ${currentSubscription?.plan?.name} Plan`,
            message: `Your ${currentSubscription?.plan?.name} plan has been successfully renewed. Thank you for continuing with us! If you have any questions or need assistance, feel free to contact support.`,
          },
        });
        await this.sendSubscriptionEmail(
          {
            ...subscription,
            payment: subscriptionPayment,
          },
          shopName,
          email,
          startDate,
          endDate,
          SubscriptionStatus.RENEWING
        );
        return tx.shop.findUnique({
          where: { id: shop.id },
          include: {
            subscriptions: {
              include: {
                associatedUsers: true,
                payments: true,
                plan: true
              },
              orderBy: {
                startDate: 'desc'
              }
            }
          }
        });
      }, {
        maxWait: this.MAX_WAIT,
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: this.TRANSACTION_TIMEOUT
      });
    } catch (error) {
      console.error('Subscription renewal error:', error);
      if (currentSubscription?.id) {
        await prisma.$transaction(async (tx) => {
          await this.handleSubscriptionFallback(
            currentSubscription.shopId,
            currentSubscription.id,
            tx
          );
        });
      }
      throw new Error(`Failed to renew subscription: ${error.message}. Please try again!.`);
    }
  }

  static async activate(shop: string, details: {
    subscriptionId: string,
    planName: string,
    status: SubscriptionStatus,
    createdAt: string,
    updatedAt: string,
  }) {
    const shopifyShop = await ShopifySessionManager.findShopByName(shop);
    if (!shopifyShop) throw new Error('Shop not found');
    return await prisma.$transaction(async (tx) => {
      const currentSubscription = await this.getCurrentSubscription(shop);
      if (!currentSubscription) {
        throw new Error('No subscription found to activate');
      }
      const pendingPayment = await tx.payment.findFirst({
        where: {
          subscriptionId: currentSubscription.id,
          status: PaymentStatus.PENDING
        },
        orderBy: { createdAt: 'desc' }
      });
      if (pendingPayment) {
        await tx.payment.updateMany({
          where: {
            subscriptionId: currentSubscription.id,
            status: PaymentStatus.PENDING
          },
          data: {
            status: PaymentStatus.SUCCEEDED,
            transactionId: details.subscriptionId,
            updatedAt: new Date(details.updatedAt)
          }
        });
      }
      await tx.subscription.updateMany({
        where: { 
          id: currentSubscription.id,
          status: { not: details.status }
        },
        data: {
          status: details.status,
          updatedAt: new Date(details.updatedAt)
        }
      });

      return await tx.subscription.findUnique({
        where: { id: currentSubscription.id },
        include: {
          payments: true,
          plan: true
        }
      });
    }, {
      maxWait: this.MAX_WAIT,
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      timeout: this.TRANSACTION_TIMEOUT
    });
  }

  static async freeze(shop: string) {
    const currentSubscription = await this.getCurrentSubscription(shop);
    if (!currentSubscription) {
      throw new Error('No subscription found to freeze');
    }
    return await prisma.$transaction(async (tx) => {
      await tx.payment.updateMany({
        where: {
          subscriptionId: currentSubscription.id,
          status: PaymentStatus.PENDING
        },
        data: {
          status: PaymentStatus.FROZEN,
          updatedAt: new Date()
        }
      });
      return await tx.subscription.update({
        where: { id: currentSubscription.id },
        data: {
          status: SubscriptionStatus.FROZEN,
          updatedAt: new Date()
        },
        include: {
          payments: true,
          plan: true
        }
      });
    }, {
      maxWait: this.MAX_WAIT,
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      timeout: this.TRANSACTION_TIMEOUT
    });     
  }

  static async unfreeze(shop: string) {
    const currentSubscription = await this.getCurrentSubscription(shop);
    if (!currentSubscription) {
      throw new Error('No subscription found to unfreeze');
    }
    return await prisma.$transaction(async (tx) => {
      const frozenPayment = await tx.payment.findFirst({
        where: {
          subscriptionId: currentSubscription.id,
          status: PaymentStatus.FROZEN
        },
        orderBy: { createdAt: 'desc' }
      });
      if (frozenPayment) {
        await tx.payment.update({
          where: { id: frozenPayment.id },
          data: {
            status: PaymentStatus.PENDING,
            updatedAt: new Date()
          }
        });
      }
      return await tx.subscription.update({
        where: { id: currentSubscription.id },
        data: {
          status: SubscriptionStatus.ACTIVE,
          updatedAt: new Date()
        },
        include: {
          payments: true,
          plan: true
        }
      });
    }, {
      maxWait: this.MAX_WAIT,
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      timeout: this.TRANSACTION_TIMEOUT
    });     
  }

  static async reset(shopName: string, usage: Usage): Promise<Shop> {
    const shop = await ShopifySessionManager.findShopByName(shopName);
    if (!shop) throw new Error('Shop not found');
    try {
     return await prisma.$transaction(async (tx) => {
       await tx.subscription.updateMany({
         where: {
           shopId: shop.id,
           status: {in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.FROZEN]}
         },
         data: {
           status: SubscriptionStatus.CANCELLED,
           endDate: new Date(),
           updatedAt: new Date()
         }
       });
       await tx.payment.updateMany({
         where: {
           subscription: {
             shopId: shop.id,
             status: {in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.FROZEN]}
           },
           status: PaymentStatus.PENDING
         },
         data: {
           status: PaymentStatus.CANCELLED,
           updatedAt: new Date()
         }
       });
       const freePlan = await tx.plan.findFirst({
         where: { name: SubscriptionPlan.FREE }
       });
       if (!freePlan) throw new Error('Free plan not found');
       const startDate = DateTime.utc();
       const endDate = startDate.plus({ months: 1 });
       const newUsage = await tx.usage.create({
         data: {
           shop: { connect: { id: shop.id } },
           serviceUsage: {
             create: {
               aiUsageDetails: {
                 create: {
                   ...usage.serviceUsage.aiUsageDetails,
                   id: uuidv4()
                 }
               },
               crawlUsageDetails: {
                 create: {
                   ...usage.serviceUsage.crawlUsageDetails,
                   id: uuidv4()  
                 }
               }
             }
           }
         }
       });
       await tx.subscription.create({
         data: {
           shop: { connect: { id: shop.id } },
           plan: { connect: { id: freePlan.id } },
           usage: { connect: { id: newUsage.id } },
           status: SubscriptionStatus.ACTIVE, 
           startDate: startDate.toJSDate(),
           endDate: endDate.toJSDate()
         }
       });
       return tx.shop.findUniqueOrThrow({
         where: { id: shop.id },
         include: {
           subscriptions: {
             include: {
               payments: true,
               plan: true
             },
             orderBy: { createdAt: 'desc' }
           }
         }
       });
     }, {
       maxWait: this.MAX_WAIT,
       isolationLevel: Prisma.TransactionIsolationLevel.Serializable, 
       timeout: this.TRANSACTION_TIMEOUT
     });
   } catch (error) {
     console.error('Reset to free plan error:', error);
     throw new Error(`Failed to reset to free plan: ${error.message}`);
   }
  }

  static async updateSubscriptionStatus(
    subscriptionId: string,
    shopName: string, 
    cancelReason?: string, 
    email: string, 
    prorate: boolean = false,
    isCanceled: boolean = false,
    status?: SubscriptionStatus,
    createdAt?: Date,
    updatedAt?: Date,
    price?: number,
  ): Promise<Subscription> {
    const isEmailValid = email && this.isValidEmail(email);
    if (!shopName?.trim()) {
      throw new Error(this.Errors.MISSING_PARAMETERS);
    }
    const currentSubscription = await this.getSubscriptionByShopifySubscriptionId(subscriptionId);
    if (!currentSubscription) {
      throw new Error(this.Errors.SUBSCRIPTION_NOT_FOUND);
      return;
    }
    if (currentSubscription?.shopifySubscriptionId !== subscriptionId) {
      console.error(`Subscription ID mismatch in cancel operation. Expected: ${subscriptionId}, Found: ${currentSubscription.shopifySubscriptionId}`);
      throw new Error('SUBSCRIPTION_ID_MISMATCH');
      return;
    }
    if (currentSubscription.plan.name === SubscriptionPlan.FREE) {
      throw new Error('Free plans cannot be canceled as they do not involve subscriptions.');
      return;
    }
    if (Object.keys(this.terminatedStatuses).includes(currentSubscription?.status)) {
      throw new Error('This subscription is already canceled.');
      console.error('This subscription is already canceled.');
      return;
    }
    const now = DateTime.utc();
    const updatedTime = DateTime.fromJSDate(currentSubscription.updatedAt).toUTC();
    const minutesSinceUpdate = now.diff(updatedTime, 'minutes').minutes;
    if (currentSubscription?.status === status && minutesSinceUpdate < 30) {
      console.error('This subscription was already updated in the last 30 minutes.');
      return;
    }

    const cycleStatus = await this.checkAndManageCycle(currentSubscription, shopName);
    try {
      return await prisma.$transaction(async (tx) => {
        let updatedSubscription;
        const subscriptionCreatedAt = createdAt ? 
          DateTime.fromISO(createdAt).toUTC() :
          DateTime.fromJSDate(currentSubscription?.startDate).toUTC();
        const subscriptionUpdatedAt = updatedAt ? 
          DateTime.fromISO(updatedAt).toUTC() :
          DateTime.utc();
        const formattedCreatedAt = subscriptionCreatedAt.toFormat('cccc, dd MMMM yyyy');
        const formattedUpdatedAt = subscriptionUpdatedAt.toFormat('cccc, dd MMMM yyyy');
        if (isCanceled && (cycleStatus.isExpired || prorate)) {
          updatedSubscription = await this.handleImmediateCancellation(
            tx, 
            currentSubscription, 
            cycleStatus, 
            cancelReason, 
            prorate,
            subscriptionCreatedAt.toJSDate(), 
            subscriptionUpdatedAt.toJSDate(),
            price
          );
        } else {
          updatedSubscription = await this.handleStatusUpdate(
            tx, 
            currentSubscription, 
            status, 
            isCanceled, 
            cancelReason,
            subscriptionCreatedAt.toJSDate(),
            subscriptionUpdatedAt.toJSDate()
          );
        }
        await this.handleStatusUpdateNotification(tx, {
          subscription: currentSubscription,
          status: updatedSubscription?.status,
          isCanceled,
          prorate,
          cycleStatus,
          formattedUpdatedAt
        });
        await this.sendSubscriptionEmail(
          updatedSubscription,
          shopName,
          email,
          undefined,
          subscriptionUpdatedAt,
          updatedSubscription?.status
        );
        return updatedSubscription;
      }, {
        maxWait: this.MAX_WAIT,
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: this.TRANSACTION_TIMEOUT
      });
    } catch (error) {
      console.error('Subscription status update error:', error);
      throw new Error(`Failed to update subscription status: ${error.message}.`);
    }
  }

  private static async handleImmediateCancellation(
    tx: PrismaTransaction,
    subscription: Subscription,
    cycleStatus: CycleStatus,
    cancelReason: string,
    prorate: boolean,
    createdAt: Date,
    updatedAt: Date,
    price?: number, 
  ): Promise<Subscription> {
    if (!subscription?.payments?.length) {
      throw new Error(this.Errors.PAYMENT_NOT_FOUND);
    }
    const lastPayment = subscription.payments[subscription.payments.length - 1];
    if (prorate) {
      const proratedAmount = parseInt(price) ?? Math.round(lastPayment.amount * (cycleStatus.usageDaysPercentage / 100));
      const adjustedAmount = Math.max(0, lastPayment.amount - proratedAmount);
      await tx.payment.update({
        where: { id: lastPayment.id },
        data: {
          amount: proratedAmount,
          adjustedAmount,
          updatedAt
        }
      });
    }
    const status = cycleStatus.isExpired 
      ? SubscriptionStatus.TERMINATED 
      : SubscriptionStatus.PRORATE_CANCELED;
    try {
      return await tx.subscription.update({
        where: { id: subscription.id },
        data: {
          status,
          cancelReason,
          endDate: updatedAt,
          updatedAt,
          canceledAt: updatedAt,
        },
        include: this.subscriptionInclude
      });
    } catch (error) {
      console.error('Subscription cancel error:', error);
      throw new Error(`Failed to cancel subscription: ${error.message}. Please try again!.`);
    }
  }

  private static async handleStatusUpdate(
    tx: PrismaTransaction,
    subscription: Subscription,
    status: SubscriptionStatus,
    isCanceled: boolean,
    cancelReason?: string,
    createdAt?: Date,
    updatedAt?: Date,
  ): Promise<Subscription> {
    try {
      return await tx.subscription.update({
        where: { id: subscription.id },
        data: {
          status: isCanceled ? SubscriptionStatus.ON_HOLD : status,
          cancelReason: cancelReason || null,
          startDate: createdAt,
          endDate: DateTime.fromJSDate(createdAt).plus({ months: 1 }).toUTC().toJSDate(),
          createdAt: createdAt || DateTime.utc().toJSDate(),
          updatedAt: updatedAt || DateTime.utc().toJSDate(),
          canceledAt: Object.keys(this.terminatedStatuses).includes(status) ? updatedAt : null,
        },
        include: this.subscriptionInclude
      });
    } catch (error) {
      console.error('Subscription status update error:', error);
      throw new Error(`Failed to update subscription status: ${error.message}.`);
    }
  }

  private static async handleStatusUpdateNotification(
    tx: PrismaTransaction,
    params: {
      subscription: Subscription;
      status: SubscriptionStatus;
      isCanceled: boolean;
      prorate: boolean;
      cycleStatus: CycleStatus;
      formattedUpdatedAt: string;
    }
  ) {
    const { subscription, status, isCanceled, prorate, cycleStatus, formattedUpdatedAt } = params;
    const getNotificationContent = () => {
      const statusContent = {
        [SubscriptionStatus.PENDING]: {
          title: `Subscription Pending: Doc2Product's ${subscription.plan.name} Plan`,
          message: `Your ${subscription.plan.name} plan is pending cancellation. ${
            prorate 
              ? 'Your subscription will be cancelled immediately with a prorated refund.'
              : cycleStatus.isExpired 
                ? 'Your subscription will end after the current cycle.' 
                : `You will continue to have access until the end of your current billing cycle on ${formattedUpdatedAt} (${cycleStatus?.daysUntilExpiration ?? '0'} days from now).`
          }`
        },
        [SubscriptionStatus.ON_HOLD]: {
          title: `Subscription Canceled and On hold: Doc2Product's ${subscription.plan.name} Plan`,
          message: `Your ${subscription.plan.name} plan has been canceled and put on hold.`
        },
        [SubscriptionStatus.FROZEN]: {
          title: `Subscription Frozen: Doc2Product's ${subscription.plan.name} Plan`,
          message: `Your ${subscription.plan.name} plan has been frozen due to payment issues.`
        },
        [SubscriptionStatus.EXPIRED]: {
          title: `Subscription Expired: Doc2Product's ${subscription.plan.name} Plan`,
          message: `Your ${subscription.plan.name} plan has been expired.`
        },
        [SubscriptionStatus.DECLINED]: {
          title: `Subscription Declined: Doc2Product's ${subscription.plan.name} Plan`,
          message: `Your ${subscription.plan.name} plan has been declined.`
        },
        [SubscriptionStatus.TERMINATED]: {
          title: `Subscription Terminated: Doc2Product's ${subscription.plan.name} Plan`,
          message: `Your ${subscription.plan.name} plan has been canceled.`
        },
        DEFAULT: {
          title: `Subscription Canceled: Doc2Product's ${subscription.plan.name} Plan`,
          message: `Your ${subscription.plan.name} plan has been canceled. ${
            prorate 
              ? 'Your subscription has been cancelled immediately with a prorated refund.'
              : cycleStatus.isExpired 
                ? 'Your subscription has ended.' 
                : `You will continue to have access until the end of your current billing cycle on ${formattedUpdatedAt} (${cycleStatus?.daysUntilExpiration ?? '0'} days from now).`
          }`
        }
      };
      return statusContent[status] || statusContent.DEFAULT;
    };
    const notificationContent = getNotificationContent();
    await tx.notification.create({
      data: {
        shopId: subscription?.shopId,
        type: NotificationType.BILLING,
        title: notificationContent.title,
        message: notificationContent.message,
        createdAt: DateTime.utc().toJSDate(),
      },
    });
  }

  static async updatePaymentStatus(
    shopName: string, 
    chargeId: string, 
    status: PaymentStatus
  ): Promise<void> {
    const currentSubscription = await this.getCurrentSubscription(shopName);
    if (!currentSubscription) {
      throw new Error(this.Errors.SUBSCRIPTION_NOT_FOUND);
    }
    const now = DateTime.utc().toJSDate();
    const pendingPayment = await prisma.payment.findFirst({
      where: {
        subscriptionId: currentSubscription.id
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    if (!pendingPayment) {
      throw new Error('No pending payment found for this subscription');
    }
    return await prisma.$transaction(async (prisma) => {
      await prisma.payment.update({
        where: { id: pendingPayment.id },
        data: {
          status,
          transactionId: chargeId,
          updatedAt: now
        }
      });
      if (status === PaymentStatus.SUCCEEDED) {
          await prisma.subscription.update({
          where: { id: currentSubscription.id },
          data: { 
            status: SubscriptionStatus.ACTIVE,
            updatedAt: now
          }
        });
        await UsageManager.resetUsageCounts(shopName);
      } else if (status === PaymentStatus.FAILED || status === PaymentStatus.CANCELLED) {
        await prisma.subscription.update({
          where: { id: currentSubscription.id },
          data: { 
            status: SubscriptionStatus.EXPIRED,
            updatedAt: now
          }
        });
      }
    }, {
      maxWait: this.MAX_WAIT,
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      timeout: this.TRANSACTION_TIMEOUT, 
    });
  }

  static async checkSubscriptionStatus(
    planName: string, 
    shopName: string, 
    canceled?: boolean,
    email: string
  ): Promise<BillingEvent> {
    try {
      const currentSubscription = await this.getCurrentSubscription(shopName, email);
      if (canceled) {
        return BillingEvent.CANCEL;
      }
      if (!currentSubscription) {
        return BillingEvent.SUBSCRIBE;
      }
      const currentPlanName = currentSubscription.plan?.name;
      const isExpired = currentSubscription.status === SubscriptionStatus.EXPIRED;
      if (isExpired || currentPlanName === planName) {
        return BillingEvent.RENEW;
      }
      if (currentPlanName && currentPlanName !== planName) {
        return BillingEvent.UPDATE;
      }
      return BillingEvent.SUBSCRIBE;
    } catch (error) {
      console.error('Error checking subscription status:', error);
      throw new Error(`Failed to check subscription status: ${error.message}`);
    }
  }

  static async getSubscriptionById(subscriptionId: string): Promise<Subscription | null> {
    if (!subscriptionId?.trim()) {
      throw new Error(this.Errors.MISSING_PARAMETERS);
    }
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { 
          id: subscriptionId 
        },
        include: this.subscriptionInclude
      });
      if (!subscription) {
        console.error(`No subscription found with Subscription ID: ${subscriptionId}`);
        throw new Error(this.Errors.SUBSCRIPTION_NOT_FOUND);
      }
      if (subscription.id !== subscriptionId) {
        console.error(`Subscription ID mismatch. Expected: ${subscriptionId}, Found: ${subscription.id}`);
        throw new Error('SUBSCRIPTION_ID_MISMATCH');
      }
      if (!subscription.plan) {
        console.warn(`Subscription with Subscription ID ${subscriptionId} found but no associated plan exists`);
      }
      return subscription;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === this.Errors.SUBSCRIPTION_NOT_FOUND) {
          throw error;
        }
        if (error.message === 'SUBSCRIPTION_ID_MISMATCH') {
          throw error;
        }
      }
      console.error('Error getting subscription by subscription ID:', error);
      throw new Error(`Failed to get subscription by subscription ID: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  static async getSubscriptionByShopifySubscriptionId(shopifySubscriptionId: string): Promise<Subscription | null> {
    if (!shopifySubscriptionId?.trim()) {
      throw new Error(this.Errors.MISSING_PARAMETERS);
    }
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { 
          shopifySubscriptionId: shopifySubscriptionId 
        },
        include: this.subscriptionInclude
      });
      if (!subscription) {
        console.error(`No subscription found with Shopify ID: ${shopifySubscriptionId}`);
        throw new Error(this.Errors.SUBSCRIPTION_NOT_FOUND);
      }
      if (subscription.shopifySubscriptionId !== shopifySubscriptionId) {
        console.error(`Subscription ID mismatch. Expected: ${shopifySubscriptionId}, Found: ${subscription.shopifySubscriptionId}`);
        throw new Error('SUBSCRIPTION_ID_MISMATCH');
      }
      if (!subscription.plan) {
        console.warn(`Subscription with Shopify ID ${shopifySubscriptionId} found but no associated plan exists`);
      }
      return subscription;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === this.Errors.SUBSCRIPTION_NOT_FOUND) {
          throw error;
        }
        if (error.message === 'SUBSCRIPTION_ID_MISMATCH') {
          throw error;
        }
      }
      console.error('Error getting subscription by Shopify subscription ID:', error);
      throw new Error(`Failed to get subscription by Shopify subscription ID: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  static async getCurrentSubscription(shopName: string, email: string) {
    if (!shopName?.trim()) {
      throw new Error(this.Errors.MISSING_PARAMETERS);
    }
    try {
      return await prisma.$transaction(async (tx) => {
        const shop = await ShopifySessionManager.findShopByName(shopName);
        if (!shop) {
          throw new Error(this.Errors.SHOP_NOT_FOUND);
        }
        let subscription = await tx.subscription.findFirst({
          where: { 
            shopId: shop.id,
            status: {
              in: [
                SubscriptionStatus.ACTIVE, 
                SubscriptionStatus.ON_HOLD, 
                SubscriptionStatus.TRIAL
              ]
            }
          },
          orderBy: {
            startDate: 'desc'
          },
          include: this.subscriptionInclude
        });
        if (!subscription) {
          subscription = await SubscriptionManager.createDefaultSubscription(shop.id, shopName, email);
          if (!subscription) {
            throw new Error('Failed to create a default subscription');
          }
        }
        const updatedSubscription = await this.handleCycleTransition(subscription, shopName, email);
        if (!updatedSubscription.plan) {
          console.warn(`Subscription found for shop ${shopName} but no associated plan exists`);
        }
        return updatedSubscription;
      }, {
        maxWait: this.MAX_WAIT,
        timeout: this.TRANSACTION_TIMEOUT,
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable
      });
    } catch (error) {
      console.error('Error getting current subscription:', error);
      throw new Error(`Failed to get current subscription: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  static async checkTrialStatus(subscription: Subscription): Promise<TrialStatus> {
    if (!subscription?.startDate || 
      !subscription?.plan?.trialDays || 
      subscription?.plan?.trialDays === 0
    ) {
      return {
        isTrialEnding: false,
        daysUntilTrialEnds: 0,
        trialStartDate: subscription?.startDate,
        trialEndDate: DateTime.utc().toJSDate(),
        shouldNotify: false,
        needsConversion: false
      };
    }
    const now = DateTime.utc();
    const startDate = DateTime.fromJSDate(subscription.startDate).toUTC();
    const trialEndDate = startDate.plus({ days: subscription.plan.trialDays });
    const daysUntilTrialEnds = Math.max(0, Math.floor(trialEndDate.diff(now, 'days').days));
    const shouldNotify = this.TRIAL_NOTIFICATION_DAYS.includes(daysUntilTrialEnds);
    const needsConversion = now.toMillis() >= trialEndDate.toMillis() && subscription.status === SubscriptionStatus.TRIAL;
    return {
      isTrialEnding: daysUntilTrialEnds <= Math.max(...this.TRIAL_NOTIFICATION_DAYS),
      daysUntilTrialEnds,
      trialStartDate: startDate.toJSDate(),
      trialEndDate: trialEndDate.toJSDate(),
      shouldNotify,
      needsConversion
    };
  }

  static async checkAndManageCycle(subscription: Subscription, shopName: string): Promise<CycleStatus> {
    if (!shopName?.trim()) {
      throw new Error(this.Errors.MISSING_PARAMETERS);
    }
    if (!subscription) {
      throw new Error(this.Errors.SUBSCRIPTION_NOT_FOUND);
    }
    if (!subscription.startDate || !subscription.endDate) {
      throw new Error(this.Errors.INVALID_DATES);
    }
    const now = DateTime.utc();
    const startDate = DateTime.fromJSDate(subscription.startDate).toUTC();
    const endDate = DateTime.fromJSDate(subscription.endDate).toUTC();
    if (startDate > endDate) {
      throw new Error(this.Errors.INVALID_DATES);
    }
    const trialStatus = await this.checkTrialStatus(subscription);
    const daysUntilExpiration = Math.max(0, Math.floor(endDate.diff(now, 'days').days));
    const daysFromSubscriptionStart = Math.floor(now.diff(startDate, 'days').days);
    const totalSubscriptionDays = Math.floor(endDate.diff(startDate, 'days').days);
    const usageDaysPercentage = Math.min(100, Math.round((daysFromSubscriptionStart / totalSubscriptionDays) * 100));
    const isCycleTransition = now.startOf('day').toMillis() === endDate.startOf('day').toMillis();
    const isExpired = now.toMillis() > endDate.toMillis();
    const nextCycle = subscription.status === SubscriptionStatus.ACTIVE ? {
      nextCycleStart: DateTime.fromJSDate(subscription.endDate).toJSDate(),
      nextCycleEnd: DateTime.fromJSDate(subscription.endDate).plus({ months: 1 }).toJSDate()
    } : {};
    return {
      ...trialStatus,
      isExpired,
      daysUntilExpiration,
      daysFromSubscriptionStart,
      usageDaysPercentage,
      isCycleTransition,
      currentCycleStart: subscription.startDate,
      currentCycleEnd: subscription.endDate,
      ...nextCycle
    };
  }

  static async convertTrialToRegularSubscription(
    tx: Prisma.TransactionClient,
    subscription: Subscription,
    shopName: string, 
    startDate: DateTime,
    endDate: DateTime,
    email: string
  ): Promise<Subscription> {
    try {
      return await prisma.$transaction(async (tx) => {
        const pendingPayment = await tx.payment.findFirst({
          where: {
            subscriptionId: subscription.id,
            status: PaymentStatus.SCHEDULED
          }
        });
        if (pendingPayment) {
          await tx.payment.update({
            where: { id: pendingPayment.id },
            data: {
              status: PaymentStatus.SUCCEEDED,
              billingPeriodStart: startDate.toJSDate(),
              billingPeriodEnd: endDate.toJSDate(),
              updatedAt: startDate.toJSDate()
            }
          });
        } else {
          await tx.payment.create({
            data: {
              shop: { connect: { id: subscription.shopId } },
              subscription: { connect: { id: subscription.id } },
              amount: subscription.plan.totalPrice,
              adjustedAmount: 0,
              currency: 'USD',
              billingType: BillingType.SUBSCRIPTION,
              status: PaymentStatus.SUCCEEDED,
              billingPeriodStart: startDate.toJSDate(),
              billingPeriodEnd: endDate.toJSDate(),
              shopifyTransactionId: subscription.shopifySubscriptionId
            }
          });
        }
        const updatedSubscription = await tx.subscription.update({
          where: { id: subscription.id },
          data: {
            status: SubscriptionStatus.ACTIVE,
            startDate: startDate.toJSDate(),
            endDate: endDate.toJSDate(),
            updatedAt: startDate.toJSDate(),
            metadata: {
              hasTrial: true,
              trialStartDate: subscription.startDate,
              trialEndDate: subscription.endDate,
              hasTrialEnded: true
            }
          },
          include: this.subscriptionInclude
        });
        return updatedSubscription;
      });
    } catch (error) {
      console.error('Error converting to regular subscription:', error);
      throw new Error(`Failed to convert trial subscription to regular subscription: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  static async handleCycleTransition(subscription: Subscription, shopName: string, email: string): Promise<Subscription> {
    if (!shopName?.trim()) {
      throw new Error(this.Errors.MISSING_PARAMETERS);
    }
    try {
      return await this.executeWithRetry(async () => {
        return prisma.$transaction(async (tx) => {
        const startDate = DateTime.utc();
        const endDate = startDate.plus({ months: 1 });
        const cycleStatus = await this.checkAndManageCycle(subscription, shopName);
        if (cycleStatus.shouldNotify) {
          await this.handleTrialEndingNotification(tx, subscription, shopName, cycleStatus, email);
        }
        if (cycleStatus.needsConversion) {
          await this.handleTrialEndedNotification(
            tx,
            subscription,
            shopName,
            startDate,
            email
          )
          return await this.convertTrialToRegularSubscription(tx, subscription, shopName, startDate, endDate, email);
        }
        if (cycleStatus?.isExpired) {
          if (subscription.status === SubscriptionStatus.ACTIVE) {
            await UsageManager.resetUsageCounts(subscription, subscription.shopId);
            await this.handleSubscriptionUpdateNotification(
              tx,
              subscription,
              shopName,
              email,
              SubscriptionStatus.RENEWING,
              'Subscription Renewed',
              'Your subscription has been automatically renewed for another billing cycle.',
              startDate,
              endDate
            );
            return await this.updateCycleDates(subscription, shopName, startDate.toJSDate(), endDate.toJSDate());
          } else if (subscription.status === SubscriptionStatus.ON_HOLD) {
            await tx.subscription.update({
              where: { id: subscription.id },
              data: {
                status: SubscriptionStatus.CANCELLED,
                endDate: startDate.toJSDate(),
                updatedAt: startDate.toJSDate(),
              }
            });
            await this.handleSubscriptionUpdateNotification(
              tx,
              subscription,
              shopName,
              email,
              SubscriptionStatus.CANCELLED,
              'Subscription Cancelled',
              'Your subscription has been cancelled due to payment issues.',
              undefined,
              startDate
            );
            return await this.createDefaultSubscription(subscription.shopId, shopName, email);
          }
        }
        return subscription;
       }, {
          maxWait: this.MAX_WAIT,
          timeout: this.TRANSACTION_TIMEOUT,
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable
        })
      });
    } catch (error) {
      console.error('Error handle cycle transition operations:', error);
      throw new Error(`Failed to handle subscription cycle transition operations: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  static async updateCycleDates(
    subscription: Subscription,
    shopName: string, 
    newStartDate?: Date, 
    newEndDate?: Date
  ): Promise<Subscription> {
    if (!subscription) {
      throw new Error(this.Errors.SUBSCRIPTION_NOT_FOUND);
    }
    if (!shopName) {
      throw new Error(this.Errors.MISSING_PARAMETERS);
    }
    const updateData: any = {};
    if (newStartDate) {
      updateData.startDate = newStartDate;
      if (!newEndDate) {
        updateData.endDate = DateTime.fromJSDate(newStartDate)
          .plus({ months: 1 })
          .toJSDate();
      }
    }
    if (newEndDate) {
      updateData.endDate = newEndDate;
      if (!newStartDate) {
        const proposedStartDate = DateTime.fromJSDate(newEndDate)
          .minus({ months: 1 });
        const currentStartDate = DateTime.fromJSDate(subscription.startDate);
        updateData.startDate = proposedStartDate > currentStartDate 
          ? proposedStartDate.toJSDate()
          : currentStartDate.toJSDate();
      }
    }
    try {
      await prisma.$transaction(async (tx) => {
        if (subscription?.plan !== SubscriptionPlan.FREE) {
          const lastPayment = subscription?.payments?.[subscription.payments.length - 1];
          if (!lastPayment) {
            throw new Error(this.Errors.PAYMENT_NOT_FOUND);
          }
          await tx.payment.create({
            data: {
              shopId: subscription?.shopId,
              subscriptionId: subscription.id,
              amount: lastPayment.amount,
              adjustedAmount: lastPayment.adjustedAmount,
              currency: lastPayment.currency,
              billingType: BillingType.SUBSCRIPTION,
              status: PaymentStatus.SUCCEEDED,
              billingPeriodStart: updateData.startDate,
              billingPeriodEnd: updateData.endDate,
              shopifyTransactionId: lastPayment.transactionId,
            }
          });
        }
        return await tx.subscription.update({
          where: { id: subscription.id },
          data: {
            startDate: updateData?.startDate,
            endDate: updateData?.endDate,
            updatedAt: DateTime.utc().toJSDate()
          },
          include: this.subscriptionInclude
        });
      }, {
        maxWait: this.MAX_WAIT,
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: this.TRANSACTION_TIMEOUT
      });
    } catch (error) {
      console.error(`Failed to update cycle dates for shop ${shopName}:`, error);
      throw new Error(`Failed to update subscription cycle: ${error.message}`);
    }
  }

  private static async handleSubscriptionUpdateNotification(
    tx: Prisma.TransactionClient,
    subscription: Subscription,
    shopName: string,
    email: string,
    status: SubscriptionStatus,
    title: string,
    message: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<void> {
    const isEmailValid = email && this.isValidEmail(email);
    await tx.notification.create({
      data: {
        shopId: subscription.shopId,
        type: NotificationType.BILLING,
        title,
        message,
        createdAt: DateTime.utc().toJSDate()
      }
    });
    await this.sendSubscriptionEmail(
      subscription,
      shopName,
      email,
      startDate ? DateTime.fromJSDate(startDate) : undefined,
      endDate ? DateTime.fromJSDate(endDate) : undefined,
      status
    );
  }

  private static async handleTrialEndedNotification(
    tx: Prisma.TransactionClient,
    subscription: Subscription,
    shopName: string,
    date: Date | DateTime,
    email: string,
  ): Promise<void> {
    const isEmailValid = email && this.isValidEmail(email);
    const lastNotification = await tx.notification.findFirst({
      where: {
        shopId: subscription.shopId,
        type: NotificationType.TRIAL_ENDED,
        createdAt: {
          gte: date.minus({ days: 1 }).toJSDate()
        }
      }
    });
    if (!lastNotification) {
      await tx.notification.create({
        data: {
          shopId: subscription.shopId,
          type: NotificationType.TRIAL_ENDED,
          title: 'Trial Period Ended - Subscription Activated',
          message: `Your trial has ended and your subscription is now active. Your first payment has been processed.`,
          createdAt: date.toJSDate(),
        }
      });
      await this.sendSubscriptionEmail(
        subscription,
        shopName,
        email,
        undefined,
        date,
        SubscriptionStatus.TRIAL_ENDED
      );
    }
  }

  private static async handleTrialEndingNotification(
    tx: Prisma.TransactionClient,
    subscription: Subscription,
    shopName: string,
    cycleStatus: CycleStatus,
    email: string,
  ): Promise<void> {
    const lastNotification = await tx.notification.findFirst({
      where: {
        shopId: subscription.shopId,
        type: NotificationType.TRIAL_ENDING,
        createdAt: {
          gte: DateTime.utc().minus({ days: 1 }).toJSDate()
        }
      }
    });
    if (!lastNotification) {
      await tx.notification.create({
        data: {
          shopId: subscription.shopId,
          type: NotificationType.TRIAL_ENDING,
          createdAt: DateTime.utc().toJSDate(),
          title: `Trial Ending: ${cycleStatus.daysUntilTrialEnds} Days Remaining`,
          message: `Your trial period will end in ${cycleStatus.daysUntilTrialEnds} days.`
        }
      });
      await this.sendSubscriptionEmail(
        subscription,
        shopName,
        email,
        undefined,
        cycleStatus.trialEndDate,
        SubscriptionStatus.TRIAL_ENDING
      );
    }
  }

  static async sendSubscriptionEmail(
    subscription: Subscription, 
    shopName: string, 
    email: string, 
    startDate?: DateTime | Date, 
    endDate?: DateTime | Date,
    status: SubscriptionStatus
  ): Promise<void> {
    const isEmailValid = email && this.isValidEmail(email);
    if (!isEmailValid) {
      console.log(this.Errors.NO_EMAIL_PROVIDED);
      return;
    }
    if (!subscription) {
      throw new Error(this.Errors.SUBSCRIPTION_NOT_FOUND);
      return null;
    }
    try {
      const emailData: any = {
       shopName: shopName,
       planName: subscription?.plan?.name,
       amount: subscription?.payment?.amount ?? subscription?.plan?.totalPrice,
       adjustedAmount: subscription?.payment?.adjustedAmount ?? 0,
       currency: subscription?.plan.currency || 'USD',
     };
     if (startDate) {
       const startDateTime = startDate instanceof DateTime ? startDate : DateTime.fromJSDate(startDate);
       emailData.currentBillingDate = startDateTime.toLocal().toFormat('cccc, dd MMMM yyyy');
     }
     if (endDate) {
       const endDateTime = endDate instanceof DateTime ? endDate : DateTime.fromJSDate(endDate);
       emailData.nextBillingDate = endDateTime.toLocal().toFormat('cccc, dd MMMM yyyy');
     }
      await emailService.initialize();
      await emailService.sendSubscriptionEmail(email, emailData, status);
    } catch (error) {
      console.error('Failed to send subscription activation email:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email,
        shopName,
        planName: subscription?.plan.name
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