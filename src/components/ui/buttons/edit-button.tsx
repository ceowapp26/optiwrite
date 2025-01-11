import React, { memo } from 'react';
import EditIcon2 from '@/icons/EditIcon2';
import BaseButton from './base-button';

const EditButton = memo(
  ({
    setIsEdit,
  }: {
    setIsEdit: React.Dispatch<React.SetStateAction<boolean>>;
  }) => {
    return (
      <BaseButton
        icon={<EditIcon2 />}
        buttonProps={{ 'aria-label': 'edit message' }}
        onClick={() => setIsEdit(true)}
      />
    );
  }
);

export default EditButton;