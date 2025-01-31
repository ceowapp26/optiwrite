"use client"
import React, { ReactNode, useEffect } from "react";
import i18n from '@/i18n';

interface PageLayoutProps {
  children: React.ReactNode;
}

const AppPageLayout = React.memo(({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    document.documentElement.lang = i18n.language;
    const languageChangeHandler = (lng: string) => {
      document.documentElement.lang = lng;
    };
    i18n.on('languageChanged', languageChangeHandler);
    return () => {
      i18n.off('languageChanged', languageChangeHandler);
    };
  }, []);

  return (
    <>{children}</>
  );
});

AppPageLayout.displayName = 'AppPageLayout';

export default AppPageLayout;

