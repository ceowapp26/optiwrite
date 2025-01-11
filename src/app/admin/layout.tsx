import React, { ReactNode } from "react";
import { SessionProvider } from "@/providers/SessionProvider";

interface AdminPageLayoutProps {
  children: React.ReactNode;
}

const AdminPageLayout = React.memo(({ children }: { children: React.ReactNode }) => {
  return (
    <>{children}</>
  );
});

AdminPageLayout.displayName = 'AdminPageLayout';

export default AdminPageLayout;

