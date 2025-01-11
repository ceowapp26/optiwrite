import { prisma } from '@/lib/prisma';
import { shopify } from '@/lib/shopify';
import { ShopifySessionManager } from '@/utils/storage';
import { generateQueryParams } from '@/utils/auth/shopify';
import { Plan, Feature, SubscriptionPlan, Interval } from '@prisma/client';

/*interface PlanInput {
  name: SubscriptionPlan;
  description?: string | null;
  price: number;
  interval: Interval;
  trialDays: number;
  isActive?: boolean;
  features: {
    aiAPILimit: number;
    crawlAPILimit: number;
  };
}

interface ValidationResult {
  isValid: boolean;
  differences?: any[];
  validatedPlan?: any;
}

interface LocalPlan {
  id: string;
  name: string;
  price: number;
  trialDays: number;
  isActive: boolean;
  features?: any;
  createdAt: Date;
}

interface ValidatedPlansResult {
  validPlans: any[];
  warnings: string[];
  inconsistencies: {
    localOnly: any[];
    shopifyOnly: any[];
    mismatched: any[];
  };
}

interface ShopifyPlan {
  id: number;
  name: string;
  price: string;
  trial_days: number;
  status: string;
  return_url: string;
}

export function validatePlanConsistency(localPlan: any, shopifyPlan: ShopifyPlan): ValidationResult {
  const differences = [];
  
  if (localPlan.name !== shopifyPlan.name) {
    differences.push({
      field: 'name',
      local: localPlan.name,
      shopify: shopifyPlan.name
    });
  }

  if (localPlan.price !== parseFloat(shopifyPlan.price)) {
    differences.push({
      field: 'price',
      local: localPlan.price,
      shopify: parseFloat(shopifyPlan.price)
    });
  }

  if (localPlan.trialDays !== shopifyPlan.trial_days) {
    differences.push({
      field: 'trialDays',
      local: localPlan.trialDays,
      shopify: shopifyPlan.trial_days
    });
  }

  return {
    isValid: differences.length === 0,
    differences: differences,
    validatedPlan: differences.length === 0 ? localPlan : null
  };
}

export function findMatchingShopifyPlan(localPlan: LocalPlan, shopifyPlans: ShopifyPlan[]): ShopifyPlan | null {
  const matchingPlans = shopifyPlans.filter(sp => sp.name === localPlan.name);
  if (matchingPlans.length === 0) return null;
  const exactMatch = matchingPlans.find(sp => {
    const shopifyPrice = parseFloat(sp.price);
    return (
      shopifyPrice === localPlan.price &&
      sp.trial_days === localPlan.trialDays
    );
  });
  if (exactMatch) return exactMatch;
  return matchingPlans.reduce((latest, current) => {
    const latestDate = new Date(latest.created_at);
    const currentDate = new Date(current.created_at);
    return currentDate > latestDate ? current : latest;
  }, matchingPlans[0]);
}

export function validateAndReconcilePlans(localPlans: LocalPlan[], shopifyPlans: ShopifyPlan[]): ValidatedPlansResult {
  const result: ValidatedPlansResult = {
    validPlans: [],
    warnings: [],
    inconsistencies: {
      localOnly: [],
      shopifyOnly: [],
      mismatched: []
    }
  };
  const processedShopifyPlanIds = new Set<number>();
  for (const localPlan of localPlans) {
    const matchingShopifyPlan = findMatchingShopifyPlan(localPlan, shopifyPlans);
    if (!matchingShopifyPlan) {
      result.inconsistencies.localOnly.push(localPlan);
      result.warnings.push(`Plan ${localPlan.name} exists only in local database`);
      continue;
    }
    processedShopifyPlanIds.add(matchingShopifyPlan.id);
    const differences = validatePlanConsistency(localPlan, matchingShopifyPlan);
    if (differences.length > 0) {
      result.inconsistencies.mismatched.push({
        planId: localPlan.id,
        localPlan,
        shopifyPlan: matchingShopifyPlan,
        differences,
        message: `Using most recent Shopify plan (ID: ${matchingShopifyPlan.id}) for comparison`
      });
      result.warnings.push(`Plan ${localPlan.name} has inconsistencies with most recent Shopify version`);
    } else {
      result.validPlans.push({
        ...localPlan,
        shopifyId: matchingShopifyPlan.id,
        shopifyStatus: matchingShopifyPlan.status,
        confirmationUrl: matchingShopifyPlan.confirmation_url,
        lastValidated: new Date().toISOString()
      });
    }
  }
  const uniqueShopifyNames = new Set<string>();
  for (const shopifyPlan of shopifyPlans) {
    if (!processedShopifyPlanIds.has(shopifyPlan.id) && 
        !uniqueShopifyNames.has(shopifyPlan.name) && 
        !localPlans.some(lp => lp.name === shopifyPlan.name)) {
      uniqueShopifyNames.add(shopifyPlan.name);
      result.inconsistencies.shopifyOnly.push(shopifyPlan);
      result.warnings.push(`Plan ${shopifyPlan.name} exists only in Shopify`);
    }
  }
  return result;
}

export function validatePlansConsistency(localPlan: LocalPlan, shopifyPlan: ShopifyPlan): string[] {
  const differences: string[] = [];
  const shopifyPrice = parseFloat(shopifyPlan.price);
  if (localPlan.price !== shopifyPrice) {
    differences.push(`price (local: ${localPlan.price}, shopify: ${shopifyPrice})`);
  }
  if (localPlan.trialDays !== shopifyPlan.trial_days) {
    differences.push(`trialDays (local: ${localPlan.trialDays}, shopify: ${shopifyPlan.trial_days})`);
  }
  const shopifyActiveStatus = ['active', 'pending'].includes(shopifyPlan.status);
  if (localPlan.isActive !== shopifyActiveStatus) {
    differences.push(`status (local: ${localPlan.isActive}, shopify: ${shopifyPlan.status})`);
  }
  if (localPlan.features && shopifyPlan.features) {
    try {
      const localFeatures = JSON.stringify(localPlan.features);
      const shopifyFeatures = JSON.stringify(shopifyPlan.features);
      if (localFeatures !== shopifyFeatures) {
        differences.push('features');
      }
    } catch (error) {
      differences.push('features (comparison error)');
    }
  }
  return differences;
}*/

