import {
  CreditPaymentProps,
  CreditPaymentSchema,
} from '@/schemas/payment.schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useGeneralContext, useGeneralActions } from '@/context/GeneralContextProvider';
import { toast } from 'sonner';
import { getSessionToken } from '@shopify/app-bridge-utils';
import { CreditPaymentInfo } from '@/types/billing';
import { pricePerUnit } from '@/constants/billing';
import { CreditService } from '@/utils/api';

export const useShopifyPayment = ({ shopName, host, accessToken,  onPurchase }: { shopName: string, host: string, accessToken: string, onPurchase: (packageId: string, isCustom: boolean, paymentData?: CreditPaymentInfo) => void }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const { state } = useGeneralContext();
  const { currentStep, paymentType, creditPaymentInfo } = state;
  const { setCurrentStep, setCreditPaymentInfo } = useGeneralActions();
  const router = useRouter();
  const [verified, setVerified] = useState(true);
  
  const methods = useForm<CreditPaymentProps>({
    resolver: zodResolver(CreditPaymentSchema),
    mode: 'onChange',
    reValidateMode: 'onChange', 
    defaultValues: {
      credits: 10,
      currency: 'USD',
    }
  });

  const onCalculatePrice = async (
    credits: number,
    currencyCode: string,
    onNext: React.Dispatch<React.SetStateAction<number>>
  ) => {
    try {
      const totalPrice = credits * pricePerUnit;
      setCreditPaymentInfo({
        ...creditPaymentInfo,
        credits,
        price: {
          amount: totalPrice,
          currencyCode: currencyCode, 
        },
      });
      onNext(1);
    } catch (error) {
      toast.error('Failed to calculate price. Please try again.');
      console.error('Calculate price error:', error);
    }
  };

  const handleSubmit = async () => {
    const paymentData: CreditPaymentInfo = {
      name: creditPaymentInfo.name,
      credits: creditPaymentInfo.credits,
      price: {
        amount: creditPaymentInfo?.price?.amount,
        currencyCode: creditPaymentInfo?.price?.currencyCode,
      }
    };
    await onPurchase(undefined, true, paymentData);
  };

  const onReset = async () => {
    try {
      setCurrentStep(0);
      setCreditPaymentInfo({
        name: '',
        credits: 0,
        price: {
          amount: 0,
          currencyCode: 'USD', 
        },
      });
      methods.reset();
      router.push('/billing');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      toast.error(errorMessage);
      throw error;
    }
  };

  const onHandleSubmit = methods.handleSubmit(async (values: CreditPaymentProps) => {
    try {
      setLoading(true);
      await handleSubmit();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit payment';
      console.error('Payment submission error:', error);
      toast.error(errorMessage);
    } finally {
      await onReset();
      setLoading(false);
    }
  });

  return {
    methods,
    onCalculatePrice,
    onHandleSubmit,
    loading,
    verified,
  };
};

