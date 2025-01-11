"use client"
import SessionProvider from '@/providers/SessionProvider';
import ContentTemplate from './_components/ContentTemplate';

export default function Template() {
  return (
    <SessionProvider>
      {({ appSession }) => (
       <ContentTemplate session={appSession} />
      )}
    </SessionProvider>
  );
}

Template.displayName = 'Template';
