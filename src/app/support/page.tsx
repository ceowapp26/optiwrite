"use client"
import SessionProvider from '@/providers/SessionProvider';
import SupportPage from './_components/SupportPage';

export default function Support() {
  return (
    <SessionProvider>
      {({ appSession }) => (
        <SupportPage 
          session={appSession} 
        />
      )}
    </SessionProvider>
  );
}

Support.displayName = 'Support';

