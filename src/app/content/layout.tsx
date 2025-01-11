import React, { ReactNode } from "react";
import { ModalProvider } from "@/components/editor/ModalProvider";
import SessionProvider from "@/providers/SessionProvider";

interface ContentPageLayoutProps {
  children: ReactNode;
}

const ContentPageLayout = React.memo(({ children }: ContentPageLayoutProps) => {
  return (
    <SessionProvider>
      <ModalProvider />
      {children}
    </SessionProvider>
  );
});

ContentPageLayout.displayName = "ContentPageLayout";

export default ContentPageLayout;
