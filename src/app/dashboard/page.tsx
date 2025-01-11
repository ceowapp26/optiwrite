"use client"
import SessionProvider from '@/providers/SessionProvider';
import DashboardPage from './_components/DashboardPage';

export default function Dashboard() {
  return (
    <SessionProvider requireGoogle>
      {({ appSession }) => (
       <DashboardPage session={appSession} />
      )}
    </SessionProvider>
  );
}

Dashboard.displayName = 'Dashboard';