export class PlanManager {
  private constructor() {}

  static async createPlan(data: PlanInput): Promise<Plan> {
    try {
      const plan = await prisma.plan.upsert({
        where: { name: data.name },
        update: {
          description: data.description,
          price: data.price,
          shopifyId: data.shopifyId,
          trialDays: data.trialDays,
          interval: data.interval || 'EVERY_30_DAYS',
          isActive: data.isActive ?? false,
          feature: {
            upsert: {
              where: { 
                planId: (await this.getPlanByName(data.name))?.id ?? '' 
              },
              create: {
                aiAPILimit: data.feature.aiAPILimit,
                crawlAPILimit: data.feature.crawlAPILimit
              },
              update: {
                aiAPILimit: data.feature.aiAPILimit,
                crawlAPILimit: data.feature.crawlAPILimit
              }
            }
          }
        },
        create: {
          name: data.name,
          description: data.description,
          price: data.price,
          shopifyId: data.shopifyId,
          interval: data.interval || 'EVERY_30_DAYS',
          trialDays: data.trialDays,
          isActive: data.isActive ?? false,
          feature: {
            create: {
              aiAPILimit: data.feature.aiAPILimit,
              crawlAPILimit: data.feature.crawlAPILimit
            }
          }
        },
        include: {
          feature: true,
          subscriptions: true
        }
      });
      return plan;
    } catch (error) {
      console.error("Plan creation error:", error);
      throw new Error('Failed to create/update plan');
    }
  }

  static async getPlan(planId: string) {
    try {
      const plan = await prisma.plan.findUnique({
        where: { id: planId },
        include: {
          feature: true,
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
          subscriptions: {
            include: {
              shop: true,
              payments: true
            }
          }
        }
      });

      if (!plan) {
        throw new Error('Plan not found');
      }

      return plan;
    } catch (error) {
      console.error("Plan fetch error:", error);
      throw new Error('Failed to fetch plan');
    }
  }

