"use client"
import SessionProvider from '@/providers/SessionProvider';
import ModelPage from '../_components/ModelPage';

export default function MainPage() {
  return (
    <SessionProvider>
      {({ session, isAdminUser}) => (
        <ModelPage 
          session={session} 
          isAdminUser={isAdminUser} 
        />
      )}
    </SessionProvider>
  );
}
