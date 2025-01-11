'use client';
import { ComponentType, useCallback, useEffect } from 'react';
import { useAppBridge } from '@/providers/AppBridgeProvider';
import { Redirect } from '@shopify/app-bridge/actions';
import { AuthenticationBanner } from '@/components/AuthenticationBanner';
import { useSearchParams } from 'next/navigation';

interface AuthProps {
  isGoogleVerified: boolean;
  isAdminUser: boolean;
  requireAdmin?: boolean;
}

export function withAuthentication<P extends AuthProps>(
  WrappedComponent: ComponentType<P>,
  options = { requireAdmin: false }
) {
  return function WithAuthenticationComponent(props: P) {
    const { isGoogleVerified, isAdminUser } = props;
    const { app } = useAppBridge();
    const redirect = app && Redirect.create(app);
    const searchParams = useSearchParams();

    const handleAuthRedirect = useCallback(() => {
      const timer = setTimeout(() => {
        const shop = searchParams?.get("shop");
        const host = searchParams?.get("host");
        redirect?.dispatch(Redirect.Action.APP, `/login?shop=${shop}&host=${host}`);
      }, 3000);
      return () => clearTimeout(timer);
    }, [redirect, searchParams]);

    useEffect(() => {
      if (!isGoogleVerified || (options.requireAdmin && !isAdminUser)) {
        handleAuthRedirect();
      }
    }, [isGoogleVerified, isAdminUser, handleAuthRedirect]);

    if (!isGoogleVerified) {
      return <AuthenticationBanner type="google" onAction={handleAuthRedirect} />;
    }

    if (options.requireAdmin && !isAdminUser) {
      return <AuthenticationBanner type="admin" onAction={handleAuthRedirect} />;
    }

    return <WrappedComponent {...props} />;
  };
}