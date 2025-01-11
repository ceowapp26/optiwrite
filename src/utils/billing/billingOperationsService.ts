import { PrismaClient, SystemMetrics, Notification, Promotion, BillingEvent, Discount, 
  NotificationType, PromotionType, PromotionUnit, DiscountType, DiscountUnit, 
  BillingEventType, BillingEventStatus } from '@prisma/client';
import { DateTime } from 'luxon';
import { prisma } from '@/lib/prisma';

interface CreateBillingEventParams {
  subscriptionId?: string;
  creditPurchaseId?: string;
  type: BillingEventType;
  amount: number;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  promotionId?: string;
  discountId?: string;
  status?: BillingEventStatus;
  appliedAmount?: number;
  failureReason?: string;
  metadata?: Record<string, any>;
}

export class BillingOperationsService {
  private prisma: PrismaClient;

  async updateSystemMetrics(metrics: Partial<SystemMetrics>): Promise<SystemMetrics> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return await prisma.systemMetrics.upsert({
      where: { date: today },
      update: metrics,
      create: {
        ...metrics,
        date: today,
        totalUsers: metrics.totalUsers ?? 0,
        activeUsers: metrics.activeUsers ?? 0,
        totalShops: metrics.totalShops ?? 0,
        totalRevenue: metrics.totalRevenue ?? 0,
        apiUsage: metrics.apiUsage ?? 0
      }
    });
  }

  async getSystemMetricsInRange(startDate: Date, endDate: Date): Promise<SystemMetrics[]> {
    return await prisma.systemMetrics.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { date: 'asc' }
    });
  }

  async createNotification({
    shopId,
    type,
    title,
    message,
    link,
    expiresAt
  }: {
    shopId: string;
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
    expiresAt?: Date;
  }): Promise<Notification> {
    return await prisma.notification.create({
      data: {
        shopId,
        type,
        title,
        message,
        link,
        expiresAt
      }
    });
  }

  async getUnreadNotifications(shopId: string): Promise<Notification[]> {
    return await prisma.notification.findMany({
      where: {
        shopId,
        isRead: false,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async markNotificationAsRead(notificationId: string): Promise<Notification> {
    return await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true }
    });
  }

  async createPromotion({
    code,
    name,
    type,
    value,
    unit,
    validFrom,
    validUntil,
    maxUses,
    shops,
    plans,
    packages,
    description,
    appliedToAll,
    metadata
  }: {
    code: string;
    name: string;
    type: PromotionType;
    value: number;
    unit: PromotionUnit;
    validFrom?: Date;
    validUntil?: Date;
    maxUses?: number;
    shops?: string[];
    plans?: string[];
    packages?: string[];
    description?: string;
    appliedToAll?: boolean;
    metadata?: Record<string, any>;
  }): Promise<Promotion> {
    return await prisma.promotion.create({
      data: {
        code,
        name,
        type,
        value,
        unit,
        validFrom: validFrom ?? new Date(), 
        validUntil,
        maxUses,
        description,
        appliedToAll: appliedToAll ?? false, 
        shops: shops
          ? {
              create: shops.map((shopId) => ({ shopId }))
            }
          : undefined, 
        plans: plans
          ? {
              create: plans.map((planId) => ({ planId }))
            }
          : undefined, 
        packages: packages
          ? {
              create: packages.map((packageId) => ({ packageId }))
            }
          : undefined, 
        metadata: metadata || undefined 
      }
    });
  }

  static async createBillingEvent(
    params: CreateBillingEventParams
  ) {
    try {
      if (!params.subscriptionId && !params.creditPurchaseId) {
        throw new Error('Either subscriptionId or creditPurchaseId must be provided');
      }
      const billingEvent = await prisma.billingEvent.create({
        data: {
          subscriptionId: params?.subscriptionId,
          creditPurchaseId: params?.creditPurchaseId,
          type: params?.type,
          amount: params?.amount,
          description: params?.description,
          startDate: params?.startDate || new Date(),
          endDate: params?.endDate,
          promotionId: params?.promotionId,
          discountId: params?.discountId,
          status: params?.status || 'PENDING',
          appliedAmount: params?.appliedAmount,
          failureReason: params?.failureReason,
          metadata: params?.metadata,
        },
        include: {
          subscription: true,
          creditPurchase: true,
          promotion: true,
          discount: true,
        },
      });
      return billingEvent;
    } catch (error) {
      console.error('Error creating billing event:', error);
      throw error;
    }
  }

  static async getEarlyAdapterPromotion(
    planId?: string,
    packageId?: string
  ): Promise<Promotion | null> {
    const now = new Date();
    const baseCondition = {
      isActive: true,
      type: PromotionType.EARLY_ADAPTER,
      validFrom: { lte: now },
      validUntil: { gte: now },
      appliedToAllPlans: true,
      ...(planId || packageId ? {
          OR: [
              ...(planId ? [{ plans: { some: { planId } } }] : []),
              ...(packageId ? [{ packages: { some: { packageId } } }] : []),
          ]
      } : {})
    };
    const promotions = await prisma.promotion.findMany({
      where: baseCondition,
      include: {
          shops: true,
          plans: true,
          packages: true
      },
      orderBy: { createdAt: 'desc' }
    });
    const applicablePromotions = promotions.filter(
      (promo) => promo.maxUses === null || promo.usedCount < promo.maxUses
    );
    return applicablePromotions.length > 0
      ? { ...applicablePromotions[0], discountType: 'promotion' }
      : null;
  }

  static async findApplicablePromotions(
    shopId: string,
    planId?: string,
    packageId?: string
  ): Promise<Promotion | null> {
    const now = new Date();
    const baseCondition = {
      isActive: true,
      validFrom: { lte: now },
      validUntil: { gte: now },
      AND: [
        {
          OR: [
            { appliedToAll: true },
            ...(packageId ? [{ appliedToAllPackages: true }] : []),
            ...(planId ? [{ appliedToAllPlans: true }] : []),
            ...(shopId ? [{ shops: { some: { shopId } } }] : []),
            ...(packageId ? [{ packages: { some: { packageId } } }] : []),
            ...(planId ? [{ plans: { some: { planId } } }] : [])
          ]
        }
      ]
    };
    const promotions = await prisma.promotion.findMany({
      where: baseCondition,
      include: {
        shops: true,
        plans: true,
        packages: true
      },
      orderBy: { createdAt: 'desc' }
    });
    const applicablePromotions = promotions.filter(
      (promo) => promo.maxUses === null || promo.usedCount < promo.maxUses
    );
    if (planId) {
      const planSpecificPromotion = applicablePromotions.find((promo) =>
        promo.plans.some((plan) => plan.planId === planId)
      );
      return planSpecificPromotion ? { ...planSpecificPromotion, discountType: 'promotion' } : null;
    }
    return applicablePromotions.length > 0
      ? applicablePromotions.map((promo) => ({
          ...promo,
          discountType: 'promotion'
        }))
      : null;
  }

  static async findApplicableDiscounts(
    shopId: string,
    planId?: string,
    packageId?: string
  ): Promise<Discount | null> {
    const now = new Date();
    const baseCondition = {
      isActive: true,
      validFrom: { gte: now },
      validUntil: { gte: now },
      AND: [
        {
          OR: [
          { appliedToAll: true },
          ...(packageId ? [{ appliedToAllPackages: true }] : []),
          ...(planId ? [{ appliedToAllPlans: true }] : []),
          ...(shopId ? [{ shops: { some: { shopId } } }] : []),
          ...(packageId ? [{ packages: { some: { packageId } } }] : []),
          ...(planId ? [{ plans: { some: { planId } } }] : [])
          ]
        }
      ]
    };
    const discounts = await prisma.discount.findMany({
      where: baseCondition,
      include: {
        shops: true,
        plans: true,
        packages: true
      },
      orderBy: { createdAt: 'desc' }
    });
    const applicableDiscounts = discounts.filter(
      (discount) => discount.maxUses === null || discount.usedCount < discount.maxUses
    );
    if (planId) {
      const planSpecificDiscount = applicableDiscounts.find((discount) =>
        discount.plans.some((plan) => plan.planId === planId)
      );
      return planSpecificDiscount ? { ...planSpecificDiscount, discountType: 'discount' } : null;
    }
    return applicableDiscounts.length > 0
      ? applicableDiscounts.map((discount) => ({
          ...discount,
          discountType: 'discount'
        }))
      : null;
  }

  static async findSingleApplicablePromotion(
    shopId: string,
    planId?: string
  ): Promise<Promotion | Discount | null> {
    const promotions = await this.findApplicablePromotions(shopId, planId);
    const discounts = await this.findApplicableDiscounts(shopId, planId);
    const isPromotionValid = promotions && promotions.length > 0;
    const isDiscountValid = discounts && discounts.length > 0;
    if (isPromotionValid && isDiscountValid) {
      throw new Error('Conflict: Both promotion and discount are applicable. Only one should be valid at a time.');
    }
    if (isPromotionValid) {
      return promotions[0]; 
    }
    if (isDiscountValid) {
      return discounts[0]; 
    }
    return null;
  }

  static async applyPromotionToSubscription(
    shopId: string,
    promotionId: string,
    planId: string
  ): Promise<void> {
    const promotion = await prisma.promotion.findUnique({
      where: { id: promotionId },
    });
    if (!promotion) throw new Error('Promotion not found');
    await prisma.$transaction(async (tx) => {
      await this.billingOps.createBillingEvent({
        type: BillingEventType.PROMOTION,
        amount: promotion.value,
        description: `Applied promotion: ${promotion.code}`,
        promotionId: promotion.id,
      });

      await tx.promotion.update({
        where: { id: promotionId },
        data: { usedCount: { increment: 1 } },
      });

      await tx.promotionToShop.upsert({
        where: {
          promotionId_shopId: {
            promotionId,
            shopId,
          },
        },
        update: {},
        create: {
          promotionId,
          shopId,
        },
      });
    });
  }

  static async validateAndApplyPromotion(
    promotionCode: string,
    shopId: string,
    planId?: string,
    packageId?: string
  ): Promise<{
    isValid: boolean;
    promotion?: Promotion;
    error?: string;
  }> {
    const promotion = await prisma.promotion.findFirst({
      where: {
        code: promotionCode,
        isActive: true,
        validFrom: { lte: new Date() },
        validUntil: { gte: new Date() },
        OR: [
          { maxUses: null },
          { usedCount: { lt: { maxUses: true } } }
        ]
      },
      include: {
        shops: true,
        plans: true,
        packages: true
      }
    });
    if (!promotion) {
      return { isValid: false, error: 'Invalid or expired promotion code' };
    }
    const isApplicable = promotion.appliedToAll ||
      promotion.shops.some(s => s.shopId === shopId) ||
      (planId && promotion.plans.some(p => p.planId === planId)) ||
      (packageId && promotion.packages.some(p => p.packageId === packageId));

    if (!isApplicable) {
      return { isValid: false, error: 'Promotion not applicable' };
    }

    await prisma.promotion.update({
      where: { id: promotion.id },
      data: { usedCount: { increment: 1 } }
    });

    return { isValid: true, promotion };
  }

  async createDiscount({
    code,
    name,
    type,
    value,
    unit,
    validFrom,
    validUntil,
    maxUses,
    minimumAmount,
    maximumAmount,
    shops,
    plans,
    packages,
    description,
    appliedToAll
  }: {
    code: string;
    name: string;
    type: DiscountType;
    value: number;
    unit: DiscountUnit;
    validFrom?: Date;
    validUntil?: Date;
    maxUses?: number;
    minimumAmount?: number;
    maximumAmount?: number;
    shops?: string[];
    plans?: string[];
    packages?: string[];
    description?: string;
    appliedToAll?: boolean;
  }): Promise<Discount> {
    return await prisma.discount.create({
      data: {
        code,
        name,
        type,
        value,
        unit,
        validFrom: validFrom ?? new Date(),
        validUntil,
        maxUses,
        minimumAmount,
        maximumAmount,
        description,
        appliedToAll: appliedToAll ?? false,
        shops: shops ? {
          create: shops.map(shopId => ({ shopId }))
        } : undefined,
        plans: plans ? {
          create: plans.map(planId => ({ planId }))
        } : undefined,
        packages: packages ? {
          create: packages.map(packageId => ({ packageId }))
        } : undefined
      }
    });
  }

  static async validateAndApplyDiscount(
    discountCode: string,
    shopId: string,
    amount: number,
    planId?: string,
    packageId?: string
  ): Promise<{
    isValid: boolean;
    discount?: Discount;
    error?: string;
  }> {
    const discount = await prisma.discount.findFirst({
      where: {
        code: discountCode,
        isActive: true,
        validFrom: { lte: new Date() },
        validUntil: { gte: new Date() },
        OR: [
          { maxUses: null },
          { usedCount: { lt: { maxUses: true } } }
        ]
      },
      include: {
        shops: true,
        plans: true,
        packages: true
      }
    });

    if (!discount) {
      return { isValid: false, error: 'Invalid or expired discount code' };
    }

    if (discount.minimumAmount && amount < discount.minimumAmount) {
      return { isValid: false, error: 'Amount below minimum required' };
    }

    if (discount.maximumAmount && amount > discount.maximumAmount) {
      return { isValid: false, error: 'Amount above maximum allowed' };
    }

    const isApplicable = discount.appliedToAll ||
      discount.shops.some(s => s.shopId === shopId) ||
      (planId && discount.plans.some(p => p.planId === planId)) ||
      (packageId && discount.packages.some(p => p.packageId === packageId));

    if (!isApplicable) {
      return { isValid: false, error: 'Discount not applicable' };
    }
    await prisma.discount.update({
      where: { id: discount.id },
      data: { usedCount: { increment: 1 } }
    });
    return { isValid: true, discount };
  }

  static async createBillingEvent({
    subscriptionId,
    creditPurchaseId,
    type,
    amount,
    description,
    startDate,
    endDate,
    promotionId,
    discountId
  }: {
    subscriptionId?: string;
    creditPurchaseId?: string;
    type: BillingEventType;
    amount: number;
    description?: string;
    startDate?: Date;
    endDate?: Date;
    promotionId?: string;
    discountId?: string;
  }): Promise<BillingEvent> {
    return await prisma.billingEvent.create({
      data: {
        subscriptionId,
        creditPurchaseId,
        type,
        amount,
        description,
        startDate: startDate ?? new Date(),
        endDate,
        promotionId,
        discountId
      }
    });
  }

  async updateBillingEventStatus(
    billingEventId: string,
    status: BillingEventStatus,
    appliedAmount?: number,
    failureReason?: string
  ): Promise<BillingEvent> {
    return await prisma.billingEvent.update({
      where: { id: billingEventId },
      data: {
        status,
        appliedAmount,
        failureReason
      }
    });
  }

  async getBillingEventsBySubscription(
    subscriptionId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<BillingEvent[]> {
    return await prisma.billingEvent.findMany({
      where: {
        subscriptionId,
        startDate: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        promotion: true,
        discount: true
      },
      orderBy: { startDate: 'desc' }
    });
  }

  async getBillingEventsByCreditPurchase(
    creditPurchaseId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<BillingEvent[]> {
    return await prisma.billingEvent.findMany({
      where: {
        creditPurchaseId,
        startDate: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        promotion: true,
        discount: true
      },
      orderBy: { startDate: 'desc' }
    });
  }

  static async calculateAdjustedPrice(
    originalPrice: number,
    promotions: Promotion[] | any,
    discounts: Discount[] | any
  ): Promise<{
    finalPrice: number;
    adjustedAmount: number;
    appliedPromotions: Promotion[];
    appliedDiscounts: Discount[];
  }> {
    const validPromotions = Array.isArray(promotions) ? promotions : [];
    const validDiscounts = Array.isArray(discounts) ? discounts : [];
    let finalPrice = originalPrice;
    let adjustedAmount = 0;
    const appliedPromotions: Promotion[] = [];
    const appliedDiscounts: Discount[] = [];
    for (const promotion of validPromotions) {
      const { adjustedPrice, adjustedValue } = await this.calculatePromotionAmount(
        finalPrice,
        promotion.value,
        promotion.unit
      );
      if (adjustedPrice !== finalPrice) {
        finalPrice = adjustedPrice;
        adjustedAmount = adjustedValue;
        appliedPromotions.push(promotion);
      }
    }
    for (const discount of validDiscounts) {
      const { adjustedPrice, adjustedValue } = await this.calculateDiscountedAmount(
        finalPrice,
        discount.value,
        discount.unit
      );
      if (adjustedPrice !== finalPrice) {
        finalPrice = adjustedPrice;
        adjustedAmount = adjustedValue;
        appliedDiscounts.push(discount);
      }
    }
    return { finalPrice, adjustedAmount, appliedPromotions, appliedDiscounts };
  }

  private static async calculateDiscountedAmount(
    originalAmount: number,
    discountValue: number,
    discountUnit: DiscountUnit
  ): Promise<number> {
    switch (discountUnit) {
      case DiscountUnit.PERCENTAGE:
        return { 
          adjustedPrice: originalAmount * (1 - discountValue / 100), 
          adjustedValue: originalAmount * discountValue / 100 
        };
      case DiscountUnit.AMOUNT:
        return { 
          adjustedPrice: Math.max(0, originalAmount - discountValue), 
          adjustedValue: Math.min(originalAmount, discountValue) 
        };
      default:
        return { 
          adjustedPrice: originalAmount, 
          adjustedValue: 0
        };
    }
  }

  private static async calculatePromotionAmount(
    baseValue: number,
    promotionValue: number,
    promotionUnit: PromotionUnit
  ): Promise<number> {
    switch (promotionUnit) {
      case PromotionUnit.PERCENTAGE:
        return { 
          adjustedPrice: baseValue * (1 - promotionValue / 100), 
          adjustedValue: baseValue * promotionValue / 100 
        };
      case PromotionUnit.AMOUNT:
        return { 
          adjustedPrice: Math.max(0, baseValue - promotionValue), 
          adjustedValue: Math.min(baseValue, promotionValue) 
        };
      case PromotionUnit.CREDITS:
        return { 
          adjustedPrice: Math.max(0, baseValue - promotionValue), 
          adjustedValue: Math.min(baseValue, promotionValue) 
        };
      case PromotionUnit.DAYS:
        return { 
          adjustedPrice: Math.max(0, baseValue - promotionValue), 
          adjustedValue: Math.min(baseValue, promotionValue) 
        };
      default:
        return { 
          adjustedPrice: baseValue, 
          adjustedValue: 0
        };
    }
  }
}


