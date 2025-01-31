import React from 'react';
import { Button, ButtonProps, Tooltip } from '@shopify/polaris';
import { useGeneralContext } from "@/context/GeneralContextProvider";

const extractEvent = (submitType: string, prefix: string = 'PUBLISH_'): Event | null => {
  return submitType?.startsWith(prefix) ? submitType.replace(prefix, '') as Event : null;
};

interface ButtonHandlerProps extends Omit<ButtonProps, 'loading' | 'disabled' | 'submit' | 'onClick'> {
  loading: boolean;
  onClickOrType: "submit" | ((e: React.MouseEvent<HTMLButtonElement>) => void);
  text: string;
  submitType?: string;
  tooltipContent?: string;
}

const ButtonHandler: React.FC<ButtonHandlerProps> = ({ 
  id,
  loading,
  onClickOrType, 
  text, 
  submitType,
  tooltipContent,
  ...restProps
}) => {
  const { submitTypeRef } = useGeneralContext();
  if (submitTypeRef && submitType) {
    submitTypeRef.current = submitType;
  }
  const isSubmitType = onClickOrType === "submit";
  const button = (
    <Button
      {...restProps}
      id={id}
      loading={isSubmitType && loading} 
      variant={isSubmitType ? "primary" : "secondary"}
      submit={isSubmitType ? true : false}
      disabled={isSubmitType ? loading : !loading}
      accessibilityLabel={isSubmitType ? "publish" : "cancel"}
      onClick={isSubmitType ? undefined : (onClickOrType as (e: React.MouseEvent<HTMLButtonElement>) => void)}
    >
      {text}
    </Button>
  );
  if (tooltipContent) {
    return (
      <Tooltip content={tooltipContent}>
        {button}
      </Tooltip>
    );
  }
  return button;
};

export default ButtonHandler;