import React, { ReactNode } from "react";
import { SessionProvider } from "@/providers/SessionProvider";

interface BillingPageLayoutProps {
  children: React.ReactNode;
}

const BillingPageLayout = React.memo(({ children }: { children: React.ReactNode }) => {
  return (
    <>{children}</>
  );
});

BillingPageLayout.displayName = 'BillingPageLayout';

export default BillingPageLayout;

