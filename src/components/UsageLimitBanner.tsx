import { Alert, Banner } from '@shopify/polaris';

interface UsageLimitBannerProps {
  aiApi: {
    isOverLimit: boolean;
    isApproachingLimit: boolean;
    remainingTokens: number;
  };
  crawlApi: {
    isOverLimit: boolean;
    isApproachingLimit: boolean;
    remainingCalls: number;
  };
}

export function UsageLimitBanner({ aiApi, crawlApi }: UsageLimitBannerProps) {
  if (aiApi.isOverLimit || crawlApi.isOverLimit) {
    return (
      <Banner title="API Usage Limit Reached" status="critical">
        <p>
          {aiApi.isOverLimit && "You have reached your AI API usage limit. "}
          {crawlApi.isOverLimit && "You have reached your Crawl API usage limit. "}
          Please upgrade your plan or wait until your next billing cycle.
        </p>
      </Banner>
    );
  }

  if (aiApi.isApproachingLimit || crawlApi.isApproachingLimit) {
    return (
      <Banner title="Approaching API Usage Limit" status="warning">
        <p>
          {aiApi.isApproachingLimit && 
            `Approaching AI API limit. Remaining tokens: ${aiApi.remainingTokens}. `}
          {crawlApi.isApproachingLimit && 
            `Approaching Crawl API limit. Remaining calls: ${crawlApi.remainingCalls}.`}
        </p>
      </Banner>
    );
  }

  return null;
}