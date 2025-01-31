import { Prisma, PrismaClient, Shop, Usage, Service, PaymentStatus, BillingType, BillingEventType, ModelName, PackageStatus, creditPurchase, CreditPurchase, Payment, NotificationType } from '@prisma/client';
import { ShopifySessionManager, ModelManager } from '@/utils/storage';
import { DateTime } from 'luxon';
import { prisma } from '@/lib/prisma';
import { Package } from '@/constants/billing';
import { CreditPaymentInfo } from '@/types/billing';
import { BillingOperationsService } from './billingOperationsService';
import emailService, { EmailServiceError, EmailResponse } from '@/utils/email/emailService';

interface RateLimit {
  rpm: number;
  rpd: number;
  tpm: number;
  tpd: number;
}

interface AIFeature {
  requestLimits: number;
  tokenLimits: number;
  maxTokens: number;
  rateLimit: RateLimit;
}

interface CrawlFeature {
  requestLimits: number;
}

interface Features {
  ai: AIFeature;
  crawl: CrawlFeature;
}

interface PackageInfo {
  id: string;
  name: string;
  description: string;
  creditAmount: number;
  pricePerCredit: number;
  totalPrice: number;
  currency: string;
  isCustom: boolean;
}

interface PaymentInfo {
  id: string;
  status: string;
  amount: number;
  adjustedAmount: number;
  currency: string;
  billingType: string;
  createdAt: Date;
  shopifyTransactionId: string;
}

interface UsageDetails {
  creditsUsed: number;
}

interface PackageDetail {
  purchaseId: string;
  status: string;
  package: PackageInfo;
  features: Features;
  usage: UsageDetails;
  payment: PaymentInfo | null;
  billingAdjustments: any;
  shopifyOrderId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface PurchaseDetails {
  totalActivePackages: number;
  packages: PackageDetail[];
  totalCreditsAvailable: number;
}

interface ExpiredPackageFilters {
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
  packageIds?: string[];
  creditPackageIds?: string[];
  minCreditsUsed?: number;
  maxCreditsUsed?: number;
  sortBy?: 'createdAt' | 'expiredAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export class CreditManager {
  private static readonly TRANSACTION_TIMEOUT = 50000;
  private static readonly MAX_WAIT = 5000;

  static readonly Errors = {
    SHOP_NOT_FOUND: 'Shop not found',
    PACKAGE_NOT_FOUND: 'Credit package not found',
    PURCHASE_NOT_FOUND: 'Credit purchase not found',
    PAYMENT_NOT_FOUND: 'No previous payment found for subscription',
    INVALID_PLAN: 'Invalid subscription plan',
    TRANSACTION_FAILED: 'Transaction failed',
    PAYMENT_FAILED: 'Payment processing failed',
    INVALID_DATES: 'Invalid subscription dates',
    MISSING_PARAMETERS: 'Missing required parameters',
    NO_EMAIL_PROVIDED: 'No email provided for purchase notification',
  } as const;

