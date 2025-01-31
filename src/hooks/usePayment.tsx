import {
  CreditPaymentProps,
  CreditPaymentSchema,
} from '@/schemas/payment.schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { getCreditPackages } from '@/actions/billing';
import { CreditPaymentInfo, useGeneralContext, useGeneralActions } from '@/context/GeneralContextProvider';
import { toast } from 'sonner';
import { pricePerUnit } from '@/constants/billing';
import { CreditApiService } from '@/utils/api';

export const useShopifyPayment = ({ shopName, accessToken }: { shopName: string, accessToken: string }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const { state } = useGeneralContext();
  const { currentStep, paymentType, creditPaymentInfo } = state;
  const { setCurrentStep, setCreditPaymentInfo } = useGeneralActions();
  const router = useRouter();
  const [verified, setVerified] = useState(true);
  
  const methods = useForm<CreditPaymentProps>({
    resolver: zodResolver(CreditPaymentSchema),
    mode: 'onSubmit',
  });

  const onCalculatePrice = async (
    credits: number,
    onNext: React.Dispatch<React.SetStateAction<number>>
  ) => {
    try {
      const totalPrice = credits * pricePerUnit;
      setCreditPaymentInfo({
        ...creditPaymentInfo,
        credits,
        price: {
          amount: totalPrice,
          currencyCode: creditPaymentInfo.price.currencyCode, 
        },
      });
      onNext(1);
    } catch (error) {
      toast.error('Failed to calculate price. Please try again.');
      console.error('Calculate price error:', error);
    }
  };

  const handleSubmit = async (values: CreditPaymentProps) => {
    const totalPrice = values.credits * pricePerUnit;
    const paymentInfo: CreditPaymentInfo = {
      name: values.name,
      price: {
        amount: totalPrice,
        currencyCode: values.currencyCode,
      }
    };
    
    await CreditApiService.purchaseCredits(shopName, accessToken, paymentInfo);
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
      await handleSubmit(values);
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