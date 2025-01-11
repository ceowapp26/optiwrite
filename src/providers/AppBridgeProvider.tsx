'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { initializeAppBridge } from '@/utils/utilities';
import { AppBridgeState, ClientApplication } from '@shopify/app-bridge';
import { PageLoader } from "@/components/PageLoader";

interface AppBridgeContextType {
  app: ClientApplication<AppBridgeState> | null;
  isAppBridgeInitialized: boolean;
}

const AppBridgeContext = createContext<AppBridgeContextType>({
  app: null,
  isAppBridgeInitialized: false,
});

export function useAppBridge() {
  const context = useContext(AppBridgeContext);
  if (context === undefined) {
    throw new Error('useAppBridge must be used within an AppBridgeProvider');
  }
  return context;
}

interface AppBridgeProviderProps {
  children: React.ReactNode;
}

export function AppBridgeProvider({ children }: AppBridgeProviderProps) {
  const [isAppBridgeInitialized, setIsAppBridgeInitialized] = useState(false);
  const [app, setApp] = useState<ClientApplication<AppBridgeState> | null>(null);

  useEffect(() => {
    const appInstance = initializeAppBridge();
    if (appInstance) {
      setApp(appInstance);
      setIsAppBridgeInitialized(true);
    }
  }, []);

  return (
    <AppBridgeContext.Provider 
      value={{ app, isAppBridgeInitialized }}
    >
      {children}
    </AppBridgeContext.Provider>
  );
}