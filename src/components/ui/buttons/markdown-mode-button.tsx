import React, { useState } from 'react';
import { useDocumentStore } from '@/stores/features/apps/document/store';
import BaseButton from './base-button';
import MarkdownIcon from '@/icons/MarkdownIcon';
import FileTextIcon from '@/icons/FileTextIcon';

const MarkdownModeButton = () => {
  const markdownMode = useDocumentStore((state) => state.markdownMode);
  const setMarkdownMode = useDocumentStore((state) => state.setMarkdownMode);

  return (
    <BaseButton
      icon={markdownMode ? <MarkdownIcon /> : <FileTextIcon />}
      buttonProps={{ 'aria-label': 'toggle markdown mode' }}
      onClick={() => {
        setMarkdownMode(!markdownMode);
      }}
    />
  );
};

export default MarkdownModeButton;