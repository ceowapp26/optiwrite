import { NextRequest, NextResponse } from 'next/server';
import { GoogleSessionManager } from '@/utils/storage';
import { cookies } from 'next/headers';
import { verifySession } from '@/utils/auth/google/verifySession';

export const maxDuration = 60;

export const dynamic = 'force-dynamic';

interface CookieData {
  jwtToken: string | null;
  userData: string | null;
  source: 'header' | 'cookie-store' | 'request' | null;
}

export async function getCookiesWithFallback(req: NextRequest): Promise<CookieData> {
  try {
    const cookieStore = await cookies();
    const jwtToken = cookieStore.get('google_session')?.value;
    const userData = cookieStore.get('google_user')?.value;
    if (jwtToken && userData) {
      return { jwtToken, userData, source: 'cookie-store' };
    }
  } catch (error) {
    console.warn('Cookie store access failed:', error);
  }
  try {
    const cookieHeader = req.headers.get('cookie');
    if (cookieHeader) {
      const cookies = parseCookieString(cookieHeader);
      const jwtToken = cookies['google_session'];
      const userData = cookies['google_user'];
      if (jwtToken && userData) {
        return { jwtToken, userData, source: 'header' };
      }
    }
  } catch (error) {
    console.warn('Cookie header parsing failed:', error);
  }
  try {
    const jwtToken = req.cookies.get('google_session')?.value;
    const userData = req.cookies.get('google_user')?.value;
    
    if (jwtToken && userData) {
      return { jwtToken, userData, source: 'request' };
    }
  } catch (error) {
    console.warn('Request cookies access failed:', error);
  }
  return {
    jwtToken: null,
    userData: null,
    source: null
  };
}

function parseCookieString(cookieString: string): Record<string, string> {
  return cookieString.split(';').reduce((cookies, cookie) => {
    const [name, value] = cookie.trim().split('=');
    cookies[name] = value;
    return cookies;
  }, {} as Record<string, string>);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const shop = searchParams.get('shop');
    const host = searchParams.get('host');
    if (!shop || !host) {
      return NextResponse.json(
        { error: 'Missing parameters' },
        { status: 400 }
      );
    }
    const { jwtToken, userData, source } = await getCookiesWithFallback(req);
    if (!jwtToken || !userData) {
      return NextResponse.json(
        { error: 'Token or user data not found' },
        { status: 401 }
      );
    }
    let session = null;
    try {
      const payload = await verifySession(jwtToken);
      session = await GoogleSessionManager.getSessionFromStorage(shop, host, payload.sessionToken);
    } catch (jwtError) {
      console.warn('JWT verification failed, attempting fallback:', jwtError);
      try {
        session = await GoogleSessionManager.getSessionFromStorageFallback(shop, host, userData?.userId);
      } catch (fallbackError) {
        console.error('Fallback session fetch failed:', fallbackError);
        return NextResponse.json(
          { error: 'Failed to fetch session' },
          { status: 401 }
        );
      }
    }
    if (session) {
      return NextResponse.json({ session });
    }
    return NextResponse.json(
      { error: 'Session not found' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Session fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session' },
      { status: 500 }
    );
  }
}