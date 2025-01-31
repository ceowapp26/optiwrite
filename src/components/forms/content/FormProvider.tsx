import React, { useCallback, useRef, useEffect } from 'react';
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
  const formRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
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
    if (contentRef.current) {
      contentRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
    onHandleSubmit(e);
  };
  useEffect(() => {
    if (loading && formRef.current) {
      formRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'end'
      });
    }
  }, [loading]);
  return (
    <FormProvider {...methods}>
      <Form onSubmit={handleSubmit}>
        <FormLayout>
          <div ref={formRef} className="flex flex-col items-center justify-between gap-3 w-full h-full">
            <div className="min-w-full" ref={contentRef}>
              {children}
            </div>
          </div>
        </FormLayout>
      </Form>
    </FormProvider>
  );
};

export default AppFormProvider;