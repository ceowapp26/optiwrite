import React from 'react';
import { Button, ButtonProps } from '@shopify/polaris';
import { useGeneralContext } from "@/context/GeneralContextProvider";

interface ButtonHandlerProps extends Omit<ButtonProps, 'loading' | 'disabled' | 'submit' | 'onClick'> {
  id: string;
  isDisabled: boolean;
  onClickOrType: "submit" | ((e: React.MouseEvent<HTMLButtonElement>) => void);
  text: string;
  submitType?: string;
}

const ButtonHandler: React.FC<ButtonHandlerProps> = ({ 
  id,
  isDisabled, 
  onClickOrType, 
  text, 
  submitType,
  ...restProps
}) => {
  const { submitTypeRef } = useGeneralContext();
  if (submitTypeRef && submitType) {
    submitTypeRef.current = submitType;
  }
  const isSubmitType = onClickOrType === "submit";
  return (
    <Button
      {...restProps}
      id={id}
      loading={isDisabled}
      variant={isSubmitType ? "primary" : "secondary"}
      submit={isSubmitType ? true : false}
      disabled={isDisabled}
      accessibilityLabel={isSubmitType ? "publish" : "cancel"}
      onClick={isSubmitType ? undefined : (onClickOrType as (e: React.MouseEvent<HTMLButtonElement>) => void)}
    >
      {text}
    </Button>
  );
};

export default ButtonHandler;



