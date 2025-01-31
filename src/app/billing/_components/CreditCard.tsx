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
  StarIcon,
} from '@shopify/polaris-icons';
import { Service } from '@prisma/client';

const calculateRequestsFromCredits = (credits: number, conversionRate: number) => {
  return Math.floor(credits / conversionRate);
};

interface BillingCardProps {
  creditPackage: typeof subscriptionPlans[0];
  onSubscribe?: () => void;
  selectedPackage?: string | null;
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

type PackageFeature = {
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
    <BlockStack gap="400">
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

const AIFeatureDetails = ({ aiAPI, creditAmount }: { aiAPI: AIAPIFeature, creditAmount: number }) => {
  const aiRequests = calculateRequestsFromCredits(creditAmount, 0.1 * 2); 
  return (
    <APIFeatureCard 
      title="AI API Features" 
      icon={<Icon source={ChartVerticalFilledIcon} />}
    >
      <BlockStack gap="300">
        <FeatureMetric
          label="AI Requests"
          value={aiRequests}
          tooltipContent="Number of AI API requests available based on credit conversion"
        />
        <Text variant="bodySm" color="subdued">
          (1 request = 0.1 credits)
        </Text>
      </BlockStack>
    </APIFeatureCard>
  );
};

interface CrawlFeatureDetailsProps {
  crawlAPI: CrawlAPIFeature;
}

const CrawlFeatureDetails = ({ crawlAPI, creditAmount }: { crawlAPI: CrawlAPIFeature, creditAmount: number }) => {
  const crawlRequests = calculateRequestsFromCredits(creditAmount, 1 * 2); 
  return (
    <APIFeatureCard 
      title="Crawl API Features" 
      icon={<Icon source={DatabaseIcon} />}
    >
      <BlockStack gap="300">
        <FeatureMetric
          label="Crawl Requests"
          value={crawlRequests}
          tooltipContent="Number of Crawl API requests available based on credit conversion"
        />
        <Text variant="bodySm" color="subdued">
          (1 request = 1 credit)
        </Text>
      </BlockStack>
    </APIFeatureCard>
  );
};

interface PlanLimitProps {
  packageLimits: PackageFeature;
  interval: string;
}

const PackageLimit = ({ packageLimits, interval, creditAmount }: PlanLimitProps & { creditAmount: number }) => {
  return (
    <BlockStack gap="400">
      <InlineStack gap="200">
        <StatusActiveIcon className="w-7 h-7 fill-blue-500" />
        <Text variant="headingLg" as="h3">Package Quotas</Text>
      </InlineStack>
      <Box background="bg-surface-secondary" padding="400" borderRadius="200">
        <BlockStack gap="200">
          <InlineStack gap="200" align="start">
            <StoreManagedIcon className="w-7 h-7 fill-blue-500" />
            <Text variant="headingMd">Credits: {creditAmount}</Text>
          </InlineStack>
        </BlockStack>
      </Box>
      {packageLimits && (
        <>
          <AIFeatureDetails aiAPI={packageLimits?.aiAPI} creditAmount={creditAmount} />
          <CrawlFeatureDetails crawlAPI={packageLimits?.crawlAPI} creditAmount={creditAmount} />
        </>
      )}
    </BlockStack>
  );
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
    ? `${discount.value}% OFF`
    : `$${discount.value} OFF`;
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
        {discount?.description && (
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


function CreditCard({
  creditPackage,
  onSubscribe,
  selectedPackage,
  loading = false,
}: BillingCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const isPopular = creditPackage.metadata.isPopular;
  const combinedPromotions = [
    ...(creditPackage.discounts?.map((d) => ({ ...d, type: 'DISCOUNT' as const })) || []),
    ...(creditPackage.promotions?.map((p) => ({ ...p, type: 'PROMOTION' as const })) || []),
  ];
  return (
    <Box 
      className={`
       ${isPopular ? 'h-[730px] sm:h-[730px] md:h-[730px] lg:h-[1000px] xl:h-[750px]' : 'h-[730px] sm:h-[730px] md:h-[730px] lg:h-[900px] xl:h-[730px]'}
        ${ isHovered 
            ? isPopular ? 'bg-primary-50' : 'bg-white'
            : isPopular ? 'bg-primary-25' : 'bg-gray-50'
        }
        relative
        ${isPopular ? 'p-6' : 'p-4'}
        ${isPopular ? 'shadow-2xl' : 'shadow-md'}
        ${isPopular ? 'rounded-[32px]' : 'rounded-[16px]'}
        ${isPopular ? 'border-2' : 'border'}
        ${isPopular ? 'border-primary-500' : 'border-gray-200'}
        ${isPopular ? 'scale-100 lg:scale-105' : 'scale-100'}
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
          <Box inlineAlign="center" padding="200" borderRadius="300">
            <BlockStack gap="300">
              <InlineStack align="space-between">
                <Text 
                  variant={isPopular ? "headingXl" : "headingLg"} 
                  as="h2"
                  color={isPopular ? "primary" : undefined}
                >
                  {creditPackage?.name}
                </Text>
              </InlineStack>
              <Text 
                variant={isPopular ? "bodyLg" : "bodyMd"} 
                as="p" 
                color="subdued"
              >
                {creditPackage?.shortDescription}
              </Text>
              {combinedPromotions?.map(discount => (
                <PromotionBanner key={discount.id} discount={discount} />
              ))}
              <BlockStack gap="200" align="center">
                <InlineStack gap="200" align="center">
                  <Text variant="headingXl" as="span">
                    ${creditPackage.price.totalPrice}
                  </Text>
                </InlineStack>
              </BlockStack>
            </BlockStack>
          </Box>
          <Divider />
          <PackageLimit 
            packageLimits={creditPackage.packageLimits} 
            interval="unlimited" 
            creditAmount={creditPackage.creditAmount}
          />
          <Divider />
          <Box className="pt-28 flex flex-col items-center justify-center">
            <Box className="bottom-24 absolute w-[80%]">
              <Button
                variant="primary"
                disabled={loading && selectedPackage !== creditPackage.id}
                loading={loading && selectedPackage === creditPackage.id}
                onClick={() => onSubscribe(creditPackage.id)}
                fullWidth
                tone={isPopular ? "success" : ""}
              >
                {isPopular ? "Get Started" : "Purchase"}
              </Button>
            </Box>

            {creditPackage.metadata.recommendedFor.length > 0 && (
              <Box className="bottom-6 absolute px-10">
                <InlineStack gap="200" wrap>
                  {creditPackage.metadata.recommendedFor.map((rec, index) => (
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
        </BlockStack>
      </Box>
    </Box>
  );
}

export default React.memo(CreditCard);