'use client';
import '@shopify/polaris/build/esm/styles.css';
import enTranslations from '@shopify/polaris/locales/en.json';
import { AppProvider as PolarisAppProvider } from '@shopify/polaris';
import { usePathname, useSearchParams } from 'next/navigation';
import { AppBridgeProvider } from "./AppBridgeProvider";
import { ApolloProvider } from "./ApolloProvider";
import { useGeneralContext } from "@/context/GeneralContextProvider";

type Theme = 'light' | 'dark' | 'light-mobile' | 'light-high-contrast-experimental';

interface PolarisProviderProps {
  children: React.ReactNode;
}

export const ShopifyProvider: React.FC<PolarisProviderProps> = ({ children }) => {
  const { state } = useGeneralContext();
  return (
    <PolarisAppProvider 
        theme={state?.theme}
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
            DatePicker: {
              today: 'Today ',
              months: {
                january: 'January',
                february: 'February',
                march: 'March',
                april: 'April',
                may: 'May',
                june: 'June',
                july: 'July',
                august: 'August',
                september: 'September',
                october: 'October',
                november: 'November',
                december: 'December',
              },
              daysOfWeek: {
                sunday: 'Sunday',
                monday: 'Monday',
                tuesday: 'Tuesday',
                wednesday: 'Wednesday',
                thursday: 'Thursday',
                friday: 'Friday',
                saturday: 'Saturday',
              },
              weekdaysShort: {
                sunday: 'Su',
                monday: 'Mo',
                tuesday: 'Tu',
                wednesday: 'We',
                thursday: 'Th',
                friday: 'Fr',
                saturday: 'Sa',
              }
            }
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




