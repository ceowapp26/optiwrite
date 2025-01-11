'use client';
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
  CreditCardIcon
} from '@shopify/polaris-icons';
import { Service } from '@prisma/client';
import { CreditPaymentInfo } from '@/types/billing';
import { useGeneralContext } from "@/context/GeneralContextProvider";
import ButtonHandler from './ButtonHandlers';

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
    background="bg-surface"
    padding="500"
    borderRadius="300"
    shadow="200"
    borderWidth="025"
    borderColor="border-secondary"
  >
    <BlockStack gap="400">
      <InlineStack gap="300" align="start">
        <Icon source={icon} tone="success" />
        <Text variant="headingMd" as="h4">{title}</Text>
      </InlineStack>
      <Divider />
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
  <Box padding="300" background="bg-surface-secondary" borderRadius="200">
    <InlineStack align="space-between" blockAlign="center">
      <InlineStack gap="300" blockAlign="center">
        <Text variant="bodyLg" as="span" fontWeight="bold">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </Text>
        <Text variant="bodyMd">{label}</Text>
      </InlineStack>
      <Tooltip content={tooltipContent} preferredPosition="above">
        <Button plain icon={InfoIcon} accessibilityLabel="More information" />
      </Tooltip>
    </InlineStack>
  </Box>
);

interface AIFeatureDetailsProps {
  aiAPI: AIAPIFeature;
}

const AIFeatureDetails = ({ creditAmount }: { creditAmount: number }) => {
  const aiRequests = calculateRequestsFromCredits(creditAmount, 0.1);
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
        <Text variant="bodySm" tone="subdued">
          (1 request = 0.1 credits)
        </Text>
      </BlockStack>
    </APIFeatureCard>
  );
};

interface CrawlFeatureDetailsProps {
  crawlAPI: CrawlAPIFeature;
}

const CrawlFeatureDetails = ({ creditAmount }: { creditAmount: number }) => {
  const crawlRequests = calculateRequestsFromCredits(creditAmount, 1);
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
        <Text variant="bodySm" tone="subdued">
          (1 request = 1 credit)
        </Text>
      </BlockStack>
    </APIFeatureCard>
  );
};

interface PlanLimitProps {
  packageLimits: PackageFeature;
}

interface CreditPriceCardProps {
  onPurchase: (packageId: string, isCustom: boolean, paymentData?: CreditPaymentInfo) => void;
  shopName: string;
  accessToken: string;
  creditPaymentInfo: CreditPaymentInfo;
  onReturn: () => void;
}

const PackageLimit = ({ creditAmount }: PlanLimitProps & { creditAmount: number }) => {
  return (
    <BlockStack gap="400">
      <>
        <AIFeatureDetails creditAmount={creditAmount} />
        <CrawlFeatureDetails creditAmount={creditAmount} />
      </>
    </BlockStack>
  );
};

const CreditPriceCard = ({ onPurchase, shopName, accessToken, creditPaymentInfo, onReturn }: CreditPriceCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <Box 
      className={`
        relative
        min-h-[580px]
        w-full lg:w-[60%]
        py-10
        ${isHovered ? 'border-hovered bg-gray-200' : 'border-subdued bg-gray-300/80'}
        shadow-300
        rounded-lg
        border-0
      `}
    >
      <div className="max-w-4xl mx-auto">
        <Box padding="600">
          <Box padding="600" background="bg-surface-secondary" borderRadius="200">
            <BlockStack gap="400">
              <InlineStack align="space-between">
                <InlineStack gap="300">
                  <Icon source={CreditCardIcon} tone="success" />
                  <Text variant="headingLg" as="h2">Credit Purchase Summary</Text>
                </InlineStack>
                <Badge tone="success" size="large">{creditPaymentInfo.name}</Badge>
              </InlineStack>
            </BlockStack>
          </Box>
        </Box>
        <Box padding="600">
          <BlockStack gap="600">
            <Box
              background="bg-surface-secondary"
              padding="600"
              borderRadius="300"
              shadow="200"
            >
              <BlockStack gap="400">
                <InlineStack blockAlign="center" align="space-between">
                  <InlineStack gap="300">
                    <Icon source={StoreManagedIcon} tone="caution" />
                    <Text variant="headingMd">Total Credits</Text>
                  </InlineStack>
                  <Text variant="heading2xl" as="span">
                    {creditPaymentInfo.credits.toLocaleString()}
                  </Text>
                </InlineStack>
                
                <Divider />
                
                <InlineStack align="space-between">
                  <Text variant="headingMd">Total Price</Text>
                  <Text variant="heading2xl" as="span" tone="success">
                    ${creditPaymentInfo.price.amount}
                  </Text>
                </InlineStack>
              </BlockStack>
            </Box>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h3">Included Features</Text>
              <Box padding="400">
                <BlockStack gap="400">
                  <AIFeatureDetails creditAmount={creditPaymentInfo.credits} />
                  <CrawlFeatureDetails creditAmount={creditPaymentInfo.credits} />
                </BlockStack>
              </Box>
            </BlockStack>
            <Box padding="400" background="bg-surface-secondary" borderRadius="200">
              <InlineStack gap="400" align="center" wrap>
                <Badge icon={LockIcon} tone="info">Secure Payment</Badge>
                <Badge icon={ShieldCheckMarkIcon} tone="success">SSL Encrypted</Badge>
                <Badge icon={ClockIcon} tone="attention">Instant Activation</Badge>
              </InlineStack>
            </Box>
            <Box paddingBlockStart="300">
              <ButtonHandler 
                onPurchase={onPurchase}
                shopName={shopName}
                accessToken={accessToken}
                isDisabled={false}
                text="Complete Purchase"
                size="large"
                tone="success"
                fullWidth
              />
            </Box>
          </BlockStack>
        </Box>
      </div>
    </Box>
  );
};

export default CreditPriceCard;

