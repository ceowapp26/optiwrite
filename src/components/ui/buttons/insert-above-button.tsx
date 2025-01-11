import React from 'react';
import { BetweenVerticalStart } from 'lucide-react';
import BaseButton from './base-button';

const InsertBelowButton = ({
  onClick,
}: {
  onClick: React.MouseEventHandler<HTMLButtonElement>;
}) => {
  return (
    <BaseButton
      icon={<BetweenVerticalStart />}
      buttonProps={{ 'aria-label': 'shift message up' }}
      onClick={onClick}
    />
  );
};

export default InsertBelowButton;
