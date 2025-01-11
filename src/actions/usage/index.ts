'use server';

import { UsageManager } from '@/utils/usage';
import { PrismaClient, Prisma, Service, ServiceUsage } from '@prisma/client';
import { ShopifySessionManager } from '@/utils/storage';
import { SubscriptionManager } from '@/utils/billing';

interface AIDetails {
  modelName: ModelName;
  inputTokens: number;
  outputTokens: number;
  requestLimits: {
    rpm: number;
    rpd: number;
    tpm: number;
    tpd: number;
  };
}

interface UsageBaseParams {
  tx: Prisma.TransactionClient;
  usage: Usage;
  service: Service;
  calls: number;
  totalRequests?: number;
}

interface AIUsageParams extends UsageBaseParams {
  totalTokens?: number;
  aiDetails: AIDetails;
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

export async function updateUsageAction(    
    shopName: string,
    service: Service,
    serviceDetails?: ServiceDetails,
    userId?: string
) {
  return await UsageManager.updateServiceUsage(
    shopName, 
    service, 
    serviceDetails,
    userId
  );
}

export async function resetUsageCountsAction(
  shopName: string,
) {
  return await UsageManager.resetUsageCounts(shopName);
}

export async function getUsageStateAction(shopName: string) {
  return await UsageManager.getUsageState(shopName);
}

export async function getSubscriptionDetailsAction(shopName: string) {
  return await SubscriptionManager.getSubscriptionDetails(shopName);
}

export async function handleCycleTransitionAction(shopName: string) {
  return await SubscriptionManager.handleCycleTransition(shopName);
}

export async function checkAndManageCycleAction(shopName: string) {
  return await SubscriptionManager.checkAndManageCycle(shopName);
}

export async function findShopByNameAction(shopName: string) {
  return await ShopifySessionManager.findShopByName(shopName);
}






