"use client"
import SessionProvider from '@/providers/SessionProvider';
import ContentHistory from '@/components/content/ContentHistory';

export default function History() {
  return (
    <SessionProvider>
      {({ appSession }) => (
       <ContentHistory session={appSession} />
      )}
    </SessionProvider>
  );
}

History.displayName = 'History';
