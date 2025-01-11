import { Prisma, PrismaClient, Plan, Shop, SubscriptionPlan, Usage, NotificationType, Service, SubscriptionStatus, PaymentStatus, BillingType, BillingEventType, Promotion, Discount } from '@prisma/client';
import { ShopifySessionManager, ModelManager } from '@/utils/storage';
import { UsageManager } from '@/utils/usage';
import { BillingEvent, CycleStatus } from '@/types/billing';
import { PlanManager } from '@/utils/billing';
import { BillingOperationsService } from './billingOperationsService';
import { PaymentManager } from '@/utils/billing';
import { MathUtils } from '@/utils/utilities/mathUtils';
import { prisma } from '@/lib/prisma';
import { DateTime } from 'luxon';
import { v4 as uuidv4 } from "uuid";
import emailService, { EmailServiceError, EmailResponse } from '@/utils/email/emailService';

type PromotionOrDiscount = Promotion | Discount;

export class SubscriptionManager {
  private prisma: PrismaClient;
  private billingOps: BillingOperationsService;
  private static readonly TRANSACTION_TIMEOUT = 50000;

  private static readonly MAX_WAIT = 5000;

  private static readonly CREDIT_CONVERSION = {
    [Service.AI_API]: 0.1, 
    [Service.CRAWL_API]: 1
  };

  private static readonly TOTAL_CONVERSION_RATE = 1.1;

  private static calculateCreditsForService(service: Service, totalCredits: number): number {
    const conversionRate = this.CREDIT_CONVERSION[service];
    if (conversionRate === undefined) {
      throw new Error(`Service ${service} not found in CREDIT_CONVERSION.`);
    }
    const result = (totalCredits * conversionRate) / this.TOTAL_CONVERSION_RATE;
    return MathUtils.floor(result, 2);
  }

