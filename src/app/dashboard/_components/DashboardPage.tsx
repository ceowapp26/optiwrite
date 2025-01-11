import React, { memo, useState, useEffect, useMemo, useCallback } from "react";
import { useAppBridge } from '@/providers/AppBridgeProvider';
import { Redirect } from '@shopify/app-bridge/actions';
import { 
  Page, 
  Layout,
  Card, 
  InlineStack, 
  Text, 
  Box, 
  Button, 
  BlockStack,
  Spinner,
  Banner  
} from '@shopify/polaris';
import { useRouter, useSearchParams } from 'next/navigation';
import { getUsageStateAction } from '@/actions/usage';
import UsageOverview from './UsageOverview';
import UsageChart from './UsageChart';

interface UsagePageProps {
  session: AppSession;
}

export default function DashboardPage({ session }: UsagePageProps) {
  const [usageData, setUsageData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { shopName, shopifyUserId } = session;
  if (!shopifyUserId || !shopName) {
    return null;
  }
 const searchParams = useSearchParams();
  const host = searchParams?.get('host') || '';
  const shop = searchParams?.get('shop') || shopName;    
  const { app } = useAppBridge();
  const redirect = app && Redirect.create(app);

  const fetchUsageData = useCallback(async () => {
    if (!shopName) return;
    try {
      setIsLoading(true);
      setError(null);
      const data = await getUsageStateAction(shopName);
      setUsageData(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch usage data');
    } finally {
      setIsLoading(false);
    }
  }, [shopName]);

  useEffect(() => {
    fetchUsageData();
  }, [fetchUsageData]);

  const handleNavigateToBillingPage = useCallback(() => {
    if (!shopName || !host || !redirect) {
      console.error('Missing required navigation parameters');
      return;
    }
    const queryParams = new URLSearchParams({
      shopName,
      host
    }).toString();
    const returnUrl = `/billing?${queryParams}`;
    redirect.dispatch(Redirect.Action.APP, {
      path: returnUrl
    });
  }, [searchParams, redirect, shopName, host]);

  const handleNavigateToHomePage = useCallback(() => {
    if (!shopName || !host || !redirect) {
      console.error('Missing required navigation parameters');
      return;
    }
    const queryParams = new URLSearchParams({
      shopName,
      host
    }).toString();
    const returnUrl = `/shops/shop=${shopName}?${queryParams}`;
    redirect.dispatch(Redirect.Action.APP, {
      path: returnUrl
    });
  }, [searchParams, redirect, shopName, host]);

  const memoizedUsageOverview = useMemo(() => {  
    if (isLoading) {
      return (
        <Box padding="400">
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Spinner size="large" />
          </div>
        </Box>
      );
    }
    if (error) {
      return (
        <Banner tone="critical">
          <p>{error}</p>
        </Banner>
      );
    }
    return usageData && <UsageOverview usageState={usageData} />;
  }, [isLoading, error, usageData]);

  if (!session) return null;

  return (
    <Page
      fullWidth
      backAction={{
        content: 'Back To Homepage',
        onAction: handleNavigateToHomePage,
      }}
      title={
        <Text variant="headingXl" as="h4">Usage Statistics</Text>
      }
       primaryAction={{
        content: 'Go To Billing',
        onAction: handleNavigateToBillingPage,
        disabled: false,
        loading: false,
      }}
    >
      <Layout>
        <Layout.Section>
          {memoizedUsageOverview}
        </Layout.Section>
        <Layout.Section>
          <UsageChart usageState={usageData} />
        </Layout.Section>
      </Layout>
    </Page>
  );
}