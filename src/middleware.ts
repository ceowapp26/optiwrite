import { NextRequest, NextResponse } from "next/server";
import { verifySession } from '@/utils/auth/google/verifySession';
import { redirectToLogin, generateQueryParams } from '@/utils/auth/utilities';
import { 
  API_AUTH_PREFIX, 
  AUTH_ROUTES, 
  PUBLIC_ROUTES, 
  USER_PROTECTED_ROUTES, 
  ADMIN_PROTECTED_ROUTES,
  AUTH_SIGNOUT_ROUTES, 
} from "./configs/routes";
import { decrypt } from '@/utils/crypto';
import { allowedOrigins, corsHeaders, DOMAIN } from './configs/sites';

async function setSessionCookie(cookieName: string, response: NextResponse, value: string): Promise<boolean> {
  const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: 'none' as const,
    maxAge: 24 * 60 * 60,
    path: '/',
    domain: DOMAIN
  };
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const setCookie = () => {
      try {
        const existingCookies = response.headers.get('Set-Cookie')?.split(', ') || [];
        const newCookieString = `${cookieName}=${value}; HttpOnly; Secure; SameSite=None; Max-Age=${24 * 60 * 60}; Path=/` + 
          (DOMAIN ? `; Domain=${DOMAIN}` : '');
        existingCookies.push(newCookieString);
        response.headers.set('Set-Cookie', existingCookies.join(', '));
        const cookieHeader = response.headers.get('Set-Cookie');
        if (cookieHeader && cookieHeader.includes(value)) {
          resolve(true);
          return;
        }
        if (attempts === 1) {
          const cookieArray = response.headers.get('Set-Cookie')?.split(', ') || [];
          cookieArray.push(newCookieString);
          response.headers.set('Set-Cookie', cookieArray.join(', '));
          
          if (response.headers.get('Set-Cookie')?.includes(value)) {
            resolve(true);
            return;
          }
        }
      } catch (error) {
        console.error(`Cookie appending attempt ${attempts + 1} failed:`, error);
      }
      attempts++;
      if (attempts < MAX_COOKIE_SET_ATTEMPTS) {
        setTimeout(setCookie, 100);
      } else {
        reject(new Error('Failed to append cookie after maximum attempts'));
      }
    };
    setCookie();
  });
}

export async function middleware(request: NextRequest) {
  const { search, pathname } = request.nextUrl;
  const urlSearchParams = new URLSearchParams(search);
  const params = Object.fromEntries(urlSearchParams.entries());
  const shop = urlSearchParams.get('shop');
  const host = urlSearchParams.get('host');
  const embedded = urlSearchParams.get('embedded');
  const origin = request.headers.get('origin') ?? '';
  const response = NextResponse.next();
  const isAllowedOrigin = origin && allowedOrigins.some(allowed => {
    if (allowed.includes('*')) {
      const regex = new RegExp('^' + allowed.replace('*', '.*') + '$');
      return regex.test(origin);
    }
    return allowed === origin;
  });
  if (isAllowedOrigin && origin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  } else {
    response.headers.set('Access-Control-Allow-Origin', 'https://admin.shopify.com');
  }
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Origin': isAllowedOrigin ? origin : 'https://admin.shopify.com',
      },
    });
  }
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  response.headers.set(
    "Content-Security-Policy",
    `frame-ancestors https://${shop} https://admin.shopify.com https://partners.shopify.com;`
  );
  response.headers.set('X-Frame-Options', `ALLOW-FROM https://${shop}`);
  if (host && shop && embedded) {
    setSessionCookie('shopify_host', response, host);
    setSessionCookie('shopify_shop', response, shop)
    setSessionCookie('shopify_embedded', response, embedded)
  }
  const isApiAuthRoute = pathname.startsWith(API_AUTH_PREFIX);
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route));
  const isAuthRoute = AUTH_ROUTES.some(route => pathname.startsWith(route));
  const sessionVerified = request.cookies.get('shopify_verified')?.value;
  if (isPublicRoute || isApiAuthRoute || isAuthRoute) {
    return response;
  }
  if (sessionVerified && sessionVerified === 'true') {
    const homeUrl = new URL('/versions/light', request.url);
    homeUrl.search = new URLSearchParams({
      shop,
      host: host,
    }).toString();
    return NextResponse.redirect(homeUrl, {
      headers: response.headers
    });
  } else {
    const authUrl = new URL('/', request.url);
    authUrl.search = new URLSearchParams({
      shop,
      host: host,
    }).toString();
    return NextResponse.redirect(authUrl, {
      headers: response.headers
    });
  }
}

export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon\\.ico).*)',
  ],
}

