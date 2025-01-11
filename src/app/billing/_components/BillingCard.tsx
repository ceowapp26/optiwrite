import React, { useState } from 'react';
import { 
  Card, 
  Button, 
  List, 
  InlineStack,
  BlockStack, 
  Text, 
  Divider, 
  Box, 
  Badge,
  Icon,
  Tooltip,
  Banner,
  Tag,
  ProgressBar
} from '@shopify/polaris';
import {
  CheckCircleIcon,
  StarFilledIcon,
  InfoIcon,
  StoreManagedIcon,
  LockIcon,
  ClockIcon,
  ShieldCheckMarkIcon,
  PersonIcon,
  ChartVerticalFilledIcon,
  DatabaseIcon,
  EmailNewsletterIcon,
  StatusActiveIcon,
  AppsIcon,
  StarIcon
} from '@shopify/polaris-icons';
import { Service, DiscountType, SubscriptionPlan } from '@prisma/client';

const intervalMap: Record<Interval, string> = {
  EVERY_30_DAYS: 'month',
  ANNUAL: 'year'
};

interface BillingCardProps {
  plan: typeof subscriptionPlans[0];
  currentPlan?: boolean;
  onSubscribe?: () => void;
  selectedPlan?: string | null;
  loading?: boolean;
}

type AIAPIFeature = {
  id: string;
  service: 'AI_API';
  requestLimits: number;
  tokenLimits: number;
  maxTokens: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  RPM: number;
  RPD: number;
  TPM: number;
  TPD: number;
  metadata: any;
};

type CrawlAPIFeature = {
  id: string;
  service: 'CRAWL_API';
  requestLimits: number;
  metadata: any;
};

type PlanFeature = {
  id: string;
  name: string;
  description: string | null;
  planId: string;
  aiAPI: AIAPIFeature;
  crawlAPI: CrawlAPIFeature;
};

interface APIFeatureCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

const APIFeatureCard = ({ title, icon, children }: APIFeatureCardProps) => (
  <Box
    background="bg-surface-secondary"
    padding="400"
    borderRadius="200"
    shadow="200"
  >
    <BlockStack gap="500">
      <Box>
        <BlockStack gap="200" align="start">
          <Badge size="large" tone="attention">
            <InlineStack gap="200" align="center">
              {icon}
              <Text variant="headingMd" as="h4">{title}</Text>
            </InlineStack>
          </Badge>
        </BlockStack>
      </Box>
      {children}
    </BlockStack>
  </Box>
);

interface FeatureMetricProps {
  label: string;
  value: number | string;
  tooltipContent: string;
}

const FeatureMetric = ({ label, value, tooltipContent }: FeatureMetricProps) => (
  <InlineStack align="space-between">
    <InlineStack gap="300" blockAlign="center">
      <Text variant="headingMd" as="span" fontWeight="bold">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </Text>
      <Text variant="bodyMd">{label}</Text>
    </InlineStack>
    <Tooltip content={tooltipContent}>
      <Icon source={InfoIcon} color="subdued" />
    </Tooltip>
  </InlineStack>
);

interface AIFeatureDetailsProps {
  aiAPI: AIAPIFeature;
}

const AIFeatureDetails = ({ aiAPI }: AIFeatureDetailsProps) => (
  <APIFeatureCard 
    title="AI Features" 
    icon={<Icon source={ChartVerticalFilledIcon} />}
  >
    <BlockStack gap="300">
      <FeatureMetric
        label="API Requests"
        value={aiAPI?.requestLimits}
        tooltipContent="Maximum number of API requests per billing period"
      />
    </BlockStack>
  </APIFeatureCard>
);

interface CrawlFeatureDetailsProps {
  crawlAPI: CrawlAPIFeature;
}

const CrawlFeatureDetails = ({ crawlAPI }: CrawlFeatureDetailsProps) => (
  <APIFeatureCard 
    title="Crawl Features" 
    icon={<Icon source={DatabaseIcon} />}
  >
    <FeatureMetric
      label="Crawl Requests"
      value={crawlAPI?.requestLimits}
      tooltipContent="Maximum number of crawl requests per billing period"
    />
  </APIFeatureCard>
);

interface PlanLimitProps {
  planLimits: PlanFeature;
  interval: string;
}

