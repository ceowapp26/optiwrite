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
  ButtonGroup,
  Text,
  Avatar,
  InlineStack,
  Box,
  BlockStack,
  Button,
  Select,
  Checkbox,
  Tag,
  Tooltip,
  Divider,
  Card,
  Badge,
} from '@shopify/polaris';

import { 
  CashDollarIcon, 
  MeasurementWeightIcon, 
  MoneyFilledIcon, 
  CalendarIcon,
  ChatIcon,
  ExternalIcon,
  ShareIcon,
  CashDollarFilledIcon,
  CatalogIcon,
  LightbulbIcon,
  SearchIcon, 
  InfoIcon,
  ProductIcon,
  BlogIcon,
  NoteIcon,
  MaximizeIcon,
  MinimizeIcon,
  EditIcon
} from '@shopify/polaris-icons';
import { type CONTENT } from '@/types/content';
import ImageCarousel from '@/components/ImageCarousel';
import { ContentCategory } from '@/types/content';
import { formatContent } from '@/helpers/formatHtml';

interface TopBarProps {
  content: CONTENT;
  onOpenEditMode: () => void;
  onToggleFullScreen: () => void;
  layoutMode?: 'tabs' | 'grid';
  isPreviewMode?: boolean;
}

const TopBar: React.FC<TopBarProps> = ({ content, onOpenEditMode, isFullScreen, onToggleFullScreen, layoutMode, isPreviewMode = false }) => {
  return (
    <Box className={isPreviewMode ? "py-10 w-full px-14" : ""}>
      <InlineStack align="space-between" blockAlign="center">
        <Box paddingBlockStart="300" paddingBlockEnd="600">
          <Badge size="large" tone="info">
            <Text variant="headingMd" as="h3" fontWeight="bold">
              Content Preview
            </Text>
          </Badge>
        </Box>
        {layoutMode && layoutMode !== "tabs" &&
          <InlineStack gap="300" blockAlign="center">
            <Button
              icon={isFullScreen ? MinimizeIcon : MaximizeIcon}
              onClick={onToggleFullScreen}
            />
            <Button
              icon={EditIcon}
              onClick={() => onOpenEditMode?.(content.id)}
            />
          </InlineStack>
        }
      </InlineStack>
    </Box>
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
      <ButtonGroup fullWidth gap="loose">
        <Button variant="secondary" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button variant="primary" loading={loading} disabled={loading} onClick={() => onAction(`${eventType}_${contentType}`, content)}>
          {`${eventType} ${contentType}`}
        </Button>
      </ButtonGroup>
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

const BlogArticleDisplay = ({ data, isFullScreen }) => {
  const authorMetadata = data.article_metafields ? 
    JSON.parse(data.article_metafields)[0]?.value : null;

  const containerClasses = isFullScreen && data?.article_title 
    ? "w-full max-w-none" 
    : "w-full max-w-3xl mx-auto";

  const gridClasses = isFullScreen && data?.article_title 
    ? "grid grid-cols-1 lg:grid-cols-12 gap-6"
    : "grid grid-cols-1 gap-6";

  const mainColumnClasses = isFullScreen && data?.article_title
    ? "lg:col-span-8"
    : "col-span-1";

  const sidebarColumnClasses = isFullScreen && data?.article_title
    ? "lg:col-span-4"
    : "col-span-1";

  return (
    <Card padding={isFullScreen ? "600" : "400"}>
      <div className={containerClasses}>
        <BlockStack gap="600">
          {(data.article_title || data.blog_commentable || data.article_author || data.article_published) && (
            <Box background="bg-surface-strong" borderRadius="300" padding="600">
              <BlockStack gap="400">
                {data.blog_commentable && (
                  <InlineStack gap="200" align="center">
                    {data.blog_title && <Tag tone="info">{data.blog_title}</Tag>}
                    {data.blog_commentable === 'yes' && (
                      <Tag tone="success">Comments Enabled</Tag>
                    )}
                  </InlineStack>
                )}
                {data.article_title && (
                  <Text variant="heading3xl" as="h1" fontWeight="bold">
                    {data.article_title}
                  </Text>
                )}
                {(data.article_author || data.article_published) && (
                  <InlineStack gap="400" align="center" wrap>
                    {data.article_author && (
                      <InlineStack gap="200" align="center">
                        <Avatar customer size="small" name={data.article_author} />
                        <Text variant="bodyMd" fontWeight="semibold">
                          {data.article_author}
                        </Text>
                      </InlineStack>
                    )}
                    {data.article_published !== undefined && (
                      <>
                        <Divider />
                        <Tag tone={data.article_published ? "success" : "warning"}>
                          {data.article_published ? "Published" : "Draft"}
                        </Tag>
                      </>
                    )}
                  </InlineStack>
                )}
              </BlockStack>
            </Box>
          )}
          <div className={gridClasses}>
            {(data.article_body_html || data.article_tags) && (
              <div className={mainColumnClasses}>
                <BlockStack gap="400">
                  {data.article_body_html && (
                    <Card background="bg-surface-strong">
                      <Box padding="600">
                        <div 
                          className="prose prose-lg max-w-none prose-headings:font-semibold prose-a:text-blue-600"
                          dangerouslySetInnerHTML={{
                            __html: formatContent(data.article_body_html),
                          }}
                        />
                      </Box>
                    </Card>
                  )}
                  {data.article_tags && (
                    <Card background="bg-surface-strong">
                      <Box padding="400">
                        <InlineStack gap="200" wrap>
                          <Icon source={ProductIcon} />
                          {data.article_tags.split(',').map((tag, index) => (
                            <Tag key={index}>{tag.trim()}</Tag>
                          ))}
                        </InlineStack>
                      </Box>
                    </Card>
                  )}
                </BlockStack>
              </div>
            )}
            {(authorMetadata || data.article_summary_html || data.blog_title || data.blog_commentable) && (
              <div className={sidebarColumnClasses}>
                <BlockStack gap="400">
                  {authorMetadata && (
                    <Card background="bg-surface-strong">
                      <Box padding="400">
                        <BlockStack gap="300">
                          <Text variant="headingMd" as="h3">About the Author</Text>
                          <InlineStack gap="300" align="center">
                            <Avatar customer size="medium" name={data.article_author} />
                            <BlockStack gap="100">
                              <Text variant="bodyMd" fontWeight="bold">
                                {data.article_author}
                              </Text>
                              <Text variant="bodySm" tone="subdued">
                                {authorMetadata}
                              </Text>
                            </BlockStack>
                          </InlineStack>
                        </BlockStack>
                      </Box>
                    </Card>
                  )}
                  {data.article_summary_html && (
                    <Card background="bg-surface-strong">
                      <Box padding="400">
                        <BlockStack gap="300">
                          <Text variant="headingMd" as="h3">Summary</Text>
                          <div 
                            className="prose prose-sm"
                            dangerouslySetInnerHTML={{
                              __html: formatContent(data.article_summary_html),
                            }}
                          />
                        </BlockStack>
                      </Box>
                    </Card>
                  )}
                  {(data.blog_title || data.blog_feedburner || data.blog_tags) && (
                    <Card background="bg-surface-strong">
                      <Box padding="400">
                        <BlockStack gap="300">
                          <Text variant="headingMd" as="h3">Blog Information</Text>
                          <BlockStack gap="200">
                            {data.blog_title && (
                              <InlineStack gap="200" align="center">
                                <Icon source={BlogIcon} />
                                <Text variant="bodyMd">{data.blog_title}</Text>
                              </InlineStack>
                            )}
                            {data.blog_feedburner && (
                              <InlineStack gap="200" align="center">
                                <Icon source={ExternalIcon} />
                                <Text variant="bodyMd">RSS Feed Available</Text>
                              </InlineStack>
                            )}
                            {data.blog_tags && (
                              <Box paddingBlockStart="200">
                                <InlineStack gap="200" wrap>
                                  {data.blog_tags.split(',').map((tag, index) => (
                                    <Tag key={index} tone="info">{tag.trim()}</Tag>
                                  ))}
                                </InlineStack>
                              </Box>
                            )}
                          </BlockStack>
                        </BlockStack>
                      </Box>
                    </Card>
                  )}
                  {data.blog_commentable && (
                    <Card background="bg-surface-strong">
                      <Box padding="400">
                        <BlockStack gap="300">
                          <Text variant="headingMd" as="h3">Share & Engage</Text>
                          <InlineStack gap="200">
                            <Button icon={ShareIcon}>Share</Button>
                            {data.blog_commentable === 'yes' && (
                              <Button icon={ChatIcon}>Comment</Button>
                            )}
                          </InlineStack>
                        </BlockStack>
                      </Box>
                    </Card>
                  )}
                </BlockStack>
              </div>
            )}
          </div>
        </BlockStack>
      </div>
    </Card>
  );
};

const ProductDisplay = ({ data, isFullScreen }) => {
  const containerClasses = isFullScreen 
    ? "w-full max-w-none" 
    : "w-full max-w-3xl mx-auto";

  const gridClasses = isFullScreen
    ? "grid grid-cols-1 lg:grid-cols-12 gap-6"
    : "grid grid-cols-1 gap-6";

  const imageColumnClasses = isFullScreen
    ? "lg:col-span-7"
    : "col-span-1";

  const infoColumnClasses = isFullScreen
    ? "lg:col-span-5"
    : "col-span-1";

  const hasProductData = data?.title || data?.product_type || data?.status;
  const hasVariantData = data?.variants?.[0];
  const hasMetaData = data?.page_title || data?.meta_description;

  return (
    <Card padding="600">
      <div className={containerClasses}>
        <BlockStack gap="600">
          {hasProductData && (
            <Box background="bg-surface-strong" borderRadius="300" padding="600">
              <BlockStack gap="400">
                {data.title && (
                  <Text variant="heading3xl" as="h1" fontWeight="bold">
                    {data.title}
                  </Text>
                )}
                {(data.product_type || data.status) && (
                  <InlineStack gap="200">
                    {data.product_type && <Tag tone="success">{data.product_type}</Tag>}
                    {data.status && <Tag tone="info">{data.status}</Tag>}
                  </InlineStack>
                )}
              </BlockStack>
            </Box>
          )}

          {(data.images?.length > 0 || hasVariantData) && (
            <div className={gridClasses}>
              {data.images?.length > 0 && (
                <div className={imageColumnClasses}>
                  <Box background="bg-surface-strong" borderRadius="300" padding="400">
                    <ImageCarousel images={data.images} />
                  </Box>
                </div>
              )}

              {hasVariantData && (
                <div className={infoColumnClasses}>
                  <BlockStack gap="400">
                    <Card background="bg-surface-strong">
                      <Box padding="400">
                        <BlockStack gap="300">
                          <InlineStack gap="200" align="baseline">
                            {hasVariantData.price && (
                              <Text variant="heading2xl" as="p" fontWeight="bold">
                                {formatCurrency(hasVariantData.price)}
                              </Text>
                            )}
                            {hasVariantData.compare_at_price && (
                              <Text variant="bodyLg" tone="subdued" textDecorationLine="line-through">
                                {formatCurrency(hasVariantData.compare_at_price)}
                              </Text>
                            )}
                          </InlineStack>
                          
                          {(hasVariantData.weight || hasVariantData.sku) && (
                            <div className="grid grid-cols-2 gap-3">
                              {hasVariantData.weight && (
                                <MetricCard
                                  icon={MeasurementWeightIcon}
                                  label="Weight"
                                  value={`${hasVariantData.weight} ${hasVariantData.weight_unit || 'kg'}`}
                                />
                              )}
                              {hasVariantData.sku && (
                                <MetricCard
                                  icon={MoneyFilledIcon}
                                  label="SKU"
                                  value={hasVariantData.sku}
                                />
                              )}
                            </div>
                          )}
                        </BlockStack>
                      </Box>
                    </Card>

                    {data.body_html && (
                      <Card background="bg-surface-strong">
                        <Box padding="400">
                          <BlockStack gap="300">
                            <Text variant="headingMd" as="h3">Product Description</Text>
                            <div 
                              className="prose prose-sm max-w-none"
                              dangerouslySetInnerHTML={{
                                __html: formatContent(data.body_html),
                              }}
                            />
                          </BlockStack>
                        </Box>
                      </Card>
                    )}
                  </BlockStack>
                </div>
              )}
            </div>
          )}

          {hasMetaData && (
            <Card background="bg-surface-strong">
              <Box padding="400">
                <BlockStack gap="400">
                  <InlineStack gap="200" align="center">
                    <SearchIcon className="w-5 h-5" />
                    <Text variant="headingMd">SEO & Metadata</Text>
                  </InlineStack>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    {data.page_title && (
                      <Box padding="300" background="bg-surface" borderRadius="200">
                        <BlockStack gap="200">
                          <Text variant="bodySm" tone="subdued">Page Title</Text>
                          <Text variant="bodyMd">{data.page_title}</Text>
                        </BlockStack>
                      </Box>
                    )}
                    
                    {data.meta_description && (
                      <Box padding="300" background="bg-surface" borderRadius="200">
                        <BlockStack gap="200">
                          <Text variant="bodySm" tone="subdued">Meta Description</Text>
                          <Text variant="bodyMd">{data.meta_description}</Text>
                        </BlockStack>
                      </Box>
                    )}
                  </div>
                </BlockStack>
              </Box>
            </Card>
          )}

          {data.tags && <TagsList tags={data.tags} />}
        </BlockStack>
      </div>
    </Card>
  );
};

const renderProductContent = (data, isFullScreen) => <ProductDisplay data={data} isFullScreen={isFullScreen} />;
const renderArticleContent = (data, isFullScreen) => <BlogArticleDisplay data={data} isFullScreen={isFullScreen} />;
const renderBlogContent = (data, isFullScreen) => <BlogArticleDisplay data={data} isFullScreen={isFullScreen} />;

interface ContentRenderedViewProps {
  content: CONTENT;
  contentType: ContentCategory;
  onOpenEditMode: () => void;
  isFullScreen: boolean;
  onToggleFullScreen: () => void;
  isPreviewMode: boolean;
  onAction?: () => void;
  onCancel?: () => void;
  loading?: boolean;
  layoutMode?: 'tabs' | 'grid';
}

const ContentRenderedView = React.memo<ContentRenderedViewProps>(({
  content,
  contentType,
  onOpenEditMode,
  isFullScreen,
  onToggleFullScreen,
  isPreviewMode,
  onAction,
  onCancel, 
  loading,
  layoutMode
}) => {
  const containerClasses = isFullScreen
    ? "bg-white mt-6 mx-6 rounded-md max-h-[350vh] overflow-auto w-full"
    : "bg-white mt-6 mx-6 rounded-md max-h-[350vh] overflow-auto w-full";

  const renderedContent = useMemo(() => {
    if (!content || !content?.output || !contentType) {
      return (
        <Box padding="400" background="bg-surface-caution">
          <Text>No content available</Text>
        </Box>
      );
    }
    switch (contentType) {
      case ContentCategory.PRODUCT:
        return renderProductContent(content?.output, isFullScreen);
      case ContentCategory.BLOG:
        return renderBlogContent(content?.output, isFullScreen);   
      case ContentCategory.ARTICLE:
        return renderArticleContent(content?.output, isFullScreen);
      default:
        return (
          <Box padding="400" background="bg-surface-caution">
            <Text>Unsupported content type</Text>
          </Box>
        );
    }
  }, [content, contentType, isFullScreen]);

  return (
      <div className={containerClasses}>
        <TopBar 
          content={content} 
          isFullScreen={isFullScreen}
          onOpenEditMode={onOpenEditMode} 
          onToggleFullScreen={onToggleFullScreen} 
          layoutMode={layoutMode}
          isPreviewMode={isPreviewMode}
        />
        {renderedContent}
        {isPreviewMode && content?.output &&
          <FooterBar
            content={content} 
            onAction={onAction}
            onCancel={onCancel}
            eventType='PUBLISH'
            contentType={contentType}
            loading={loading}
          />
        }
      </div>
    );
  }
);

ContentRenderedView.displayName = "ContentRenderedView";

export default ContentRenderedView;


