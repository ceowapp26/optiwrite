"use client"
import SessionProvider from '@/providers/SessionProvider';
import HomePage from '../_components/HomePage';

export default function ContentPage() {
  return (
    <SessionProvider>
      {({ appSession }) => (
       <HomePage session={appSession} />
      )}
    </SessionProvider>
  );
}

ContentPage.displayName = 'ContentPage';