const PlanLimit = ({ planLimits, interval }: PlanLimitProps) => {
  return (
    <BlockStack gap="400">
      <Box paddingInline="200">
        <InlineStack gap="200">
          <StatusActiveIcon className="w-7 h-7 fill-blue-500" />
          <Text variant="headingLg" as="h3">Plan Quotas</Text>
        </InlineStack>
      </Box>
      {planLimits && (
        <>
          <AIFeatureDetails aiAPI={planLimits?.aiAPI} />
          <CrawlFeatureDetails crawlAPI={planLimits?.crawlAPI} />
        </>
      )}
    </BlockStack>
  )
};

const FeatureSection = ({ title, features, icon: Icon }: { title: string; features: string[]; icon: any }) => (
  <Box>
    <InlineStack align="start" gap="200">
      <Icon className="w-7 h-7 fill-blue-500" />
      <Text variant="headingLg" as="h3">{title}</Text>
    </InlineStack>
    <Box paddingBlock="200" />    
    <Box padding="400" background="bg-surface-secondary" borderRadius="200">
      <BlockStack gap="300" inlineAlign="start" align="start">
        {features.map((feature, index) => (
          <InlineStack gap="200" align="start" wrap={false}>
            <CheckCircleIcon className="w-6 h-6 fill-green-500" />
            <Text variant="bodyMd">{feature}</Text>
          </InlineStack>
        ))}
      </BlockStack>
    </Box>
  </Box>
);

const CoreFeatureSection = ({ title, features, icon: Icon }: { title: string; features: {title: string, description: string}[]; icon: any }) => (
  <Box>
    <Box paddingInline="200">
      <InlineStack gap="200">
        <Icon className="w-7 h-7 fill-blue-500" />
        <Text variant="headingLg" as="h3">{title}</Text>
      </InlineStack>
    </Box>
    <Box paddingBlock="200" />
    <Box padding="400" background="bg-surface-secondary" borderRadius="200">
      <BlockStack gap="300" inlineAlign="start" align="start">
       {features.map((feature, index) => (
         <BlockStack gap="200" key={index}>
           <InlineStack gap="200" align="start" wrap={false}>
             <StoreManagedIcon className="w-5 h-5 fill-green-500"/>
             <Text variant="bodyMd" fontWeight="bold">{feature.title}</Text>
           </InlineStack>
           <Text variant="bodyMd" color="subdued">{feature.description}</Text>
         </BlockStack>
       ))}
     </BlockStack>
   </Box>
  </Box>
);

interface Discount {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: DiscountType;
  value: number;
  unit: DiscountUnit;
  validFrom: Date;
  validUntil?: Date;
  isActive: boolean;
  minimumAmount?: number;
  maximumAmount?: number;
}

const PromotionBanner = ({ discount }: { discount: Discount }) => {
  if (!discount || Object.entries(discount).length === 0) return;
  const isExpiring = discount?.validUntil && 
  new Date(discount?.validUntil).getTime() - new Date().getTime() < 86400000 * 3;
  const discountText = discount?.unit === 'PERCENTAGE' 
    ? `${discount?.value}% OFF`
    : `$${discount?.value} OFF`;
  return (
    <Box background="bg-success-subdued" padding="400" borderRadius="200">
      <BlockStack gap="300">
        <InlineStack gap="200" wrap align="center">
          <Badge tone="success" size="large">{discountText}</Badge>
          <Text variant="headingMd">{discount?.name}</Text>
          {isExpiring && (
            <InlineStack gap="100" align="center">
              <Icon source={ClockIcon} color="critical" />
              <Text tone="critical">Expires soon</Text>
            </InlineStack>
          )}
        </InlineStack>
        {discount?.description && discount?.type !== DiscountType.EARLY_ADAPTER && (
          <Text variant="bodyMd">{discount?.description}</Text>
        )}
        <InlineStack gap="200" align="center">
          <Text variant="bodySm" color="subdued">
            Valid until {new Date(discount?.validUntil!).toLocaleDateString()}
          </Text>
        </InlineStack>
      </BlockStack>
    </Box>
  );
};

