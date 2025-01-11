'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, memo, ReactNode } from 'react';
import { useShopifySession, useAuthRedirect } from '@/hooks/useShopifyAuth';
import { SessionContextValue, AppSession } from '@/types/auth';
import { PageLoader } from "@/components/PageLoader";
import { useAppDispatch, useAppSelector } from "@/hooks/useLocalStore";
import { storeSession, selectSession } from "@/stores/features/authSlice";
import { useProcessUninstall } from '@/hooks/useProcessUninstall';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Card, Text, BlockStack, Box, Banner } from '@shopify/polaris';
import LoadingScreen from "@/components/LoadingScreen";
import AuthRedirectScreen from "@/components/AuthRedirectScreen";

interface SessionContextData {
  session: SessionContextValue;
  appSession: AppSession;
  isAdminUser: boolean;
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
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const uninstall = useProcessUninstall();
  const authRedirect = useAuthRedirect();
  const shopifyState = useShopifySession();
  const [error, setError] = useState<string | null>(null);
  const isLoading = useMemo(() => 
    shopifyState.loading,
    [shopifyState.loading]
  );
  const sessionError = useMemo(() => {
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
    shopifyUserEmail: sessionValue?.shopify?.online?.onlineAccessInfo?.associated_user?.email,
    shopifyOnlineAccessToken: sessionValue?.shopify?.online?.accessToken,
    shopifyUserId: sessionValue?.shopify?.online?.onlineAccessInfo?.associated_user?.id,
  }), [
    sessionValue?.shopify?.offline?.shop,
    sessionValue?.shopify?.offline?.accessToken,
    sessionValue?.shopify?.online?.accessToken,
    sessionValue?.shopify?.online?.onlineAccessInfo?.associated_user?.email,
    sessionValue?.shopify?.online?.onlineAccessInfo?.associated_user?.id,
  ]);

  const isAdminUser = useMemo(() => 
    Boolean(sessionValue?.shopify?.online?.onlineAccessInfo?.associated_user?.role === 'admin'),
    [sessionValue?.shopify?.online?.onlineAccessInfo?.associated_user?.role]
  );
  const contextData = useMemo<SessionContextData>(() => ({
    session: sessionValue,
    appSession,
    isAdminUser
  }), [sessionValue, appSession, isAdminUser]);

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



