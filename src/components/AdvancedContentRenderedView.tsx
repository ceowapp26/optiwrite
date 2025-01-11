import React, { useMemo, useState, useEffect, useCallback, memo } from 'react';
import {
  Listbox,
  TextField,
  Icon,
  Link,
  Popover,
  AutoSelection,
  Scrollable,
  EmptySearchResult,
  Text,
  InlineStack,
  Box,
  BlockStack,
  Button,
  Select,
  Checkbox,
  Tag,
  Tooltip,
  Card,
  Badge,
  Spinner
} from '@shopify/polaris';
import { 
  CashDollarIcon, 
  MeasurementWeightIcon, 
  MoneyFilledIcon, 
  CashDollarFilledIcon,
  CatalogIcon,
  LightbulbIcon, 
  SearchIcon, 
  InfoIcon,
  ProductIcon,
  MaximizeIcon,
  MinimizeIcon
} from '@shopify/polaris-icons';
import styled from 'styled-components';
import { type product } from '@/types/product';
import ImageCarousel from '@/components/ImageCarousel';
import { ContentCategory } from '@/types/product';

const StyledCard = styled(Box)`
  transition: all 0.3s ease;
  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--p-shadow-500);
  }
`;

const StyledMetricCard = styled(Box)`
  background: var(--p-surface);
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  border: 1px solid var(--p-border-subdued);
  transition: all 0.2s ease;
  
  &:hover {
    border-color: var(--p-border-highlight);
    background: var(--p-surface-hovered);
  }
`;

const ImageContainer = styled(Box)`
  border-radius: 16px;
  overflow: hidden;
  box-shadow: var(--p-shadow-300);
`;

interface FooterBarProps {
  product: product;
  eventType: string;
  onAction?: (eventType: string, product: product) => void;
  onCancel?: () => void;
  cancelLabel?: string;
  loading: boolean;
}

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount || 0);
};

const FooterBar: React.FC<FooterBarProps> = ({
  product,
  onAction,
  onCancel,
  eventType,
  cancelLabel = 'Cancel',
  loading
}) => {
  const contentType = product?.contentType || 'Content';
  
  return (
    <Box padding="400" background="bg-surface" borderRadius="200" shadow="200">
      <InlineStack gap="200" align="center" blockAlign="center" justify="end">
        <Button plain onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button loading={loading} disabled={loading} primary onClick={() => onAction?.(`${eventType}_${contentType}`, product)}>
          {`${eventType} ${contentType}`}
        </Button>
      </InlineStack>
    </Box>
  );
};

interface AdvancedContentRenderedViewProps {
  product: product;
  isFullScreen: boolean; 
  onToggleFullScreen: () => void;
  loading: boolean;
}

