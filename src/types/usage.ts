export interface UsageState {
  aiApi: {
    totalUsage: number;
    limit: number;
    isOverLimit: boolean;
    isApproachingLimit: boolean;
    remainingTokens: number;
  };
  crawlApi: {
    totalUsage: number;
    limit: number;
    isOverLimit: boolean;
    isApproachingLimit: boolean;
    remainingCalls: number;
  };
  subscription: {
    plan: SubscriptionPlan;
    status: BillingStatus;
    endDate: Date;
  };
  isLoading: boolean;
  error: Error | null;
}