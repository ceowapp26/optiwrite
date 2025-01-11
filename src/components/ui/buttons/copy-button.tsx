import React, { useState } from 'react';
import TickIcon from '@/icons/TickIcon';
import CopyIcon from '@/icons/CopyIcon';
import BaseButton from './base-button';

const CopyButton = ({
  onClick,
}: {
  onClick: React.MouseEventHandler<HTMLButtonElement>;
}) => {
  const [isCopied, setIsCopied] = useState<boolean>(false);

  return (
    <BaseButton
      icon={isCopied ? <TickIcon /> : <CopyIcon />}
      buttonProps={{ 'aria-label': 'copy message' }}
      onClick={(e) => {
        onClick(e);
        setIsCopied(true);
        window.setTimeout(() => {
          setIsCopied(false);
        }, 3000);
      }}
    />
  );
};

export default CopyButton;