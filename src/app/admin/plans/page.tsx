"use client"
import SessionProvider from '@/providers/SessionProvider';
import PlanPage from '../_components/PlanPage';

export default function AdminPlan() {
  return (
    <SessionProvider>
      {({ session, isAdminUser }) => (
        <PlanPage 
          session={session} 
          isAdminUser={isAdminUser}
        />
      )}
    </SessionProvider>
  );
}

AdminPlan.displayName = "AdminPlan";

