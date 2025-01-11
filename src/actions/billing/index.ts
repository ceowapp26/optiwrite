"use server";
import { prisma } from '@/lib/prisma'
import { PlanManager, SubscriptionManager, CreditManager, BillingOperationsService } from '@/utils/billing';

export async function getSubscriptionPlans() {
  try {
    const plans = await PlanManager.getAllPlans();
    return plans;
  } catch (error) {
    console.error('Error registering product:', error);
    return null;
  }
}

export async function getAllStandardPackages() {
  try {
    const packages = await CreditManager.getAllStandardPackages();
    return packages;
  } catch (error) {
    console.error('Error registering product:', error);
    return null;
  }
}

export async function createStandardCreditPackages() {
  try {
    const packages = await CreditManager.createStandardCreditPackages();
    return packages;
  } catch (error) {
    console.error('Error registering product:', error);
    return null;
  }
}

export async function getSubscriptionDetails(shopName: string) {
  try {
    const data = await SubscriptionManager.getSubscriptionDetails(shopName);
    return data;
  } catch (error) {
    console.error('Error registering product:', error);
    return null;
  }
}

export async function getPurchaseDetails(shopName: string) {
  try {
    const data = await CreditManager.getPurchaseDetails(shopName);
    return data;
  } catch (error) {
    console.error('Error registering product:', error);
    return null;
  }
}

export async function getCurrentSubscription(shopName: string) {
  try {
    const data = await SubscriptionManager.getCurrentSubscription(shopName);
    return data;
  } catch (error) {
    console.error('Error retrieve current subscription:', error);
    return null;
  }
}

export async function getEarlyAdapterPromotion(planId?: string, packageId?: string) {
  try {
    const data = await BillingOperationsService.getEarlyAdapterPromotion();
    return data;
  } catch (error) {
    console.error('Error retrieve early adapter promotion:', error);
    return null;
  }
}

