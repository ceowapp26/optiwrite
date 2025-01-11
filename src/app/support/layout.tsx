import React, { ReactNode } from "react";
import { SessionProvider } from "@/providers/SessionProvider";

interface SupportPageLayoutProps {
  children: React.ReactNode;
}

const SupportPageLayout = React.memo(({ children }: { children: React.ReactNode }) => {
  return (
    <>{children}</>
  );
});

SupportPageLayout.displayName = 'SupportPageLayout';

export default SupportPageLayout;

