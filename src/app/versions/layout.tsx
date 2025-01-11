import React, { ReactNode } from "react";

interface PageLayoutProps {
  children: React.ReactNode;
}

const AppPageLayout = React.memo(({ children }: { children: React.ReactNode }) => {
  return (
    <>{children}</>
  );
});

AppPageLayout.displayName = 'AppPageLayout';

export default AppPageLayout;

