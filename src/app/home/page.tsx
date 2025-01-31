"use client"
import SessionProvider from '@/providers/SessionProvider';
import HomePage from '../_components/HomePage';

export default function Home() {
  return (
    <SessionProvider>
      {({ appSession }) => (
       <HomePage session={appSession} />
      )}
    </SessionProvider>
  );
}

Home.displayName = 'Home';
