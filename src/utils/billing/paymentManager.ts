import { PrismaClient, Payment, PaymentStatus, Plan, Shop, Subscription } from '@prisma/client';
import { ShopifySessionManager } from '@/utils/storage';
import { prisma } from '@/lib/prisma';
import { DateTime } from 'luxon';

export class PaymentManager {
  static async getPaymentById(paymentId: string): Promise<Payment | null> {
    return await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        subscription: {
          include: {
            shop: true,
            plan: true
          }
        }
      }
    });
  }

  static async getShopPayments(shopName: string): Promise<Payment[]> {
    const shop = await ShopifySessionManager.findShopByName(shopName);
    if (!shop) {
      throw new Error('Shop not found');
    }

    return await prisma.payment.findMany({
      where: {
        subscription: {
          shopId: shop.id
        }
      },
      include: {
        subscription: {
          include: {
            plan: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  static async createPayment({
    shopName,
    amount,
    currency,
    billingPeriodStart,
    billingPeriodEnd,
    transactionId
  }: {
    shopName: string;
    amount: number;
    currency: string;
    billingPeriodStart: Date;
    billingPeriodEnd: Date;
    transactionId?: string;
  }): Promise<Payment> {
    const shop = await prisma.shop.findUnique({
      where: { name: shopName },
      include: {
        subscriptions: {
          where: {
            status: 'ACTIVE'
          },
          take: 1
        }
      }
    });

    if (!shop || shop.subscriptions.length === 0) {
      throw new Error('Shop or active subscription not found');
    }

    return await prisma.payment.create({
      data: {
        subscriptionId: shop.subscriptions[0].id,
        amount,
        currency,
        status: PaymentStatus.PENDING,
        billingPeriodStart,
        billingPeriodEnd,
        transactionId
      },
      include: {
        subscription: {
          include: {
            plan: true
          }
        }
      }
    });
  }

  static async updatePaymentStatus(
    paymentId: string,
    status: PaymentStatus
  ): Promise<Payment> {
    return await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status,
        updatedAt: new Date()
      },
      include: {
        subscription: {
          include: {
            plan: true
          }
        }
      }
    });
  }

  static async processPayment(paymentId: string): Promise<Payment> {
    return await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        include: {
          subscription: true
        }
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      try {
        const success = Math.random() > 0.1;

        const status = success ? PaymentStatus.SUCCEEDED : PaymentStatus.FAILED;
        const updatedPayment = await tx.payment.update({
          where: { id: paymentId },
          data: {
            status,
            updatedAt: new Date()
          },
          include: {
            subscription: {
              include: {
                plan: true
              }
            }
          }
        });

        if (success && payment.billingPeriodEnd) {
          await tx.subscription.update({
            where: { id: payment.subscriptionId },
            data: {
              endDate: payment.billingPeriodEnd
            }
          });
        }

        return updatedPayment;
      } catch (error) {
        return await tx.payment.update({
          where: { id: paymentId },
          data: {
            status: PaymentStatus.FAILED,
            updatedAt: new Date()
          },
          include: {
            subscription: {
              include: {
                plan: true
              }
            }
          }
        });
      }
    });
  }

  static async getPaymentHistory(
    shopName: string,
    page: number = 1,
    pageSize: number = 10
  ): Promise<{
    payments: Payment[];
    total: number;
    totalPages: number;
  }> {
    const shop = await ShopifySessionManager.findShopByName(shopName);
    if (!shop) {
      throw new Error('Shop not found');
    }

    const skip = (page - 1) * pageSize;

    const [payments, total] = await prisma.$transaction([
      prisma.payment.findMany({
        where: {
          subscription: {
            shopId: shop.id
          }
        },
        include: {
          subscription: {
            include: {
              plan: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: pageSize
      }),
      prisma.payment.count({
        where: {
          subscription: {
            shopId: shop.id
          }
        }
      })
    ]);

    return {
      payments,
      total,
      totalPages: Math.ceil(total / pageSize)
    };
  }

  static async refundPayment(
    paymentId: string,
    reason?: string
  ): Promise<Payment> {
    return await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        include: {
          subscription: true
        }
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.status !== PaymentStatus.SUCCEEDED) {
        throw new Error('Can only refund successful payments');
      }
      const refundedPayment = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.REFUNDED,
          updatedAt: new Date()
        },
        include: {
          subscription: {
            include: {
              plan: true
            }
          }
        }
      });

      await tx.payment.create({
        data: {
          subscriptionId: payment.subscriptionId,
          amount: -payment.amount, 
          currency: payment.currency,
          status: PaymentStatus.SUCCEEDED,
          billingPeriodStart: payment.billingPeriodStart,
          billingPeriodEnd: payment.billingPeriodEnd,
          transactionId: `refund_${payment.transactionId || payment.id}`
        }
      });

      return refundedPayment;
    });
  }

  static async getPaymentStatistics(
    shopName: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalAmount: number;
    successfulPayments: number;
    failedPayments: number;
    refundedPayments: number;
    refundedAmount: number;
    netAmount: number;
  }> {
    const shop = await ShopifySessionManager.findShopByName(shopName);
    if (!shop) {
      throw new Error('Shop not found');
    }
    const payments = await prisma.payment.findMany({
      where: {
        subscription: {
          shopId: shop.id
        },
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    });
    const successfulPayments = payments.filter(p => p.status === PaymentStatus.SUCCEEDED);
    const refundedPayments = payments.filter(p => p.status === PaymentStatus.REFUNDED);
    const totalAmount = successfulPayments.reduce((sum, p) => sum + p.amount, 0);
    const refundedAmount = refundedPayments.reduce((sum, p) => sum + p.amount, 0);
    return {
      totalAmount,
      successfulPayments: successfulPayments.length,
      failedPayments: payments.filter(p => p.status === PaymentStatus.FAILED).length,
      refundedPayments: refundedPayments.length,
      refundedAmount,
      netAmount: totalAmount - refundedAmount
    };
  }
}