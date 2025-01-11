'use client';

import { useEffect, useState, useMemo } from 'react';
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
import { withAuthentication } from '@/components/AuthWrapper';
import { Redirect } from '@shopify/app-bridge/actions';
import { useSearchParams } from 'next/navigation';
import {
  SettingsIcon,
  CreditCardIcon,
  CustomersMinor,
  StoreManagedIcon,
  DataPresentationIcon,
} from '@shopify/polaris-icons';

interface HomePageProps {
  session: SessionContextValue;
  isAdminUser: boolean;
}

function HomePage({ session, isAdminUser }: HomePageProps) {
  const { app } = useAppBridge();
  const redirect = app && Redirect.create(app);
  const searchParams = useSearchParams();
  const [toastProps, setToastProps] = useState({
    active: false,
    message: '',
    error: false,
  });

  const navigationCards = [
    {
      title: "AI Models Management",
      description: "Configure and manage AI models, parameters, and settings",
      icon: SettingsIcon,
      path: "/admin/models",
      primaryColor: "bg-indigo-50",
      iconColor: "text-indigo-600",
    },
    {
      title: "Admin Management",
      description: "Manage user permissions and roles",
      icon: StoreManagedIcon,
      path: "/admin/users",
      primaryColor: "bg-emerald-50",
      iconColor: "text-emerald-600",
    },
    {
      title: "Subscription Plan Management",
      description: "Manage and moderate subscription plans",
      icon: CreditCardIcon,
      path: "/admin/plans",
      primaryColor: "bg-amber-50",
      iconColor: "text-amber-600",
    },
    {
      title: "Subscription Statistics",
      description: "Subscription and payment history",
      icon: DataPresentationIcon,
      path: "/admin/payments",
      primaryColor: "bg-amber-50",
      iconColor: "text-amber-600",
    },
  ];

  const handleNavigation = (path: string) => {
    const shop = searchParams?.get("shop");
    const host = searchParams?.get("host");
    if (redirect) {
      redirect.dispatch(Redirect.Action.APP, {
        path: `${path}?shop=${shop}&host=${host}`,
      });
    }
  };

  return (
    <Frame>
      <Page
        fullWidth
        title="Admin Management"
        subtitle="Manage your application settings and configurations"
      >
        <Layout>
          {navigationCards.map((card, index) => (
            <Layout.Section oneThird key={index}>
              <Card padding="5">
                <div className={`p-6 rounded-lg ${card.primaryColor}`}>
                  <div className="flex items-center mb-4">
                    <div className={`p-2 rounded-lg ${card.iconColor}`}>
                      <Icon source={card.icon} />
                    </div>
                    <Text variant="headingMd" as="h2" className="ml-3">
                      {card.title}
                    </Text>
                  </div>
                  <div className="pl-3">
                    <Text as="h5" color="subdued">
                      {card.description}
                    </Text>
                  </div>
                  <div className="mt-6">
                    <Button
                      variant="primary"
                      onClick={() => handleNavigation(card.path)}
                      fullWidth
                    >
                      Manage
                    </Button>
                  </div>
                </div>
              </Card>
            </Layout.Section>
          ))}
        </Layout>

        {toastProps.active && (
          <Toast
            content={toastProps.message}
            error={toastProps.error}
            onDismiss={() => setToastProps({ active: false, message: '', error: false })}
          />
        )}
      </Page>
    </Frame>
  );
}

export default withAuthentication(HomePage, { requireAdmin: true });
