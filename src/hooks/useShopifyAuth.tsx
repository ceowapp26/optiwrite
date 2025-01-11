import { getOnlineSession, getOfflineSession, doTokenExchange, checkSessionExpires, setAuthCookies } from "@/actions/auth";
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useAppBridge } from '@/providers/AppBridgeProvider';
import { Redirect } from '@shopify/app-bridge/actions';
import { Session } from '@shopify/shopify-api';
import { DOMAIN } from '@/configs/sites';
import { useAppDispatch, useAppSelector } from "@/hooks/useLocalStore";
import { storeSession, selectSession } from "@/stores/features/authSlice";
import { useCallback, useEffect, useMemo, useState } from "react";
import { generateQueryParams } from '@/utils/auth/utilities';
import { getSessionToken } from "@shopify/app-bridge/utilities";
import { ShopifySessionCache } from "@/utils/cache";
import { useSessionManagement } from '@/hooks/useSessionManagement';

const shopifySessionCache = new ShopifySessionCache();

interface VerifyResponse {
  status: "success" | "error";
  type: "token" | "scope";
  sessionType: "offline" | "online";
  message: string;
  accountOwner?: boolean;
}

interface ShopifyTokenProps {
  shop: string | null;
  host: string | null;
  isOffline: boolean;
}

export function useAuthRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = useCallback(() => {
    if (!!router) {
      const embedded = searchParams?.get("embedded");
      const authUrl = `${process.env.SHOPIFY_HOST}/api/auth?${searchParams?.toString()}`;
      if (embedded === "1") {
        window.open(authUrl, "_top");
      } else {
        window.location.href = authUrl;
      }
    } else {
      console.error("app or router not defined");
    }
  }, [searchParams, router]);

  return redirect;
}

export function useVerifySession() {
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [accountOwner, setAccountOwner] = useState(false);
  const [sessionType, setSessionType] = useState<"offline" | "online">(
    "offline",
  );
  const [authErrorType, setAuthErrorType] = useState<"token" | "scope">(
    "token",
  );
  const router = useRouter();
  const searchParams = useSearchParams();
  const { app, isAppBridgeInitialized } = useAppBridge();

  const queryParams = useMemo(() => {
    if (router) {
      const shop = searchParams?.get("shop");
      const host = searchParams?.get("host");
      if (shop && host) {
        return generateQueryParams(shop, host)
      }
    }
    return null;
  }, [router, searchParams]);

  useEffect(() => {
    if (queryParams && app) {
      fetch(`/api/auth/verify?${queryParams.toString()}`)
        .then(async (response) => {
          setLoading(true);
          const body = (await response.json()) as VerifyResponse;
          if (body.status == "success") {
            setVerified(true);
          } else {
            setVerified(false);
            setAuthErrorType(body.type);
            setSessionType(body.sessionType);
            if (body.accountOwner) {
              setAccountOwner(true);
            }
          }
          setLoading(false);
        })
        .catch((err) => {
          console.log(err);
          setLoading(false);
          setVerified(false);
        });
    }
  }, [app, queryParams]);

  return {
    verified,
    loading,
    accountOwner,
    sessionType,
    authErrorType,
  };
}

const PARAM_KEYS = {
 sessionId: "ssid",
 email: "sml", 
} as const;

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const SESSION_REFRESH_BUFFER = 5 * 60 * 1000; 

