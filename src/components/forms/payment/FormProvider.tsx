import React from 'react';
import Loader from '@/components/Loader';
import { useShopifyPayment } from '@/hooks/useShopifyPayment';
import { FormProvider } from 'react-hook-form';
import { CreditPaymentInfo } from '@/types/billing';
import ErrorBanner from '@/components/ErrorBanner';

interface ShopifyPaymentProps {
  shopName: string;
  accessToken: string;
  onPurchase: (packageId: string, isCustom: boolean, paymentData?: CreditPaymentInfo) => void;
}

export const withShopifyPayment = <P extends object>(
  WrappedComponent: React.ComponentType<P & ShopifyPaymentProps>
) => {
  return function WithShopifyPaymentComponent(
    props: P & ShopifyPaymentProps
  ) {
    const { shopName, accessToken, onPurchase, ...rest } = props;

    if (!shopName || !accessToken) {
      console.warn("Shop name or host or access token is missing.");
      return <ErrorBanner errors={["Missing credentials."]} />;
    }

    const { methods, onHandleSubmit, loading } = useShopifyPayment({ 
      shopName, 
      accessToken,
      onPurchase 
    });

    return (
      <FormProvider {...methods}>
        <form onSubmit={onHandleSubmit} className="h-full">
          <div className="flex flex-col items-center justify-between gap-3 w-full h-full">
            <Loader loading={loading}>
              <WrappedComponent
                onPurchase={onPurchase}
                shopName={shopName}
                accessToken={accessToken}
                {...(rest as P)}
              />
            </Loader>
          </div>
        </form>
      </FormProvider>
    );
  };
};