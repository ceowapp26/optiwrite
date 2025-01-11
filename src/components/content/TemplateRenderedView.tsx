import React, { useMemo } from 'react';
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
  BlogIcon,
  NoteIcon,
} from '@shopify/polaris-icons';
import { type CONTENT } from '@/types/content';
import ImageCarousel from '@/components/ImageCarousel';
import { ContentCategory } from '@/types/content';
import { formatContent } from '@/helpers/formatHtml';

interface TopBarProps {
  content: CONTENT;
  onOpenEditMode: () => void;
  onToggleFullScreen: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ content, onOpenEditMode, onToggleFullScreen }) => {
  return (
    <div className="flex gap-2">
      <Badge>Preview</Badge>
      <Button
        plain
        onClick={onToggleFullScreen}
      >
        Toggle Fullscreen
      </Button>
      <Button
        plain
        onClick={() => onOpenEditMode?.(content.id)}
      >
        Edit Mode
      </Button>
    </div>
  );
};

interface FooterBarProps {
  content: CONTENT;
  eventType: string;
  contentType;
  onAction?: () => void;
  onCancel?: () => void;
  cancelLabel?: string;
  loading: boolean;
}

const FooterBar: React.FC<FooterBarProps> = ({
  content,
  onAction,
  onCancel,
  eventType,
  contentType,
  cancelLabel = 'Cancel',
  loading
}) => {
  return (
    <Box padding="400" background="bg-surface" borderRadius="200" shadow="200">
      <InlineStack gap="200" align="center" blockAlign="center" justify="end">
        <Button plain onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button loading={loading} disabled={loading} primary onClick={() => onAction(`${eventType}_${contentType}`, content)}>
          {`${eventType} ${contentType}`}
        </Button>
      </InlineStack>
    </Box>
  );
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount || 0);
};

const MetricCard = React.memo(({ icon: IconComponent, label, value, tooltip }) => (
  <Card>
    <Box padding="400">
      <BlockStack gap="200">
        <InlineStack gap="200" align="center">
          <IconComponent className="w-5 h-5" />
          <Text variant="headingSm" as="h3">{label}</Text>
        </InlineStack>
        <InlineStack gap="200" align="center" blockAlign="center">
          <Text variant="headingLg" as="p" fontWeight="bold">
            {value}
          </Text>
          {tooltip && (
            <Tooltip content={tooltip}>
              <InfoIcon className="w-4 h-4 text-subdued" />
            </Tooltip>
          )}
        </InlineStack>
      </BlockStack>
    </Box>
  </Card>
));

const TagsList = React.memo(({ tags }) => {
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
                  <ProductIcon className="w-5 h-5" />
                  <div className="max-w-32">
                    <Tag>{tag.trim()}</Tag>
                  </div>
                </InlineStack>
              </Box>
            ))}
          </InlineStack>
        </Box>
      </InlineStack>
    </Box>
  );
});

const ProductDisplay = ({ product }) => {
  return (
    <Box padding="600" background="bg-surface" borderRadius="300">
      <BlockStack gap="600">
        {/* Hero Section */}
        <Box background="bg-surface-strong" borderRadius="300" padding="600">
          <BlockStack gap="400">
            <Text variant="heading3xl" as="h1" fontWeight="bold">
              {product.title}
            </Text>
            
            {product.product_type && (
              <InlineStack gap="200">
                <Tag tone="success">{product.product_type}</Tag>
                {product.status && <Tag tone="info">{product.status}</Tag>}
              </InlineStack>
            )}
          </BlockStack>
        </Box>

        {/* Product Gallery & Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Image Gallery */}
          <div className="lg:col-span-7">
            <Box background="bg-surface-strong" borderRadius="300" padding="400">
              <ImageCarousel images={product.images || []} />
            </Box>
          </div>

          {/* Product Info */}
          <div className="lg:col-span-5">
            <BlockStack gap="400">
              {/* Pricing Card */}
              <Card background="bg-surface-strong">
                <Box padding="400">
                  <BlockStack gap="300">
                    <InlineStack gap="200" align="baseline">
                      <Text variant="heading2xl" as="p" fontWeight="bold">
                        {formatCurrency(product.variants?.[0]?.price)}
                      </Text>
                      {product.variants?.[0]?.compare_at_price && (
                        <Text variant="bodyLg" tone="subdued" textDecorationLine="line-through">
                          {formatCurrency(product.variants[0].compare_at_price)}
                        </Text>
                      )}
                    </InlineStack>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <MetricCard
                        icon={MeasurementWeightIcon}
                        label="Weight"
                        value={`${product.variants?.[0]?.weight || 0} ${product.variants?.[0]?.weight_unit || 'kg'}`}
                      />
                      <MetricCard
                        icon={MoneyFilledIcon}
                        label="SKU"
                        value={product.variants?.[0]?.sku || 'N/A'}
                      />
                    </div>
                  </BlockStack>
                </Box>
              </Card>

              {/* Description */}
              {product.body_html && (
                <Card background="bg-surface-strong">
                  <Box padding="400">
                    <BlockStack gap="300">
                      <Text variant="headingMd" as="h3">Product Description</Text>
                      <div className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{
                          __html: formatContent(product.body_html),
                        }}
                      />
                    </BlockStack>
                  </Box>
                </Card>
              )}
            </BlockStack>
          </div>
        </div>

        {/* SEO Section */}
        <Card background="bg-surface-strong">
          <Box padding="400">
            <BlockStack gap="400">
              <InlineStack gap="200" align="center">
                <SearchIcon className="w-5 h-5" />
                <Text variant="headingMd">SEO & Metadata</Text>
              </InlineStack>
              
              <div className="grid md:grid-cols-2 gap-4">
                {product.page_title && (
                  <Box padding="300" background="bg-surface" borderRadius="200">
                    <BlockStack gap="200">
                      <Text variant="bodySm" tone="subdued">Page Title</Text>
                      <Text variant="bodyMd">{product.page_title}</Text>
                    </BlockStack>
                  </Box>
                )}
                
                {product.meta_description && (
                  <Box padding="300" background="bg-surface" borderRadius="200">
                    <BlockStack gap="200">
                      <Text variant="bodySm" tone="subdued">Meta Description</Text>
                      <Text variant="bodyMd">{product.meta_description}</Text>
                    </BlockStack>
                  </Box>
                )}
              </div>
            </BlockStack>
          </Box>
        </Card>

        <TagsList tags={product.tags} />
      </BlockStack>
    </Box>
  );
};

