import {
  HttpLink,
  ApolloClient,
  InMemoryCache,
  ApolloProvider as ApolloProviderClient,
} from "@apollo/client";
import { PageLoader } from "@/components/PageLoader";
import { generateQueryParams } from '@/utils/auth/utilities';
import { authenticatedFetch } from "@shopify/app-bridge/utilities";
import { Redirect } from '@shopify/app-bridge/actions';
import deepMerge from '@shopify/app-bridge/actions/merge';
import { useAppBridge } from '@/providers/AppBridgeProvider';
import { ClientApplication, AppBridgeState } from '@shopify/app-bridge';

interface CustomFetchOptions extends RequestInit {
  headers?: Record<string, string>;
}

export function ApolloProvider({ children }: { children: React.ReactNode }) {
  const { isAppBridgeInitialized, app } = useAppBridge();

  if (!isAppBridgeInitialized || !app) {
    return (
      <div className="min-h-screen h-full flex items-center justify-center">
        <PageLoader size="lg" />
      </div>
    );
  }

  const httpLink = new HttpLink({
    uri: '/api/graphql',
    fetch: authenticatedFetch(app),
    credentials: 'include',
  });

  const client = new ApolloClient({
    link: httpLink,
    cache: new InMemoryCache(),
    defaultOptions: {
      watchQuery: {
        fetchPolicy: 'no-cache',
        errorPolicy: 'ignore',
      },
      query: {
        fetchPolicy: 'no-cache',
        errorPolicy: 'all',
      },
    },
  });
  
  return (
    <ApolloProviderClient client={client}>
      {children}
    </ApolloProviderClient>
  );
}


