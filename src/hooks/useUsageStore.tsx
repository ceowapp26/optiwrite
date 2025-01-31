'use client';

import { create } from 'zustand';
import { 
  getUsageStateAction,
  getSubscriptionDetailsAction, 
  updateUsageAction,
  handleCycleTransitionAction,
  checkAndManageCycleAction,
  resetUsageCountsAction,
  findShopByNameAction,
  handleUsageNotificationAction
} from '@/actions/usage';
import { countTokens } from '@/utils/ai';
import { Redirect } from '@shopify/app-bridge/actions';
import { useAppDispatch, useAppSelector } from "@/hooks/useLocalStore";
import { storeSession, selectSession } from "@/stores/features/authSlice";
import { AppBridgeState, ClientApplication } from '@shopify/app-bridge';
import { Service, SubscriptionStatus, ModelName } from '@prisma/client';
import { eventEmitter } from '@/helpers/eventEmitter';

const TIME_LIMIT = 60000;

interface ServiceState {
  totalRequests: number;
  remainingRequests: number;
  percentageUsed: number;
  isOverLimit: boolean;
  isApproachingLimit: boolean;
  rateLimits?: {
    rpm?: number;
    rpd?: number;
    tpm?: number;
    tpd?: number;
    maxTokens?: number;
    tokensPerMinute?: number;
    tokensPerDay?: number;
    requestsPerMinuteLimit?: number;
    requestsPerDayLimit?: number;
    remainingRequestsPerMinute?: number;
    remainingRequestsPerDay?: number;
    resetTimeForMinuteRequests?: Date;
    resetTimeForDayRequests?: Date;
  };
}

interface UsageStore {
  shopName: string | null;
  userId?: string;
  subscription: {
    id: string | null;
    status: SubscriptionStatus;
    planName: string;
    serviceUsage: {
      [Service.AI_API]?: ServiceState;
      [Service.CRAWL_API]?: ServiceState;
    };
    isApproachingLimit: boolean;
    cycleStart?: Date;
    cycleEnd?: Date;
    daysUntilExpiration?: number;
  };
  creditPackages: {
    active: Array<{
      id: string;
      name: string;
      creditsUsed: number;
      creditLimit: number;
      percentageUsed: number;
      remainingCredits: number;
      serviceUsage: {
        [Service.AI_API]?: ServiceState;
        [Service.CRAWL_API]?: ServiceState;
      };
      isExpiringSoon: boolean;
      expiresAt?: Date;
    }>;
    expired: Array<{
      id: string;
      name: string;
      expiredAt: Date;
    }>;
  };
  totalUsage: {
    creditsUsed: number;
    creditLimit: number;
    remainingCredits: number;
    percentageUsed: number;
    isOverLimit: boolean;
    isApproachingLimit: boolean;
  };
  serviceDetails: {
    [Service.AI_API]?: {
      totalRequests: number;
      totalTokens: number;
      inputTokens: number;
      outputTokens: number;
      model: ModelName;
      rateLimits: {
        requestsPerMinuteLimit: number;
        requestsPerDayLimit: number;
        remainingRequestsPerMinute: number;
        remainingRequestsPerDay: number;
        resetTimeForMinuteRequests: Date;
        resetTimeForDayRequests: Date;
        tokensPerMinute: number;
        tokensPerDay: number;
        maxTokens: number;
      };
    };
    [Service.CRAWL_API]?: {
      totalRequests: number;
      rateLimits: {
        requestsPerMinute: number;
        requestsPerDay: number;
      };
    };
  };
  isLoading: boolean;
  error: Error | null;
  setShopDetails: (shopName: string, userId?: string) => Promise<void>;
  updateAiUsage: (modelName: ModelName, inputTokens: number, outputTokens: number, app: ClientApplication<AppBridgeState>) => Promise<void>;
  updateCrawlUsage: (calls: number, app: ClientApplication<AppBridgeState>) => Promise<void>;
  checkAiAPILimit: (prompt: string, model: string, requestedCalls: number, app: ClientApplication<AppBridgeState>) => Promise<boolean>;
  checkCrawlLimit: (requestedCalls: number, app: ClientApplication<AppBridgeState>) => Promise<boolean>;
  refreshUsage: () => Promise<void>;
  redirectToBilling: (app: ClientApplication<AppBridgeState>) => void;
}

