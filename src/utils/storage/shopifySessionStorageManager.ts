import { Session } from '@shopify/shopify-api';
import { SessionNotFoundError } from './sessionStorageError';
import { ModelManager } from './aiModelManager';
import { PlanManager } from '../billing';
import { Prisma, Service, Shop, SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import { MathUtils } from '@/utils/utilities/mathUtils';
import { prisma } from '@/lib/prisma';
import { DateTime } from 'luxon';

export class ShopifySessionManager {
  private static apiKey = process.env.SHOPIFY_API_KEY || "";

  private static readonly TRANSACTION_TIMEOUT = 20000;

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

  static async getSessionFromStorage(sessionId: string): Promise<Session> {
    const session = await prisma.shopifySession.findUnique({
      where: { id: sessionId },
      include: {
        onlineAccessInfo: {
          include: {
            associatedUser: true,
          },
        },
      },
    });
    if (session) {
      return this.generateShopifySessionFromDB(session);
    } else {
      throw new SessionNotFoundError();
    }
  }

  static async storeSessionToStorage(session: Session): Promise<{ sessionId: string; email: string } | null> {
    try {
      const shopifySession = await prisma.shopifySession.upsert({
        where: { id: session.id },
        update: {
          shop: session.shop,
          accessToken: session.accessToken,
          scope: session.scope,
          expires: session.expires,
          isOnline: session.isOnline,
          state: session.state,
          apiKey: this.apiKey,
        },
        create: {
          id: session.id,
          shop: session.shop,
          accessToken: session.accessToken,
          scope: session.scope,
          expires: session.expires,
          isOnline: session.isOnline,
          state: session.state,
          apiKey: this.apiKey,
        },
      });
      const [freePlan, model] = await Promise.all([
        PlanManager.getPlanByName(SubscriptionPlan.FREE),
        ModelManager.getLatestModel()
      ]);
      if (!freePlan) throw new Error('Free plan not found');
      if (!model) throw new Error('Model not found');
      const aiApiCredits = this.calculateCreditsForService(Service.AI_API, freePlan?.creditAmount);
      const crawlApiCredits = freePlan?.creditAmount - aiApiCredits;
      const now = new Date();
      const startDate = DateTime.now().startOf('day');
      const endDate = DateTime.now().plus({ months: 1 });
      let shop;
      let onlineSession: { sessionId: string; email: string } | null = null;
      const existingShop = await prisma.shop.findUnique({
        where: { name: session.shop },
        include: { 
          subscriptions: true,
          associatedUsers: true,
          sessions: true,
          usages: {
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
      if (!existingShop) {
        shop = await prisma.shop.create({
          data: {
            name: session.shop,
            sessions: {
              create: {
                sessionId: shopifySession.id
              }
            }
          },
          include: {
            usages: {
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
        if (!shop) throw Error("Failed to create new shop")
        shop = await prisma.shop.create({
          data: {
            name: session.shop,
            sessions: {
              create: {
                sessionId: shopifySession.id
              }
            }
          },
          include: {
            usages: {
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
        const usage = await prisma.usage.create({
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
        const subscription = await prisma.subscription.create({
          data: {
            shop: { connect: { id: shop.id } },
            plan: { connect: { id: freePlan.id } },
            usage: { connect: { id: usage.id } },
            status: SubscriptionStatus.ACTIVE,
            startDate: startDate.toJSDate(),
            endDate: endDate.toJSDate(),
            creditBalance: freePlan?.creditAmount ?? 0
          }
        });
      } else {
        shop = await prisma.shop.update({
          where: { name: session.shop },
          data: {
            sessions: {
              connectOrCreate: {
                where: {
                  sessionId: shopifySession.id
                },
                create: {
                  sessionId: shopifySession.id
                }
              }
            }
          },
          include: {
            subscriptions: true,
            associatedUsers: true,
            sessions: true,
            usages: {
              include: {
                associatedUsers: true,
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
        if (!shop?.usages || shop?.usages.length === 0) {
          const usage = await prisma.usage.create({
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
          const subscription = await prisma.subscription.create({
            data: {
              shop: { connect: { id: shop.id } },
              plan: { connect: { id: freePlan.id } },
              usage: { connect: { id: usage.id } },
              status: SubscriptionStatus.ACTIVE,
              startDate: startDate.toJSDate(),
              endDate: endDate.toJSDate(),
              creditBalance: freePlan?.creditAmount ?? 0
            }
          });
        }
      }
      if (session.onlineAccessInfo) {
        const onlineAccessInfo = await prisma.onlineAccessInfo.upsert({
          where: { sessionId: session.id },
          update: {
            expiresIn: session.onlineAccessInfo.expires_in,
            associatedUserScope: session.onlineAccessInfo.associated_user_scope,
          },
          create: {
            sessionId: session.id,
            expiresIn: session.onlineAccessInfo.expires_in,
            associatedUserScope: session.onlineAccessInfo.associated_user_scope,
          },
        });
        const { associated_user } = session.onlineAccessInfo;
        const associatedUser = await prisma.associatedUser.upsert({
          where: { userId: associated_user.id },
          update: {
            firstName: associated_user.first_name,
            lastName: associated_user.last_name,
            email: associated_user.email,
            emailVerified: associated_user.email_verified,
            accountOwner: associated_user.account_owner,
            locale: associated_user.locale,
            collaborator: associated_user.collaborator,
            onlineAccessInfoId: onlineAccessInfo.id,
          },
          create: {
            userId: associated_user.id,
            firstName: associated_user.first_name,
            lastName: associated_user.last_name,
            email: associated_user.email,
            emailVerified: associated_user.email_verified,
            accountOwner: associated_user.account_owner,
            locale: associated_user.locale,
            collaborator: associated_user.collaborator,
            onlineAccessInfoId: onlineAccessInfo.id,
          },
        });
        onlineSession = {
          sessionId: onlineAccessInfo.sessionId,
          email: associatedUser.email
        };
        if (shop) {
          await prisma.shop.update({
            where: { id: shop.id },
            data: {
              associatedUsers: {
                connect: [{ id: associatedUser.id }]
              }
            }
          });
          if (associatedUser.userId) {
            const shopUsages = await prisma.usage.findMany({
              where: {
                shopId: shop.id,
                associatedUsers: {
                  none: {
                    associatedUserId: BigInt(associatedUser.userId)
                  }
                }
              },
              include: {
                subscription: true,
                creditPurchase: {
                  include: { creditPackage: true }
                },
                associatedUsers: {
                  include: {
                    associatedUser: true
                  }
                }
              }
            });
            await Promise.all(
              shopUsages.map(usage => 
                prisma.associatedUserToUsage.create({
                  data: {
                    associatedUserId: BigInt(associatedUser.userId),
                    usageId: usage.id
                  }
                })
              )
            );
          }
        }
        const completedUninstallEvent = await prisma.webhookLog.findFirst({
          where: {
            shopId: session.shop,
            topic: 'APP_UNINSTALLED_COMPLETED',
          },
          orderBy: {
            createdAt: 'desc'
          }
        });
        if (!completedUninstallEvent) {
          await prisma.webhookLog.create({
            data: {
              topic: 'APP_UNINSTALLED_COMPLETED',
              shopId: session.shop,
              payload: {
                status: "COMPLETED",
                completedAt: new Date()
              }
            }
          });
        }
      }
      return onlineSession;
    } catch (error) {
      console.error('Error in storeSessionToStorage:', error);
      return null;
    }
  }

  private static generateShopifySessionFromDB(session: any): Session {
    return new Session({
      id: session.id,
      shop: session.shop,
      accessToken: session.accessToken || undefined,
      scope: session.scope || undefined,
      state: session.state,
      isOnline: session.isOnline,
      expires: session.expires || undefined,
      onlineAccessInfo: session.onlineAccessInfo
        ? {
            expires_in: session.onlineAccessInfo.expiresIn,
            associated_user: {
              id: session.onlineAccessInfo.associatedUser.userId,
              first_name: session.onlineAccessInfo.associatedUser.firstName,
              last_name: session.onlineAccessInfo.associatedUser.lastName,
              email: session.onlineAccessInfo.associatedUser.email,
              email_verified: session.onlineAccessInfo.associatedUser.emailVerified,
              account_owner: session.onlineAccessInfo.associatedUser.accountOwner,
              locale: session.onlineAccessInfo.associatedUser.locale,
              collaborator: session.onlineAccessInfo.associatedUser.collaborator,
            },
            associated_user_scope: session.onlineAccessInfo.associatedUserScope,
          }
        : undefined,
    });
  }

  static async getSessionFromStorageWithEmail(sessionId: string, userEmail: string): Promise<Session | null> {
    try {
      const session = await prisma.shopifySession.findFirst({
        where: {
          id: sessionId,
          isOnline: true,
          onlineAccessInfo: {
            associatedUser: {
              email: userEmail
            }
          }
        },
        include: {
          onlineAccessInfo: {
            include: {
              associatedUser: true,
            },
          },
        }
      });
      if (session) {
        return this.generateShopifySessionFromDB(session);
      }
      console.log(`No active session found for sessionId: ${sessionId} and email: ${userEmail}`);
      return null;
    } catch (error) {
      console.error('Error fetching session:', error);
      throw new Error(`Failed to fetch session for sessionId: ${sessionId} and email: ${userEmail}`);
    }
  }

  static async deleteSessionFromStorage(sessionId: string): Promise<void> {
    try {
      await prisma.shopifySession.delete({
        where: { id: sessionId },
      });
    } catch (error) {
      console.error('Error deleting session:', error);
      throw error;
    }
  }

  static async deleteSessionsFromStorage(sessionIds: string[]): Promise<void> {
    try {
      await prisma.shopifySession.deleteMany({
        where: { id: { in: sessionIds } },
      });
    } catch (error) {
      console.error('Error deleting sessions:', error);
      throw error;
    }
  }

  static async connectAssociatedUsertoUsage(usageId: string, associatedUserId: string): Promise<void> {
    await prisma.associatedUserToUsage.create({
      data: {
        usage: { connect: { id: usageId } },
        associatedUser: { connect: { userId: associatedUserId } }
      }
    });
  }

  static async findShopUsagesByName(shopName: string) {
    return prisma.usage.findMany({
      where: {
        shop: {
          name: shopName
        }
      },
      include: {
        associatedUsers: {
          include: {
            associatedUser: true
          }
        }
      }
    });
  }

  static async deleteUnusedSessions(currentSessionId: string, userEmail: string) {
    try {
      const duplicateSessions = await prisma.shopifySession.findMany({
        where: {
          isOnline: true,
          id: {
            not: currentSessionId
          },
          onlineAccessInfo: {
            associatedUser: {
              email: userEmail
            }
          }
        },
        include: {
          onlineAccessInfo: {
            include: {
              associatedUser: true
            }
          }
        }
      });
      if (duplicateSessions.length > 0) {
        await prisma.shopifySession.deleteMany({
          where: {
            id: {
              in: duplicateSessions.map(session => session.id)
            }
          }
        });
        console.log(`Deleted ${duplicateSessions.length} duplicate sessions for user ${userEmail}`);
      }
    } catch (error) {
      console.error('Error cleaning up duplicate sessions:', error);
      throw error;
    }
  }
  
   static async findShopByName(name: string) {
    return prisma.shop.findUnique({
      where: { 
        name 
      },
      include: {
        sessions: {
          include: {
            session: true
          }
        },
        usages: {
          include: {
            associatedUsers: {
              include: {
                associatedUser: true
              }
            },
            serviceUsage: {
              include: {
                aiUsageDetails: true,
                crawlUsageDetails: true
              }
            }
          }
        },
        contents: true,
        associatedUsers: true,
        subscriptions: {
          include: {
            payments: true,
            plan: {
              include: {
                feature: true
              }
            }
          }
        }
      }
    });
  }

  static async findCurrentAssociatedUsersByShop(shop: string) {
    const currentSessions = await prisma.shopifySession.findMany({
      where: { 
        shop,
        isOnline: true,
        expires: {
          gt: new Date()
        }
      },
      include: {
        onlineAccessInfo: {
          include: {
            associatedUser: true
          }
        }
      },
      orderBy: {
        expires: 'desc'
      }
    });
    const associatedUsers = currentSessions
      .map(session => session.onlineAccessInfo?.associatedUser)
      .filter(user => user !== null && user !== undefined);
    return associatedUsers;
  }

  static async findSubscriptionByShop(shopId: string) {
    return prisma.subscription.findUnique({
      where: {
        shopId: shopId
      },
      include: {
        plan: {
          include: {
            features: true
          }
        },
        payments: true,
        shop: true
      }
    });
  }

  static async findAssociatedUserByEmail(email: string) {
    try {
      const associatedUser = await prisma.associatedUser.findFirst({
        where: { 
          email: email 
        },
        include: {
          shop: true,
          subscriptions: {
            include: {
              subscription: {
                include: {
                  plan: true
                }
              }
            }
          },
          creditPurchases: {
            include: {
              creditPurchase: {
                include: {
                  creditPackage: true
                }
              }
            }
          },
          googleUsers: {
            include: {
              googleUser: true
            }
          },
          usageRelation: {
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
          }
        }
      });
      if (!associatedUser) {
        return null;
      }
      return associatedUser;
    } catch (error) {
      console.error('Error finding associated user by email:', error);
      throw new Error(`Failed to find associated user with email: ${email}`);
    }
  }

  static async clearRecords(shopDomain: string): Promise<void> {
    try {
      const shopifyShop = await this.findShopByName(shopDomain);
      if (!shopifyShop) {
        console.log('Shop not found in database');
        return;
      }
      await prisma.$transaction(async (tx) => {
        if (shopifyShop.subscriptions?.length > 0) {
          for (const subscription of shopifyShop.subscriptions) {
            if (subscription.payments?.length > 0) {
              await tx.payment.deleteMany({
                where: { subscriptionId: subscription.id }
              });
            }
          }
          await tx.subscription.deleteMany({
            where: { shopId: shopifyShop.id }
          });
        }
        if (shopifyShop?.creditPurchases?.length > 0) {
          for (const purchases of shopifyShop?.creditPurchases) {
            await tx.creditPurchases.deleteMany({
              where: { shopId: shopifyShop.id }
            });
          }
        }
        if (shopifyShop.usages?.length > 0) {
          const serviceUsages = await tx.serviceUsage.findMany({
            where: { 
              usage: {
                shopId: shopifyShop.id
              }
            }
          });
          if (serviceUsages.length > 0) {
            await tx.aIUsageDetails.deleteMany({
              where: {
                id: {
                  in: serviceUsages.map(su => su.aiUsageId)
                }
              }
            });
            await tx.crawlUsageDetails.deleteMany({
              where: {
                id: {
                  in: serviceUsages.map(su => su.crawlUsageId)
                }
              }
            });
          }
          await tx.usage.deleteMany({
            where: { shopId: shopifyShop.id }
          });
        }
        if (shopifyShop.products?.length > 0) {
          await tx.product.deleteMany({
            where: { shopId: shopifyShop.id }
          });
        }
        if (shopifyShop.sessions?.length > 0) {
          await tx.session.deleteMany({
            where: { shopId: shopifyShop.id }
          });
        }
      }, {
        maxWait: this.MAX_WAIT,
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: this.TRANSACTION_TIMEOUT
      });      
      await prisma.$transaction(async (tx) => {
        if (shopifyShop.users?.length > 0) {
          const googleUsers = await tx.googleUser.findMany({
            where: {
              shops: {
                some: { shopId: shopifyShop.id }
              }
            },
            include: {
              sessions: true
            }
          });
          if (googleUsers.length > 0) {
            await tx.googleUser.deleteMany({
              where: {
                id: { in: googleUsers.map(user => user.id) }
              }
            });
          }
        }
      }, {
        timeout: this.TRANSACTION_TIMEOUT,
        maxWait: this.MAX_WAIT,
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable
      });
      await prisma.$transaction(async (tx) => {
        if (shopifyShop.associatedUsers?.length > 0) {
          await tx.associatedUserToGoogleUser.deleteMany({
            where: {
              associatedUserId: { 
                in: shopifyShop.associatedUsers.map(user => user.userId) 
              }
            }
          });
          await tx.associatedUser.deleteMany({
            where: { shopId: shopifyShop.id }
          });
        }
      }, {
        timeout: this.TRANSACTION_TIMEOUT,
        maxWait: this.MAX_WAIT,
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable
      });
      
      await prisma.$transaction(async (tx) => {
        await tx.webhookLog.deleteMany({
          where: { shopId: shopDomain }
        });
        const shopStillExists = await tx.shop.findUnique({
          where: { id: shopifyShop.id },
          select: { id: true }
        });
        if (shopStillExists) {
          await tx.shop.delete({
            where: { id: shopifyShop.id }
          });
        }
      }, {
        timeout: this.TRANSACTION_TIMEOUT
      });
      return true;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          console.log('Shop already deleted or not found:', error.meta?.cause);
          return true;
        }
        if (error.code === 'P2034') {
          console.error('Transaction failed, possibly due to timeout:', error);
          throw new Error('Transaction timeout');
        }
      }
      console.error('Error deleting shop data:', error);
      throw error;
    }
  }

  static async clearWebhookRecords(shopDomain: string): Promise<WebhookLog[]> {
    try {
      const deletedLogs = await prisma.webhookLog.deleteMany({
        where: {
          shopId: shopDomain, 
        },
      });
      return deletedLogs;
    } catch (error) {
      console.error('Error clearing webhook logs:', error);
      throw new Error(`Failed to clear webhook logs: ${error.message}`);
    }
  }

  static async findSessionsByShop(shop: string): Promise<Session[]> {
    const shopifySessions = await prisma.shopifySession.findMany({
      where: { shop },
      include: {
        onlineAccessInfo: {
          include: {
            associatedUser: true,
          },
        },
      },
    });
    return shopifySessions.map(session => this.generateShopifySessionFromDB(session));
  }
}