  static async updatePlan(
    planId: string, 
    data: Partial<PlanInput>
  ): Promise<Plan> {
    try {
      const existingPlan = await prisma.plan.findUnique({ 
        where: { id: planId } 
      });
      if (!existingPlan) {
        throw new Error('Plan not found');
      }

      if (existingPlan.name === SubscriptionPlan.FREE && 
          data.name && 
          data.name !== SubscriptionPlan.FREE) {
        throw new Error('Cannot modify the name of the FREE plan');
      }

      const updateData: any = {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.interval && { interval: data.interval }),
        ...(data.trialDays !== undefined && { trialDays: data.trialDays }),
        ...(data.shopifyId && { shopifyId: data.shopifyId }),
        ...(data.isActive !== undefined && { isActive: data.isActive })
      };

      if (data.features) {
        updateData.features = {
          upsert: {
            where: { planId: existingPlan.id },
            update: {
              aiAPILimit: data.features.aiAPILimit,
              crawlAPILimit: data.features.crawlAPILimit
            },
            create: {
              aiAPILimit: data.features.aiAPILimit,
              crawlAPILimit: data.features.crawlAPILimit
            }
          }
        };
      }

      return await prisma.plan.update({
        where: { id: existingPlan.id },
        data: updateData,
        include: {
          features: true,
          subscriptions: {
            include: {
              shop: true,
              payments: true
            }
          }
        }
      });
    } catch (error) {
      console.error("Plan update error:", error);
      throw new Error(error instanceof Error ? error.message : 'Failed to update plan');
    }
  }

  static async getPlan(planId: string) {
    try {
      const plan = await prisma.plan.findUnique({
        where: { id: planId },
        include: {
          feature: true,
          subscriptions: {
            include: {
              shop: true,
              payments: true
            }
          }
        }
      });

      if (!plan) {
        throw new Error('Plan not found');
      }

      return plan;
    } catch (error) {
      console.error("Plan fetch error:", error);
      throw new Error('Failed to fetch plan');
    }
  }

  static async getPlanByName(name: SubscriptionPlan) {
    try {
      return await prisma.plan.findUnique({
        where: { name },
        include: {
          feature: {
            include: {
              aiAPI: true,
              crawlAPI: true,
            },
          },
          subscriptions: {
            include: {
              shop: true,
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
        },
      });
    } catch (error) {
      console.error("Plan fetch by name error:", error);
      throw new Error("Failed to fetch plan by name");
    }
  }

  static async deletePlan(planId: string) {
    try {
      const plan = await this.getPlan(planId);
      if (!plan) {
        throw new Error('Plan not found');
      }

      if (plan.name === SubscriptionPlan.FREE) {
        throw new Error('Cannot delete the FREE plan as it is a default plan');
      }

      if (plan.subscriptions.length > 0) {
        throw new Error('Cannot delete plan with active subscriptions');
      }

      await prisma.feature.deleteMany({
        where: { planId }
      });

      await prisma.plan.delete({
        where: { id: planId }
      });

      return true;
    } catch (error) {
      console.error("Plan deletion error:", error);
      throw new Error(error instanceof Error ? error.message : 'Failed to delete plan');
    }
  }

  static async getAllPlans() {
    try {
      return await prisma.plan.findMany({
        include: {
          feature: {
            include: {
              aiAPI: true,
              crawlAPI: true,
            }
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
          subscriptions: {
            include: {
              shop: true,
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
        },
        orderBy: { price: 'asc' }
      });
    } catch (error) {
      console.error("Plans fetch error:", error);
      throw new Error('Failed to fetch plans');
    }
  }

  static async syncPlanWithShopify(planId: string, shopifyPlan: any) {
    try {
      return await prisma.plan.update({
        where: { id: planId },
        data: {
          name: shopifyPlan.name,
          price: parseFloat(shopifyPlan.price),
          trialDays: shopifyPlan.trial_days,
          shopifyId: shopifyPlan.id, 
        },
        include: {
          features: true,
          subscriptions: {
            include: {
              shop: true,
              payments: true
            }
          }
        }
      });
    } catch (error) {
      console.error("Plan sync error:", error);
      throw new Error('Failed to sync plan with Shopify');
    }
  }
}
