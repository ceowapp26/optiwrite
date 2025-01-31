import {
  ActionList,
  AppProvider,
  LegacyCard,
  ContextualSaveBar,
  FormLayout,
  Frame,
  Layout,
  Loading,
  Modal,
  Navigation,
  Page,
  Box,
  SkeletonBodyText,
  SkeletonDisplayText,
  SkeletonPage,
  TextContainer,
  TextField,
  Toast,
  InlineStack,
  BlockStack,
  Button,
  Text,
  Link,
  Spinner,
  ProgressBar,
  DataTable,
  Card,
  Banner,
  Divider,
  Icon,
  Popover,
  Tooltip,
  Badge,
  Skeleton
} from '@shopify/polaris';
import {
  ArrowLeftIcon,
  HomeIcon,
  OrderIcon,
  ChatIcon,
  CheckIcon,
  MoonIcon,
  SunIcon,
  ExternalIcon,
  ViewIcon,
  PlusCircleIcon,
  CreditCardIcon,
  ChartVerticalFilledIcon,
  CheckCircleIcon,
  AlertDiamondIcon,
  PriceListIcon,
  PackageIcon,
  HashtagDecimalIcon
} from '@shopify/polaris-icons';
import LanguageIcon from '@mui/icons-material/Language';
import { ComposeIcon, AppsIcon } from '@shopify/polaris-icons';
import { cn } from '@/lib/utils';
import { z } from 'zod';
import React, { useState, useCallback, useRef, useEffect, useMemo, memo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDataProcessing } from '@/hooks/useDataProcessing';
import { styled } from 'styled-components';
import { AnimatePresence, motion } from 'framer-motion';
import { BaseFormProps, FormType } from './FormProvider';
import { useAppBridge } from '@/providers/AppBridgeProvider';
import { useShopifySubmit } from '@/hooks/useShopifySubmit';
import { Redirect } from '@shopify/app-bridge/actions';
import { type Theme } from '@/context/GeneralContextProvider';
import { useAppDispatch, useAppSelector } from '@/hooks/useLocalStore'; 
import { setContentData, selectContentData } from '@/stores/features/contentSlice';
import DynamicLayout from './DynamicLayout';
import { TONE_OPTIONS } from '@/constants/share';
import { DEFAULT_TEMPLATES } from '@/constants/template';
import { BASE_ARTICLE_OUTPUT_FORMAT, BASE_BLOG_OUTPUT_FORMAT, BASE_PRODUCT_OUTPUT_FORMAT } from '@/constants/prompt';
import { type COMMAND } from '@/types/share';
import { getBlogContents } from '@/actions/content/server';
import { eventEmitter } from '@/helpers/eventEmitter';
import { ContentCategory } from '@prisma/client';
import NotificationBell from "@/components/NotificationBell";
import LanguageSelector from '@/components/LanguageSelector';
import { getUsageStateAction } from '@/actions/usage';
import { LayoutContainer, layoutVariants, StyledOverlay, overlayVariants } from '@/styles/style.general';
import { validateField, textFieldValidationSchema } from '@/schemas/form.schema';
import { v4 as uuidv4 } from "uuid";
import RedirectModal from '@/components/content/RedirectModal';
import { supabase } from '@/lib/supabase';
import { Service } from '@prisma/client';

const USAGE_UPDATE_DELAY = 1000;

const ThemeToggleButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 12px;
  border: 1px solid var(--p-border-subdued);
  border-radius: 6px;
  background: var(--p-surface);
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: var(--p-surface-hovered);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  svg {
    width: 20px;
    height: 20px;
    color: var(--p-text);
  }
`;

const IconWrapper = styled.span`
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--p-text);
  font-size: 14px;
  font-weight: 500;
