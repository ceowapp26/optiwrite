import { Session } from '@shopify/shopify-api';
import { SessionNotFoundError } from './sessionStorageError';
import { ModelManager } from './aiModelManager';
import { SubscriptionManager } from '@/utils/billing';
import { GoogleSessionManager } from './googleSessionStorageManager';
import { PlanManager } from '../billing';
import { Prisma, Service, SubscriptionPlan, SubscriptionStatus, WebhookLog } from '@prisma/client';
import { v4 as uuidv4 } from "uuid";
import { prisma } from '@/lib/prisma';
import { DateTime } from 'luxon';

export class ShopifySessionManager {
  private static apiKey = process.env.SHOPIFY_API_KEY || "";

  private static readonly TRANSACTION_TIMEOUT = 100000;

  private static readonly MAX_WAIT = 50000;

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

  static async storeSessionToStorage(session: Session): Promise<void> {
    try {
      if (!session || !session.shop || !session.id) {
        throw new Error('Invalid session data: Missing required fields');
      }
      const now = DateTime.utc().toJSDate();
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
      const freePlan = await PlanManager.getPlanByName(SubscriptionPlan.FREE);
      if (!freePlan) throw new Error('Free plan not found');
      const model = await ModelManager.getLatestModel();
      if (!model) throw new Error('Model not found');
      let onlineSession: { sessionId: string; email: string } | null = null;
      let shop;
      let defaultSubscription;
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
        const startDate = DateTime.utc().startOf('day');
        const endDate = startDate.plus({ months: 1 });
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
        defaultSubscription = await SubscriptionManager.createDefaultSubscription(shop.id, session.shop);
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
        if (!shop?.usages?.length || !shop?.subscriptions?.length) {
          defaultSubscription = await SubscriptionManager.createDefaultSubscription(shop.id, session.shop);
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
        await prisma.shop.update({
          where: { id: shop.id },
          data: {
            associatedUsers: {
              connect: [{ id: associatedUser.id }]
            }
          }
        });
        if (defaultSubscription && !defaultSubscription?.associatedUsers?.length) {
          await prisma.subscription.update({
            where: { 
              id: defaultSubscription.id 
            },
            data: {
              associatedUsers: {
                create: [{
                  associatedUserId: associatedUser.id,
                }]
              }
            }
          });
        }
        for (const usage of shop.usages) {
          const associatedUserConnection = usage.associatedUsers.find(
            au => au.associatedUserId === associatedUser.userId
          );
          if (!associatedUserConnection) {
            await prisma.associatedUserToUsage.create({
              data: {
                associatedUserId: associatedUser.userId,
                usageId: usage.id
              }
            });
          }
        }
      }
      try {
        const completedUninstallEvent = await prismaClient.webhookLog.findFirst({
          where: {
            shopName: session.shop,
            topic: 'APP_UNINSTALLED_COMPLETED',
          },
          orderBy: {
            createdAt: 'desc'
          }
        });

        if (!completedUninstallEvent) {
          await prismaClient.webhookLog.create({
            data: {
              topic: 'APP_UNINSTALLED_COMPLETED',
              shopName: session.shop,
              payload: {
                status: "COMPLETED",
                completedAt: now
              }
            }
          });
        }
      } catch (error) {
        console.error('Error handling uninstall webhook log:', error);
      }
      return onlineSession;
    } catch (error) {
      console.error('Error in storeSessionToStorage:', error);
      throw error;
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

  static async getSessionFromStorageByAccessToken(accessToken: string): Promise<Session | null> {
    try {
      const session = await prisma.shopifySession.findFirst({
        where: {
          accessToken,
          isOnline: false,
        }
      });
      if (session) {
        return this.generateShopifySessionFromDB(session);
      }
      console.log(`No active session found for access token: ${accessToken}`);
      return null;
    } catch (error) {
      console.error('Error fetching session:', error);
      throw new Error(`Failed to fetch session for access token: ${accessToken}`);
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
        },
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
  
  static async removeGoogleUserFromShop(shopId: string, googleUserId: string): Promise<void> {
    await prisma.shopToUser.delete({
      where: {
        shopId_userId: {
          shopId: shopId,
          userId: googleUserId
        }
      }
    });
  }

  static async findShopByName(name: string) {
    return prisma.$transaction(async (tx) => {
      return tx.shop.findUnique({
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
          creditPurchases: {
            include: {
              billingEvents: true,
              payment: true,
              usage: true,
              associatedUsers: true
            }
          },
          notifications: true,
          promotions: true,
          discounts: true,
          payments: true,
          subscriptions: {
            include: {
              billingEvents: true,
              payments: {
                include: {
                  billingEvents: true,
                },
              },
              usage: true,
              associatedUsers: true,
              plan: {
                include: {
                  feature: true
                }
              }
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
    return associatedUsers || [];
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
          shopName: shopDomain, 
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


