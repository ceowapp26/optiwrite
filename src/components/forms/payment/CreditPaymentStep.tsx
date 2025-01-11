'use client';
import { useGeneralContext, useGeneralActions } from '@/context/GeneralContextProvider';
import { AppBridgeState, ClientApplication } from '@shopify/app-bridge';
import React, { useState, useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import dynamic from 'next/dynamic';
import { CreditPaymentInfo } from '@/types/billing';
import { defaultCreditPaymentInfo } from '@/constants/billing';
import Spinner from '@/components/Spinner';
import CreditInput from './CreditInput';
import CreditPriceCard from './CreditPriceCard';
  
/*const CreditPriceCard = dynamic(() => import('./CreditPriceCard'), {
  ssr: false,
  loading: () => <Spinner />,
});*/

type Props = {
  shopName: string;
  accessToken: string;
  onPurchase: (packageId: string, isCustom: boolean, paymentData?: CreditPaymentInfo) => void;
};

const CreditPaymentStep: React.FC<Props> = ({ shopName, accessToken, onPurchase }) => {
  const {
    register,
    formState: { errors },
    control,
    setValue,
  } = useFormContext();  
  const { state } = useGeneralContext();
  const { setCurrentStep, setCreditPaymentInfo } = useGeneralActions();
  const { currentStep, creditPaymentInfo } = state;
  const onReturn = () => {
    setCurrentStep(0);
    setCreditPaymentInfo(defaultCreditPaymentInfo);
  }
  
  switch (currentStep) {
    case 0:
      return (
        <CreditInput
          register={register}
          errors={errors}
          control={control}
          onPurchase={onPurchase}
          shopName={shopName}
          accessToken={accessToken}
        />
      );
    case 1:
      return ( 
        <CreditPriceCard 
          onPurchase={onPurchase}
          accessToken={accessToken}
          shopName={shopName}
          creditPaymentInfo={creditPaymentInfo}
          onReturn={onReturn}
        />
      );
    default:
      return null;
  }
};

export default CreditPaymentStep;