const ArticleDisplay = ({ article }) => {
  return (
    <Box padding="600" background="bg-surface" borderRadius="300">
      <BlockStack gap="600">
        <Box background="bg-surface-strong" borderRadius="300" padding="600">
          <BlockStack gap="400">
            <Text variant="heading3xl" as="h1" fontWeight="bold">
              {article.article_title}
            </Text>
            
            <InlineStack gap="200" align="center">
              {article.article_author && (
                <InlineStack gap="200" align="center">
                  <Icon source={BlogIcon} />
                  <Text variant="bodyMd" fontWeight="semibold">
                    By {article.article_author}
                  </Text>
                </InlineStack>
              )}
              <Text variant="bodySm" tone="subdued">
                Published: {article.article_published ? 'Yes' : 'No'}
              </Text>
            </InlineStack>
          </BlockStack>
        </Box>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-12">
            <Card background="bg-surface-strong">
              <Box padding="600">
                {article.article_body_html && (
                  <div className="prose prose-lg max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: formatContent(article.article_body_html),
                    }}
                  />
                )}
              </Box>
            </Card>
          </div>

          <div className="lg:col-span-12">
            <BlockStack gap="400">
              {article.article_summary_html && (
                <Card background="bg-surface-strong">
                  <Box padding="400">
                    <BlockStack gap="300">
                      <Text variant="headingMd">Summary</Text>
                      <div className="prose prose-sm"
                        dangerouslySetInnerHTML={{
                          __html: formatContent(article.article_summary_html),
                        }}
                      />
                    </BlockStack>
                  </Box>
                </Card>
              )}
              {article.article_metafields && (
                <Card background="bg-surface-strong">
                  <Box padding="400">
                    <BlockStack gap="300">
                      <Text variant="headingMd">About the Author</Text>
                      <Text variant="bodyMd">
                        {JSON.parse(article.article_metafields)[0]?.value}
                      </Text>
                    </BlockStack>
                  </Box>
                </Card>
              )}
            </BlockStack>
          </div>
        </div>

        <TagsList tags={article.article_tags} />
      </BlockStack>
    </Box>
  );
};

const renderProductContent = (product) => <ProductDisplay product={product} />;
const renderArticleContent = (article) => <ArticleDisplay article={article} />;

interface ContentRenderedViewProps {
  content: CONTENT;
  contentType: ContentCategory;
  onOpenEditMode: () => void;
  onToggleFullScreen: () => void;
  isPreviewedMode: boolean;
  onAction?: () => void;
  onCancel?: () => void;
  loading?: boolean;
}

const TemplateRenderedView = React.memo<ContentRenderedViewProps>(({
  content,
  contentType,
  onOpenEditMode,
  onToggleFullScreen,
  isPreviewedMode,
  onAction,
  onCancel, 
  loading
}) => {
  const renderedContent = useMemo(() => {
    if (!content || !contentType) {
      return (
        <Box padding="400" background="bg-surface-caution">
          <Text>No content available</Text>
        </Box>
      );
    }
    switch (contentType) {
      case ContentCategory.PRODUCT:
        return renderProductContent(content);
      case ContentCategory.BLOG:
        return renderArticleContent(content);   
      case ContentCategory.ARTICLE:
        return renderArticleContent(content);
      default:
        return (
          <Box padding="400" background="bg-surface-caution">
            <Text>Unsupported content type</Text>
          </Box>
        );
    }
  }, [content, contentType]);

  return (
      <React.Fragment>
        {renderedContent}
      </React.Fragment>
    );
  }
);

TemplateRenderedView.displayName = "TemplateRenderedView";

export default TemplateRenderedView;
