'use client';
import { AlertCircle, Loader2 } from 'lucide-react'; 
import { Card, Text, BlockStack, Box, Banner } from '@shopify/polaris';

interface AuthRedirectScreenProps {
  content: {
    title: string;
    message: string;
    action: string;
  };
  onAction?: () => void;
}

const AuthRedirectScreen = ({ content, onAction }: AuthRedirectScreenProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <Card>
        <BlockStack gap="400">
          <Box padding="400">
            <div className="flex flex-col items-center space-y-6">
              <div className="animate-pulse">
                <img 
                  src="/images/Doc2Product-logo.png" 
                  alt="Logo" 
                  className="h-16 w-auto"
                />
              </div>
              <Banner
                title="Authentication Required"
                tone="warning"
                title={content.title}
                status="warning"
                action={{
                  content: content.action,
                  onAction: onAction
                }}
                icon={AlertCircle}
              >
                <BlockStack gap="200">
                  <Text as="p">
                    {content.message}
                  </Text>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Redirecting to home page...</span>
                  </div>
                </BlockStack>
              </Banner>
            </div>
          </Box>
        </BlockStack>
      </Card>
    </div>
  );
};

interface AuthenticationBannerProps {
  type: 'google' | 'admin' | 'shopify';
  onAction?: () => void;
}

export const AuthenticationBanner = ({ type, onAction }: AuthenticationBannerProps) => {
  const getBannerContent = () => {
    switch (type) {
      case 'google':
        return {
          title: 'Google Authentication Required',
          message: 'Please sign in with your Google account to access this page.',
          action: 'Sign in with Google'
        };
      case 'admin':
        return {
          title: 'Admin Access Required',
          message: 'This page requires admin privileges to access.',
          action: 'Return to Home'
        };
      case 'shopify':
        return {
          title: 'Shopify Authentication Required',
          message: 'Please authenticate with Shopify to access this page.',
          action: 'Sign in with Shopify'
        };
      default:
        return {
          title: 'Authentication Required',
          message: 'Please sign in to access this page.',
          action: 'Sign in'
        };
    }
  };

  const content = getBannerContent();

  return (
    <div className="fixed top-0 left-0 right-0 z-50 p-4 bg-white shadow-lg">
      <AuthRedirectScreen content={content} onAction={onAction} />
    </div>
  );
};