function BillingCard({
  plan,
  currentPlan = false,
  onSubscribe,
  selectedPlan,
  loading = false
}: BillingCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const isFreePlan = plan.id === 'free';
  const isPopular = plan.metadata.isPopular;
  const combinedPromotions = [
    ...(plan.discounts?.map(d => ({...d, type: 'DISCOUNT' as const})) || []),
    ...(plan.promotions?.map(p => ({...p, type: 'PROMOTION' as const})) || [])
  ];

  return (
    <Box 
      className={`
        ${isPopular ? 'h-[1250px] sm:h-[1150px] md:h-[1250px] lg:h-[1920px] xl:h-[1470px]' : 'h-[1250px] sm:h-[1150px] md:h-[1250px] lg:h-[1900px] xl:h-[1470px]'}
        ${currentPlan 
          ? 'bg-success-50' 
          : isHovered 
            ? isPopular ? 'bg-primary-50' : 'bg-white'
            : isPopular ? 'bg-primary-25' : 'bg-gray-50'
        }
        relative
        ${isPopular ? 'p-6' : 'p-4'}
        ${isPopular ? 'shadow-2xl' : 'shadow-md'}
        ${isPopular ? 'rounded-[32px]' : 'rounded-[16px]'}
        ${isPopular ? 'border-2' : 'border'}
        ${isPopular ? 'border-primary-500' : 'border-gray-200'}
        ${isPopular ? 'scale-100 xl:scale-105' : 'scale-100'}
        ${isPopular ? 'z-10' : 'z-0'}
        transition-all duration-400 ease-in-out
        flex justify-center items-start
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isPopular && (
        <Box 
          className="absolute top-[-12px] left-[70%] w-full transform -translate-x-1/2"
        >
          <Badge tone="attention" size="large">
            <InlineStack gap="200" align="center">
              <StarIcon className="w-5 h-5 fill-yellow-500" />
              <Text variant="headingMd">Most Popular</Text>
              <StarIcon className="w-5 h-5 fill-yellow-500" />
            </InlineStack>
          </Badge>
        </Box>
      )}
      <Box>
        <BlockStack gap={isPopular ? "500" : "300"}>
          <Box padding="200" borderRadius="300">
            <BlockStack align="center" inlineAlign="center" gap="300">
              <InlineStack align="space-between">
                <Text 
                  variant={isPopular ? "headingXl" : "headingLg"} 
                  as="h2"
                  color={isPopular ? "primary" : undefined}
                >
                  {plan.displayName}
                </Text>
              </InlineStack>

              <Text 
                variant={isPopular ? "bodyLg" : "bodyMd"} 
                as="p" 
                color="subdued"
              >
                {plan.shortDescription}
              </Text>

              {combinedPromotions?.map(discount => (
                <PromotionBanner key={discount?.promotion?.id || discount?.discount?.id} discount={discount?.promotion || discount?.discount} />
              ))}

              {plan.trialDays && (
                <Badge tone="success" size={isPopular ? "large" : "medium"}>
                  <InlineStack gap="200" align="center">
                    <Icon source={ClockIcon} />
                    <Text>{plan.trialDays} days free trial</Text>
                  </InlineStack>
                </Badge>
              )}

              <BlockStack gap="200" align="center">
                <InlineStack gap="200" align="center" blockAlign="center">
                  {!isFreePlan && (
                    <>
                      <Text 
                        variant={isPopular ? "heading2xl" : "headingXl"} 
                        as="span"
                        color={isPopular ? "primary" : undefined}
                      >
                        ${plan.price.monthly}
                      </Text>
                      <Text variant="bodyMd" as="span" color="subdued">
                        / month
                      </Text>
                    </>
                  )}
                </InlineStack>
              </BlockStack>
            </BlockStack>
          </Box>
          <Divider />
          <PlanLimit 
            planLimits={plan.planLimits} 
            interval={intervalMap[plan.interval]} 
          />
          <Divider />
          <CoreFeatureSection 
            title="Main Features" 
            features={plan.features.coreFeatures}
            icon={AppsIcon}
            highlighted={isPopular}
          />
          <Divider />
          {plan.name !== SubscriptionPlan.FREE && (
            <Box className="pt-24 flex flex-col items-center justify-center">
              <Box className="bottom-28 absolute w-[80%]">
                <Button
                  variant="primary"
                  disabled={loading && selectedPlan !== plan.name}
                  loading={loading && selectedPlan === plan.name}
                  onClick={onSubscribe}
                  fullWidth
                  tone={isPopular ? "success" : ""}
                >
                  {currentPlan ? "Renew" : isPopular ? "Get Started" : "Upgrade"}
                </Button>
              </Box>
              {plan.metadata.recommendedFor.length > 0 && (
                <Box className="bottom-8 absolute px-10">
                  <InlineStack gap="200" wrap>
                    {plan.metadata.recommendedFor.map((rec, index) => (
                      <Tag
                        key={index}
                        tone={isPopular ? "primary" : undefined}
                      >
                        {rec}
                      </Tag>
                    ))}
                  </InlineStack>
                </Box>
              )}
            </Box>
          )}
        </BlockStack>
      </Box>
    </Box>
  );
}

export default React.memo(BillingCard);