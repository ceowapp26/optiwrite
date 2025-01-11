"use client"
import SessionProvider from '@/providers/SessionProvider';
import PaymentPage from '../_components/PaymentPage';

export default function Payment() {
  return (
    <SessionProvider>
      {({ session, isAdminUser }) => (
        <PaymentPage 
          session={session} 
          isAdminUser={isAdminUser}
        />
      )}
    </SessionProvider>
  );
}

Payment.displayName = 'Payment';

