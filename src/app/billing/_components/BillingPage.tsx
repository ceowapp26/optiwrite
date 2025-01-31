"use client"
import React, { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import { 
  Page, 
  Layout,
  Button, 
  Grid, 
  Banner, 
  Toast, 
  Frame,
  Modal,
  Spinner,
  InlineStack,
  Text,
  ProgressBar,
  Card,
  BlockStack,
  Badge,
  Icon,
  Box,
  SkeletonPage,
  Tabs,
  Tooltip,
  Select,
} from '@shopify/polaris';
import { useTheme } from 'next-themes';
import { Zap } from 'lucide-react';
import { StatusActiveIcon, AlertBubbleIcon, ArrowLeftIcon, ViewIcon, ClockIcon, StarIcon, CheckCircleIcon } from '@shopify/polaris-icons';
import { useAppBridge } from '@/providers/AppBridgeProvider';
import { Redirect } from '@shopify/app-bridge/actions';
import { SessionContextValue } from '@/types/auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { SubscriptionService, CreditService } from '@/utils/api';
import { getSessionToken } from '@shopify/app-bridge-utils';
import CreditPaymentStep from '@/components/forms/payment/CreditPaymentStep';
import { defaultCreditPaymentInfo } from '@/constants/billing';
import { useGeneralContext, useGeneralActions } from '@/context/GeneralContextProvider';
import { getSubscriptionPlans, getSubscriptionDetails, getPurchaseDetails, createStandardCreditPackages, getAllStandardPackages, getEarlyAdapterPromotion } from '@/actions/billing';
import { type BillingEvent, type SubscriptionDetails, type CreditDetails, type Package } from '@/types/billing';
import HighLightBar from '@/components/forms/payment/HighlightBar';
import { withShopifyPayment } from '@/components/forms/payment/FormProvider';
import BillingLoading from './BillingLoading';
import CreditCard from './CreditCard';
import CreditDetails from './CreditDetails';
import BillingCard from './BillingCard';
import BillingDetails from './BillingDetails';
import { DateTime } from 'luxon';
import { subscriptionPlans, creditPackages, cancellationOptions, cancelReasons } from '@/constants/billing';
import { CreditPaymentInfo } from '@/types/billing';
import { Plan, DiscountType, SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import { motion } from 'framer-motion';

const EarlyAdopterBanner = ({ discount }) => {
  if (!discount || discount?.type !== DiscountType.EARLY_ADAPTER) {
    return null;
  }
  return (
    <Box className="p-6 mb-10 shadow-md rounded-md w-full bg-gradient-to-r from-violet-600 to-blue-600 text-white overflow-hidden">
      <BlockStack gap="200">
        <BlockStack gap="200" inlineAlign="center">
          <Box className="hidden md:block pb-3">
            <InlineStack gap="200" align="center" blockAlign="center" wrap={false}>
              <StarIcon className="w-12 h-12 fill-yellow-400 animate-pulse" />
              <Text variant="heading2xl" as="h1">
                Early Adopter Special
              </Text>
            </InlineStack>
          </Box>

          <Box className="ml-12">
            <BlockStack gap="400">
              <Text variant="headingXl" as="h1">
                50% OFF for 12 Months
              </Text>
              <InlineStack gap="300" align="center" blockAlign="center" wrap>
                <Badge tone="success" size="large">
                  <InlineStack gap="200" align="center">
                    <Zap className="w-5 h-5 fill-white" />
                    <Text>First 200 Clients Only</Text>
                  </InlineStack>
                </Badge>
                <InlineStack gap="100" align="center">
                  <ClockIcon className="w-5 h-5 fill-yellow-400" />
                  <Text variant="bodySm">
                    Limited Time Offer
                  </Text>
                </InlineStack>
              </InlineStack>
            </BlockStack>
          </Box>

          <Box className="hidden lg:block ml-auto">
            <InlineStack gap="200" align="center" blockAlign="center">
              <CheckCircleIcon className="w-7 h-7 fill-green-400" />
              <Text variant="bodyXl">
                Save up to $1,200 yearly
              </Text>
            </InlineStack>
          </Box>
        </BlockStack>
        <InlineStack gap="200" wrap>
          <Text variant="bodyMd" tone="inherit">
            ⚡ Premium Features
          </Text>
          <Text variant="bodyMd" tone="inherit">
            ⚡ Priority Support
          </Text>
          <Text variant="bodyMd" tone="inherit">
            ⚡ Extended API Limits
          </Text>
        </InlineStack>
      </BlockStack>
    </Box>
  );
};

const mainTabs = [
  {
    id: 'subscription',
    panelID: 'subscription',
    content: 'Subscription Plans',
    accessibilityLabel: 'Subscription Plans',
  },
  {
    id: 'credit',
    panelID: 'credit',
    content: 'Credit Packages',
    accessibilityLabel: 'Credit Packages',
  },
];

const creditTabs = [
  {
    id: 'package',
    panelID: 'package',
    content: 'Credit Packages',
    accessibilityLabel: 'Credit Packages',
  },
  {
    id: 'custom',
    panelID: 'custom',
    content: 'Custom Amount',
    accessibilityLabel: 'Custom Amount',
  },
];


interface BillingPageProps {
  session: SessionContextValue;
}

interface BannerHandles {
  focus: () => void;
}

export default function BillingPage({ session }: BillingPageProps) {
  const { state } = useGeneralContext();
  const { shopifyUserEmail: email, shopName, shopifyOfflineAccessToken: accessToken } = session;
  const { setTheme: setNextTheme } = useTheme();
  const { currentStep, creditPaymentInfo, paymentType } = state;
  const { setPaymentType, setCurrentStep, setCreditPaymentInfo } = useGeneralActions();
  const [mainTabSelected, setMainTabSelected] = useState<'subscription' | 'credit'>('subscription');
  const [creditTabSelected, setCreditTabSelected] = useState<'package' | 'custom'>('package');
  const [loading, setLoading] = useState(false);
  const [planLoading, setPlanLoading] = useState(false);
  const [packageLoading, setPackageLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [promotion, setPromotion] = useState(null);
  const [cancellationType, setCancellationType] = useState('end-of-cycle');
  const [showCurrentPlanDetails, setShowCurrentPlanDetails] = useState<boolean>(false);
  const [showPackagePurchaseDetails, setShowPackagePurchaseDetails] = useState<boolean>(false);
  const [currentSubscription, setCurrentSubscription] = useState<string | null>(null);
  const [toastProps, setToastProps] = useState({ active: false, content: '', error: false });
  const [subscriptionDetails, setSubscriptionDetails] = useState<SubscriptionDetails>();
  const [purchaseDetails, setPurchaseDetails] = useState<PurchaseDetails>();
  const [loadingPackageItem, setLoadingPackageItem] = useState<string | null>(null);
  const [loadingPlanItem, setLoadingPlanItem] = useState<string | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [showRedirectModal, setShowRedirectModal] = useState(false);
  const [confirmCancelModal, setConfirmCancelModal] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState('');
  const [cancelReason, setCancelReason] = useState(cancelReasons[5].value);
  const banner = useRef<BannerHandles>(null);
  const { app } = useAppBridge();
  const redirect = app && Redirect.create(app);
  const searchParams = useSearchParams();
  const host = searchParams?.get('host') || '';

  const isProcessing = useMemo(() => {
    return planLoading || packageLoading;
  }, [planLoading, packageLoading]);

  const handleMainTabChange = useCallback(
    (selectedTabIndex: number) => { 
      setMainTabSelected(mainTabs[selectedTabIndex].id);
      setPaymentType(mainTabs[selectedTabIndex].id.toUpperCase());
    },
    [],
  );

  const handleCreditTabChange = useCallback(
    (selectedTabIndex: number) => setCreditTabSelected(creditTabs[selectedTabIndex].id),
    [],
  );

  useEffect(() => banner.current?.focus(), []);    

  const showToast = (content: string, error = false) => {
    setToastProps({ active: true, content, error });
  };

  const handleToastDismiss = useCallback(() => {
    setToastProps(prev => ({ ...prev, active: false }));
  }, []);

  const mergePlansWithConfig = (dbPlans: Plan[], configPlans: typeof subscriptionPlans) => {
    return configPlans.map(configPlan => {
      const dbPlan = dbPlans.find(plan => plan.name === configPlan.name);
      if (!dbPlan) {
        return configPlan;
      }
      return {
        ...configPlan,
        trialDays: dbPlan.trialDays || undefined,
        discounts: dbPlan.discounts || configPlan.discounts,
        promotions: dbPlan.promotions ||  configPlan.promotions,
        interval: dbPlan.interval || 'EVERY_30_DAYS',
        price: {
          monthly: dbPlan.totalPrice,
          currency: dbPlan.currency || configPlan.currency,
        },
        planLimits: dbPlan.feature || {},
        description: dbPlan.description || configPlan.description,
        metadata: {
          ...configPlan.metadata,
          ...(dbPlan.metadata as object || {})
        }
      };
    });
  };

  const mergePackagesWithConfig = (dbPackages: Package[], configPackages: typeof creditPackages) => {
    return configPackages.map(configPackage => {
      const dbPackage = dbPackages.find(pkg => pkg.name === configPackage.name);
      if (!dbPackage) {
        return configPackage;
      }
      return {
        ...configPackage,
        id: dbPackage?.id,
        name: dbPackage?.name || configPackage?.name,
        discounts: dbPackage.discounts || configPackage.discounts,
        promotions: dbPackage.promotions || configPackage.promotions,
        price: {
          ...configPackage.price,
          totalPrice: dbPackage.totalPrice,
          pricePerCredit: dbPackage.pricePerCredit,
          currency: dbPackage.currency || configPackage.price.currency,
        },
        creditAmount: dbPackage.creditAmount,
        packageLimits: dbPackage.feature || {},
        description: dbPackage.description || configPackage.description,
        metadata: {
          ...configPackage.metadata,
          ...(dbPackage.metadata as object || {})
        }
      };
    });
  };

  const fetchPlans = useCallback(async () => {
    try {
      setPlanLoading(true);
      const dbPlans = await getSubscriptionPlans();
      const mergedPlans = mergePlansWithConfig(dbPlans, subscriptionPlans);
      setPlans(mergedPlans);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load subscription data');
      showToast('Failed to load subscription data', true);
    } finally {
      setPlanLoading(false); 
    }
  }, []);

  const fetchEarlyAdapterPromotion = useCallback(async () => {
    try {
      setLoading(true);
      const earlyAdapterPromotion = await getEarlyAdapterPromotion();
      setPromotion(earlyAdapterPromotion);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load promotion data');
      showToast('Failed to load promotion data', true);
    } finally {
      setLoading(false); 
    }
  }, []);

  const fetchPackages = useCallback(async () => {
    try {
      setPackageLoading(true);
      //await createStandardCreditPackages();
      const packages = await getAllStandardPackages();
      const mergedPackages = mergePackagesWithConfig(packages, creditPackages);
      setPackages(mergedPackages);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load package data');
      showToast('Failed to load package data', true);
    } finally {
      setPackageLoading(false);
    }
  }, []);

  const fetchSubscriptionDetails = useCallback(async () => {
    try {
      setDetailLoading(true);
      const data = await getSubscriptionDetails(shopName, email);
      setCurrentSubscription(data);
      setSubscriptionDetails(data);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load subscription data');
      showToast('Failed to load subscription data', true);
    } finally {
      setDetailLoading(false);
    }
  }, [searchParams, shopName, email]);

  const fetchPurchaseDetails = useCallback(async () => {
    try {
      setDetailLoading(true);
      const data = await getPurchaseDetails(shopName);
      setPurchaseDetails(data);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load subscription data');
      showToast('Failed to load subscription data', true);
    } finally {
      setDetailLoading(false);
    }
  }, [searchParams, shopName]);

  const handleNavigation = useCallback(() => {
    if (!shopName || !host || !redirect) {
      console.error('Missing required navigation parameters');
      return;
    }
    const queryParams = new URLSearchParams({
      shopName,
      host
    }).toString();
    const returnUrl = `/versions/light?${queryParams}`;
    redirect.dispatch(Redirect.Action.APP, {
      path: returnUrl
    });
  }, [searchParams, redirect, shopName, host]);

  const handleBilling = useCallback(
    async (
      planName: string, 
      canceled = false,
      cancelReason?: string, 
      subscriptionId: string | null = null, 
      prorate: boolean = false, 
      status?: SubscriptionStatus
    ) => {
    try {
      setLoadingPlanItem(planName);
      setLoading(true);
      setError(null);
      const sessionToken = await getSessionToken(app);
      const event = await SubscriptionService.checkSubscriptionStatus(
        planName,
        shopName,
        sessionToken,
        canceled,
        email
      );
      const serviceState = SubscriptionService.getState();
      if (serviceState.loading) {
        showToast('Processing your request...', false);
      }
      const subscriptionData = await SubscriptionService.handleBillingEvent(
        planName,
        shopName,
        host,
        sessionToken,
        event,
        canceled,
        cancelReason,
        email,
        subscriptionId,
        prorate,
        status
      );
      if (subscriptionData.confirmationUrl) {
        setRedirectUrl(subscriptionData.confirmationUrl);
        setShowRedirectModal(true);
        setTimeout(() => {
          redirect?.dispatch(Redirect.Action.REMOTE, subscriptionData.confirmationUrl);
        }, 3000);
      } else if (canceled) {
        await fetchPlans();
        showToast('Subscription canceled successfully');
      }
    } catch (error) {
      console.error('Subscription error:', error);
      const serviceState = SubscriptionService.getState();
      setError(serviceState.error || 'Failed to process subscription request');
      showToast(serviceState.error || 'Failed to process subscription request', true);
    } finally {
      setLoading(false);
      setLoadingPlanItem(null);
    }
  }, [app, shopName, redirect, searchParams, fetchPlans, email, currentSubscription]);

  const handlePurchase = useCallback(async (packageId: string, isCustom: boolean, paymentData?: CreditPaymentInfo) => {
    try {
      setLoadingPackageItem(packageId);
      setLoading(true);
      setError(null);
      const sessionToken = await getSessionToken(app);
      const purchaseData = await CreditService.purchaseCredits(shopName, host, sessionToken, packageId, isCustom, paymentData, email);
      if (purchaseData.confirmationUrl) {
        setRedirectUrl(purchaseData.confirmationUrl);
        setShowRedirectModal(true);
        setTimeout(() => {
          redirect?.dispatch(Redirect.Action.REMOTE, purchaseData.confirmationUrl);
        }, 1000);
      } 
    } catch (error) {
      console.error('Purchase error:', error);
      const serviceState = SubscriptionService.getState();
      setError(serviceState.error || 'Failed to process purchase request');
      showToast(serviceState.error || 'Failed to process purchase request', true);
    } finally {
      setLoading(false);
      setLoadingPackageItem(null);
    }
  }, [app, shopName, host, redirect, searchParams, fetchPackages, email]);

  const onPurchaseStepBack = () => {
    setCurrentStep(0);
    setCreditPaymentInfo(defaultCreditPaymentInfo);
  }

  useEffect(() => {
    fetchPlans();
    fetchSubscriptionDetails();
    fetchPurchaseDetails();
    fetchPackages();
    fetchEarlyAdapterPromotion();
  }, [
    fetchPlans, 
    fetchSubscriptionDetails, 
    fetchPurchaseDetails,
    fetchPackages, 
    fetchEarlyAdapterPromotion
  ]);

  useEffect(() => {
    localStorage.setItem('theme', 'light');
    setNextTheme('light');
  }, [setNextTheme]);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { status: 'success', label: 'Active', icon: StatusActiveIcon },
      pending: { status: 'attention', label: 'Processing', icon: AlertBubbleIcon },
      cancelled: { status: 'warning', label: 'Cancelled' },
      expired: { status: 'critical', label: 'Expired' }
    };
    const config = statusConfig[status.toLowerCase()] || statusConfig.pending;
    return (
      <BlockStack alignment="center" spacing="tight">
        {config.icon && <Icon source={config.icon} tone={config.status} />}
        <Badge tone={config.status}>{config.label}</Badge>
      </BlockStack>
    );
  };

  const packageMarkup = (
    <>
      {isProcessing ? (
        <BillingLoading />
      ) : (
        <div className="flex justify-center items-center px-10 py-16 mt-4">
          <Grid 
            columns={{
              xs: 6,  
              sm: 6,    
              md: 12,     
              lg: 12,    
              xl: 12      
            }}
            gap={{
              xs: '60px', 
              sm: '30px',    
              md: '30px',  
              lg: '30px'
            }}
          >
            {packages.map((pkg) => (
              <Grid.Cell 
                key={pkg.id} 
                columnSpan={{
                  xs: 6,   
                  sm: 6,    
                  md: 6,     
                  lg: 3,    
                  xl: 3      
                }}
              >
                <CreditCard
                  creditPackage={pkg}
                  selectedPackage={loadingPackageItem}
                  onSubscribe={() => handlePurchase(pkg.id, false)}
                  loading={loadingPackageItem === pkg.id}
                />
              </Grid.Cell>
            ))}
          </Grid>
        </div>
      )}
    </>
  );

  const EnhancedCreditPaymentStep = withShopifyPayment(CreditPaymentStep);

  const customMarkup = (
    <div className="flex justify-center items-center">
      <div className="w-full">
        <BlockStack align="center" gap="200">
          <Box>
            <div className="flex justify-end mb-6 lg:max-w-[80%] w-full min-w-full">
              {currentStep === 1 && paymentType === 'CREDIT' && (
                <Tooltip content="Go back to the previous step">
                  <Button variant="primary" onClick={onPurchaseStepBack} plain icon={ArrowLeftIcon}>
                    Back
                  </Button>
                </Tooltip>
              )}
            </div>
            <EnhancedCreditPaymentStep
              onPurchase={handlePurchase}
              shopName={shopName}
              accessToken={accessToken}
            />
            <HighLightBar />
          </Box>
        </BlockStack>
      </div>
    </div>
  );

  const subscriptionMarkup = (
    <>
      {isProcessing ? (
        <BillingLoading />
      ) : (
        <div className="flex justify-center items-center px-10 py-16 mt-4 md:px-10 lg:px-1">
          <Grid 
            columns={{
              xs: 6,  
              sm: 6,    
              md: 12,     
              lg: 12,    
              xl: 12      
            }}
            gap={{
              xs: '60px', 
              sm: '30px',    
              md: '30px',  
              lg: '30px'
            }}
          >
            {plans.map((plan) => (
              <Grid.Cell 
                key={plan.id} 
                columnSpan={{
                  xs: 6,   
                  sm: 6,    
                  md: 6,     
                  lg: 3,    
                  xl: 3      
                }}
              >
                <BillingCard
                  plan={plan}
                  currentPlan={currentSubscription?.plan?.name === plan.name}
                  selectedPlan={loadingPlanItem}
                  onSubscribe={() => handleBilling(plan.name)}
                  loading={loadingPlanItem === plan.name}
                />
              </Grid.Cell>
            ))}
          </Grid>
        </div>
      )}
    </>
  );

  const subscriptionDetailMarkup = (
    <>
      {isProcessing ? (
        <BillingLoading />
      ) : (
       <BillingDetails 
          details={subscriptionDetails}
          loading={detailLoading}
          error={error}
        />
      )}
    </>
  );

  const purchaseDetailMarkup = (
    <>
      {isProcessing ? (
        <BillingLoading />
      ) : (
       <CreditDetails 
          details={purchaseDetails}
          loading={detailLoading}
          error={error}
        />
      )}
    </>
  );

  return (
    <Frame>
      <Page
        backAction={{
          content: 'Back To Homepage',
          onAction: handleNavigation,
        }}
        title={
          <Text variant="headingXl" as="h4">Billing Management</Text>
        }
        titleMetadata={<Badge tone="success">Active</Badge>}
        subtitle={
          <Text variant="headingMd" as="h4">
            You're using the <span className="font-bold font-2xl text-blue-800 bg-amber-200 rounded-full p-1 mx-1">{currentSubscription?.plan?.name}</span> plan of Doc2Product. Upgrade to unlock advanced features and enhance your experience.
          </Text>
        }
        compactTitle
        secondaryActions={[
          {
            id: 'view-subscription-button',
            content: 'View Active Subscription',
            icon: ViewIcon,
            loading: loading || isProcessing,
            onAction: () => setShowCurrentPlanDetails(true),
          },
          ...(currentSubscription?.plan?.name !== SubscriptionPlan.FREE ? [{
            id: 'cancel-subscription-button',
            content: 'Cancel subscription',
            destructive: true,
            onAction: () => setConfirmCancelModal(true),
            loading: loading || isProcessing,
          }] : [])

        ]}
        actionGroups={[
          {
            title: 'More actions',
            actions: [
              {
                id: 'view-purchase',
                icon: ViewIcon,
                content: 'View Package Purchases',
                loading: loading || isProcessing,
                onAction: () => setShowPackagePurchaseDetails(true),
              }
            ],
          },
        ]}
        fullWidth
      >
        <Layout>
          {promotion && (
            <Layout.Section>
              <EarlyAdopterBanner discount={promotion} />
            </Layout.Section>
          )}
          {error && (
            <Layout.Section>
              <Banner
                title="There was an issue"
                onDismiss={() => setError(null)}
                tone="critical"
                ref={banner}
              >
                <p>{error}</p>
              </Banner>
            </Layout.Section>
          )}

          {showCurrentPlanDetails && (
            <Modal
              open={showCurrentPlanDetails}
              onClose={() => setShowCurrentPlanDetails(false)}
              title="Current Subscription Details"
            >
              <Modal.Section>
                {subscriptionDetailMarkup}
              </Modal.Section>
            </Modal>
          )}
          {showPackagePurchaseDetails && (
            <Modal
              open={showPackagePurchaseDetails}
              onClose={() => setShowPackagePurchaseDetails(false)}
              title="Package Purchases Details"
            >
              <Modal.Section>
                {purchaseDetailMarkup}
              </Modal.Section>
            </Modal>
          )}
          <Layout.Section>
            <Box 
              background="bg-surface" 
              borderRadius="300" 
              padding="400"
              shadow="200"
            >
              <Box className="border-b border-gray-200 pb-4">
                <Tabs 
                  tabs={mainTabs} 
                  selected={mainTabs.findIndex((tab) => tab?.id === mainTabSelected)}
                  onSelect={handleMainTabChange} 
                  fitted
                />
              </Box>
              <Box paddingBlockStart="400">
                {mainTabSelected === 'subscription' && (
                  <Box>{subscriptionMarkup}</Box>
                )}
                {mainTabSelected === 'credit' && (
                  <Box className="space-y-6">
                    <Box 
                      background="bg-surface-secondary"
                      borderRadius="200"
                      padding="300"
                    >
                      <Tabs 
                        tabs={creditTabs} 
                        selected={creditTabs.findIndex((tab) => tab?.id === creditTabSelected)}
                        onSelect={handleCreditTabChange}
                      />
                    </Box>
                    <Box paddingBlockStart="400">
                      {creditTabSelected === 'package' && packageMarkup}
                      {creditTabSelected === 'custom' && customMarkup}
                    </Box>
                  </Box>
                )}
              </Box>
            </Box>
          </Layout.Section>
        </Layout>
        {showRedirectModal && (
         <Modal
           open={showRedirectModal}
           onClose={() => setShowRedirectModal(false)}
           title="Completing Your Subscription"
           primaryAction={{
             content: 'Continue',
             onAction: () => redirect?.dispatch(Redirect.Action.REMOTE, redirectUrl),
             size: 'large',
             variant: 'primary'
           }}
           secondaryActions={[{
             content: 'Cancel',
             onAction: () => setShowRedirectModal(false)
           }]}
         >
           <Modal.Section>
             <BlockStack align="center" inlineAlign="center" gap="500">
               <Text variant="headingMd" as="h2">Setting up your subscription</Text>
               <Spinner size="large" tone="success" />
               <ProgressBar 
                 progress={75} 
                 size="medium"
                 tone="success"
                 animated
               />
               <Text variant="bodyMd" tone="subdued">
                 You'll be redirected to complete payment momentarily...
               </Text>
             </BlockStack>
           </Modal.Section>
         </Modal>
        )}
        {confirmCancelModal && (
          <Modal
            open={confirmCancelModal}
            onClose={() => setConfirmCancelModal(false)}
            title={`Cancel ${currentSubscription?.plan?.name} Plan`}
            primaryAction={{
              content: 'Cancel Plan',
              destructive: true,
              onAction: async () => {
                const shouldProrate = cancellationType === 'immediate';
                handleBilling(currentSubscription?.plan?.name, true, cancelReason, currentSubscription?.shopifySubscriptionId, shouldProrate, currentSubscription?.status);
                setConfirmCancelModal(false);
              },
            }}
            secondaryActions={[
              {
                content: 'Keep Plan',
                onAction: () => setConfirmCancelModal(false),
              },
            ]}
          >
            <Modal.Section>
              <BlockStack gap="400">
                <Icon source={AlertBubbleIcon} tone="critical" />
                <Text>
                  Are you absolutely sure you want to cancel your "{currentSubscription?.plan?.name}" plan? 
                  This action cannot be undone.
                </Text>
                <Select
                  label="How would you like to cancel?"
                  options={cancellationOptions}
                  onChange={setCancellationType}
                  value={cancellationType}
                  required
                />
                <Select
                  label="Reason for cancellation"
                  options={cancelReasons}
                  onChange={setCancelReason}
                  value={cancelReason}
                  required
                />
                {cancellationType === 'immediate' && (
                  <Text tone="subdued">
                    You'll receive a prorated refund for the unused portion of your subscription period.
                  </Text>
                )}
                {cancellationType === 'end-of-cycle' && (
                  <Text tone="subdued">
                    Your subscription will remain active until the end of the current billing cycle on {DateTime.fromJSDate(subscriptionDetails?.endDate).toFormat('cccc, dd MMMM yyyy')}.
                  </Text>
                )}
              </BlockStack>
            </Modal.Section>
          </Modal>
        )}
        {toastProps.active && (
          <Toast
            content={toastProps.content}
            error={toastProps.error}
            onDismiss={handleToastDismiss}
            duration={4000}
          />
        )}
      </Page>
    </Frame>
  );
}