import React from 'react';
import RefreshIcon from '@/icons/RefreshIcon';
import BaseButton from './base-button';

const RefreshButton = ({
  onClick,
}: {
  onClick: React.MouseEventHandler<HTMLButtonElement>;
}) => {
  return (
    <BaseButton
      icon={<RefreshIcon />}
      buttonProps={{ 'aria-label': 'regenerate message' }}
      onClick={onClick}
    />
  );
};

export default RefreshButton;