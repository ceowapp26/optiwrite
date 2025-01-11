import React from 'react';
import DownChevronArrow from '@/icons/DownChevronArrow';
import BaseButton from './base-button';

const DownButton = ({
  onClick,
}: {
  onClick: React.MouseEventHandler<HTMLButtonElement>;
}) => {
  return (
    <BaseButton
      icon={<DownChevronArrow />}
      buttonProps={{ 'aria-label': 'shift message down' }}
      onClick={onClick}
    />
  );
};

export default DownButton;