import React from 'react';
import { Form, FormLayout } from '@shopify/polaris';
import { FormProvider } from 'react-hook-form';
import { useShopifySubmit } from '@/hooks/useShopifySubmit';
import ErrorBanner from '@/components/ErrorBanner';
import Loader from '@/components/Loader';

type Props = {
  shopName: string;
  accessToken: string;
  children: React.ReactNode;
};

const AppFormProvider: React.FC<Props> = ({ shopName, accessToken, children }) => {
  if (!shopName || !accessToken) {
    console.warn("Shop name or access token is missing.");
    return <ErrorBanner errors={["Missing credentials."]} />;
  }
  const { methods, onHandleSubmit, loading } = useShopifySubmit({ shopName, accessToken });

  const handleSubmit = (e: React.FormEvent) => {
    if (!(e.nativeEvent instanceof SubmitEvent) || 
        !(e.nativeEvent.submitter instanceof HTMLElement) ||
        e.nativeEvent.submitter?.type !== 'submit'
      ) {
      e.preventDefault();
      return;
    }
    onHandleSubmit?.(e);
  };

  return (
    <FormProvider {...methods}>
      <Form onSubmit={handleSubmit}>
        <FormLayout>
          <div className="flex flex-col items-center justify-center gap-3 h-full min-w-full">
            <Loader loading={loading}>{children}</Loader>
          </div>
        </FormLayout>
      </Form>
    </FormProvider>
  );
};

export default AppFormProvider;