  static async getSubscriptionDetails(shopName: string) {
    try {
      const subscription = await this.getCurrentSubscription(shopName);
      if (!subscription) {
        return null;
      }
      const cycleStatus = await this.checkAndManageCycle(shopName);
      const latestPayment = subscription.payments[subscription.payments.length - 1];
      const billingAdjustments = await this.calculateBillingAdjustments(latestPayment?.billingEvents || []);
      return {
        status: subscription.status,
        plan: {
          name: subscription.plan.name,
          price: subscription.plan.price,
          feature: subscription.plan.feature
        },
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        daysUntilExpiration: cycleStatus.daysUntilExpiration,
        isCycleTransition: cycleStatus.isExpired,
        nextCycleStart: cycleStatus.nextCycleStart,
        nextCycleEnd: cycleStatus.nextCycleEnd,
        billingAdjustments,
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
    const now = DateTime.now();
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
    let finalPrice = plan?.totalPrice;
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

  static async subscribeWithPromotionStrategy(
    shopName: string,
    planName: string,
    transactionId: string,
    email: string
  ): Promise<Shop> {
    const shop = await ShopifySessionManager.findShopByName(shopName);
    if (!shop) throw new Error('Shop not found');
    const plan = await PlanManager.getPlanByName(planName);
    if (!plan) throw new Error('Plan not found');
    const model = await ModelManager.getLatestModel();
    if (!model) throw new Error('Model not found');
    const associatedUsers = await ShopifySessionManager.findCurrentAssociatedUsersByShop(shopName);
    if (!associatedUser?.userId) {
      throw new Error(`Associated user not found for email: ${email}`);
    }
    const { finalPrice, adjustedAmount, appliedPlanDiscount, durationLimitInIntervals } = await this.calculateDiscountMetrics(plan, shop?.id);
    const aiApiCredits = this.calculateCreditsForService(Service.AI_API, plan?.creditAmount);
    const crawlApiCredits = plan?.creditAmount - aiApiCredits;
    const now = new Date();
    const startDate = DateTime.now();
    const endDate = startDate.plus({ months: 1 });
    try {
      return await prisma.$transaction(async (tx) => {
        await tx.subscription.updateMany({
          where: {
            shopId: shop.id,
            status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.FROZEN] },
          },
          data: {
            status: SubscriptionStatus.EXPIRED,
            endDate: startDate.toJSDate(),
            updatedAt: new Date(),
          },
        });
        const usage = await tx.usage.create({
          data: {
            shop: { connect: { id: shop.id } },
            associatedUsers: {
              create: associatedUsers.map(user => ({
                associatedUser: {
                  connect: { userId: user.userId }
                }
              }))
            },
            serviceUsage: {
              create: {
                aiUsageDetails: {
                  create: {
                    service: Service.AI_API,
                    modelName: model.name,
                    inputTokensCount: 0,
                    outputTokensCount: 0,
                    totalRequests: plan?.feature?.aiAPI?.requestLimits ?? 0,
                    totalRemainingRequests: plan?.feature?.aiAPI?.requestLimits ?? 0,
                    totalRequestsUsed: 0,
                    requestsPerMinuteLimit: plan?.feature?.aiAPI?.RPM ?? 0,
                    requestsPerDayLimit: plan?.feature?.aiAPI?.RPD ?? 0,
                    remainingRequestsPerMinute: plan?.feature?.aiAPI?.RPM ?? 0,
                    remainingRequestsPerDay: plan?.feature?.aiAPI?.RPD ?? 0,
                    resetTimeForMinuteRequests: now,
                    resetTimeForDayRequests: now,
                    tokensConsumedPerMinute: 0,
                    tokensConsumedPerDay: 0,
                    totalTokens: plan?.feature?.aiAPI?.totalTokens ?? 0,
                    totalTokensUsed: 0,
                    totalCredits: aiApiCredits ?? 0,
                    totalCreditsUsed: 0,
                    totalRemainingCredits: aiApiCredits ?? 0,
                    lastTokenUsageUpdateTime: now
                  }
                },
                crawlUsageDetails: {
                  create: {
                    service: Service.CRAWL_API,
                    totalRequests: plan?.feature?.crawlAPI?.requestLimits ?? 0,
                    totalRemainingRequests: plan?.feature?.crawlAPI?.requestLimits ?? 0,
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
            plan: { connect: { id: plan.id } },
            status: SubscriptionStatus.ACTIVE,
            startDate: startDate.toJSDate(),
            endDate: endDate.toJSDate(),
            usage: { connect: { id: usage.id } },
            shopifySubscriptionId: transactionId,
            associatedUsers: {
              create: {
                associatedUser: {
                  connect: { userId: associatedUser.userId }
                }
              }
            },
          }
        });
        switch(appliedPlanDiscount?.type) {
          case 'promotion': {
            const promotion = appliedPlanDiscount.discount as Promotion;
            await tx.payment.create({
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
              }
            });
            await tx.promotion.update({
              where: { id: promotion.id },
              data: { usedCount: { increment: 1 } },
            });
            break;
          }
          case 'discount': {
            const discount = appliedPlanDiscount.discount as Discount;
            await tx.payment.create({
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
              }
            });
            await tx.discount.update({
              where: { id: discount.id },
              data: { usedCount: { increment: 1 } }
            });
            break;
          }
          default: {
            await tx.payment.create({
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
              }
            });
          }
        }
        await tx.notification.create({
          data: {
            shopId: shop.id,
            type: NotificationType.BILLING,
            title: `Subscription Successful: Doc2Product's ${planName} Plan`,
            message: `Thank you for subscribing to ${planName} plan! Your subscription is now active, and you can enjoy all the features included in this plan. If you have any questions, feel free to contact support.`,
          },
        });
        await this.sendSubscriptionActivated(plan, shopName, email, endDate);
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
      throw new Error(`Failed to create subscription: ${error.message}`);
    }
  }

  static async subscribe(shopName: string, planName: string, transactionId: string): Promise<Shop> {
    const shop = await ShopifySessionManager.findShopByName(shopName);
    if (!shop) throw new Error('Shop not found');
    const plan = await PlanManager.getPlanByName(planName);
    if (!plan) throw new Error('Invalid subscription plan');
    const startDate = DateTime.now();
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
            updatedAt: new Date()
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
                associatedUsers: true,
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
    try {
      await prisma.$transaction(async (tx) => {
        const currentSubscription = await this.getCurrentSubscription(shopName);
        if (currentSubscription) {
          await tx.subscription.update({
            where: { id: currentSubscription.id },
            data: { 
              status: SubscriptionStatus.CANCELLED,
              endDate: DateTime.now().toJSDate(),
              updatedAt: new Date()
            }
          });
        }
      }, {
        maxWait: this.MAX_WAIT,
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: this.TRANSACTION_TIMEOUT
      });       
      return await this.subscribeWithPromotionStrategy(shopName, newPlanName, transactionId, email);
    } catch (error) {
      console.error('Subscription update error:', error);
      throw new Error(`Failed to update subscription: ${error.message}`);
    }
  }

  static async createDefaultSubscription(shopId: string): Promise<Subscription> {
    try {
      const freePlan = await prisma.plan.findFirst({
        where: { name: SubscriptionPlan.FREE }
      });
      if (!freePlan) {
        throw new Error('Free plan not found in the system');
      }
      const startDate = DateTime.now().startOf('day');
      const endDate = startDate.plus({ months: 1 });
      return await prisma.subscription.create({
        data: {
          shop: { connect: { id: shopId } },
          plan: { connect: { id: freePlan.id } },
          status: SubscriptionStatus.ACTIVE,
          startDate: startDate.toJSDate(),
          endDate: endDate.toJSDate(),
        },
        include: {
          plan: true,
          payments: true
        }
      });
    } catch (error) {
      console.error('Error creating default subscription:', error);
      throw new Error(`Failed to create default subscription: ${error.message}`);
    }
  }

  static async renew(shopName: string, transactionId: string, email: string): Promise<Shop> {
    const shop = await ShopifySessionManager.findShopByName(shopName);
    if (!shop) throw new Error('Shop not found');
    const currentSubscription = await this.getCurrentSubscription(shopName);
    if (!currentSubscription) throw new Error('No subscription found');
    if (currentSubscription.plan.name === 'FREE') {
      throw new Error('Cannot renew a free plan');
    }
    const model = await ModelManager.getLatestModel();
    if (!model) throw new Error('Model not found');
    const associatedUsers = await ShopifySessionManager.findCurrentAssociatedUsersByShop(shopName);
    const associatedUser = await ShopifySessionManager.findAssociatedUserByEmail(email);
    if (!associatedUser?.userId) {
      throw new Error(`Associated user not found for email: ${email}`);
    }
    const now = new Date();
    const { finalPrice, adjustedAmount, appliedPlanDiscount, durationLimitInIntervals } = await this.calculateDiscountMetrics(currentSubscription?.plan, shop?.id);
    const aiApiCredits = this.calculateCreditsForService(Service.AI_API, currentSubscription?.plan?.creditAmount);
    const crawlApiCredits = currentSubscription?.plan?.creditAmount - aiApiCredits;
    const startDate = DateTime.now();
    const endDate = startDate.plus({ months: 1 });
    return await prisma.$transaction(async (tx) => {
    const usage = await tx.usage.upsert({
        where: {
          id: currentSubscription.usageId
        },
        create: {
          shop: { connect: { id: shop.id } },
          associatedUsers: {
            create: associatedUsers.map(user => ({
              associatedUser: {
                connect: { userId: user.userId }
              }
            }))
          },
          serviceUsage: {
            create: {
              aiUsageDetails: {
                create: {
                  service: Service.AI_API,
                  modelName: model.name,
                  inputTokensCount: 0,
                  outputTokensCount: 0,
                  totalRequests: currentSubscription?.plan?.feature?.aiAPI?.requestLimits ?? 0,
                  totalRemainingRequests: currentSubscription?.plan?.feature?.aiAPI?.requestLimits ?? 0,
                  totalRequestsUsed: 0,
                  requestsPerMinuteLimit: currentSubscription?.plan?.feature?.aiAPI?.RPM ?? 0,
                  requestsPerDayLimit: currentSubscription?.plan?.feature?.aiAPI?.RPD ?? 0,
                  remainingRequestsPerMinute: currentSubscription?.plan?.feature?.aiAPI?.RPM ?? 0,
                  remainingRequestsPerDay: currentSubscription?.plan?.feature?.aiAPI?.RPD ?? 0,
                  resetTimeForMinuteRequests: now,
                  resetTimeForDayRequests: now,
                  tokensConsumedPerMinute: 0,
                  tokensConsumedPerDay: 0,
                  totalTokens: currentSubscription?.plan?.feature?.aiAPI?.totalTokens ?? 0,
                  totalTokensUsed: 0,
                  totalCredits: aiApiCredits ?? 0,
                  totalCreditsUsed: 0,
                  totalRemainingCredits: aiApiCredits ?? 0,
                  lastTokenUsageUpdateTime: now
                }
              },
              crawlUsageDetails: {
                create: {
                  service: Service.CRAWL_API,
                  totalRequests: currentSubscription?.plan?.feature?.crawlAPI?.requestLimits ?? 0,
                  totalRemainingRequests: currentSubscription?.plan?.feature?.crawlAPI?.requestLimits ?? 0,
                  totalRequestsUsed: 0,
                  totalCredits: crawlApiCredits ?? 0,
                  totalCreditsUsed: 0,
                  totalRemainingCredits: crawlApiCredits ?? 0,
                }
              }
            }
          }
        },
        update: {
          serviceUsage: {
            update: {
              aiUsageDetails: {
                update: {
                  service: Service.AI_API,
                  modelName: model.name,
                  inputTokensCount: 0,
                  outputTokensCount: 0,
                  totalRequests: currentSubscription?.plan?.feature?.aiAPI?.requestLimits ?? 0,
                  totalRemainingRequests: currentSubscription?.plan?.feature?.aiAPI?.requestLimits ?? 0,
                  totalRequestsUsed: 0,
                  requestsPerMinuteLimit: currentSubscription?.plan?.feature?.aiAPI?.RPM ?? 0,
                  requestsPerDayLimit: currentSubscription?.plan?.feature?.aiAPI?.RPD ?? 0,
                  remainingRequestsPerMinute: currentSubscription?.plan?.feature?.aiAPI?.RPM ?? 0,
                  remainingRequestsPerDay: currentSubscription?.plan?.feature?.aiAPI?.RPD ?? 0,
                  resetTimeForMinuteRequests: now,
                  resetTimeForDayRequests: now,
                  tokensConsumedPerMinute: 0,
                  tokensConsumedPerDay: 0,
                  totalTokens: currentSubscription?.plan?.feature?.aiAPI?.totalTokens ?? 0,
                  totalTokensUsed: 0,
                  totalCredits: aiApiCredits ?? 0,
                  totalCreditsUsed: 0,
                  totalRemainingCredits: aiApiCredits ?? 0,
                  lastTokenUsageUpdateTime: now
                }
              },
              crawlUsageDetails: {
                update: {
                  service: Service.CRAWL_API,
                  totalRequests: currentSubscription?.plan?.feature?.crawlAPI?.requestLimits ?? 0,
                  totalRemainingRequests: currentSubscription?.plan?.feature?.crawlAPI?.requestLimits ?? 0,
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
        }
      });
      switch(appliedPlanDiscount?.type) {
        case 'promotion': {
          const promotion = appliedPlanDiscount.discount as Promotion;
          await tx.payment.create({
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
            }
          });
          await tx.promotion.update({
            where: { id: promotion.id },
            data: { usedCount: { increment: 1 } },
          });
          break;
        }
        case 'discount': {
          const discount = appliedPlanDiscount.discount as Discount;
          await tx.payment.create({
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
            }
          });
          await tx.discount.update({
            where: { id: discount.id },
            data: { usedCount: { increment: 1 } }
          });
          break;
        }
        default: {
          await tx.payment.create({
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
            }
          });
        }
      }
      await tx.notification.create({
        data: {
          shopId: shop.id,
          type: NotificationType.BILLING,
          title: `Plan Renewed: Doc2Product's ${currentSubscription?.plan?.name} Plan`,
          message: `Your ${currentSubscription?.plan?.name} plan has been successfully renewed. Thank you for continuing with us! If you have any questions or need assistance, feel free to contact support.`,
        },
      });
      await this.sendSubscriptionActivated(currentSubscription?.plan, shopName, email, endDate);
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
       const startDate = DateTime.now();
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

  static async cancel(shopName: string, cancelReason?: string, email: string) {
    const shop = await ShopifySessionManager.findShopByName(shopName);
    if (!shop) throw new Error('Shop not found');
    const currentSubscription = await this.getCurrentSubscription(shopName);
    if (!currentSubscription) {
      throw new Error('No subscription found to cancel');
    }
    if (currentSubscription.plan.name === 'FREE') {
      throw new Error('Cannot cancel a free plan');
      return;
    }
    await prisma.$transaction(async (tx) => {
      await tx.payment.updateMany({
        where: {
          subscriptionId: currentSubscription.id,
          status: { in: [PaymentStatus.PENDING, PaymentStatus.SUCCEEDED] }
        },
        data: {
          status: PaymentStatus.CANCELLED,
          updatedAt: new Date()
        }
      });
      await tx.subscription.update({
        where: { id: currentSubscription.id },
        data: {
          status: SubscriptionStatus.CANCELLED,
          cancelReason,
          endDate: new Date(),
          updatedAt: new Date(),
          canceledAt: new Date(),
        },
        include: {
          payments: true,
          plan: true
        }
      });
      await tx.notification.create({
        data: {
          shopId: shop.id,
          type: NotificationType.BILLING,
          title: `Subscription Canceled: Doc2Product's ${currentSubscription.plan.name} Plan`,
          message: `Your ${currentSubscription.plan.name} plan has been successfully canceled. You will continue to have access until the end of your current billing cycle. If this was a mistake or you wish to resubscribe, please contact support or visit your billing settings.`,
        },
      });
      await this.sendSubscriptionExpired(currentSubscription, shopName, email);
    }, {
      maxWait: this.MAX_WAIT,
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      timeout: this.TRANSACTION_TIMEOUT
    });   
    return await this.reset(shopName, currentSubscription?.usage);
  }

  static async updatePaymentStatus(
    shopName: string, 
    chargeId: string, 
    status: PaymentStatus
  ): Promise<void> {
    const currentSubscription = await this.getCurrentSubscription(shopName);
    if (!currentSubscription) {
      throw new Error('No active subscription found');
    }
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
          updatedAt: new Date()
        }
      });
      if (status === PaymentStatus.SUCCEEDED) {
          await prisma.subscription.update({
          where: { id: currentSubscription.id },
          data: { 
            status: SubscriptionStatus.ACTIVE,
            updatedAt: new Date()
          }
        });
        await UsageManager.resetUsageCounts(shopName);
      } else if (status === PaymentStatus.FAILED || status === PaymentStatus.CANCELLED) {
        await prisma.subscription.update({
          where: { id: currentSubscription.id },
          data: { 
            status: SubscriptionStatus.EXPIRED,
            updatedAt: new Date()
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
    canceled?: boolean
  ): Promise<BillingEvent> {
    try {
      const currentSubscription = await this.getCurrentSubscription(shopName);
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

  static async getCurrentSubscription(shopName: string) {
    try {
      const shop = await ShopifySessionManager.findShopByName(shopName);
      if (!shop) {
        throw new Error(`Shop not found: ${shopName}`);
      }
      const subscription = await prisma.subscription.findFirst({
        where: { 
          shopId: shop.id,
          status: {
            in: [SubscriptionStatus.ACTIVE]
          }
        },
        orderBy: {
          startDate: 'desc'
        },
        include: {
          plan: {
            include: {
              feature: {
                 include: {
                  aiAPI: true,
                  crawlAPI: true
                }
              },
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
              associatedUser: true,
            },
          },
          billingEvents: {
            include: {
              promotion: true,
              discount: true,
            },
          },
          payments: {
            include: {
              billingEvents: {
                include: {
                  promotion: true,
                  discount: true,
                }
              }
            }
          }
        }
      });
      if (subscription && !subscription.plan) {
        console.warn(`Subscription found for shop ${shopName} but no associated plan exists`);
      }
      return subscription;
    } catch (error) {
      console.error('Error getting current subscription:', error);
      throw new Error(`Failed to get current subscription: ${error.message}`);
    }
  }

    static async checkAndManageCycle(shopName: string): Promise<CycleStatus> {
    if (!shopName) throw new Error('Shop name is required');
    const subscription = await this.getCurrentSubscription(shopName);
    if (!subscription) throw new Error(`No active subscription found for shop: ${shopName}`);
    if (!subscription.startDate || !subscription.endDate) {
      throw new Error('Invalid subscription dates');
    }
    /*if (startDate > endDate) {
      throw new Error('Invalid date range: start date is after end date');
    }*/
    const now = DateTime.utc();
    const startDate = DateTime.fromJSDate(subscription.startDate).toUTC();
    const endDate = DateTime.fromJSDate(subscription.endDate).toUTC();
    const daysUntilExpiration = Math.max(0, Math.floor(endDate.diff(now, 'days').days));
    const isCycleTransition = now.startOf('day').toMillis() === endDate.startOf('day').toMillis();
    const isExpired = now.toMillis() > endDate.toMillis();
    let nextCycleStart: Date | undefined;
    let nextCycleEnd: Date | undefined;
    if (subscription.status === SubscriptionStatus.ACTIVE) {
      nextCycleStart = endDate.toJSDate();
      nextCycleEnd = endDate.plus({ months: 1 }).toJSDate();
    }
    return {
      isExpired,
      daysUntilExpiration,
      isCycleTransition,
      currentCycleStart: subscription.startDate,
      currentCycleEnd: subscription.endDate,
      nextCycleStart,
      nextCycleEnd
    };
  }

  static async handleCycleTransition(shopName: string): Promise<void> {
    if (!shopName) {
      throw new Error('Shop name is required');
    }
    try {
      const cycleStatus = await this.checkAndManageCycle(shopName);
      const subscription = await this.getCurrentSubscription(shopName);
      if (!subscription) {
        throw new Error(`No active subscription found for shop: ${shopName}`);
      }
      if (cycleStatus.isExpired) {
        await UsageManager.resetUsageCounts(shopName);
        const startDate = DateTime.now().startOf('day');
        const endDate = startDate.plus({ months: 1 });  
        await this.updateCycleDates(
          subscription,
          shopName,
          startDate.toJSDate(),
          endDate.toJSDate()
        );
      }
    } catch (error) {
      console.error(`Failed to handle cycle transition for shop ${shopName}:`, error);
      throw error;
    }
  }

  static async updateCycleDates(
    subscription: Subscription,
    shopName: string, 
    newStartDate?: Date, 
    newEndDate?: Date
  ): Promise<void> {
    if (!subscription || !subscription.id) {
      throw new Error('Invalid subscription data');
    }
    if (!shopName) {
      throw new Error('Shop name is required');
    }
    const shop = await ShopifySessionManager.findShopByName(shopName);
    if (!shop || !shop.id) {
      throw new Error(`Shop not found: ${shopName}`);
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
            throw new Error('No previous payment found for subscription');
          }
          await tx.payment.create({
            data: {
              shopId: shop.id,
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
        await tx.subscription.update({
          where: { id: subscription.id },
          data: {
            startDate: updateData?.startDate,
            endDate: updateData?.endDate,
            updatedAt: new Date()
          }
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

  static async sendSubscriptionActivated(plan: Plan, shopName: string, email: string, date: string): Promise<Subscription> {
    if (!email) {
      console.log('No email provided for subscription activation notification');
      return;
    }
    try {
      const billingDate = date || DateTime.now().plus({ months: 1 });
      const emailData = {
        shopName: shopName,
        planName: plan.name,
        amount: plan.totalPrice,
        currency: plan.currency || 'USD',
        nextBillingDate: billingDate.toFormat('cccc, dd MMMM yyyy'),
      };
      await emailService.initialize();
      await emailService.sendSubscriptionActivated(email, emailData);
    } catch (error) {
      console.error('Failed to send subscription activation email:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email,
        shopName,
        planName: plan.name
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

  static async sendSubscriptionExpired(subscription: Subscription, shopName: string, email: string): Promise<Subscription> {
    if (!email) {
      console.log('No email provided for subscription activation notification');
      return;
    }
    try {
      const luxonDateFromJs = DateTime.fromJSDate(subscription?.endDate);
      const emailData = {
        shopName: shopName,
        planName: subscription.plan.name,
        nextBillingDate: luxonDateFromJs.toFormat('cccc, dd MMMM yyyy'),
      };
      await emailService.initialize();
      await emailService.sendSubscriptionExpired(email, emailData);
    } catch (error) {
      console.error('Failed to send subscription activation email:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email,
        shopName,
        planName: plan.name
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