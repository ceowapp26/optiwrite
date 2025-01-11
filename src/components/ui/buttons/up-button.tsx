import React from 'react';
import DownChevronArrow from '@/icons/DownChevronArrow';
import BaseButton from './base-button';

const UpButton = ({
  onClick,
}: {
  onClick: React.MouseEventHandler<HTMLButtonElement>;
}) => {
  return (
    <BaseButton
      icon={<DownChevronArrow className='rotate-180' />}
      buttonProps={{ 'aria-label': 'shift message up' }}
      onClick={onClick}
    />
  );
};

export default UpButton;