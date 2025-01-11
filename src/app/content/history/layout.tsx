import React, { ReactNode } from "react";
import { SessionProvider } from "@/providers/SessionProvider";

interface HistoryPageLayoutProps {
  children: React.ReactNode;
}

const HistoryPageLayout = React.memo(({ children }: { children: React.ReactNode }) => {
  return (
    <>{children}</>
  );
});

HistoryPageLayout.displayName = 'HistoryPageLayout';

export default HistoryPageLayout;

