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
    if (isOpen && !loading) {
      setIsRedirecting(true);
      timeoutRef.current = setTimeout(() => {
        onProceed(content?.contentId);
      }, 1000);
    }
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setIsRedirecting(false);
    };
  }, [isOpen, loading, onProceed]);

  if (loading) {
    return null;
  }

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Access Advanced Editor"
      titleHidden={false}
      primaryAction={{
        content: isRedirecting 
          ? 'Redirecting...' 
          : 'Proceed to Editor',
        onAction: onProceed,
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
          </div>
          {isRedirecting ? (
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
                Ready to enhance your content?
              </Text>
              <Text variant="bodyMd" as="p" tone="subdued">
                Access our powerful advanced editor with all premium features unlocked.
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
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
};

RedirectModal.displayName = 'RedirectModal';

export default RedirectModal;