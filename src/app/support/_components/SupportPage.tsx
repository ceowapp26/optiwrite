'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Page,
  Layout,
  Card,
  Text,
  Button,
  Frame,
  Toast,
  Icon,
} from '@shopify/polaris';
import { SessionContextValue } from '@/types/auth';
import { useAppBridge } from '@/providers/AppBridgeProvider';
import { Redirect } from '@shopify/app-bridge/actions';
import { useSearchParams } from 'next/navigation';
import DemoSection from './DemoSection';
import ContactSection from './ContactSection';

interface SupportPageProps {
  session: SessionContextValue;
}

function SupportPage({ session }: SupportPageProps) {
  const { app } = useAppBridge();
  const redirect = app && Redirect.create(app);
  const searchParams = useSearchParams();
  const [toastProps, setToastProps] = useState({
    active: false,
    message: '',
    error: false,
  });

  const handleNavigation = useCallback(() => {
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
    const returnUrl = `/shops/shop=${shop}?${queryParams}`;
    redirect.dispatch(Redirect.Action.APP, {
      path: returnUrl
    });
  }, [searchParams, redirect]);

  return (
    <Page
      backAction={{
        content: 'Back To Homepage',
        onAction: handleNavigation,
      }}
      title={
        <Text variant="headingXl" as="h4">Support Page</Text>
      }
      subtitle={
        <Text variant="headingMd" as="h4">
          Full Demo and Email Contact
        </Text>
      }
      compactTitle
      fullWidth
    >
      <Layout>
        <Layout.Section>
          <DemoSection />
        </Layout.Section>
        <Layout.Section >
          <ContactSection />
        </Layout.Section>
      </Layout>
    </Page>
  );
}

export default SupportPage;