export function useShopifySession() {
  const { app, isAppBridgeInitialized } = useAppBridge();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const { sessionId, email } = useAppSelector(selectSession);
  const shop = searchParams.get("shop");
  const [sessionState, setSessionState] = useState<ShopifySessionState>({
    online: null,
    offline: null,
    loading: true,
    verified: false,
    error: null,
  });

 const getSessionData = useCallback(() => {
    if (!searchParams) return null;
    if (sessionId && email) {
      return {
        sessionId,
        email,
      };
    }
    const sessionData = Object.entries(PARAM_KEYS).reduce((acc, [key, param]) => {
      const value = searchParams.get(param);
      if (value) {
        acc[key as keyof typeof PARAM_KEYS] = decodeURIComponent(value);
      }
      return acc;
    }, {} as Record<keyof typeof PARAM_KEYS, string>);

    if (Object.keys(sessionData).length) {
      dispatch(storeSession(sessionData));
    }
    return sessionData;
  }, [searchParams, sessionId, email, dispatch]);

   const validateSession = useCallback((
    onlineSession: ShopifySession | null,
    sessionData: Record<string, string> | null
  ) => {
    if (!onlineSession || !sessionData) return false;
    const isSessionValid = 
      sessionData.sessionId === onlineSession.id &&
      sessionData.email === onlineSession?.onlineAccessInfo?.associated_user?.email;
    return isSessionValid;
  }, []);

  const initializeSession = useCallback(async (app: any, shop: string, forceFetch = false) => {
    if (!app || !shop) {
      setSessionState(prev => ({
        ...prev,
        loading: false,
        error: {
          type: 'SHOPIFY',
          message: 'Missing required parameters',
        },
      }));
      return;
    }
    const sessionData = getSessionData();
    const cacheKey = shopifySessionCache.getKey(shop, sessionData?.sessionId || null);
    if (!forceFetch) {
      const cachedSession = shopifySessionCache.get(cacheKey);
      if (cachedSession) {
        setSessionState(cachedSession);
        return;
      }
    }
    try {
      setSessionState(prev => ({ ...prev, loading: true }));
      let token: string | null = null;
      let onlineSession: ShopifySession | null = null;
      let offlineSession: any | null = null;

      for (let retries = 0; retries < MAX_RETRIES; retries++) {
        try {
          if (!token) {
            token = await getSessionToken(app);
          }

          if (!onlineSession && sessionData) {
            onlineSession = await getOnlineSession(token, sessionData.sessionId, sessionData.email);
          }

          if (!offlineSession) {
            offlineSession = await getOfflineSession(shop);
          }

          if (onlineSession && offlineSession) break;

        } catch (error) {
          if (retries === MAX_RETRIES - 1) throw error;
          await new Promise(resolve => 
            setTimeout(resolve, RETRY_DELAY * Math.pow(2, retries))
          );
        }
      }
      if (!onlineSession || !offlineSession) {
        throw new Error('Failed to initialize sessions after multiple attempts');
      }
      if (!validateSession(onlineSession, sessionData)) {
        dispatch(storeSession({
          sessionId: onlineSession.id,
          email: onlineSession.onlineAccessInfo?.associated_user?.email,
        }));
      }
      const newSessionState = {
        online: onlineSession,
        offline: offlineSession,
        loading: false,
        verified: true,
        error: null,
      };
      shopifySessionCache.set(cacheKey, newSessionState);
      setSessionState(newSessionState);
    } catch (error) {
      console.error('Session initialization error:', error);
      shopifySessionCache.clear(cacheKey);
      setSessionState(prev => ({
        ...prev,
        loading: false,
        verified: false,
        error: {
          type: 'SHOPIFY',
          message: error instanceof Error ? error.message : 'Failed to initialize Shopify session',
        },
      }));
    }
  }, [app, getSessionData, validateSession, dispatch]);

  useEffect(() => {
    if (!isAppBridgeInitialized || !app || !shop) return;
    initializeSession(app, shop);
  }, [app, shop, isAppBridgeInitialized, initializeSession]);

  useEffect(() => {
    if (!sessionState.online?.expires) return;
    const calculateTimeToExpiry = (expiryTime: string | Date) => {
      const expiryDate = new Date(expiryTime);
      return expiryDate.getTime() - Date.now();
    };
    const timeToExpiry = calculateTimeToExpiry(sessionState.online?.expires);
    if (timeToExpiry <= 0) {
      initializeSession(app, shop);
      return;
    }
    const timer = setTimeout(() => {
      initializeSession(app, shop);
    }, Math.max(0, timeToExpiry - 60000));
    return () => clearTimeout(timer);
  }, [app, shop, sessionState, initializeSession]);

  useEffect(() => {
    return () => {
      if (shop) {
        const cacheKey = shopifySessionCache.getKey(shop, sessionState.online?.id || null);
        shopifySessionCache.clear(cacheKey);
      }
    };
  }, [shop, sessionState.online?.id]);

  // Health check(5 minutes check optional)
  /*useEffect(() => {
    if (!sessionState.verified) return;

    const healthCheck = setInterval(() => {
      const currentSession = sessionState.online;
      if (!currentSession?.expires) return;

      const expiryTime = new Date(currentSession.expires).getTime();
      const now = Date.now();

      if (expiryTime - now <= SESSION_REFRESH_BUFFER) {
        initializeSession(app, shop);
      }
    }, SESSION_REFRESH_BUFFER);

    return () => clearInterval(healthCheck);
  }, [app, shop, sessionState.verified, sessionState.online, initializeSession]);*/

  return sessionState;
}
