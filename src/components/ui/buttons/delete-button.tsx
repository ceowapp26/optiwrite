import React, { memo } from 'react';
import DeleteIcon from '@/icons/DeleteIcon';
import BaseButton from './base-button';

const DeleteButton = memo(
  ({
    setIsDelete,
  }: {
    setIsDelete: React.Dispatch<React.SetStateAction<boolean>>;
  }) => {
    return (
      <BaseButton
        icon={<DeleteIcon />}
        buttonProps={{ 'aria-label': 'delete message' }}
        onClick={() => setIsDelete(true)}
      />
    );
  }
);

export default DeleteButton;