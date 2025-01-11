import React, { useEffect, useRef, useState } from 'react';
import { Modal, Text, BlockStack, InlineStack, Button, Icon, Link, Spinner } from '@shopify/polaris';
import { AlertCircleIcon, LockIcon, ArrowRightIcon } from '@shopify/polaris-icons';
import { SubscriptionPlan } from '@prisma/client';
import { type CONTENT } from '@/types/content';

interface RedirectModalProps {
  isOpen: boolean;
  content: CONTENT;
  onClose: () => void;
  onProceed: () => void;
  loading?: boolean;
}

export const RedirectModal: React.FC<RedirectModalProps> = ({
  isOpen,
  content,
  onClose,
  onProceed,
  loading = false,
}) => {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const theme = localStorage.getItem('theme');
  const isLightTheme = theme === 'light';
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isPremiumUser = true;

  const themeStyles = {
    gradientFrom: isLightTheme ? 'from-blue-500/10' : 'from-blue-900/20',
    gradientTo: isLightTheme ? 'to-purple-500/10' : 'to-purple-900/20',
    lockBg: isLightTheme ? 'bg-white/90' : 'bg-gray-900/90',
    lockIconColor: isLightTheme ? 'fill-violet-600' : 'fill-violet-400',
    featureHoverBg: isLightTheme ? 'hover:bg-violet-50' : 'hover:bg-violet-900/20',
    alertBg: isLightTheme ? 'bg-sky-50' : 'bg-sky-900/20',
    alertIconColor: isLightTheme ? 'fill-blue-600' : 'fill-blue-400',
  };

  useEffect(() => {
    if (isOpen && isPremiumUser && !loading) {
      setIsRedirecting(true);
      timeoutRef.current = setTimeout(() => {
        onProceed();
      }, 1000);
    }
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setIsRedirecting(false);
    };
  }, [isOpen, isPremiumUser, loading, onProceed]);

  if (loading) {
    return null;
  }

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={isPremiumUser ? "Access Advanced Editor" : "Upgrade Required"}
      titleHidden={false}
      primaryAction={{
        content: isPremiumUser 
          ? isRedirecting 
            ? 'Redirecting...' 
            : 'Proceed to Editor'
          : 'Upgrade Now',
        onAction: isPremiumUser ? onProceed : onUpgrade,
        loading: isRedirecting,
        disabled: isRedirecting,
        variant: 'primary',
      }}
      secondaryActions={[
        {
          content: 'Cancel',
          onAction: onClose,
          disabled: isRedirecting,
        },
      ]}
    >
      <Modal.Section>
        <BlockStack gap="500">
          <div className="relative overflow-hidden rounded-lg">
            <div className={`absolute inset-0 bg-gradient-to-r ${themeStyles.gradientFrom} ${themeStyles.gradientTo} animate-gradient`} />
            <img
              src="/images/ai-note-taking-apps-4.png"
              alt="Advanced Editor Preview"
              className="w-full h-56 object-cover rounded-lg shadow-lg transform transition-transform duration-300 hover:scale-[1.02]"
            />
            {!isPremiumUser && (
              <div className="absolute top-4 right-4">
                <div className={`${themeStyles.lockBg} backdrop-blur-sm rounded-full px-4 py-2 shadow-lg`}>
                  <InlineStack gap="200" align="center">
                    <LockIcon className={`h-5 w-5 ${themeStyles.lockIconColor}`} />
                    <Text variant="bodyMd" as="span" fontWeight="semibold">
                      Premium Feature
                    </Text>
                  </InlineStack>
                </div>
              </div>
            )}
          </div>
          {isRedirecting && isPremiumUser ? (
            <BlockStack gap="400" align="center" inlineAlign="center">
              <Spinner size="large" />
              <Text variant="headingMd" as="h2" alignment="center">
                Redirecting to Advanced Editor
              </Text>
              <Text variant="bodyMd" as="p" tone="subdued" alignment="center">
                Please wait while we prepare your workspace...
              </Text>
            </BlockStack>
          ) : (
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                {isPremiumUser ? "Ready to enhance your content?" : "Unlock Advanced Editing Features"}
              </Text>
              <Text variant="bodyMd" as="p" tone="subdued">
                {isPremiumUser 
                  ? "Access our powerful advanced editor with all premium features unlocked."
                  : "Upgrade to Pro or Ultimate plan to access premium features and take your content to the next level."}
              </Text>
              <div className="space-y-3 mt-4">
                {[
                  "AI-Powered Content Generation",
                  "Advanced SEO Optimization Tools",
                  "Real-time Content Analytics",
                  "Custom Templates Library",
                ].map((feature, index) => (
                  <div
                    key={index}
                    className={`flex items-center space-x-3 p-2 rounded-lg transition-colors ${themeStyles.featureHoverBg}`}
                  >
                    <div className="flex-shrink-0">
                      <Icon source={ArrowRightIcon} tone="success" />
                    </div>
                    <Text variant="bodyMd">{feature}</Text>
                  </div>
                ))}
              </div>
            </BlockStack>
          )}
          {!isPremiumUser && (
            <div className={`mt-4 p-4 ${themeStyles.alertBg} rounded-lg`}>
              <InlineStack gap="200" blockAlign="center">
                <AlertCircleIcon className={`h-5 w-5 ${themeStyles.alertIconColor}`} />
                <Text variant="bodyMd">
                  <Link url="/billing">Compare plans</Link> to find the best option for your needs
                </Text>
              </InlineStack>
            </div>
          )}
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
};

RedirectModal.displayName = 'RedirectModal';

export default RedirectModal;