  private static readonly packageInclude = {
    feature: {
      include: {
        aiAPI: true, 
        crawlAPI: true
      },
    },
    promotions: {
      include: {
        promotion: true, 
      },
    },
    discounts: {
      include: {
        discount: true, 
      },
    },
    purchases: {
      include: {
        shop: true,
        payment: true,
        billingEvents: true,
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
  };

  private static readonly purchaseInclude = {
    shop: true,
    payment: true,
    billingEvents: true,
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
  };

  private static readonly paymentInclude = {
    billingEvents: true
  };

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

  static async createStandardCreditPackages() {
    const standardPackages = [
      {
        name: Package.SMALL,
        creditAmount: 100,
        pricePerCredit: 0.10,
        totalPrice: 10.00,
        description: "Perfect for small businesses getting started",
        isCustom: false,
      },
      {
        name: Package.MEDIUM,
        creditAmount: 500,
        pricePerCredit: 0.08,
        totalPrice: 40.00,
        description: "Most popular for growing businesses",
        isCustom: false,
      },
      {
        name: Package.LARGE,
        creditAmount: 1000,
        pricePerCredit: 0.06,
        totalPrice: 60.00,
        description: "Best value for established businesses",
        isCustom: false,
      },
      {
        name: Package.ENTERPRISE,
        creditAmount: 5000,
        pricePerCredit: 0.04,
        totalPrice: 200.00,
        description: "Enterprise-grade solution for large operations",
        isCustom: false,
      }
    ];
    
    await prisma.$transaction(async (tx) => {
      for (const pkg of standardPackages) {
        await tx.creditPackage.upsert({
          where: {
            name: pkg.name 
          },
          update: pkg,
          create: pkg
        });
      }
    });
  }
  
  static async getPurchaseDetails(shopName: string): Promise<PurchaseDetails | null> {
    try {
      const activePackages = await this.getActivePackages(shopName);
      if (!activePackages.length) return null;
      const packageDetails = await Promise.all(
        activePackages.map(async (purchase) => {
          const usageDetails = await this.getPackageUsageDetails(purchase.usage);
          const billingAdjustments = await this.calculateBillingAdjustments(purchase.billingEvents);
          return {
            purchaseId: purchase.id,
            status: purchase.status,
            package: {
              id: purchase.creditPackage.id,
              name: purchase.creditPackage.name,
              description: purchase.creditPackage.description,
              creditAmount: purchase.creditPackage.creditAmount,
              pricePerCredit: purchase.creditPackage.pricePerCredit,
              totalPrice: purchase.creditPackage.totalPrice,
              currency: purchase.creditPackage.currency,
              isCustom: purchase.creditPackage.isCustom,
            },
            features: {
              ai: {
                requestLimits: purchase.creditPackage.feature?.aiAPI.requestLimits,
                tokenLimits: purchase.creditPackage.feature?.aiAPI.tokenLimits,
                creditLimits: purchase.creditPackage.feature?.aiAPI.creditLimits,
                maxTokens: purchase.creditPackage.feature?.aiAPI.maxTokens,
                rateLimit: {
                  rpm: purchase.creditPackage.feature?.aiAPI.RPM,
                  rpd: purchase.creditPackage.feature?.aiAPI.RPD,
                  tpm: purchase.creditPackage.feature?.aiAPI.TPM,
                  tpd: purchase.creditPackage.feature?.aiAPI.TPD,
                },
              },
              crawl: {
                creditLimits: purchase.creditPackage.feature?.crawlAPI.creditLimits,
                requestLimits: purchase.creditPackage.feature?.crawlAPI.requestLimits,
              },
            },
            usage: usageDetails,
            payment: purchase.payment ? {
              id: purchase.payment.id,
              status: purchase.payment.status,
              amount: purchase.payment.amount,
              adjustedAmount: purchase.payment.adjustedAmount,
              currency: purchase.payment.currency,
              billingType: purchase.payment.billingType,
              createdAt: purchase.payment.createdAt,
              shopifyTransactionId: purchase.payment.shopifyTransactionId,
            } : null,
            billingAdjustments,
            shopifyOrderId: purchase.shopifyOrderId,
            createdAt: purchase.createdAt,
            updatedAt: purchase.updatedAt,
          };
        })
      );
      return {
        totalActivePackages: packageDetails?.length ?? 0,
        packages: packageDetails,
        totalCreditsAvailable: packageDetails.reduce((sum, pkg) => 
          sum + (pkg.package.creditAmount - (pkg.usage?.creditsUsed || 0)), 0),
      };
    } catch (error) {
      console.error('Error getting purchase details:', error);
      throw new Error(`Failed to get purchase details: ${error.message}`);
    }
  }

  static async getAllStandardPackages() {
    return await prisma.creditPackage.findMany({
      where: {
        isCustom: false,
        isActive: true
      },
      orderBy: {
        creditAmount: 'asc'
      },
      include: this.packageInclude
    });
  }

  static async calculateFinalPrice(
    packageId: string,
    shopId: string
  ): Promise<{
    finalPrice: number;
    adjustedAmount: number;
    appliedPromotions: Promotion[];
    appliedDiscounts: Discount[];
  }> {
    const creditPackage = await this.getPackageById(packageId);
    if (!creditPackage) throw new Error(this.Errors.PACKAGE_NOT_FOUND);
    const initialPrice = creditPackage.totalPrice;
    const promotions = await BillingOperationsService.findApplicablePromotions(shopId, undefined, packageId);
    const discounts = await BillingOperationsService.findApplicableDiscounts(shopId, undefined, packageId);
    const {
      finalPrice: adjustedPrice,
      adjustedAmount,
      appliedPromotions,
      appliedDiscounts
    } = await BillingOperationsService.calculateAdjustedPrice(initialPrice, promotions, discounts);
    return { finalPrice: adjustedPrice, adjustedAmount, appliedPromotions, appliedDiscounts };
  }

  static async purchaseCreditsWithPromotions(
    shopName: string,
    creditPackageId: string,
    shopifyChargeId: string,
    email: string
  ): Promise<{
    creditPurchase: CreditPurchase;
    payment: Payment;
  }> {
    try {
      const now = DateTime.utc();
      const shop = await ShopifySessionManager.findShopByName(shopName);
      if (!shop) throw new Error(this.Errors.SHOP_NOT_FOUND);
      const creditPackage = await this.getPackageById(creditPackageId);
      if (!creditPackage) throw new Error(this.Errors.PACKAGE_NOT_FOUND);
      const associatedUsers = await ShopifySessionManager.findCurrentAssociatedUsersByShop(shopName);
      const isEmailValid = email && this.isValidEmail(email);
      let associatedUser;
      if (isEmailValid) {
        associatedUser = await ShopifySessionManager.findAssociatedUserByEmail(email);
        if (!associatedUser?.userId) {
          throw new Error(`Associated user not found for email: ${email}`);
        }
      }
      const model = await ModelManager.getLatestModel();
      const { id, shopId, ...purchaseSnapshot } = creditPackage;
      const { finalPrice, adjustedAmount, appliedPromotions, appliedDiscounts } = await this.calculateFinalPrice(creditPackageId, shop.id);
      return await prisma.$transaction(async (tx) => {
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
                    totalRequests: creditPackage?.feature?.aiAPI?.requestLimits ?? 0,
                    totalRemainingRequests: creditPackage?.feature?.aiAPI?.requestLimits ?? 0,
                    totalRequestsUsed: 0,
                    requestsPerMinuteLimit: creditPackage?.feature?.aiAPI?.RPM ?? 0,
                    requestsPerDayLimit: creditPackage?.feature?.aiAPI?.RPD ?? 0,
                    remainingRequestsPerMinute: creditPackage?.feature?.aiAPI?.RPM ?? 0,
                    remainingRequestsPerDay: creditPackage?.feature?.aiAPI?.RPD ?? 0,
                    resetTimeForMinuteRequests: now.toJSDate(),
                    resetTimeForDayRequests: now.toJSDate(),
                    tokensConsumedPerMinute: 0,
                    tokensConsumedPerDay: 0,
                    totalTokens: creditPackage?.feature?.aiAPI?.totalTokens ?? 0,
                    totalRemainingTokens: creditPackage?.feature?.aiAPI?.totalTokens ?? 0,
                    totalTokensUsed: 0,
                    totalCredits: creditPackage?.feature?.aiAPI?.creditLimits ?? 0,
                    totalCreditsUsed: 0,
                    totalRemainingCredits: creditPackage?.feature?.aiAPI?.creditLimits ?? 0,
                    lastTokenUsageUpdateTime: now.toJSDate()
                  }
                },
                crawlUsageDetails: {
                  create: {
                    service: Service.CRAWL_API,
                    totalRequests: creditPackage?.feature?.crawlAPI?.requestLimits ?? 0,
                    totalRemainingRequests: creditPackage?.feature?.crawlAPI?.requestLimits ?? 0,
                    totalRequestsUsed: 0,
                    totalCredits: creditPackage?.feature?.crawlAPI?.creditLimits ?? 0,
                    totalCreditsUsed: 0,
                    totalRemainingCredits: creditPackage?.feature?.crawlAPI?.creditLimits ?? 0,
                  }
                }
              }
            }
          }
        });
        const creditPurchase = await tx.creditPurchase.create({
          data: {
            shop: { connect: { id: shop.id } },
            creditPackage: { connect: { id: creditPackageId } },
            usage: { connect: { id: usage.id } },
            purchaseSnapshot,
            shopifyPurchaseId: shopifyChargeId,
            status: PackageStatus.ACTIVE,
            ...(associatedUser?.userId && isEmailValid && {
              associatedUsers: {
                create: {
                  associatedUser: {
                    connect: { userId: associatedUser.userId }
                  }
                }
              }
            }),
          },
          include: this.purchaseInclude
        });
        for (const promotion of appliedPromotions) {
          await tx.billingEvent.create({
            data: {
              creditPurchase: { connect: { id: creditPurchase.id } },
              type: BillingEventType.PROMOTION,
              amount: promotion.value,
              description: `Applied promotion: ${promotion.code}`,
              promotion: { connect: { id: promotion.id } },
            }
          });
          await tx.promotion.update({
            where: { id: promotion.id },
            data: { usedCount: { increment: 1 } }
          });
        }
        for (const discount of appliedDiscounts) {
          await tx.billingEvent.create({
            data: {
              creditPurchase: { connect: { id: creditPurchase.id } },
              type: BillingEventType.DISCOUNT,
              amount: discount.value,
              description: `Applied discount: ${discount.code}`,
              discount: { connect: { id: discount.id } },
            }
          });
          await tx.discount.update({
            where: { id: discount.id },
            data: { usedCount: { increment: 1 } }
          });
        }
        const payment = await tx.payment.create({
          data: {
            shop: { connect: { id: shop.id } },
            amount: finalPrice,
            adjustedAmount,
            currency: 'USD',
            status: PaymentStatus.SUCCEEDED,
            billingType: BillingType.ONE_TIME,
            creditPurchase: { connect: { id: creditPurchase.id } },
            shopifyTransactionId: shopifyChargeId
          },
          include: this.paymentInclude
        });
        await tx.notification.create({
          data: {
            shopId: shop.id,
            type: NotificationType.BILLING,
            title: `Package Purchased: Doc2Product's ${creditPackage?.name} Package`,
            message: `Thank you for purchasing the ${creditPackage?.name} package! Your package is now active, and you can start utilizing its features immediately. If you have any questions or need assistance, feel free to reach out to our support team.`,
          },
        });
        await this.sendCreditsPurchased(
          {
            ...creditPurchase,
            payment
          }, 
          shopName, 
          email, 
          now
        );
        return { creditPurchase, payment };
      }, {
        timeout: this.TRANSACTION_TIMEOUT,
        maxWait: this.MAX_WAIT,
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable
      });
    } catch (error) {
      console.error('Credit purchase error:', error);
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new Error(`Unique constraint failed: ${error.meta?.target}`);
        }
      }
      throw error;
    }
  }

  static async purchaseCredits(
    shopName: string,
    creditPackageId: string,
    shopifyChargeId: string,
  ) {
    try {
      const shop = await ShopifySessionManager.findShopByName(shopName);
      if (!shop) throw new Error('Shop not found');
      const creditPurchase = await this.getPackageById(creditPackageId);
      if (!creditPurchase) throw new Error('Credit package not found');
      const associatedUsers = await ShopifySessionManager.findCurrentAssociatedUsersByShop(shopName);
      const model = await ModelManager.getLatestModel();
      const { id, shopId, ...purchaseSnapshot } = creditPurchase;
      return await prisma.$transaction(async (tx) => {
        const usage = await tx.usage.create({
          data: {
            shop: {
              connect: { id: shop.id }
            },
            associatedUsers: {
              create: associatedUsers.map(user => ({
                associatedUser: {
                  connect: { userId: user.userId }
                }
              }))
            },
            aiUsage: {
              create: {
                modelName: model.name,
                totalRequests: 0,
                inputTokensCount: 0,
                outputTokensCount: 0,
                requestsPerMinuteLimit: 0,
                requestsPerDayLimit: 0,
                remainingRequestsPerMinute: 0,
                remainingRequestsPerDay: 0,
                resetTimeForMinuteRequests: startDate,
                resetTimeForDayRequests: startDate,
                tokensConsumedPerMinute: 0,
                tokensConsumedPerDay: 0,
                totalTokensUsed: 0,
                lastTokenUsageUpdateTime: startDate
              }
            },
            creditsUsed: 0,
            metadata: {},
          }
        });
        const creditPurchase = await tx.creditPurchase.create({
          data: {
            shop: {
              connect: { id: shop.id }
            },
            creditPurchase: {
              connect: { id: creditPackageId }
            },
            usage: {
              connect: { id: usage.id }
            },
            purchaseSnapshot,
            shopifyOrderId: shopifyChargeId,
            status: PackageStatus.ACTIVE
          },
          select: {
            id: true
          }
        });
        const payment = await tx.payment.create({
          data: {
            shop: { connect: { id: shop.id } },
            amount: creditPurchase.totalPrice,
            currency: 'USD',
            status: PaymentStatus.SUCCEEDED,
            BillingType: BillingType.ONE_TIME,
            creditPurchase: { connect: { id: creditPurchase.id } },
            shopifyTransactionId: shopifyChargeId  
          }
        });
        return { creditPurchase, payment };
      }, {
        timeout: this.TRANSACTION_TIMEOUT,
        maxWait: this.MAX_WAIT,
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable
      });
    } catch (error) {
      console.error('Credit purchase error:', error);
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new Error(`Unique constraint failed: ${error.meta?.target}`);
        }
      }
      throw error;
    }
  }

  static async activatePurchase(purchaseId: string) {
    return await prisma.creditPurchase.update({
      where: { id: purchaseId },
      data: { status: PackageStatus.ACTIVE },
      include: {
        usage: true,
        creditPurchase: true,
      }
    });
  }

  static async getPurchaseById(purchaseId: string) {
    return await prisma.creditPurchase.findUnique({
      where: { id: purchaseId },
      include: {
        shop: true,
        usage: true,
        creditPurchase: true,
      }
    });
  }
  
  static async createCustomCreditPackage(paymentData: CreditPaymentInfo) {
    if (!paymentData?.price?.amount || !paymentData?.credits) {
      throw new Error('Invalid custom package data');
    }
    const packageName = `CUSTOM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const aiRequests = Math.floor(paymentData.credits / 0.1) * 0.5; 
    const crawlRequests = paymentData.credits * 0.5;      
    try {          
      return await prisma.$transaction(async (tx) => {
        const customPackage = await tx.creditPackage.create({
          data: {
            name: packageName,
            creditAmount: paymentData?.credits,
            pricePerCredit: paymentData?.price?.amount / paymentData?.credits,
            currency: paymentData?.price?.currencyCode || 'USD',
            totalPrice: paymentData?.price?.amount,
            description: "Custom credit package",
            isCustom: true,
            isActive: true
          }
        });
        const aiFeature = await tx.aIFeature.create({
          data: {
            service: Service.AI_API,
            requestLimits: aiRequests,
            tokenLimits: aiRequests * 1000,
            creditLimits: paymentData.credits * 0.5,
            maxTokens: 10000,
            RPM: 10,
            RPD: Math.min(aiRequests, 200),
            TPM: 10000,
            TPD: Math.min(aiRequests * 1000, 10000)
          }
        });
        const crawlFeature = await tx.crawlFeature.create({
          data: {
            service: Service.CRAWL_API,
            creditLimits: paymentData.credits * 0.5,
            requestLimits: crawlRequests
          }
        });
        await tx.feature.create({
          data: {
            name: `${packageName}_Feature`,
            description: `Feature set for custom package ${packageName}`,
            packageId: customPackage.id,
            aiFeatureId: aiFeature.id,
            crawlFeatureId: crawlFeature.id
          }
        });
        return customPackage;
      });
    } catch (error) {
      console.error('Custom package creation error:', error);
      throw new Error('Failed to create custom package');
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new Error(`Unique constraint failed: ${error.meta?.target}`);
        }
      }
      throw error;
    }
  }

  static async getPackageByName(packageName: string): Promise<CreditPackage | null> {
    try {
      const creditPackage = await prisma.creditPackage.findUnique({
        where: { name: packageName },
        include: this.packageInclude
      });
      if (!creditPackage) {
        throw new Error('Package not found');
      }
      return creditPackage;
    } catch (error) {
      console.error("Package fetch error:", error);
      throw new Error('Failed to fetch package');
    }
  }

  static async getPackageById(id: string): Promise<CreditPackage | null> {
    try {
      const creditPackage = await prisma.creditPackage.findUnique({
        where: { id },
        include: this.packageInclude
      });
      if (!creditPackage) {
        throw new Error('Package not found');
      }
      return creditPackage;
    } catch (error) {
      console.error("Package fetch error:", error);
      throw new Error('Failed to fetch package');
    }
  }

  static async deductCredits(
    shopName: string,
    amount: number,
    modelName: ModelName,
    inputTokens?: number,
    outputTokens?: number
  ): Promise<Usage> {
    const shop = await ShopifySessionManager.findShopByName(shopName);
    if (!shop) throw new Error('Shop not found');
    return await prisma.$transaction(async (tx) => {
      const usage = await tx.usage.findUnique({
        where: { shopId: shop.id }
      });
      if (!usage) throw new Error('No usage record found');
      const subscription = await tx.subscription.findFirst({
        where: {
          shopId: shop.id,
          status: 'ACTIVE'
        }
      });
      if (!subscription || subscription.creditBalance < amount) {
        throw new Error('Insufficient credits');
      }
      await tx.subscription.update({
        where: { id: subscription.id },
        data: {
          creditBalance: {
            decrement: amount
          }
        }
      });
      return await tx.usage.update({
        where: { id: usage.id },
        data: {
          creditsUsed: {
            increment: amount
          },
          modelName,
          inputTokens,
          outputTokens,
          metadata: {
            lastUsage: new Date(),
            modelUsed: modelName
          }
        }
      });
    }, {
      timeout: this.TRANSACTION_TIMEOUT,
      maxWait: this.MAX_WAIT,
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable
    });
  }

  static async getCreditsBalance(shopName: string): Promise<number> {
    const shop = await ShopifySessionManager.findShopByName(shopName);
    if (!shop) throw new Error('Shop not found');
    const subscription = await prisma.subscription.findFirst({
      where: {
        shopId: shop.id,
        status: 'ACTIVE'
      }
    });
    return subscription?.creditBalance || 0;
  }

  static async updatePaymentStatus(
    shopifyTransactionId: string,
    status: PaymentStatus,
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { shopifyTransactionId },
        include: { creditPurchase: true }
      });
      if (!payment) throw new Error('Payment not found');
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status,
          shopifyTransactionId,
          updatedAt: new Date()
        }
      });
      if (payment.creditPurchase) {
        const newStatus = status === PaymentStatus.SUCCEEDED ? PackageStatus.ACTIVE :
                         status === PaymentStatus.CANCELLED ? PackageStatus.CANCELLED :
                         status === PaymentStatus.FAILED ? PackageStatus.FROZEN :
                         PackageStatus.PAST_DUE;
        await tx.creditPurchase.update({
          where: { id: payment.creditPurchase.id },
          data: { status: newStatus }
        });
      }
    });
  }

  static async getCreditHistory(shopName: string) {
    const shop = await ShopifySessionManager.findShopByName(shopName);
    if (!shop) throw new Error('Shop not found');
    
    return await prisma.creditPurchase.findMany({
      where: {
        shopId: shop.id
      },
      include: {
        payment: true,
        creditPurchase: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  static async checkAndUpdatePackageStatus(shopName: string): Promise<void> {
    const shop = await ShopifySessionManager.findShopByName(shopName);
    if (!shop) throw new Error('Shop not found');
    const activePackages = await prisma.creditPurchase.findMany({
      where: {
        shopId: shop.id,
        status: PackageStatus.ACTIVE
      },
      include: {
        usages: true
      }
    });
    await prisma.$transaction(async (tx) => {
      for (const pkg of activePackages) {
        const totalUsed = pkg.usages.reduce((sum, usage) => sum + usage.creditsUsed, 0);
        const purchaseSnapshot = pkg.purchaseSnapshot as any;
        if (totalUsed >= purchaseSnapshot.creditAmount) {
          await tx.creditPurchase.update({
            where: { id: pkg.id },
            data: { status: PackageStatus.EXPIRED }
          });
        }
      }
    });
  }

  static async getNextAvailablePackage(shopName: string) {
    const shop = await ShopifySessionManager.findShopByName(shopName);
    if (!shop) throw new Error('Shop not found');

    return await prisma.creditPurchase.findFirst({
      where: {
        shopId: shop.id,
        status: PackageStatus.ACTIVE
      },
      include: {
        creditPurchase: true,
        usages: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
  }

  static async getActivePackages(shopName: string): Promise<creditPurchase[] | []> {
    const shop = await ShopifySessionManager.findShopByName(shopName);
    if (!shop) throw new Error('Shop not found');
    return await prisma.creditPurchase.findMany({
      where: {
        shopId: shop.id,
        status: PackageStatus.ACTIVE,
      },
      include: this.purchaseInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  static async getExpiredPackages(
    shopName: string, 
    filters: ExpiredPackageFilters = {}
  ): Promise<{ packages: CreditPurchase[]; total: number }> {
    const shop = await ShopifySessionManager.findShopByName(shopName);
    if (!shop) throw new Error('Shop not found');
    const {
      startDate,
      endDate,
      limit,
      offset,
      packageIds,
      creditPackageIds,
      minCreditsUsed,
      maxCreditsUsed,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = filters;
    const where: Prisma.CreditPurchaseWhereInput = {
      shopId: shop.id,
      status: PackageStatus.EXPIRED,
      ...(startDate && {
        expiredAt: {
          gte: startDate
        }
      }),
      ...(endDate && {
        expiredAt: {
          lte: endDate
        }
      }),
      ...(packageIds?.length && {
        id: {
          in: packageIds
        }
      }),
      ...(creditPackageIds?.length && {
        creditPackageId: {
          in: creditPackageIds
        }
      }),
      ...(minCreditsUsed !== undefined && {
        usage: {
          creditsUsed: {
            gte: minCreditsUsed
          }
        }
      }),
      ...(maxCreditsUsed !== undefined && {
        usage: {
          creditsUsed: {
            lte: maxCreditsUsed
          }
        }
      })
    };
    const total = await prisma.creditPurchase.count({ where });
    const packages = await prisma.creditPurchase.findMany({
      where,
      include: this.purchaseInclude,
      orderBy: {
        [sortBy]: sortOrder
      },
      ...(limit && { take: limit }),
      ...(offset && { skip: offset })
    });
    return {
      packages,
      total
    };
  }

  static async getPackageUsageDetails(usage: Usage) {
    if (!usage.serviceUsage) return null;
    const aiUsage = usage.serviceUsage.aiUsageDetails;
    const crawlUsage = usage.serviceUsage.crawlUsageDetails;
    return {
      ai: {
        totalRequests: aiUsage.totalRequests,
        remainingRequests: aiUsage.totalRemainingRequests,
        requestsUsed: aiUsage.totalRequestsUsed,
        tokensUsed: aiUsage.totalTokensUsed,
        remainingTokens: aiUsage.totalRemainingTokens,
        totalCredits: aiUsage.totalCredits,
        remainingCredits: aiUsage.totalRemainingCredits,
        creditsUsed: aiUsage.totalCreditsUsed,
        rateLimit: {
          rpm: aiUsage.requestsPerMinuteLimit,
          rpd: aiUsage.requestsPerDayLimit,
          remainingRPM: aiUsage.remainingRequestsPerMinute,
          remainingRPD: aiUsage.remainingRequestsPerDay,
        },
        modelName: aiUsage.modelName,
        lastUpdated: aiUsage.lastTokenUsageUpdateTime,
      },
      crawl: {
        totalRequests: crawlUsage.totalRequests,
        remainingRequests: crawlUsage.totalRemainingRequests,
        requestsUsed: crawlUsage.totalRequestsUsed,
        totalCredits: crawlUsage.totalCredits,
        remainingCredits: crawlUsage.totalRemainingCredits,
        creditsUsed: crawlUsage.totalCreditsUsed,
      }
    };
  }

  static async calculateBillingAdjustments(billingEvents: BillingEvent[]) {
    return billingEvents.reduce((acc, event) => {
      if (event.type === BillingEventType.PROMOTION) {
        acc.promotions.push({
          code: event.promotion?.code,
          value: event.promotion?.amount,
          description: event.promotion?.description,
          unit: event.promotion?.unit
        });
      } else if (event.type === BillingEventType.DISCOUNT) {
        acc.discounts.push({
          code: event.discount?.code,
          value: event.discount?.amount,
          description: event.discount?.description,
          unit: event.discount?.unit
        });
      }
      return acc;
    }, { promotions: [], discounts: [] });
  }

  static async sendCreditsPurchased(purchase: creditPurchase, shopName: string, email: string, date: Date): Promise<void> {
    const isEmailValid = email && this.isValidEmail(email);
    if (!isEmailValid) {
      console.log(this.Errors.NO_EMAIL_PROVIDED);
      return;
    }
    if (!purchase) {
      throw new Error(this.Errors.PURCHASE_NOT_FOUND);
      return null;
    }
    try {
      const emailData = {
        shopName: shopName,
        packageName: purchase?.creditPackage?.name,
        amount: purchase?.payment?.amount ?? purchase?.creditPackage?.totalPrice,
        adjustedAmount: purchase?.payment?.adjustedAmount ?? 0,
        credits: purchase?.creditPackage?.creditAmount,
        currency: purchase?.creditPackage?.currency,
        billingDate: date.toLocal().toFormat('cccc, dd MMMM yyyy'),
      };
      await emailService.initialize();
      await emailService.sendCreditsPurchased(email, emailData);
    } catch (error) {
      console.error('Failed to send package purchase email:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email,
        shopName,
        packageName: purchase?.creditPackage?.name
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

