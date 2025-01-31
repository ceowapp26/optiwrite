'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode, memo } from 'react';
import { useShopifySession, useAuthRedirect } from '@/hooks/useShopifyAuth';
import { useProcessUninstall } from '@/hooks/useProcessUninstall';
import { useProcessSubscription } from '@/hooks/useProcessSubscription';
import { SessionContextValue, AppSession } from '@/types/auth';
import { PageLoader } from "@/components/PageLoader";
import { storeSession, selectSession } from "@/stores/features/authSlice";
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Card, Text, BlockStack, Box, Banner } from '@shopify/polaris';
import LoadingScreen from "@/components/LoadingScreen";
import AuthRedirectScreen from "@/components/AuthRedirectScreen";

interface SessionContextData {
  session: SessionContextValue;
  appSession: AppSession;
}

const SessionContext = createContext<SessionContextData | null>(null);

export const useSessionContext = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSessionContext must be used within SessionProvider');
  }
  return context;
};

interface SessionProviderProps {
  children: ReactNode | ((contextData: SessionContextData) => ReactNode);
  requireAuth?: boolean;
  requireShopify?: boolean;
}

const SessionProvider = React.memo(({
  children,
  requireAuth = true,
  requireShopify = true,
}: SessionProviderProps) => {
  const authRedirect = useAuthRedirect();
  const shopifyState = useShopifySession();
  const uninstall = useProcessUninstall();
  const processSubscription = useProcessSubscription();
  const [error, setError] = useState<string | null>(null);
  const [isSignedOut, setIsSignedOut] = useState(false);
  const isLoading = useMemo(() => 
    shopifyState.loading,
    [shopifyState.loading]
  );

  const sessionError = useMemo(() => {
    if (shopifyState.error) {
      return {
        type: 'UNKNOWN',
        message: `Multiple authentication errors: ${shopifyState.error.message}`
      };
    }
    return shopifyState.error || null;
  }, [shopifyState.error]);
  const sessionValue = useMemo<SessionContextValue>(() => ({
    shopify: {
      online: shopifyState.online,
      offline: shopifyState.offline,
      verified: shopifyState.verified
    },
    loading: isLoading,
    error: sessionError
  }), [
    shopifyState.online,
    shopifyState.offline,
    shopifyState.verified,
    isLoading,
    sessionError
  ]);
  const appSession = useMemo<AppSession>(() => ({
    shopName: sessionValue?.shopify?.offline?.shop,
    shopifyOfflineAccessToken: sessionValue?.shopify?.offline?.accessToken,
    shopifyOnlineAccessToken: sessionValue?.shopify?.online?.accessToken,
    shopifyUserEmail: sessionValue?.shopify?.online?.onlineAccessInfo?.associated_user?.email,
    shopifyUserId: sessionValue?.shopify?.online?.onlineAccessInfo?.associated_user?.id,
    userIds: {
      shopifyUserId: sessionValue?.shopify?.online?.onlineAccessInfo?.associated_user?.id
    }
  }), [
    sessionValue?.shopify?.offline?.shop,
    sessionValue?.shopify?.offline?.accessToken,
    sessionValue?.shopify?.online?.accessToken,
    sessionValue?.shopify?.online?.onlineAccessInfo?.associated_user?.email,
    sessionValue?.shopify?.online?.onlineAccessInfo?.associated_user?.id,
  ]);
  const contextData = useMemo<SessionContextData>(() => ({
    session: sessionValue,
    appSession,
  }), [sessionValue, appSession]);

  const validateAuth = useCallback(async () => {
    if (!requireAuth || isLoading) return;
    try {
      if (requireShopify && !shopifyState.verified) {
        setError("Shopify authentication required");
        authRedirect();
        return;
      }
      setError(null);
      return;
    } catch (err) {
      console.error("Authentication validation failed:", err);
      setError("Authentication error occurred");
    }
  }, [
    requireAuth,
    requireShopify,
    shopifyState.verified,
    authRedirect,
    isLoading,
  ]);

  useEffect(() => {
    validateAuth();
  }, [validateAuth]);

  const getErrorMessage = (error: any) => {
    if (error?.type === 'SHOPIFY') {
      return "Shopify authentication is required to access this application. Please sign in with your Shopify account.";
    }
    if (error) return "Authentication is required to access this application. Please sign in to continue.";
    return;
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error && !isLoading) {
    if (requireAuth) {
      return <AuthRedirectScreen message={getErrorMessage(error)} />;
    }
  }

  return (
    <SessionContext.Provider value={contextData}>
      {typeof children === "function" ? children(contextData) : children}
    </SessionContext.Provider>
  );
});

export const withAuthWrapper = <P extends { session?: SessionContextValue; appSession?: AppSession; }>(
  WrappedComponent: React.ComponentType<P>
) => {
  const WithSessionComponent = (props: Omit<P, "session" | "appSession">) => {
    const contextData = useSessionContext();
    const enhancedProps = useMemo(
      () => ({
        ...props,
        session: contextData.session,
        appSession: contextData.appSession
      }),
      [props, contextData.session, contextData.appSession]
    );
    return <WrappedComponent {...enhancedProps as P} />;
  };
  WithSessionComponent.displayName = `withAuth(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;
  return memo(WithSessionComponent);
};

SessionProvider.displayName = 'SessionProvider';

export default SessionProvider;

