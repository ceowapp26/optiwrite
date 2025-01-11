import React, { ReactNode } from "react";
import { SessionProvider } from "@/providers/SessionProvider";

interface TemplatePageLayoutProps {
  children: React.ReactNode;
}

const TemplatePageLayout = React.memo(({ children }: { children: React.ReactNode }) => {
  return (
    <>{children}</>
  );
});

TemplatePageLayout.displayName = 'TemplatePageLayout';

export default TemplatePageLayout;

