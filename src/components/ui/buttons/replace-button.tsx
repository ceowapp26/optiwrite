import React from 'react';
import { Replace } from 'lucide-react';
import BaseButton from './base-button';

const ReplaceButton = ({
  onClick,
}: {
  onClick: React.MouseEventHandler<HTMLButtonElement>;
}) => {
  return (
    <BaseButton
      icon={<Replace />}
      buttonProps={{ 'aria-label': 'shift message up' }}
      onClick={onClick}
    />
  );
};

export default ReplaceButton;

