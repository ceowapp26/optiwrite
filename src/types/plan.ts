export enum SubscriptionPlan {
  FREE = "FREE",
  STANDARD = "STANDARD",
  PRO = "PRO",
  ULTIMATE = "ULTIMATE",
}

export enum Interval {
  EVERY_30_DAYS = "EVERY_30_DAYS",
  ANNUAL = "ANNUAL",
}

export interface PLAN {
  id: string;
  shopifyId?: string;
  name: SubscriptionPlan;
  description?: string;
  price: number;
  interval: Interval;
  trialDays: number;
  isActive: boolean;
  features: Feature[];
  subscriptions: Subscription[];
  createdAt: Date;
  updatedAt: Date;
}
