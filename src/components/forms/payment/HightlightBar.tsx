'use client';
import { useGeneralContext } from '@/context/GeneralContextProvider';
import { cn } from '@/lib/utils';
import React from 'react';

type Props = {};

const HighLightBar: React.FC<Props> = () => {
  const { currentStep, paymentType } = useGeneralContext();

  return (
    <div className="grid grid-cols-5 gap-5">
      <div
        className={cn(
          'rounded-full h-2 col-span-1',
          currentStep === 1 ? 'bg-orange' : 'bg-platinum'
        )}
      />
      <div
        className={cn(
          'rounded-full h-2 col-span-1',
          currentStep === 2 ? 'bg-orange' : 'bg-platinum'
        )}
      />
      <div
        className={cn(
          'rounded-full h-2 col-span-1',
          currentStep === 3 ? 'bg-orange' : 'bg-platinum'
        )}
      />
      <div
        className={cn(
          'rounded-full h-2 col-span-1',
          currentStep === 4 ? 'bg-orange' : 'bg-platinum'
        )}
      />
      <div
        className={cn(
          'rounded-full h-2 col-span-1',
          currentStep === 5 ? 'bg-orange' : 'bg-platinum'
        )}
      />
    </div>
  );
};

export default HighLightBar;