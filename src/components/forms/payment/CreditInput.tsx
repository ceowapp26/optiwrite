import React, { useState } from 'react';
import { FieldErrors, UseFormSetValue, FieldValues, UseFormRegister, Control } from 'react-hook-form';
import {
  Card,
  Text,
  BlockStack,
  InlineStack,
  Icon,
  Box,
  Badge,
  Tooltip,
  Banner
} from '@shopify/polaris';
import { CREDIT_PURCHASE_FORM } from '@/constants/billing';
import { 
  CashDollarIcon, 
  InfoIcon, 
  WalletIcon,
  StarIcon 
} from '@shopify/polaris-icons';
import { CreditPaymentInfo } from '@/types/billing';
import FormGenerator from './FormGenerator';
import ButtonHandler from './ButtonHandlers';

type Props = {
  register: UseFormRegister<FieldValues>;
  errors: FieldErrors<FieldValues>;
  control: Control<FieldValues>;
  shopName: string;
  accessToken: string;
  onPurchase: (packageId: string, isCustom: boolean, paymentData?: CreditPaymentInfo) => void;
};

function CreditInput({ 
  register, 
  control, 
  errors, 
  accessToken, 
  shopName, 
  onPurchase 
}: Props) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Box 
      className={`
        relative
        min-h-[500px]
        w-full lg:w-[60%]
        py-10
        ${isHovered ? 'border-hovered bg-gray-200' : 'border-subdued bg-gray-300/80'}
        shadow-300
        rounded-lg
        border-0
      `}
    >
      <Box padding="300">
        <BlockStack gap="400">
          <Box 
            padding="400" 
            background="bg-surface-secondary"
            borderRadius="200"
          >
            <BlockStack gap="600">
              <InlineStack gap="200" align="space-between">
                <InlineStack gap="300" align="center">
                  <Icon source={CashDollarIcon} tone="success" />
                  <Text variant="headingLg">Purchase Credits</Text>
                </InlineStack>
                <InlineStack align="center" blockAlign="center" gap="200">
                  <Tooltip content="Purchase credits to use for AI features and API calls">
                    <Icon source={InfoIcon} tone="warning" />
                  </Tooltip>
                  <Icon source={StarIcon} tone="warning" />
                </InlineStack>
              </InlineStack>
              <Banner status="info">
                <Text variant="bodyMd">
                  Credits can be used across all our app features
                </Text>
              </Banner>
              <InlineStack gap="200" blockAlign="center" align="center" wrap>
                <Tooltip content="Set your own credit amount">
                  <Badge tone="info" size="large">
                    <InlineStack gap="200" align="center" blockAlign="center">
                      <WalletIcon className="w-5 h-5 fill-blue-500" />
                      <Text>Custom Amount</Text>
                    </InlineStack>
                  </Badge>
                </Tooltip>
                <Tooltip content="Credits never expire">
                  <Badge tone="success">No Expiry</Badge>
                </Tooltip>
                <Tooltip content="Purchase more to save more">
                  <Badge tone="attention">Volume Discount Available</Badge>
                </Tooltip>
              </InlineStack>
            </BlockStack>
          </Box>
          <Box 
            minHeight="320px" 
            background="bg-surface-secondary"
            borderRadius="200"
            position="relative"
            padding="0"
            shadow="300"
            borderRadius="200"
          >
            <Box padding="300">
              <BlockStack gap="400">
                {CREDIT_PURCHASE_FORM.map((field) => (
                  <FormGenerator
                    key={field.id}
                    {...field}
                    register={register}
                    errors={errors}
                    control={control}
                  />
                ))}
              </BlockStack>
            </Box>
            <Box
              className="flex bottom-8 items-center justify-center absolute w-full px-14"
            >            
              <ButtonHandler 
                onPurchase={onPurchase}
                shopName={shopName}
                accessToken={accessToken}
                fullWidth
              />
            </Box>
          </Box>
        </BlockStack>
      </Box>
    </Box>
  );
}

export default CreditInput;