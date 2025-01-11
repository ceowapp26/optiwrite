"use client"
import SessionProvider from '@/providers/SessionProvider';
import HomePage from './_components/HomePage';

export default function Admin() {
  return (
    <SessionProvider>
      {({ session, isAdminUser }) => (
        <HomePage 
          session={session} 
          isAdminUser={isAdminUser}
        />
      )}
    </SessionProvider>
  );
}

Admin.displayName = 'Admin';

