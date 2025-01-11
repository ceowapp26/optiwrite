import React from 'react';
import { Button, ButtonProps } from '@shopify/polaris';
import { useGeneralContext, useGeneralActions } from '@/context/GeneralContextProvider';
import { useShopifyPayment } from '@/hooks/useShopifyPayment';
import { useFormContext } from 'react-hook-form';
import { CreditPaymentInfo } from '@/types/billing';

interface ButtonHandlerProps extends Omit<ButtonProps, 'loading' | 'disabled' | 'submit' | 'onClick'> {
  isDisabled: boolean;
  shopName: string;
  accessToken: string;
  onPurchase: (packageId: string, isCustom: boolean, paymentData?: CreditPaymentInfo) => void;
}

const ButtonHandler: React.FC<ButtonHandlerProps> = ({ 
  isDisabled, 
  shopName,
  accessToken,
  onPurchase,
  ...restProps 
}) => {
  const { state } = useGeneralContext();
  const { setCurrentStep } = useGeneralActions();
  const { currentStep, paymentType } = state;
  const { onCalculatePrice } = useShopifyPayment({ shopName, accessToken, onPurchase });
  const { watch, trigger } = useFormContext();

  const handleCalculatePrice = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const isValid = await trigger(['credits', 'currency']);

    if (isValid) {
      const credits = watch('credits');
      const currencyCode = watch('currency');
      await onCalculatePrice(credits, currencyCode, setCurrentStep);
    }
  };

  const isCreditFirstStep = paymentType === 'CREDIT' && currentStep === 0;

  const buttonProps = {
    id: "credit",
    variant: "primary" as const,
    submit: isCreditFirstStep ? false : true,
    accessibilityLabel: "credit",
    loading: !isCreditFirstStep && isDisabled,
    disabled: !isCreditFirstStep && isDisabled,
    onClick: isCreditFirstStep ? handleCalculatePrice : undefined,
    ...restProps
  };

  return (
    <Button
      {...buttonProps}
    >
      {isCreditFirstStep ? 'Continue' : 'Purchase'}
    </Button>
  );
};

export default ButtonHandler;