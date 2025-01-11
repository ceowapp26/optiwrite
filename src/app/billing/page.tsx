"use client"
import SessionProvider from '@/providers/SessionProvider';
import BillingPage from './_components/BillingPage';

export default function Billing() {
  return (
    <SessionProvider>
      {({ appSession }) => (
       <BillingPage session={appSession} />
      )}
    </SessionProvider>
  );
}

Billing.displayName = 'Billing';
