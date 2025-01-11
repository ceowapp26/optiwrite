"use client";

import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { type AppSession, type UserIds } from '@/types/auth';
import { useEdgeStore } from '@/lib/edgestore';
import OptiwriteEditor from './OptiwriteEditor';
import { JSONContent } from "novel";

interface EditorProps {
  contentId?: string;
  contentTitle?: string;
  initialContent?: string;
  onChange: (value: string) => void;
  handleShopifyAI?: (shopName: string, userId: string, action: string, content: string) => Promise<any>;
}

const Editor = ({ onChange, contentId, contentTitle, initialContent, handleShopifyAI}: EditorProps) => {
  const { resolvedTheme } = useTheme();
  return (
    <React.Fragment>
      <OptiwriteEditor 
        contentId={contentId} 
        contentTitle={contentTitle} 
        initialContent={initialContent} 
        onChange={onChange} 
        handleShopifyAI={handleShopifyAI}
      />
    </React.Fragment>
  );
};

export default Editor;
































