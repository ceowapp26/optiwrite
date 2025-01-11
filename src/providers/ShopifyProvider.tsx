'use client';
import '@shopify/polaris/build/esm/styles.css';
import enTranslations from '@shopify/polaris/locales/en.json';
import { AppProvider as PolarisAppProvider } from '@shopify/polaris';
import { usePathname, useSearchParams } from 'next/navigation';
import { AppBridgeProvider } from "./AppBridgeProvider";
import { ApolloProvider } from "./ApolloProvider";

interface PolarisProviderProps {
  children: React.ReactNode;
}

export const ShopifyProvider: React.FC<PolarisProviderProps> = ({ children }) => {
  return (
      <PolarisAppProvider
        i18n={{
          Polaris: {
            Avatar: {
              label: 'Avatar',
              labelWithInitials: 'Avatar with initials {initials}',
            },
            ContextualSaveBar: {
              save: 'Save',
              discard: 'Discard',
            },
            TextField: {
              characterCount: '{count} characters',
            },
            TopBar: {
              toggleMenuLabel: 'Toggle menu',

              SearchField: {
                clearButtonLabel: 'Clear',
                search: 'Search',
              },
            },
            Modal: {
              iFrameTitle: 'body markup',
            },
            Frame: {
              skipToContent: 'Skip to content',
              navigationLabel: 'Navigation',
              Navigation: {
                closeMobileNavigationLabel: 'Close navigation',
              },
            },
          },
        }}
      >
        <AppBridgeProvider>
          <ApolloProvider>
            {children}
          </ApolloProvider>
        </AppBridgeProvider>
    </PolarisAppProvider>
  );
};




