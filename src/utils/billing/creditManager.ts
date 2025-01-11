import { Prisma, PrismaClient, Shop, Usage, Service, PaymentStatus, BillingType, BillingEventType, ModelName, PackageStatus, CreditPackage, NotificationType } from '@prisma/client';
import { ShopifySessionManager, ModelManager } from '@/utils/storage';
import { DateTime } from 'luxon';
import { prisma } from '@/lib/prisma';
import { Package } from '@/constants/billing';
import { CreditPaymentInfo } from '@/types/billing';
import { BillingOperationsService } from './billingOperationsService';
import emailService, { EmailServiceError, EmailResponse } from '@/utils/email/emailService';

export class CreditManager {
  private static readonly TRANSACTION_TIMEOUT = 50000;
  private static readonly MAX_WAIT = 5000;

  private static readonly CREDIT_CONVERSION = {
    [Service.AI_API]: 0.1, 
    [Service.CRAWL_API]: 1
  };

  private static calculateCreditsForService(service: Service, totalCredits: number): number {
    const conversionRate = this.CREDIT_CONVERSION[service];
    if (conversionRate === undefined) {
      throw new Error(`Service ${service} not found in CREDIT_CONVERSION.`);
    }
    return totalCredits * conversionRate;
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

   static async getPurchaseDetails(shopName: string) {
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
                maxTokens: purchase.creditPackage.feature?.aiAPI.maxTokens,
                rateLimit: {
                  rpm: purchase.creditPackage.feature?.aiAPI.RPM,
                  rpd: purchase.creditPackage.feature?.aiAPI.RPD,
                  tpm: purchase.creditPackage.feature?.aiAPI.TPM,
                  tpd: purchase.creditPackage.feature?.aiAPI.TPD,
                },
              },
              crawl: {
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
            createdAt: purchase.creditPackage.createdAt,
            updatedAt: purchase.creditPackage.updatedAt,
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
      }
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
    if (!creditPackage) throw new Error('Credit package not found');
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
    email: string,
  ) {
    try {
      const now = new Date();
      const shop = await ShopifySessionManager.findShopByName(shopName);
      if (!shop) throw new Error('Shop not found');
      const creditPackage = await this.getPackageById(creditPackageId);
      if (!creditPackage) throw new Error('Credit package not found');
      const associatedUsers = await ShopifySessionManager.findCurrentAssociatedUsersByShop(shopName);
      const associatedUser = await ShopifySessionManager.findAssociatedUserByEmail(email);
      if (!associatedUser?.userId) {
        throw new Error(`Associated user not found for email: ${email}`);
      }
      const model = await ModelManager.getLatestModel();
      const { id, shopId, ...purchaseSnapshot } = creditPackage;
      const { finalPrice, adjustedAmount, appliedPromotions, appliedDiscounts } = await this.calculateFinalPrice(creditPackageId, shop.id);
      return await prisma.$transaction(async (tx) => {
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
                    totalRequests: creditPackage?.feature?.aiAPI?.requestLimits ?? 0,
                    totalRemainingRequests: creditPackage?.feature?.aiAPI?.requestLimits ?? 0,
                    totalRequestsUsed: 0,
                    requestsPerMinuteLimit: creditPackage?.feature?.aiAPI?.RPM ?? 0,
                    requestsPerDayLimit: creditPackage?.feature?.aiAPI?.RPD ?? 0,
                    remainingRequestsPerMinute: creditPackage?.feature?.aiAPI?.RPM ?? 0,
                    remainingRequestsPerDay: creditPackage?.feature?.aiAPI?.RPD ?? 0,
                    resetTimeForMinuteRequests: now,
                    resetTimeForDayRequests: now,
                    tokensConsumedPerMinute: 0,
                    tokensConsumedPerDay: 0,
                    totalTokens: creditPackage?.feature?.aiAPI?.totalTokens ?? 0,
                    totalTokensUsed: 0,
                    totalCredits: this.calculateCreditsForService(Service.AI_API, plan?.creditAmount),
                    totalCreditsUsed: 0,
                    totalRemainingCredits: this.calculateCreditsForService(Service.AI_API, plan?.creditAmount),
                    lastTokenUsageUpdateTime: now
                  }
                },
                crawlUsageDetails: {
                  create: {
                    service: Service.CRAWL_API,
                    totalRequests: creditPackage?.feature?.crawlAPI?.requestLimits ?? 0,
                    totalRemainingRequests: creditPackage?.feature?.crawlAPI?.requestLimits ?? 0,
                    totalRequestsUsed: 0,
                    totalCredits: this.calculateCreditsForService(Service.CRAWL_API, plan?.creditAmount),
                    totalCreditsUsed: 0,
                    totalRemainingCredits: this.calculateCreditsForService(Service.CRAWL_API, plan?.creditAmount),
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
            associatedUsers: {
              create: {
                associatedUser: {
                  connect: { userId: associatedUser.userId }
                }
              }
            },
          }
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
          }
        });
        await tx.notification.create({
          data: {
            shopId: shop.id,
            type: NotificationType.BILLING,
            title: `Package Purchased: Doc2Product's ${creditPackage?.name} Package`,
            message: `Thank you for purchasing the ${creditPackage?.name} package! Your package is now active, and you can start utilizing its features immediately. If you have any questions or need assistance, feel free to reach out to our support team.`,
          },
        });
        await this.sendCreditsPurchased(creditPackage, shopName, email);
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
      const creditPackage = await this.getPackageById(creditPackageId);
      if (!creditPackage) throw new Error('Credit package not found');
      const associatedUsers = await ShopifySessionManager.findCurrentAssociatedUsersByShop(shopName);
      const model = await ModelManager.getLatestModel();
      const { id, shopId, ...purchaseSnapshot } = creditPackage;
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
            creditPackage: {
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
            amount: creditPackage.totalPrice,
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
        creditPackage: true,
      }
    });
  }

  static async getPurchaseById(purchaseId: string) {
    return await prisma.creditPurchase.findUnique({
      where: { id: purchaseId },
      include: {
        shop: true,
        usage: true,
        creditPackage: true,
      }
    });
  }
  
  static async createCustomCreditPackage(paymentData: CreditPaymentInfo) {
    if (!paymentData?.price?.amount || !paymentData?.credits) {
      throw new Error('Invalid custom package data');
    }
    const packageName = `CUSTOM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const aiRequests = Math.floor(paymentData.credits / 0.1); 
    const crawlRequests = paymentData.credits;                
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
  }
  
   static async getPackageByName(packageName: string) {
    try {
      const creditPackage = await prisma.creditPackage.findUnique({
        where: { name: packageName },
        include: {
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
        }
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

  static async getPackageById(id: string) {
    try {
      const creditPackage = await prisma.creditPackage.findUnique({
        where: { id },
        include: {
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
        }
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
        creditPackage: true
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
        creditPackage: true,
        usages: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
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
      },
      creditsUsed: usage.creditsUsed || 0,
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

  static async sendCreditsPurchased(creditPackage: CreditPackage, shopName: string, email: string): Promise<CreditPackage> {
    if (!email) {
      console.log('No email provided for subscription activation notification');
      return;
    }
    try {
      const emailData = {
        shopName: shopName,
        packageName: creditPackage.name,
        amount: creditPackage.totalPrice,
        credits: creditPackage.creditAmount,
        currency: creditPackage.currency,
        billingDate: DateTime.now().toFormat('cccc, dd MMMM yyyy'),
      };
      await emailService.initialize();
      await emailService.sendCreditsPurchased(email, emailData);
    } catch (error) {
      console.error('Failed to send subscription activation email:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email,
        shopName,
        packageName: creditPackage.name
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
