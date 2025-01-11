"use client"
import SessionProvider from '@/providers/SessionProvider';
import AdminPage from '../_components/AdminPage';

export default function AdminUser() {
  return (
    <SessionProvider>
     {({ session, isAdminUser }) => (
        <AdminPage 
          session={session} 
          isGoogleVerified={isGoogleVerified} 
          isAdminUser={isAdminUser}
        />
      )}
    </SessionProvider>
  );
}

AdminUser.displayName = "AdminUser";

