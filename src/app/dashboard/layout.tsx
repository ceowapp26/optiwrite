import React, { ReactNode } from "react";
import { SessionProvider } from "@/providers/SessionProvider";

interface DashboardPageLayoutProps {
  children: React.ReactNode;
}

const DashboardPageLayout = React.memo(({ children }: { children: React.ReactNode }) => {
  return (
    <>{children}</>
  );
});

DashboardPageLayout.displayName = 'DashboardPageLayout';

export default DashboardPageLayout;

