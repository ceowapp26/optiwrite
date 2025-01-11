'use client';
import { useCallback } from 'react';
import { 
  Button, 
  Box,
  InlineStack,
  Banner
} from '@shopify/polaris';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';
import { useAppBridge } from '@/providers/AppBridgeProvider';

interface GoogleSignInButtonProps {
  shop: string;
  host: string;
}

export default function GoogleSignInButton({ shop, host }: GoogleSignInButtonProps) {
  const { signIn, isLoading, isConnected, error } = useGoogleAuth({ shop, host });

  const handleSignIn = useCallback(async () => {
    try {
      await signIn();
    } catch (err) {
      console.error('Sign-in error:', err);
    }
  }, [signIn]);

  return (
    <div className="flex p-6 justify-center items-center">
      {isConnected ? (
        <Banner status="success">
          <p>Successfully connected to Google Docs!</p>
        </Banner>
      ) : (
        <div className="inline-flex rounded-md border border-r-0 border-gray-300">
          <div className="flex items-center justify-center px-4 py-2 rounded-l-md bg-white">
            <img 
              src="/images/Google__G__logo.png" 
              alt="Google Logo" 
              width={30} 
              height={30}
              style={{ flexShrink: 0 }}
            />
          </div>
           <div className="flex items-center justify-center px-4 py-2 rounded-r-md bg-blue-300 text-white">
            <Button
              onClick={handleSignIn}
              disabled={isLoading}
              loading={isLoading}
              variant="plain"
            >
              <span style={{ color: 'white', fontWeight: '400', textDecoration: 'none' }}>
                {isLoading ? 'Connecting...' : 'Sign in with Google'}
              </span>
            </Button>
          </div>
        </div>
      )}
      
      {error && (
        <Box paddingBlock="400">
          <Banner
            title="Error"
            status="critical"
            onDismiss={() => {}}
          >
            <p>{error}</p>
          </Banner>
        </Box>
      )}
    </div>
  );
}