`;

const formatNumber = (num) => {
  return new Intl.NumberFormat().format(num);
};

const extractId = (gid) => {
  return gid.split('/').pop();
};

interface CreditBadgeProps {
  remainingCredits: number;
  isPopoverOpened: boolean;
  isOverLimit: boolean;
  isApproachingLimit: boolean;
  handleRedirectToBilling: () => void;
  handleRedirectToDashboard: () => void;
  handleTooglePopover: () => void;
}

const UsageDetailPopover = memo(({ data, service, loading }) => {
  const subscriptionRequestLimit = data.subscription?.serviceUsage[service]?.totalRequests || 0;
  const subscriptionRequestUsed = data.subscription?.serviceUsage[service]?.totalRequestsUsed || 0;
  const subscriptionRequestRemaining = data.subscription?.serviceUsage[service]?.remainingRequests || 0;

  const subscriptionCreditLimit = data.subscription?.serviceUsage[service]?.totalCredits || 0;
  const subscriptionCreditUsed = data.subscription?.serviceUsage[service]?.totalCreditsUsed || 0;
  const subscriptionCreditRemaining = data.subscription?.serviceUsage[service]?.remainingCredits || 0;

  const packages = data.creditPackages?.active || [];
  const groupedPackages = data?.creditPackages?.active.reduce((acc, pkg) => {
    const groupName = pkg.name.startsWith('CUSTOM_') ? 'CUSTOM' : pkg.name;
    if (!acc[groupName]) {
      acc[groupName] = {
        packages: [],
        activeCount: 0,
        name: pkg.name.startsWith('CUSTOM_') ? 'CUSTOM' : pkg.name,
        serviceUsage: {
          [service]: {
            totalRequests: 0,
            remainingRequests: 0,
            usedRequests: 0,
            totalCredits: 0,
            remainingCredits: 0,
            usedCredits: 0
          }
        }
      };
    }
    acc[groupName].packages.push(pkg);
    acc[groupName].activeCount += 1;
    if (pkg.serviceUsage?.[service]) {
      acc[groupName].serviceUsage[service].totalRequests += pkg.serviceUsage[service].totalRequests;
      acc[groupName].serviceUsage[service].usedRequests += pkg.serviceUsage[service].totalRequestsUsed;
      acc[groupName].serviceUsage[service].remainingRequests += pkg.serviceUsage[service].remainingRequests;
      acc[groupName].serviceUsage[service].totalCredits += pkg.serviceUsage[service].totalCredits;
      acc[groupName].serviceUsage[service].usedCredits += pkg.serviceUsage[service].totalCreditsUsed;
      acc[groupName].serviceUsage[service].remainingCredits += pkg.serviceUsage[service].remainingCredits;
    }
    return acc;
  }, {});

  const packageOrder = ['SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE', 'CUSTOM'];
  const sortedPackageNames = Object.keys(groupedPackages).sort(
    (a, b) => packageOrder.indexOf(a) - packageOrder.indexOf(b)
  );

  const subscriptionRows = [
    [
      'Total',
      subscriptionCreditLimit.toLocaleString(),
      subscriptionRequestLimit.toLocaleString(),
    ],
    [
      'Used',
      subscriptionCreditUsed.toLocaleString(),
      subscriptionRequestUsed.toLocaleString(),
    ],
    [
      'Remaining',
      subscriptionCreditRemaining.toLocaleString(),
      subscriptionRequestRemaining.toLocaleString(),
    ],
  ];

  const createPackageRows = (groupData) => [
    [
      'Total',
      groupData.serviceUsage[service].totalCredits.toLocaleString(),
      groupData.serviceUsage[service].totalRequests.toLocaleString(),
    ],
    [
      'Used',
      groupData.serviceUsage[service].usedCredits.toLocaleString(),
      groupData.serviceUsage[service].usedRequests.toLocaleString(),
    ],
    [
      'Remaining',
      groupData.serviceUsage[service].remainingCredits.toLocaleString(),
      groupData.serviceUsage[service].remainingRequests.toLocaleString(),
    ],
  ];

  const totalRows = [
    [
      'Total',
      (subscriptionCreditLimit + packages.reduce((sum, pkg) => 
        sum + (pkg.serviceUsage[service]?.totalCredits ?? 0), 0)).toLocaleString(),
      (subscriptionRequestLimit + packages.reduce((sum, pkg) => 
        sum + (pkg.serviceUsage[service]?.totalRequests ?? 0), 0)).toLocaleString(),
    ],
    [
      'Used',
      (subscriptionCreditUsed + packages.reduce((sum, pkg) => 
        sum + (pkg.serviceUsage[service]?.totalCreditsUsed ?? 0), 0)).toLocaleString(),
      (subscriptionRequestUsed + packages.reduce((sum, pkg) => 
        sum + (pkg.serviceUsage[service]?.totalRequestsUsed ?? 0), 0)).toLocaleString(),
    ],
    [
      'Remaining',
      (subscriptionCreditRemaining + packages.reduce((sum, pkg) => 
        sum + (pkg.serviceUsage[service]?.remainingCredits ?? 0), 0)).toLocaleString(),
      (subscriptionRequestRemaining + packages.reduce((sum, pkg) => 
        sum + (pkg.serviceUsage[service]?.remainingRequests ?? 0), 0)).toLocaleString(),
    ],
  ];

  return (
    <Box padding="400" width="100%">
      <BlockStack gap="400">
        <InlineStack blockAlign="center" align="space-between">
          <Text variant="headingMd">Usage Details for {service === 'AI_API' ? 'AI API Service' : 'CRAWL API Service'}</Text>
        </InlineStack>
        
        <Box background="bg-surface-caution" padding="200" borderRadius="200">
          <BlockStack gap="200">
            <Text variant="headingSm">Important Information:</Text>
            <Card>
              <BlockStack gap="100">
                <Text fontWeight="semibold" tone="success">Total Limit = Subscription Limit + Package Limits</Text>
                <Text fontWeight="semibold" tone="success">Request deduction order:</Text>
                <Text fontWeight="semibold" tone="success">1. Deduct from subscription first</Text>
                <Text fontWeight="semibold" tone="success">2. Then deduct from active packages</Text>
              </BlockStack>
            </Card>
          </BlockStack>
        </Box>

        <BlockStack gap="300">
          <InlineStack blockAlign="center" align="start" gap="50">
            <Text variant="headingSm">Active Subscription</Text>
          </InlineStack>
          <Box padding="300" background="bg-surface" borderRadius="200" borderWidth="025" borderColor="border">
            <BlockStack gap="200">
              <InlineStack blockAlign="center" align="space-between">
                <Text fontWeight="bold">{data.subscription?.planName || 'Free Plan'}</Text>
              </InlineStack>
              <DataTable
                columnContentTypes={['text', 'numeric', 'numeric']}
                headings={['Number', 'Credits', 'Requests']}
                rows={subscriptionRows}
                hoverable
              />
            </BlockStack>
          </Box>
        </BlockStack>

        {sortedPackageNames.length > 0 && (
          <BlockStack gap="300">
            <InlineStack blockAlign="center" align="start" gap="100">
              <Text variant="headingSm">Active Packages</Text>
            </InlineStack>
            {sortedPackageNames.map((groupName) => {
              const groupData = groupedPackages[groupName];
              if (!groupData || groupData.activeCount === 0) return null;
              return (
                <Box
                  key={groupName}
                  padding="300"
                  background="bg-surface"
                  borderRadius="200"
                  borderWidth="025"
                  borderColor="border"
                >
                  <BlockStack gap="200">
                    <InlineStack blockAlign="center" align="space-between">
                      <Text fontWeight="bold">{groupData.name}</Text>
                      <Text variant="bodySm" tone="success">
                        {groupData.activeCount} {groupData.activeCount === 1 ? 'package' : 'packages'}
                      </Text>
                    </InlineStack>
                    <DataTable
                      columnContentTypes={['text', 'numeric', 'numeric']}
                      headings={['Number', 'Credits', 'Requests']}
                      rows={createPackageRows(groupData)}
                      hoverable
                    />
                  </BlockStack>
                </Box>
              );
            })}
          </BlockStack>
        )}

        <Divider />

        <Box padding="300" background="bg-surface-emphasis" borderRadius="200">
          <BlockStack gap="300">
            <InlineStack align="start" blockAlign="center" gap="50">
              <Text variant="headingMd" color="text-inverse">Total Usage Summary</Text>
            </InlineStack>
            <DataTable
              columnContentTypes={['text', 'numeric', 'numeric']}
              headings={['Number', 'Credits', 'Requests']}
              rows={totalRows}
              hoverable
            />
          </BlockStack>
        </Box>

      </BlockStack>
    </Box>
  );
});

const UsageStatusDisplay = memo(({ 
  data,
  loading, 
  handleRedirectToBilling, 
  handleRedirectToDashboard 
}) => {
  const [active, setActive] = useState(false);

  const toggleModal = useCallback(() => setActive((active) => !active), []);

  const getStatusForService = (service) => {
    const totalRemaining = (data.subscription?.serviceUsage[service]?.remainingCredits || 0) +
      (data.creditPackages?.active || []).reduce((sum, pkg) => 
        sum + (pkg.serviceUsage[service]?.remainingCredits ?? 0), 0
      );
    const totalLimit = (data.subscription?.serviceUsage[service]?.totalCredits || 0) +
      (data.creditPackages?.active || []).reduce((sum, pkg) => 
        sum + (pkg.serviceUsage[service]?.totalCredits ?? 0), 0
      );
    const isOverLimit = totalRemaining <= 0;
    const isApproachingLimit = totalRemaining <= totalLimit * 0.2;
    return { totalRemaining, isOverLimit, isApproachingLimit };
  };

  const getStatusColor = (isOverLimit, isApproachingLimit) => {
    if (isOverLimit) return 'critical';
    if (isApproachingLimit) return 'warning';
    return 'success';
  };

  const aiStats = useMemo(() => getStatusForService(Service.AI_API, data), [data]);
  const crawlStats = useMemo(() => getStatusForService(Service.CRAWL_API, data), [data]);

  const getBadgeContent = (service, stats) => {
    const containerStyles = "transition-all duration-200 rounded-md px-2 py-2 hover:bg-gray-100 cursor-pointer";
    if (stats.isOverLimit) {
      return (
        <Box className={`${containerStyles} hover:bg-red-50`}>
          <InlineStack 
            align="center" 
            gap="200"
          >
            <Icon 
              source={AlertDiamondIcon} 
              tone="critical"
              className="transform transition-transform hover:scale-110" 
            />
            <Text 
              variant="bodySm" 
              as="span"
              className="font-medium text-red-600"
            >
              No requests remaining
            </Text>
          </InlineStack>
        </Box>
      );
    }

    return (
      <Box className={`${containerStyles} ${
        stats.isApproachingLimit 
          ? 'hover:bg-yellow-50' 
          : 'hover:bg-green-50'
      }`}>
        <InlineStack 
          align="center" 
          gap="200"
        >
          <Icon 
            source={stats.isApproachingLimit ? AlertCircleIcon : CheckCircleIcon} 
            tone={getStatusColor(stats.isOverLimit, stats.isApproachingLimit)}
            className="transform transition-transform hover:scale-110" 
          />
          <Text 
            variant="bodySm" 
            as="span"
            className={`font-medium ${
              stats.isApproachingLimit 
                ? 'text-yellow-700' 
                : 'text-green-700'
            }`}
          >
            {formatNumber(stats.totalRemaining)} credits remaining
          </Text>
        </InlineStack>
      </Box>
    );
  };

  const AIModal = () => (
    <Modal
      open={active}
      onClose={toggleModal}
      title="AI API Usage Details"
      primaryAction={{
        content: 'Close',
        onAction: toggleModal,
      }}
    >
      <Modal.Section>
        <UsageDetailPopover 
          data={data} 
          service={Service.AI_API} 
          loading={loading}
        />
      </Modal.Section>
    </Modal>
  );

  const CrawlModal = () => (
    <Modal
      open={active}
      onClose={toggleModal}
      title="Crawl API Usage Details"
      primaryAction={{
        content: 'Close',
        onAction: toggleModal,
      }}
    >
      <Modal.Section>
        <UsageDetailPopover 
          data={data} 
          service={Service.CRAWL_API} 
          loading={loading}
        />
      </Modal.Section>
    </Modal>
  );

  return (
    <Box width="100%" padding="400">
      <BlockStack gap="400">
        <BlockStack gap="300">
          <InlineStack align="center" gap="300">
            <Tooltip content="Click to view details">
              <Button
                variant="monochromePlain"
                tone={getStatusColor(aiStats.isOverLimit, aiStats.isApproachingLimit)}
                onClick={toggleModal}
              >
                <InlineStack gap="200" align="center">
                  <Text variant="headingSm">AI API</Text>
                  {getBadgeContent(Service.AI_API, aiStats)}
                </InlineStack>
              </Button>
            </Tooltip>
            <AIModal />
            {(aiStats.isOverLimit || aiStats.isApproachingLimit) && (
              <InlineStack gap="200">
                <Tooltip content="Purchase credits">
                  <Button
                    variant="primary"
                    tone={aiStats.isOverLimit ? 'critical' : 'warning'}
                    icon={PlusCircleIcon}
                    onClick={handleRedirectToBilling}
                  >
                    Purchase
                  </Button>
                </Tooltip>
                <Tooltip content="View usage">
                  <Button
                    variant="tertiary"
                    icon={ChartVerticalFilledIcon}
                    onClick={handleRedirectToDashboard}
                  />
                </Tooltip>
              </InlineStack>
            )}
          </InlineStack>
          <InlineStack align="center" gap="300">
            <Tooltip content="Click to view details">
              <Button
                variant="monochromePlain"
                tone={getStatusColor(crawlStats.isOverLimit, crawlStats.isApproachingLimit)}
                onClick={toggleModal}
              >
                <InlineStack gap="200" align="center">
                  <Text variant="headingSm">Crawl API</Text>
                  {getBadgeContent(Service.CRAWL_API, crawlStats)}
                </InlineStack>
              </Button>
            </Tooltip>
            <CrawlModal />
            {(crawlStats.isOverLimit || crawlStats.isApproachingLimit) && (
              <InlineStack gap="200">
                <Tooltip content="Purchase credits">
                  <Button
                    variant="primary"
                    tone={crawlStats.isOverLimit ? 'critical' : 'warning'}
                    icon={PlusCircleIcon}
                    onClick={handleRedirectToBilling}
                  >
                    Purchase
                  </Button>
                </Tooltip>
                <Tooltip content="View usage">
                  <Button
                    variant="tertiary"
                    icon={ChartVerticalFilledIcon}
                    onClick={handleRedirectToDashboard}
                  />
                </Tooltip>
              </InlineStack>
            )}
          </InlineStack>
        </BlockStack>
      </BlockStack>
    </Box>
  );
});

const CreditUsageDisplay = memo(({ 
  data, 
  loading,
  handleRedirectToBilling, 
  handleRedirectToDashboard 
}) => {
  const [activeView, setActiveView] = useState('summary');
  const [selectedService, setSelectedService] = useState(null);
  
  const getTotalCredits = () => {
    const services = [Service.AI_API, Service.CRAWL_API];
    return services.reduce((total, service) => {
      const subCredits = data.subscription?.serviceUsage[service]?.remainingCredits || 0;
      const pkgCredits = (data.creditPackages?.active || []).reduce(
        (sum, pkg) => sum + (pkg.serviceUsage[service]?.remainingCredits ?? 0), 0
      );
      return total + subCredits + pkgCredits;
    }, 0);
  };

  const getServiceStats = (service) => {
    const totalCredits = (data.subscription?.serviceUsage[service]?.remainingCredits || 0) +
      (data.creditPackages?.active || []).reduce(
        (sum, pkg) => sum + (pkg.serviceUsage[service]?.remainingCredits ?? 0), 0
      );
    
    const totalRequests = (data.subscription?.serviceUsage[service]?.totalRequests || 0) +
      (data.creditPackages?.active || []).reduce(
        (sum, pkg) => sum + (pkg.serviceUsage[service]?.totalRequests ?? 0), 0
      );
    
    return { totalCredits, totalRequests };
  };

  const renderSummaryView = () => (
    <Box padding="400">
      <Button
        id="total-credits-button"
        variant="plain"
        onClick={() => setActiveView('services')}
        ariaLabel="View service breakdown"
      >
        <Box
          padding="400"
          background="bg-surface"
          borderRadius="200"
          borderWidth="025"
          borderColor="border"
        >
          <BlockStack gap="200">
            <Text variant="headingLg" fontWeight="bold" alignment="center">
              {formatNumber(getTotalCredits())}
            </Text>
            <Text variant="bodyMd" alignment="center">Total Credits</Text>
          </BlockStack>
        </Box>
      </Button>
      <Box id="credits-button-tooltip">
        <Tooltip content="Click to view service breakdown">
          <Text variant="bodySm">Click for details</Text>
        </Tooltip>
      </Box>
    </Box>
  );

  const renderServicesView = () => (
    <Box padding="400">
      <BlockStack gap="400">
        <InlineStack gap="200" align="center">
          <Button
            icon={ArrowLeftIcon}
            variant="plain"
            onClick={() => setActiveView('summary')}
            ariaLabel="Back to summary"
          />
          <Text variant="headingMd">Service Credits</Text>
        </InlineStack>
        <UsageStatusDisplay
          data={data}
          loading={loading}
          handleRedirectToBilling={handleRedirectToBilling}
          handleRedirectToDashboard={handleRedirectToDashboard}
        />
      </BlockStack>
    </Box>
  );

  return (
    <div id="credit-usage-container">
      {activeView === 'summary' && renderSummaryView()}
      {activeView === 'services' && renderServicesView()}
    </div>
  );
});

interface PageContentProps {
  version: string;
  session: AppSession;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  isFullScreen: boolean;
  theme: Theme;
  toggleTheme: () => void;
  handleStartTour: () => void;
  onToggleFullScreen: () => void;
  isOpenSidebar: boolean;
  onToggleSidebar: () => void;
  onOpenSidebar: () => void;
  onCloseSidebar: () => void;
  handleShopifyAI: (shopName: string, userId: string, action: string, content: string) => Promise<any>;
  error: string;
  setError: React.Dispatch<React.SetStateAction<string>>;
  aiErrors: AIError[];
  setAiErrors: React.Dispatch<React.SetStateAction<AIError[]>>;
  outputContent: any;
  setOutputContent: (data: any) => void;
  setIsFullScreen: (value: boolean) => void;
}

export default function PageContent({
  version,
  session,
  theme,
  toggleTheme,
  handleStartTour,
  isFullScreen,
  onToggleFullScreen,
  setIsFullScreen,
  isOpenSidebar,
  onToggleSidebar,
  onOpenSidebar,
  onCloseSidebar,
  isLoading,
  setIsLoading,
  error,
  aiErrors,
  setError,
  setAiErrors,
  outputContent,
  setOutputContent,
  handleShopifyAI,
}: PageContentProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const { app } = useAppBridge();
  const redirect = app && Redirect.create(app);
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const localContentData = useAppSelector(selectContentData);
  const skipToContentRef = useRef<HTMLAnchorElement>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [mobileNavigationActive, setMobileNavigationActive] = useState(false);
  const [modalActive, setModalActive] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [processedInputData, setProcessedInputData] = useState(undefined);
  const [submittedData, setSubmittedData] = useState({});
  const [isDataGenerating, setIsDataGenerating] = useState(false);
  const [urls, setUrls] = useState<string[]>(['']); 
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [subtitleChecked, setSubtitleChecked] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<boolean>(false);
  const [subtitleQuantity, setSubtitleQuantity] = useState(1);
  const [subtitlePrompts, setSubtitlePrompts] = useState<string[]>([]);
  const [selectedLength, setSelectedLength] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CATEGORY>('BLOG');
  const [selectedTone, setSelectedTone] = useState(TONE_OPTIONS[0].id.toUpperCase());
  const [isDataProcessing, setIsDataProcessing] = useState(false);
  const [isContentGenerating, setIsContentGenerating] = useState(false);
  const [dataProgress, setDataProgress] = useState(0);
  const [generateProgress, setGenerateProgress] = useState(0);
  const [toastMessage, setToastMessage] = useState("");
  const [toastActive, setToastActive] = useState(false);
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [showProcessingStatus, setShowProcessingStatus] = useState(false);
  const [showConversionStatus, setShowConversionStatus] = useState(false);
  const [blogs, setBlogs] = useState([]);
  const [isImportImageAvailable, setIsImportImageAvailable] = useState<boolean>(false);
  const [selectedImage, setSelectedImage] = useState<'yes' | 'no' | 'unsplash'>('no');
  const [selectedBlog, setSelectedBlog] = useState<string | null>(null);
  const [isBlogLoading, setIsBlogLoading] = useState<boolean>(false);
  const [loadingBlogProgress, setLoadingBlogProgress] = useState(0);
  const [blogLoadingError, setBlogLoadingError] = useState<string | null>(null);
  const [paginationLimit, setPaginationLimit] = useState(1);
  const [currentLimit, setCurrentLimit] = useState(8);
  const [totalBlogs, setTotalBlogs] = useState<number>(0);
  const [loadingMoreBlogs, setLoadingMoreBlogs] = useState(false);
  const [usageData, setUsageData] = useState(null);
  const [isUsageStateLoading, setIsUsageStateLoading] = useState(false);
  const [usageStateError, setUsageStateError] = useState<string | null>("");
  const [isUsageUpdated, setIsUsageUpdated] = useState(false);
  const [isPopoverOpened, setIsPopoverOpened] = useState(false);
  const [showRedirectModal, setShowRedirectModal] = useState(false);
  const [isSetupLoading, setIsSetupLoading] = useState<boolean>(false);

  const onTogglePopover = useCallback(() => setIsPopoverOpened((active) => !active), []);

  const backgroundColor = theme === 'light' ? 'bg-[var(--p-color-bg-surface)] border-gray-100/30' : 'bg-[var(--p-color-bg-inverse)] border-gray-100/30';

  const scrollToView = useCallback(() => {
    if (contentRef.current) {
      contentRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [contentRef]);

  const { shopName, shopifyOfflineAccessToken: accessToken, shopifyUserId: userId, shopifyUserEmail: email } = session;
  const { 
    loading: actionLoading, 
    progress, 
    status, 
    error: actionError, 
    onManualSubmit,
    onCancelAction, 
  } = useShopifySubmit({ shopName, accessToken });
  const categoryMap = {
    BLOG: ContentCategory.BLOG,
    PRODUCT: ContentCategory.PRODUCT,
  };
  const fetchUsageData = useCallback(async () => {
    if (!shopName) return;
    try {
      setIsUsageStateLoading(true);
      setUsageStateError(null);
      const data = await getUsageStateAction(shopName, email);
      setUsageData(data);
    } catch (err) {
      setUsageStateError(err.message || 'Failed to fetch usage data');
    } finally {
      setIsUsageStateLoading(false);
    }
  }, [email, shopName]);

  const initViewUsage = useCallback(() => {
    if (!usageData && !isUsageStateLoading) {
      fetchUsageData();
    }
  }, [usageData, isUsageStateLoading, fetchUsageData]);

  const fetchBlogContents = useCallback(async (pagination: number, limit: number) => {
    if (!shopName || !accessToken) return;
    try {
      setIsBlogLoading(true);
      setBlogLoadingError(null);
      setLoadingBlogProgress(25);
      const result = await getBlogContents(shopName, accessToken, pagination, limit);
      setLoadingBlogProgress(75);
      if (result?.success && result?.data) {
        const transformedBlogs = result?.data?.blogs?.map(blog => ({
          blogName: blog.title,
          blogId: extractId(blog.id).toString(),
        }));
        setBlogs(prevBlogs => {
          const existingIds = new Set(prevBlogs.map(blog => blog.value));
          const newUniqueBlogs = transformedBlogs.filter(blog => !existingIds.has(blog.value));
          return [...prevBlogs, ...newUniqueBlogs];
        });
        if (result?.data?.totalBlogs !== totalBlogs) {
          setTotalBlogs(result?.data?.totalBlogs);
        }
        setLoadingBlogProgress(100);
      }
    } catch (err) {
      setBlogLoadingError(err instanceof Error ? err.message : 'Failed to fetch blogs');
    } finally {
      setIsBlogLoading(false);
    }
  }, [shopName, accessToken]);

  const loadMoreBlogs = useCallback(async () => {
    if (loadingMoreBlogs) return;
    const newPaginationLimit = paginationLimit + 1;
    try {
      setLoadingMoreBlogs(true);
      setLoadingBlogProgress(25);
      const result = await getBlogContents(shopName, accessToken, newPaginationLimit, currentLimit);
      setLoadingBlogProgress(75);
      if (result?.success && result?.data) {
        const transformedBlogs = result?.data?.blogs?.map(blog => ({
          blogName: blog.title,
          blogId: extractId(blog.id).toString(),
        }));
        setBlogs(prevBlogs => {
          const existingIds = new Set(prevBlogs.map(blog => blog.value));
          const newUniqueBlogs = transformedBlogs.filter(blog => !existingIds.has(blog.value));
          return [...prevBlogs, ...newUniqueBlogs];
        });
        if (result?.data?.totalBlogs !== totalBlogs) {
          setTotalBlogs(result?.data?.totalBlogs);
        }
        setTotalBlogs(result?.data?.totalBlogs);
        setLoadingBlogProgress(100);
      }
      setPaginationLimit(newPaginationLimit);
    } catch (error) {
      console.error('Failed to load more content', error);
    } finally {
      setLoadingMoreBlogs(false);
    }
  }, [paginationLimit, currentLimit, accessToken, shopName, loadingMoreBlogs]);

  const validateForm = () => {
    try {
      textFieldValidationSchema.parse({
        prompt,
        urls,
        subtitlePrompts: subtitleChecked ? subtitlePrompts : undefined
      });
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors = {};
        error.errors.forEach(err => {
          const path = err.path.join('.');
          newErrors[path] = err.message;
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  useEffect(() => {
    const subscriptions = [
      eventEmitter.subscribe('aiUsageUpdated', () => setIsUsageUpdated(true)),
      eventEmitter.subscribe('crawlUsageUpdated', () => setIsUsageUpdated(true))
    ];
    return () => subscriptions.forEach(unsubscribe => unsubscribe());
  }, []);

  useEffect(() => {
    let mounted = true;
    const initializeBlogContents = async () => {
      if (selectedCategory === ContentCategory.ARTICLE) {
        try {
          await fetchBlogContents(1, currentLimit);
        } catch (error) {
          console.error('Failed to initialize blog contents:', error);
        }
      }
    };
    initializeBlogContents();
    return () => {
      mounted = false;
    };
  }, [selectedCategory, currentLimit, fetchBlogContents]);

  useEffect(() => {
    if (urls.filter(url => url !== '').length > 0) 
      setIsImportImageAvailable(true);
  }, [urls]);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      await initViewUsage();
    };
    init();
    return () => {
      isMounted = false;
    };
  }, [initViewUsage]);

  const memoizedBlogs = useMemo(() => blogs, [blogs]);

  useEffect(() => {
    if (!isUsageUpdated) return;
    const timer = setTimeout(() => {
      fetchUsageData();
      setIsUsageUpdated(false);
    }, USAGE_UPDATE_DELAY);
    return () => clearTimeout(timer);
  }, [isUsageUpdated, fetchUsageData]);

  useEffect(() => {
    if (!isDataProcessing && processedInputData) {
      const timer = setTimeout(() => {
        setShowProcessingStatus(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isDataProcessing, processedInputData]);

  useEffect(() => {
    if (!isContentGenerating && localContentData) {
      const timer = setTimeout(() => {
        setShowConversionStatus(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isContentGenerating, localContentData]);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToastMessage(message);
    setToastType(type);
    setToastActive(true);
  }, []);

  const handleError = useCallback((error: Error | string) => {
    const errorMessage = error instanceof Error ? error.message : error;
    setError(errorMessage);
    showToast(errorMessage, "error");
    setTimeout(() => {
      setError("");
    }, 4000);
  }, [setError, showToast]);

  const { processData } = useDataProcessing({ 
    onError: handleError, 
    app 
  });

  const [errors, setErrors] = useState<{
    prompt?: string;
    urls?: string[];
    subtitlePrompts?: string[];
  }>({});

  const handleToneChange = useCallback(
    (selectedTabIndex: number) => { 
      setSelectedTone(TONE_OPTIONS[selectedTabIndex].id.toUpperCase());
    },
    [],
  );

  const handleSelectImage = useCallback((value: string | string[]) => {
    if (Array.isArray(value)) {
      setSelectedImage(value[0]);
    } else {
      setSelectedImage(value);
    }
  }, []);

  const handleSelectArticleChange = useCallback((value: string | string[]) => {
    if (Array.isArray(value)) {
      setSelectedArticle(value[0]);
    } else {
      setSelectedArticle(value);
    }
  }, []);

  const handleSubtitleCheckedChange = useCallback((checked: boolean) => {
    setSubtitleChecked(checked);
    if (!checked) {
      setSubtitleQuantity(1);
      setSubtitlePrompts([]);
    }
  }, []);

  const handleSubtitleQuantityChange = useCallback((quality: number) => {
    setSubtitleQuantity(quality);
    setSubtitlePrompts(prev => {
      const newPrompts = [...prev];
      if (quality > prev.length) {
        return [...prev, ...Array(quality - prev.length).fill('')];
      } else {
        return prev.slice(0, quality);
      }
    });
  }, []);

  const handleSubtitlePromptChange = useCallback((index: number, value: string) => {
    const error = validateField('subtitlePrompts', value, index);
    setErrors(prev => ({
      ...prev,
      subtitlePrompts: {
        ...prev.subtitlePrompts,
        [index]: error
      }
    }));
    setSubtitlePrompts(prev => {
      const newPrompts = [...prev];
      newPrompts[index] = value;
      return newPrompts;
    });
  }, []);

  const handlePromptChange = useCallback((value: string) => {
    setPrompt(value);
    setErrors(prev => ({ ...prev, prompt: error }));
  }, []);

  const handleSelectBlog = useCallback((blogId: string | null) => {
    if (!blogId) 
      setSelectedBlog(null);
    else 
    setSelectedBlog(blogId);
  }, []);

  const handleLengthChange = useCallback((value: string) => {
    setSelectedLength(value);
  }, []);

  const handleUrlChange = useCallback((index: number, value: string) => {
    const error = validateField('urls', value, index);
    setErrors(prev => ({
      ...prev,
      urls: {
        ...prev.urls,
        [index]: error
      }
    }));
    setUrls(prevUrls => {
      const newUrls = [...prevUrls];
      newUrls[index] = value;
      return newUrls;
    });
  }, []);

  const handleAddUrl = useCallback(() => {
    if (urls.length < 4) {
      setUrls(prevUrls => [...prevUrls, '']);
    }
  }, [urls]);
  
  const handleTemplateChange = useCallback(
    (template: Template) => {
      setSelectedTemplate(prev => (prev?.id === template?.id ? null : template));
    },
    []
  );

  const handleResetForm = useCallback(() => {
    setPrompt('');
    setUrls(['']);
    setSubtitleChecked(false);
    setSubtitleQuantity(0);
    setSubtitlePrompts([]);
    setSelectedTemplate(null);
    setProcessedInputData(undefined);
    setSelectedArticle(false);
    setOutputContent(null);
    setSelectedLength('');
    setSelectedCategory(ContentCategory.BLOG);
    setSelectedTone(TONE_OPTIONS[0].id.toUpperCase());
    setIsDataProcessing(false);
    setIsContentGenerating(false);
    setToastActive(false);
    setToastMessage('');
    setShowProcessingStatus(false);
    setShowConversionStatus(false);
    setSelectedImage('no');
    setSelectedBlog(null);
    dispatch(setContentData(null)); 
  }, []);

  const handleGenerateContent = useCallback(async (data: any) => {
    setIsContentGenerating(true);
    setGenerateProgress(0);
    setShowConversionStatus(true);
    dispatch(setContentData(null));
    setIsFullScreen(false);
    try {
      setGenerateProgress(50);
      const result = await handleShopifyAI(
        shopName,
        userId,
        data?.category,
        data
      );
      if (result?.success && result?.data) {
        const processedData = { ...result?.data, images: data?.context?.medias?.images.slice(0, 10) || []};
        setGenerateProgress(100);
        const contentId = uuidv4();
        dispatch(setContentData({ contentId: contentId, input: { category: data?.category, ...data }, output: processedData }));
        setOutputContent({ contentId: contentId, input: { category: data?.category, ...data }, output: processedData });
        showToast("Content Generateed successfully!", "success");
        scrollToView();
        return processedData;
      }
    } catch (error) {
      handleError(error);
      throw error;
    } finally {
      setIsContentGenerating(false);
    }
  }, [shopName, userId, handleError, showToast]);

  const handleProcessData = useCallback(async (data: any) => {
      setOutputContent({});
      setIsDataProcessing(false);
      setShowProcessingStatus(false);
    if (errors?.urls?.length > 0) {
      errors.urls.forEach(url => {
        showToast(`Url ${url} is invalid. Please enter a valid URL`, "error");
      });
      return;
    }
    try {
      if (data?.urls?.length > 0) {
        setIsDataProcessing(true);
        setDataProgress(30);
        setShowProcessingStatus(true);
        const processedData = await processData(shopName, userId, data.urls);
        let slicedImages = processedData?.medias?.images?.slice(0, 10);
        if (data?.sections?.quantity > 0) {
          const sliceCount = 3 * data?.sections?.quantity;
          slicedImages = processedData?.medias?.images?.slice(0, sliceCount);
        } else {
          slicedImages = processedData?.medias?.images?.slice(0, 3);  
        }
        setDataProgress(100);
        setProcessedInputData({
          ...processedData,
          ...(selectedImage === 'yes' && isImportImageAvailable ? { medias: { images: slicedImages } } : {})
        });
        setIsDataProcessing(false);
        showToast("Content successfully retrieved!", "success");
        return await handleGenerateContent({ context: processedData, ...data });
      } else {
        return await handleGenerateContent(data);
      }
    } catch (error) {
      handleError(error);
      setIsDataProcessing(false);
    }
  }, [errors.urls, shopName, userId, urls, isImportImageAvailable, processData, handleGenerateContent, handleError, showToast]);


  const getIncludedFields = useCallback((
    selectedCategory: ContentCategory,
    selectedArticle: boolean | null = null,
    selectedBlog: boolean | null = null
  ) => {
    let includedFields: string[] | object[] = [];
    switch (selectedCategory) {
      case ContentCategory.BLOG:
        includedFields = Object.keys(BASE_BLOG_OUTPUT_FORMAT);
        break;
      case ContentCategory.ARTICLE:
        includedFields = Object.keys(BASE_ARTICLE_OUTPUT_FORMAT);
        break;
      case ContentCategory.PRODUCT:
        includedFields = Object.keys(BASE_PRODUCT_OUTPUT_FORMAT);
        break;
    }
    if (selectedCategory === ContentCategory.BLOG && selectedArticle) {
      const articleFields = Object.keys(BASE_ARTICLE_OUTPUT_FORMAT);
      includedFields = [
        ...includedFields.filter(field => field !== 'article'),
        { article: articleFields }
      ];
    }
    if (selectedCategory === ContentCategory.ARTICLE && selectedBlog) {
      const blogFields = Object.keys(BASE_BLOG_OUTPUT_FORMAT);
      includedFields = [
        ...includedFields.filter(field => field !== 'blog'),
        { blog: blogFields }
      ];
    }
    return includedFields;
  }, []);

  const handleFormSubmit = useCallback(async(formType: FormType) => {
    const sections = subtitleChecked ? {
      quantity: subtitleQuantity,
      titles: subtitlePrompts
    } : null;
    const includedFields = getIncludedFields(selectedCategory, selectedArticle, selectedBlog);
    const isNewBlog = !selectedBlog;
    let templateData;
    if (
      selectedTemplate && 
      typeof selectedTemplate === 'object' && 
      Object.entries(selectedTemplate).length > 0
    ) {
      const { 
        id, 
        icon, 
        category, 
        keywords, 
        topic, 
        layoutType, 
        isPremium, 
        blog_commentable, 
        blog_feedburner, 
        blog_feedburner_location,
        blog_handle, 
        blog_metafield,
        article_author,
        article_image,
        article_metafield,
        created_at,
        image,
        images,
        options,
        published_at,
        published_scope,
        metafields_global_title_tag,
        metafields_global_description_tag,
        updated_at,
        status,
        variants,
        ...rest 
      } = selectedTemplate;
      templateData = rest;
    }
    const inputData = {
      description: prompt,
      urls: urls.filter(url => url !== ''),
      sections,
      tone: selectedTone,
      category: selectedCategory,
      length: selectedLength,
      includedFields,
      imageIncluded: selectedImage,
      ...(selectedCategory === ContentCategory.BLOG && { articleIncluded: selectedArticle }),
      ...(selectedCategory === ContentCategory.ARTICLE && { isNewBlog , blogId: selectedBlog }),
      ...(selectedTemplate && { template: templateData })
    };
    try {
      if (validateForm())
      setSubmittedData(inputData);  
      const outputData = await handleProcessData(inputData);  
      setToastActive(true);
    } catch (error) {
      console.error('Form submission error:', error)
    } finally {
      setIsDataGenerating(false);
      //handleResetForm();
    }
  }, [
    shopName,
    prompt, 
    urls, 
    subtitleChecked,
    subtitleQuantity,
    subtitlePrompts,
    selectedLength,
    selectedTemplate,
    selectedCategory,
    selectedImage,
    selectedArticle,
    setToastActive,
    shopName,
  ]);

  const setUpShopStorage = useCallback(async () => {
    if (!shopName) return;
    setIsSetupLoading(true);
    try {
      const { data: existingFiles, error: listError } = await supabase.storage
        .from('optiwrite-images')
        .list(`${shopName}`);
      if (listError) {
        console.error("Error checking folder:", listError);
        throw listError;
      }
      if (existingFiles && existingFiles.length > 0) {
        const filesToRemove = existingFiles.map((file) => `${shopName}/${file.name}`);
        const { error: removeError } = await supabase.storage
          .from('optiwrite-images')
          .remove(filesToRemove);
        if (removeError) {
          console.error("Error clearing folder:", removeError);
          throw removeError;
        }
      }
    } catch (error) {
      console.error("Error setting up storage:", error);
      throw error;
    } finally {
      setIsSetupLoading(false);
    }
  }, [shopName]);

  const onOpenEditMode = useCallback(async(contentId) => {
    const shop = searchParams?.get("shop");
    const host = searchParams?.get("host");
    if (!shop || !host || !redirect) {
      console.error('Missing required navigation parameters');
      return;
    }
    const queryParams = new URLSearchParams({
      shop,
      host
    }).toString();
    await setUpShopStorage();
    const returnUrl = `/content/edit/${contentId}?${queryParams}`;
    redirect.dispatch(Redirect.Action.APP, {
      path: returnUrl
    });
  }, [searchParams, redirect, setUpShopStorage, setShowRedirectModal]);

  const handleOpenEditor = useCallback(async () => {
    setShowRedirectModal(true);
  }, []);

  const onNavigateToSupport = useCallback(() => {
    const shop = searchParams?.get("shop");
    const host = searchParams?.get("host");
    if (!shop || !host || !redirect) {
      console.error('Missing required navigation parameters');
      return;
    }
    const queryParams = new URLSearchParams({
      shop,
      host
    }).toString();
    const returnUrl = `/support?${queryParams}`; 
    redirect.dispatch(Redirect.Action.APP, {
      path: returnUrl
    });
  }, [searchParams, redirect]);

  const onNavigateToBilling = useCallback(() => {
    const shop = searchParams?.get("shop");
    const host = searchParams?.get("host");
    if (!shop || !host || !redirect) {
      console.error('Missing required navigation parameters');
      return;
    }
    const queryParams = new URLSearchParams({
      shop,
      host
    }).toString();
    const returnUrl = `/billing?${queryParams}`; 
    redirect.dispatch(Redirect.Action.APP, {
      path: returnUrl
    });
  }, [searchParams, redirect]);

  const onNavigateToDashboard = useCallback(() => {
    const shop = searchParams?.get("shop");
    const host = searchParams?.get("host");
    if (!shop || !host || !redirect) {
      console.error('Missing required navigation parameters');
      return;
    }
    const queryParams = new URLSearchParams({
      shop,
      host
    }).toString();
    const returnUrl = `/dashboard?${queryParams}`; 
    redirect.dispatch(Redirect.Action.APP, {
      path: returnUrl
    });
  }, [searchParams, redirect]);

  const commonProps: BaseFormProps = {
    prompt,
    urls,
    errors,
    onPromptChange: handlePromptChange,
    onUrlChange: handleUrlChange,
    onFormSubmit: handleFormSubmit,
    onAddUrl: handleAddUrl,
    onResetForm: handleResetForm,
    subtitleChecked,
    onSubtitleCheckedChange: handleSubtitleCheckedChange,
    subtitleQuantity,
    onSubtitleQuantityChange: handleSubtitleQuantityChange,
    subtitlePrompts,
    onSubtitlePromptChange: handleSubtitlePromptChange,
    selectedTemplate: selectedTemplate,
    onSelectTemplate: handleTemplateChange,
    selectedLength: selectedLength,
    onSelectLength: handleLengthChange,
    toneOptions: TONE_OPTIONS,
    selectedTone: selectedTone,
    onSelectTone: handleToneChange,
    selectedCategory: selectedCategory,
    onSelectCategory: setSelectedCategory,
    selectedBlog,
    blogs: memoizedBlogs,
    isBlogLoading,
    blogLoadingError,
    onLoadMoreBlogs: loadMoreBlogs,
    loadingMoreBlogs,
    loadingBlogProgress,
    totalBlogs,
    onSelectBlog: handleSelectBlog,
    selectedImage,
    onSelectImage: handleSelectImage,
    selectedArticle,
    onSelectArticle: handleSelectArticleChange,
    isImportImageAvailable,
    generating: isContentGenerating,
    processing: isDataProcessing,
    showProcessingStatus,
    dataProgress,
    processedInputData,
    showConversionStatus,
    generateProgress,
    localContentData,
    error,
    setError,
    contentRef
  };

  const onCreateNewForm = () => {
    handleResetForm();
  };

  const memorizedCreditBadge = useMemo(() => {
    if (isUsageStateLoading) {
      return (
        <Box padding="400">
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Spinner size="large" />
          </div>
        </Box>
      );
    }
    if (usageStateError) {
      return (
        <Banner tone="critical">
          <p>{usageStateError}</p>
        </Banner>
      );
    }
    if (usageData) {
      return (
        <CreditUsageDisplay
          loading={isUsageStateLoading}
          data={usageData}
          handleRedirectToBilling={onNavigateToBilling}
          handleRedirectToDashboard={onNavigateToDashboard}
        />
      );
    }
    return null;
  }, [
    isUsageStateLoading, 
    usageStateError, 
    usageData, 
  ]);

  const topBarMarkup = (
    <Box className={`${backgroundColor} p-4 mt-6 rounded-md shadow-lg px-10 w-full border`}>
      <InlineStack align="space-between" blockAlign="center" gap="400">
        <InlineStack align="center" gap="400">
          <Text variant="headingLg" as="h1">
            Optiwrite
          </Text>

          <InlineStack align="center" gap="400">
            <Tooltip content="Toggle navigation">
              <Button
                variant="tertiary"
                onClick={() => onToggleSidebar()}
              >
                <AppsIcon className="w-6 h-6 fill-gray-500" />
              </Button>
            </Tooltip>
            <Tooltip content="Create new form">
              <Button
                variant="primary"
                tone="success"
                icon={ComposeIcon}
                onClick={() => onCreateNewForm()}
              >
                Create new
              </Button>
            </Tooltip>
          </InlineStack>
        </InlineStack>
        {memorizedCreditBadge}
      </InlineStack>
    </Box>
  );

  const skipToContentTarget = (
    <a id="SkipToContentTarget" ref={skipToContentRef} tabIndex={-1} />
  );
   const pageMarkup = (
      <Page
        fullWidth
        primaryAction={
          <ThemeToggleButton id="theme-toogle-btn" onClick={toggleTheme} aria-label="Toggle theme">
            <IconWrapper>
              {theme === 'light' ? (
                <>
                  <Icon source={MoonIcon} />
                  Dark mode
                </>
              ) : (
                <>
                  <Icon source={SunIcon} />
                  Light mode
                </>
              )}
            </IconWrapper>
          </ThemeToggleButton>
        }
        secondaryActions={[
          {
            id: 'notification-bell',
            content: <NotificationBell shopName={shopName} />,
            onAction: () => {}, 
          },
          {
            id: 'purchase-button',
            content: 'Upgrade',
            icon: CreditCardIcon,
            onAction: () => onNavigateToBilling()
          },
          {
            id: 'language-button',
            content: 
            <LanguageSelector 
              IconComponent={LanguageIcon}
              fullWidth={true}
            />,
            onAction: () => {}, 
          },
        ]}
      >
      <Layout>
        {skipToContentTarget}
        {topBarMarkup}
        <DynamicLayout
          {...commonProps}
          theme={theme}
          version={version}
          onToggleFullScreen={onToggleFullScreen} 
          outputContent={outputContent}
          isFullScreen={isFullScreen}
          onOpenEditMode={handleOpenEditor}
          onAction={onManualSubmit}
          onCancelAction={onCancelAction}
          actionLoading={actionLoading}
        />
      </Layout>
    </Page>
  );
  
  const toastMarkup = toastActive ? (
    <Toast
      content={toastMessage}
      error={toastType === "error"}
      onDismiss={() => setToastActive(false)}
      duration={4000}
    />
  ) : null;

  return (
    <AnimatePresence>
      <LayoutContainer
        key="layout-container"
        initial={false}
        animate={isOpenSidebar ? 'expanded' : 'collapsed'}
        variants={layoutVariants}
        transition={{ type: 'tween', duration: 0.3 }}
      >
        {isOpenSidebar && (
          <StyledOverlay
            key="overlay"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={overlayVariants}
            transition={{ duration: 0.2 }}
          />
        )}
        {pageMarkup}
        {toastMarkup}
        {showRedirectModal && (
          <RedirectModal
            content={outputContent} 
            isOpen={showRedirectModal}
            onClose={() => setShowRedirectModal(false)}
            onProceed={onOpenEditMode}
            loading={isSetupLoading}
          />
        )}
      </LayoutContainer>
    </AnimatePresence>
  );
}


