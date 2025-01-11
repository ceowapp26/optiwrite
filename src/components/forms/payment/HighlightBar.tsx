'use client';
import { useGeneralContext } from '@/context/GeneralContextProvider';
import { cn } from '@/lib/utils';
import React from 'react';

type Props = {};

const HighLightBar: React.FC<Props> = () => {
  const { state } = useGeneralContext();
  const { currentStep } = state;

  return (
    <div className="w-full py-16 flex flex-row justify-center">
      <div className="grid grid-cols-2 gap-2 min-w-[60%]">
        <div
          className={cn(
            'rounded-full h-2 col-span-1',
            currentStep === 0 ? 'bg-orange' : 'bg-platinum'
          )}
        />
        <div
          className={cn(
            'rounded-full h-2 col-span-1',
            currentStep === 1 ? 'bg-orange' : 'bg-platinum'
          )}
        />
      </div>
    </div>
  );
};

export default HighLightBar;