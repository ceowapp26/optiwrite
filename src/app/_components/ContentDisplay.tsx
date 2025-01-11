"use client";
import React from 'react';
import { type TEMPLATE } from '@/types/template';
import { ProductIcon, MaximizeIcon, RefreshIcon } from '@shopify/polaris-icons';
import { Box, Text, BlockStack, InlineStack, Tag, Badge, Button, Card } from '@shopify/polaris';

interface ProductDisplayProps {
  onToggleFullScreen: () => void;
  content: TEMPLATE;
}

const ContentDisplay: React.FC<ProductDisplayProps> = ({ content, onToggleFullScreen }) => {
  return (
    <Box width="100%" height="100%" minHeight="100vh" background="bg-surface" padding="400">
      <InlineStack align="space-between">
        <Badge icon={ProductIcon}>Preview</Badge>
        <InlineStack gap="200">
          <Button icon={MaximizeIcon} onClick={() => onToggleFullScreen()} />
          <Button icon={RefreshIcon} />
        </InlineStack>
      </InlineStack>
      <Box paddingBlockEnd="300" />
      <BlockStack gap="300">
        <Text variant="headingLg">{JSON.stringify(content)}</Text>
        <Text variant="bodyLg">
        </Text>
        
            </BlockStack>
    </Box>
  );
};

export default ContentDisplay;