export const useUsageStore = create<UsageStore>((set, get) => ({
  shopName: null,
  userId: undefined,
  subscription: {
    id: null,
    status: SubscriptionStatus.EXPIRED,
    planName: 'FREE',
    serviceUsage: {},
    isApproachingLimit: false,
    cycleStart: new Date(),
    cycleEnd: new Date(),
    daysUntilExpiration: 0,
  },
  creditPackages: {
    active: [],
    expired: []
  },
  totalUsage: {
    creditsUsed: 0,
    creditLimit: 0,
    remainingCredits: 0,
    percentageUsed: 0,
    isOverLimit: false,
    isApproachingLimit: false,
  },
  serviceDetails: {},
  isLoading: false,
  error: null,

  redirectToBilling: (app: ClientApplication<AppBridgeState>) => {
    const { shopName, userId, aiApi } = get();
    const redirect = app && Redirect.create(app);
    redirect.dispatch(Redirect.Action.APP, {
      path: `/billing`, 
    });
  },

  getAiApi: () => {
    return get().subscription?.serviceUsage[Service.AI_API]?.rateLimit;
  },

  setShopDetails: async (shopName: string, userId?: string, email: string) => {
    set({ shopName, userId, email });
    await get().refreshUsage();
  },

  updateAiUsage: async (
    modelName: ModelName, 
    inputTokens: number, 
    outputTokens: number, 
    apiCalls?: number, 
    requestsPerMinuteLimit: number,
    requestsPerDayLimit: number,
    remainingRequestsPerMinute: number,
    remainingRequestsPerDay: number,
    resetTimeForMinuteRequests: number,
    resetTimeForDayRequests: number,
    app: ClientApplication<AppBridgeState>
  ) => {
    const { 
      shopName, 
      userId, 
      email, 
      subscription, 
      creditPackages, 
      totalUsage, 
      serviceDetails, 
      aiApi 
    } = get();
    if (!shopName) throw new Error('Shop ID not set');
    try {
      set({ isLoading: true, error: null });
      await updateUsageAction(
        shopName,
        Service.AI_API,
        {
          subscription,
          creditPackages,
          totalUsage,
          serviceDetails
        },
        {
          aiDetails: {
            modelName,
            inputTokens,
            outputTokens,
            totalRequests: apiCalls,
            requestsPerMinuteLimit,
            requestsPerDayLimit,
            remainingRequestsPerMinute,
            remainingRequestsPerDay,
            resetTimeForMinuteRequests,
            resetTimeForDayRequests
          }
        },
        userId,
        email
      );
      await get().refreshUsage();
      eventEmitter.publish('aiUsageUpdated', shopName);
      const currentState = get();
      if (currentState?.totalUsage?.serviceUsage[Service.AI_API]?.isOverLimit) {
        const { Modal, Button } = await import('@shopify/app-bridge/actions');
        const subscribeButton = Button.create(app, {label: 'Upgrade'});
        subscribeButton.subscribe(Button.Action.CLICK, () => {
          get().redirectToBilling(app);
        });
        const cancelButton = Button.create(app, {label: 'Cancel'});
        const modal = Modal.create(app, {
          title: 'Access Limit Reached',
          message: "You've reached the maximum AI token usage for this billing cycle. Upgrade your plan to unlock additional access and continue benefiting from our advanced AI features.",
          footer: {
            buttons: {
              primary: subscribeButton,
              secondary: [cancelButton],
            },
          },
        });
        cancelButton.subscribe(Button.Action.CLICK, () => {
          modal.dispatch(Modal.Action.CLOSE);
        });
        modal.dispatch(Modal.Action.OPEN);
      }
    } catch (error) {
      set({ error: error as Error });
    } finally {
      set({ isLoading: false });
    }
  },

  updateCrawlUsage: async (calls: number = 1, app: ClientApplication<AppBridgeState>) => {
    const { 
      shopName, 
      userId, 
      email, 
      subscription, 
      creditPackages, 
      totalUsage, 
      serviceDetails, 
      aiApi 
    } = get();
    if (!shopName) throw new Error('Shop ID not set');
    try {
      set({ isLoading: true, error: null });
      await updateUsageAction(
        shopName,
        Service.CRAWL_API,
        {
          subscription,
          creditPackages,
          totalUsage,
          serviceDetails
        },
        {
          crawlDetails: {
            totalRequests: calls
          }
        },
        userId,
        email
      );
      await get().refreshUsage();
      eventEmitter.publish('crawlUsageUpdated', shopName);
      const currentState = get();
      if (currentState?.totalUsage?.serviceUsage[Service.CRAWL_API]?.isOverLimit) {
        const { Modal, Button } = await import('@shopify/app-bridge/actions');
        const subscribeButton = Button.create(app, {label: 'Upgrade'});
        subscribeButton.subscribe(Button.Action.CLICK, () => {
          get().redirectToBilling(app);
        });
        const cancelButton = Button.create(app, {label: 'Cancel'});
        const modal = Modal.create(app, {
          title: 'Access Limit Reached',
          message: "You've reached your Crawl API call limit for this billing cycle. Consider upgrading your plan for more API calls.",
          footer: {
            buttons: {
              primary: subscribeButton,
              secondary: [cancelButton],
            },
          },
        });
        cancelButton.subscribe(Button.Action.CLICK, () => {
          modal.dispatch(Modal.Action.CLOSE);
        });
        modal.dispatch(Modal.Action.OPEN);
      }
    } catch (error) {
      set({ error: error as Error });
    } finally {
      set({ isLoading: false });
    }
  },

  checkAiAPILimit: async (prompt: string, model: string, requestedCalls: number, app: ClientApplication<AppBridgeState>, stop?: () => void) => {
    const estimatedTokens = await countTokens({
      input: prompt,
      model: model
    });
    const now = Date.now();
    const { serviceDetails } = get();
    const aiDetails = serviceDetails[Service.AI_API];
    if (!aiDetails) return true;
    const showModal = async (title: string, message: string) => {
      const { Modal, Button } = await import('@shopify/app-bridge/actions');
      const subscribeButton = Button.create(app, {label: 'Upgrade'});
      const cancelButton = Button.create(app, {label: 'Cancel'});
      subscribeButton.subscribe(Button.Action.CLICK, () => {
        get().redirectToBilling(app);
      });
      const modal = Modal.create(app, {
        title,
        message,
        footer: {
          buttons: {
            primary: subscribeButton,
            secondary: [cancelButton],
          },
        },
      });
      cancelButton.subscribe(Button.Action.CLICK, () => {
        modal.dispatch(Modal.Action.CLOSE);
      });
      modal.dispatch(Modal.Action.OPEN);
      return false;
    };
    const minuteResetTime = new Date(aiDetails?.rateLimits?.resetTimeForMinuteRequests);
    switch (true) {
      case ((now - minuteResetTime) <= TIME_LIMIT && 
      (estimatedTokens + aiDetails?.rateLimits.tokensPerMinute > aiDetails?.rateLimits?.requestsPerMinuteLimit)):
        return showModal(
          'Token Limit Exceeded',
          "You've exceeded token limit for this time frame. Please wait for a minute and try again or consider upgrading your plan for increased token allocation and try reducing your input size."
        );
      case (requestedCalls > aiDetails?.rateLimits?.remainingRequestsPerDay):
        return showModal(
          'Request Limit Exceeded',
          "You've reached your AI API call limit for this billing cycle. Consider upgrading your plan for more API calls.",
        );
      /*case (estimatedTokens.inputTokens > aiApi.remainingTokens && max_tokens !== undefined && estimatedTokens.inputTokens > max_tokens):
        return showModal(
          'Token Limit Exceeded',
          "You've exceeded both your billing cycle token limit and the model's maximum token limit. Please upgrade your plan for increased token allocation and try reducing your input size."
        );
      case (estimatedTokens.inputTokens > aiApi.remainingTokens):
        return showModal(
          'Billing Cycle Limit Reached',
          "You've reached your token usage limit for this billing cycle. Upgrade your plan to unlock additional access and continue using our AI features."
        );*/
      case (estimatedTokens?.inputTokens > aiDetails?.rateLimits?.maxTokens):
        return showModal(
          'Model Token Limit Exceeded',
          `Your input exceeds the model's maximum token limit of ${aiDetails?.rateLimits?.maxTokens}. Please reduce the size of your input or upgrade to a plan with higher token limits.`
        );
      default:
        return true;
    }
  },

  checkCrawlLimit: async (requestedCalls: number, app: ClientApplication<AppBridgeState>) => {
    const { serviceDetails } = get();
    const crawlDetails = serviceDetails[Service.CRAWL_API];
    if (!crawlDetails) return true;
    if (requestedCalls > crawlDetails.totalRemainingRequests) {
      const { Modal, Button } = await import('@shopify/app-bridge/actions');
      const subscribeButton = Button.create(app, {label: 'Upgrade'});
      subscribeButton.subscribe(Button.Action.CLICK, () => {
        get().redirectToBilling(app);
      });
      const cancelButton = Button.create(app, {label: 'Cancel'});
      const modal = Modal.create(app, {
        title: 'Access Limit Reached',
        message: "You've reached your Crawl API call limit for this billing cycle. Consider upgrading your plan for more API calls.",
        footer: {
          buttons: {
            primary: subscribeButton,
            secondary: [cancelButton],
          },
        },
      });
      cancelButton.subscribe(Button.Action.CLICK, () => {
        modal.dispatch(Modal.Action.CLOSE);
      });
      modal.dispatch(Modal.Action.OPEN);
      return false;
    }
    return true;
  },

  refreshUsage: async () => {
    const { shopName, userId, email } = get();
    if (!shopName) return;
    try {
      set({ isLoading: true, error: null });
      const usageState = await getUsageStateAction(shopName, email);
      if (!usageState) {
        throw new Error('Failed to get usage state after reset');
      }
      set((state) => ({
        ...state,
        subscription: usageState?.subscription,
        creditPackages: usageState?.creditPackages,
        totalUsage: usageState?.totalUsage,
        serviceDetails: usageState?.serviceDetails
      }));
    } catch (error) {
      set({ error: error as Error });
    } finally {
      set({ isLoading: false });
    }
  }
}));

 