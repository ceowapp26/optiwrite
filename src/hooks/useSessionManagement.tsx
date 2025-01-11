"use client"
import { useEffect } from 'react';
import { useAppDispatch } from '@/hooks/useLocalStore';
import { usePathname } from 'next/navigation';
import { Auth, storeSession, selectSession, reset } from "@/stores/features/authSlice";
import { useAuthStore } from "@/hooks/useLocalStore";

interface SessionData {
  sessionId?: string;
  email?: string;
}

export const useSessionManagement = () => {
  const dispatch = useAppDispatch();
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname) return;
    const extractUrlParam = (pattern: RegExp): string | undefined => {
      const match = pathname.match(pattern);
      return match?.[1];
    };
    const patterns = {
      sessionId: /\?ssid=([^&]+)/,
      email: /&&sml=([^?]+)/
    };
    const sessionData: SessionData = {
      sessionId: extractUrlParam(patterns.sessionId)?.then(sessionId => sessionId ? decodeURIComponent(sessionId) : undefined),
      email: extractUrlParam(patterns.email)?.then(email => email ? decodeURIComponent(email) : undefined)
    };
    const hasAnyValue = Object.values(sessionData).some(value => value !== undefined);
    if (hasAnyValue) {
      const cleanSessionData = Object.entries(sessionData)
        .reduce((acc, [key, value]) => {
          if (value !== undefined) {
            acc[key] = value;
          }
          return acc;
        }, {} as SessionData);
      dispatch(store(cleanSessionData));
      console.debug('Session updated with:', cleanSessionData);
    }
  }, [pathname]);
};

