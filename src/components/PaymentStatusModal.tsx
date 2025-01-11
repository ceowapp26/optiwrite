"use client"
import React, { useEffect, useState } from 'react';
import { Modal, Icon, Text, BlockStack, Button, Toast, ProgressBar, Frame, Box } from '@shopify/polaris';
import { StatusActiveIcon, AlertBubbleIcon, XIcon } from '@shopify/polaris-icons';
import confetti from 'canvas-confetti';
import { useAppBridge } from '@/providers/AppBridgeProvider';
import { Redirect } from '@shopify/app-bridge/actions';
import { useSearchParams, useRouter } from 'next/navigation';

interface PaymentStatusConfig {
  icon: React.ReactNode;
  title: string;
  message: string;
  color: string;
  showConfetti?: boolean;
}

const STATUS_CONFIGS: Record<string, PaymentStatusConfig> = {
  SUCCEEDED: {
    icon: <StatusActiveIcon className="w-8 h-8 fill-white" />,
    title: 'Payment Successful',
    message: 'Your subscription has been activated successfully. You now have full access to all features.',
    color: 'var(--p-color-bg-fill-success)',
    showConfetti: true
  },
  PENDING: {
    icon: <AlertBubbleIcon className="w-8 h-8 fill-white" />,
    title: 'Payment Processing',
    message: 'Your payment is being processed. This may take a few moments.',
    color: 'var(--p-color-bg-fill-caution)'
  },
  FAILED: {
    icon: <XIcon className="w-8 h-8 fill-white" />,
    title: 'Payment Failed',
    message: 'There was an issue processing your payment. Please try again or contact support.',
    color: 'var(--p-color-bg-fill-critical)'
  }
};

export default function PaymentStatusModal() {
  const { app, isAppBridgeInitialized } = useAppBridge();
  const redirect = app && Redirect.create(app);
  const [isVisible, setIsVisible] = useState(false);
  const [toastActive, setToastActive] = useState(false);
  const searchParams = useSearchParams();
  const paymentStatus = decodeURIComponent(searchParams.get('status') || '')?.toUpperCase();
  const config = STATUS_CONFIGS[paymentStatus];

  useEffect(() => {
    if (paymentStatus && config) {
      setIsVisible(true);
      if (config.showConfetti) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#008060', '#95BF47', '#FBF7ED']
        });
      }
      setToastActive(true);
    }
  }, [paymentStatus, config]);

  const handleClose = () => {
    const shop = searchParams?.get("shop");
    const host = searchParams?.get("host");
    const queryParams = new URLSearchParams({
      shop,
      host
    }).toString();
    setIsVisible(false);
    if (redirect) {
      redirect.dispatch(Redirect.Action.APP, {
        path: `/shops/shop=${shop}?${queryParams}`,
      });
    }
  };
  if (!config || !isVisible) return null;

  const toastMarkup = toastActive && (
    <div style={{ position: 'fixed', top: 0, left: 0, width: 0, height: 0 }}>
      <Frame>
        <Toast
          content={config.message}
          onDismiss={() => setToastActive(false)}
          duration={4000}
          error={paymentStatus === 'FAILED'}
          success={paymentStatus === 'SUCCEEDED'}
        />
      </Frame>
    </div>
  );

  return (
    <React.Fragment>
      <Modal
        open={isVisible}
        onClose={handleClose}
        title={config.title}
        titleHidden
      >
        <Modal.Section>
          <BlockStack align="center" inlineAlign="center" gap="400">
            <div style={{
              backgroundColor: config.color,
              borderRadius: '50%',
              padding: '16px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              width: '64px',
              height: '64px'
            }}>
              {config.icon}
            </div>
            <BlockStack align="center" inlineAlign="center" gap="100">
              <Text variant="headingLg" as="h2" alignment="center">
                {config.title}
              </Text>
              <Text variant="bodyMd" as="p" alignment="center" color="subdued">
                {config.message}
              </Text>
            </BlockStack>
            {paymentStatus === 'PENDING' && (
              <div style={{ width: '100%', maxWidth: '300px' }}>
                <ProgressBar progress={75} size="small" />
              </div>
            )}
            <Box width="100%" paddingInline="500" paddingBlockStart="500" paddingBlockEnd="200">
              <Button onClick={handleClose} variant="primary" tone="success" fullWidth>
                {paymentStatus === 'SUCCEEDED' ? 'Continue to App' : 'Close'}
              </Button>
            </Box>
          </BlockStack>
        </Modal.Section>
      </Modal>
      {toastMarkup}
    </React.Fragment>
  );
}
