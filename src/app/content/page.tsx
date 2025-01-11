"use client"
import SessionProvider from '@/providers/SessionProvider';
import ContentHistory from '@/components/ContentHistory';

export default function ContentPage() {
  return (
    <SessionProvider>
      {({ appSession }) => (
       <ContentHistory session={appSession} />
      )}
    </SessionProvider>
  );
}

ContentPage.displayName = 'ContentPage';