const AdvancedContentRenderedView: React.FC<AdvancedContentRenderedViewProps> = ({
  product,
  isFullScreen,
  onToggleFullScreen,
  loading
}) => {
  const theme = localStorage.getItem("theme");

  const TagsList = memo(({ tags }: { tags: string }) => {
    if (!tags) return null;
    return (
      <Box paddingBlockStart="300">
        <InlineStack gap="200" wrap={false}>
          <Text variant="headingMd">Tags:</Text>
          <Box>
            <InlineStack gap="200" wrap>
              {tags.split(",").map((tag, index) => (
                <Box padding="100" key={index}>
                  <InlineStack gap="100" align="center">
                    <ProductIcon className={`w-5 h-5 ${theme === 'light' ? 'fill-gray-800' : 'fill-gray-200'}`} />
                    <Box maxWidth="32">
                      <Tag>{tag.trim()}</Tag>
                    </Box>
                  </InlineStack>
                </Box>
              ))}
            </InlineStack>
          </Box>
        </InlineStack>
      </Box>
    );
  });

  const MetricCard = ({ icon: IconComponent, label, value, tooltip }) => (
    <Card>
      <StyledMetricCard>
        <BlockStack gap="200" align="center" inlineAlign="start">
          <InlineStack gap="200" align="space-between" blockAlign="center">
            <IconComponent className={`w-5 h-5 ${theme === 'light' ? 'fill-gray-800' : 'fill-gray-200'}`} />
            <Text variant="headingSm" as="h3">{label}</Text>
          </InlineStack>
          <InlineStack gap="200" align="center" blockAlign="center">
            <Text variant="headingLg" as="p" fontWeight="bold">
              {value}
            </Text>
            {tooltip && (
              <Tooltip content={tooltip}>
                <InfoIcon className={`w-5 h-5 ${theme === 'light' ? 'fill-gray-800' : 'fill-gray-200'}`} />
              </Tooltip>
            )}
          </InlineStack>
        </BlockStack>
      </StyledMetricCard>
    </Card>
  );

  const renderMetricCards = useMemo(() => {
    const isFieldIncluded = (fieldValue: string) => {
      return Object.keys(product).includes(fieldValue);
    };
    const hasFinancialFields = Object.keys(product).some(field => 
      ['price', 'costPerItem', 'profit', 'weight'].includes(field)
    );
    if (!hasFinancialFields) return null;
    return (
      <Box
        background="bg-surface"
        padding="300"
        borderRadius="200"
        shadow="200"
      >
        <BlockStack inlineAlin="center" align="center" gap="400">
          <Text variant="headingMd" as="h2">Product Details</Text>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
           {isFieldIncluded('price') && (
              <MetricCard
                icon={CashDollarIcon}
                label="Selling Price"
                value={formatCurrency(product.price)}
                tooltip="Current market price"
              />
            )}
            
            {isFieldIncluded('costPerItem') && (
              <MetricCard
                icon={CashDollarFilledIcon}
                label="Cost Per Item"
                value={formatCurrency(product.costPerItem)}
                tooltip="Unit production cost"
              />
            )}
            
            {isFieldIncluded('profit') && (
              <MetricCard
                icon={MoneyFilledIcon}
                label="Profit Margin"
                value={formatCurrency(product.profit)}
                tooltip="Profit per unit sold"
              />
            )}
            
            {isFieldIncluded('weight') && (
              <MetricCard
                icon={MeasurementWeightIcon}
                label="Weight"
                value={`${product.weight || 0} kg`}
                tooltip="Product weight in kilograms"
              />
            )}
          </div>
        </BlockStack>
      </Box>
    );
  }, [product]);

  if (!product) return null;

  return (
    <Box width="100%" padding="300" background="bg-surface" borderRadius="300">
      <Box paddingBlock="300">
        <Badge size="large" tone="info">
          <Text variant="headingMd" as="h3" fontWeight="bold">
            Content Preview
          </Text>
        </Badge>
      </Box>
      <BlockStack gap="600">
        <StyledCard>
          <Box background="bg-surface-strong" borderRadius="300" padding="600">
            <BlockStack gap="300">
              <InlineStack align="space-between" gap="200">
                <Text variant="heading2xl" as="h2" fontWeight="bold">
                  {product?.title}
                </Text>
              </InlineStack>
              <InlineStack align="start" gap="200">
                {product?.category && <Badge size="large" tone="attention">{product.category}</Badge>}
              </InlineStack>
            </BlockStack>
          </Box>
        </StyledCard>
        <ImageContainer>
          <ImageCarousel images={product?.images || []} />
        </ImageContainer>
        <StyledCard>
        {renderMetricCards}
        </StyledCard>
        {product?.bodyContent && (
          <StyledCard>
            <Card background="bg-surface-strong">
              <Box padding="400">
                <BlockStack gap="300">
                  <Text variant="headingMd">Product Description</Text>
                  <Box dangerouslySetInnerHTML={{ __html: product.bodyContent }} />
                </BlockStack>
              </Box>
            </Card>
          </StyledCard>
        )}
        <StyledCard>
          <Card background="bg-surface-strong">
            <Box padding="400">
              <BlockStack inlineAlign="center" gap="400">
                <InlineStack gap="200" align="center">
                  <SearchIcon className={`w-5 h-5 ${theme === 'light' ? 'fill-gray-800' : 'fill-gray-200'}`} />
                  <Text variant="headingMd">SEO & Metadata</Text>
                </InlineStack>
                <Box className="grid md:grid-cols-2 gap-4">
                  {['pageTitle', 'metaDescription'].map((field) => (
                    product[field as keyof typeof product] && (
                      <Box key={field} padding="300" background="bg-surface" borderRadius="200">
                        <BlockStack gap="200">
                          <Text variant="bodySm" tone="subdued">
                            {field === 'pageTitle' ? 'Page Title' : 'Meta Description'}
                          </Text>
                          <Text variant="bodyMd">{product[field as keyof typeof product]}</Text>
                        </BlockStack>
                      </Box>
                    )
                  ))}
                </Box>
              </BlockStack>
            </Box>
          </Card>
        </StyledCard>
        {product?.tags && (
          <Box>
            <TagsList tags={product.tags} />
          </Box>
        )}
      </BlockStack>
    </Box>
  );
};

export default memo(AdvancedContentRenderedView);