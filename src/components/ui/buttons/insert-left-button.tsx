import React from 'react';
import { BetweenHorizontalEnd } from 'lucide-react';
import BaseButton from './base-button';

const InsertLeftButton = ({
  onClick,
}: {
  onClick: React.MouseEventHandler<HTMLButtonElement>;
}) => {
  return (
    <BaseButton
      icon={<BetweenHorizontalEnd className='rotate-180' />}
      buttonProps={{ 'aria-label': 'shift message up' }}
      onClick={onClick}
    />
  );
};

export default InsertLeftButton;

