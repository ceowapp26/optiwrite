import { AppBridgeState, ClientApplication } from '@shopify/app-bridge';
import createApp from '@shopify/app-bridge';

export function initializeAppBridge(): ClientApplication<AppBridgeState> | null {
  if (typeof window === 'undefined') return null;
  const urlParams = new URLSearchParams(window.location.search);
  const host = urlParams.get('host');
  if (!host) return;
  return createApp({
    apiKey: process.env.SHOPIFY_API_KEY!,
    host: decodeURIComponent(host),
    forceRedirect: true
  });
}
