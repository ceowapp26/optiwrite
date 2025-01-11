import React from 'react';
import { BetweenHorizontalStart } from 'lucide-react';
import BaseButton from './base-button';

const InsertRightButton = ({
  onClick,
}: {
  onClick: React.MouseEventHandler<HTMLButtonElement>;
}) => {
  return (
    <BaseButton
      icon={<BetweenHorizontalStart className='rotate-180' />}
      buttonProps={{ 'aria-label': 'shift message up' }}
      onClick={onClick}
    />
  );
};

export default InsertRightButton;
