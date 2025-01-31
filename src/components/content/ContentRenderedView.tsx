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
  CheckIcon,
  ClockIcon,
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
import { cn } from '@/lib/utils';

interface TopBarProps {
  content: CONTENT;
  onOpenEditMode: () => void;
  onToggleFullScreen: () => void;
  layoutMode?: 'tabs' | 'grid';
  isPreviewMode?: boolean;
}

const TopBar: React.FC<TopBarProps> = ({ content, onOpenEditMode, isFullScreen, onToggleFullScreen, layoutMode = null, isPreviewMode = false }) => {
  return (
    <Box className={isPreviewMode ? "px-4 py-4" : "px-4 w-full pb-4"}>
      <InlineStack align="space-between" blockAlign="center">
        <Box paddingBlockStart="300" paddingBlockEnd="600">
          <Badge size="large" tone="info">
            <Text variant="headingMd" as="h3" fontWeight="bold">
              Content Preview
            </Text>
          </Badge>
        </Box>
        {isPreviewMode &&
          <InlineStack gap="300" blockAlign="center">
            <Button
              icon={isFullScreen ? MinimizeIcon : MaximizeIcon}
              onClick={onToggleFullScreen}
            />
            <Button
              icon={EditIcon}
              onClick={() => onOpenEditMode?.()}
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
  loading
}) => {
  return (
    <Box padding="600" background="bg-surface" borderRadius="200" shadow="200">
      <ButtonGroup fullWidth gap="loose">
        <Button variant="primary" loading={loading} onClick={() => onAction(`${eventType}_${contentType}`, content)}>
          {`${eventType} ${contentType}`}
        </Button>
         <Button variant="secondary" disabled={!loading} onClick={onCancel}>
          Cancel
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

const convertArrayToObject = (array) => {
  return array.reduce((acc, item) => {
    acc[item.key] = {
      namespace: item.namespace,
      value: item.value,
      value_type: item.value_type,
      description: item.description,
    };
    return acc;
  }, {});
};


interface StatusBadgeProps {
  status: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  children?: React.ReactNode;
}

const StatusBadge = ({ status, icon: Icon, children }: StatusBadgeProps) => {
  const getStatusColor = (status: string) => {
    const colors = {
      success: 'bg-success-subdued text-success',
      warning: 'bg-caution text-caution',
    };
    return colors[status] || 'bg-surface-neutral text-emphasis-subdued';
  };

  return (
    <span
      className={`
        inline-flex items-center px-3 py-1 
        rounded-full text-xs font-medium 
        shadow-sm backdrop-blur-sm
        ${getStatusColor(status)}
      `}
    >
      <Icon className="w-5 h-5 mr-2" />
    </span>
  );
};

const BlogArticleDisplay = ({ 
  content, 
  onAction, 
  onCancel, 
  contentType, 
  isPreviewMode, 
  loading, 
  isFullScreen 
}) => {
  const data = content?.output;
  const hasBothContent = data.article_title && data.blog_title;
  const hasArticleOnly = data.article_title && !data.blog_title;
  const hasBlogOnly = !data.article_title && data.blog_title;

  const blogSEOData = {
    page_title: data?.blog_page_title,
    meta_description: data?.blog_meta_description, 
    handle: data?.blog_handle
  }

  const articleSEOData = {
    page_title: data?.article_page_title,
    meta_description: data?.article_meta_description, 
    handle: data?.article_handle
  }

  const containerClasses = cn(
    "w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-12",
    {
      'bg-gradient-to-b from-gray-50/80 to-white': data.article_title || data.blog_title,
      'bg-white': !data.article_title && !data.blog_title
    }
  );

  const layoutClasses = cn(
    "grid gap-2 lg:gap-2",
    {
      'lg:grid-cols-3': hasBothContent && isFullScreen, 
      'grid-cols-1': !hasBothContent && !isFullScreen
    }
  );

  const blogContainerClasses = cn(
    "space-y-6 relative p-6 bg-amber-50/20 rounded-lg border border-amber-200",
    { 'lg:col-span-1': hasBothContent && isFullScreen }
  );

  const articleContainerClasses = cn(
    "space-y-6 relative p-6 bg-blue-50/20 rounded-lg border border-amber-200",
    {
      'lg:col-span-2': hasBothContent && isFullScreen,
      'col-span-full': hasArticleOnly
    }
  );

  return (
    <div className="min-h-screen px-4 pb-4">
      <Card padding="0" background="transparent">
        <div className={containerClasses}>
          <BlockStack gap="800">
            <div className={layoutClasses}>
              {data.blog_title && (
                <div className={blogContainerClasses}>
                  <Box 
                    background="bg-surface"
                    borderRadius="500" 
                    padding="400"
                    shadow="large"
                  >
                    <InlineStack gap="300" align="space-between">
                      <Box className="flex items-center gap-4 px-6 py-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-md shadow-sm">
                        <InlineStack gap="100" blockAlign="center">
                          <BlogIcon className="w-5 h-5" />
                          <Text className="text-sm font-medium">Blog Overview</Text>
                        </InlineStack>
                      </Box>
                    </InlineStack>
                    <Box 
                      background="bg-surface"
                      paddingBlockStart="800"
                      shadow="large"
                    >
                      <Box className="bg-surface-secondary rounded-md shadow-sm">
                        <BlockStack gap="800">
                          <Text 
                            variant="heading3xl" 
                            as="h1" 
                            fontWeight="bold"
                            className="text-gray-900 leading-tight"
                          >
                            {data.blog_title}
                          </Text>
                          {data.blog_commentable && (
                            <InlineStack gap="300" align="center">
                              <Box className="flex items-center gap-4 px-4 py-2 bg-[var(--p-color-bg-fill-info)] text-gray-700 rounded-md shadow-sm">
                                <InlineStack gap="100" blockAlign="center">
                                  <ChatIcon className="w-5 h-5" />
                                  <Text className="text-sm font-medium">
                                    {getCommentStatus(data.blog_commentable)}
                                  </Text>
                                </InlineStack>
                              </Box>
                            </InlineStack>
                          )}
                        </BlockStack>
                      </Box>
                      <BlockStack gap="800">
                        <Box className="pt-6">
                          <SEOSection data={blogSEOData} />
                        </Box>
                        {data.blog_tags && (
                          <Box className="border-t border-gray-200 pt-6">
                            <TagsList tags={data.blog_tags} />
                          </Box>
                        )}
                      </BlockStack>
                    </Box>
                  </Box>
                </div>
              )}
              {data.article_title && (
                <div className={articleContainerClasses}>
                  <Box 
                    background="bg-surface"
                    borderRadius="500" 
                    padding="400"
                    shadow="large"
                  >
                    <BlockStack gap="500">
                      <InlineStack gap="300" align="space-between">
                        <Box className="flex items-center gap-4 px-6 py-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-md shadow-sm">
                          <InlineStack gap="100" blockAlign="center">
                            <ChatIcon className="w-5 h-5" />
                            <Text className="text-sm font-medium">Blog Post</Text>
                          </InlineStack>
                        </Box>
                      </InlineStack>
                      <Text 
                        variant="heading3xl" 
                        as="h1" 
                        fontWeight="bold"
                        className="text-gray-900 leading-tight"
                      >
                        {data.article_title}
                      </Text>
                      <InlineStack gap="400" align="center" wrap className="pt-2">
                        {data.article_author && (
                          <AuthorDisplay author={data.article_author} />
                        )}
                        <MetaInformation data={data} />
                      </InlineStack>
                    </BlockStack>
                  </Box>
                  <ContentSection data={data} />
                  <SummarySection data={data} />
                  <SEOSection data={articleSEOData} />
                  {data.article_tags && (
                    <Box paddingBlockStart="600" className="border-t border-gray-200">
                      <TagsList tags={data.article_tags} />
                    </Box>
                  )}
                </div>
              )}
            </div>
          </BlockStack>
        </div>
        {isPreviewMode &&
          <FooterBar
            content={content} 
            onAction={onAction}
            onCancel={onCancel}
            eventType='PUBLISH'
            contentType={contentType}
            loading={loading}
          />
        }
      </Card>
    </div>
  );
};

const AuthorDisplay = ({ author }) => (
  <InlineStack gap="300" align="center">
    <Avatar 
      customer 
      size="medium" 
      name={author}
      className="border-2 border-white shadow-md ring-2 ring-gray-100" 
    />
    <BlockStack gap="100">
      <Text variant="bodyLg" fontWeight="semibold" className="text-gray-900">{author}</Text>
      <Text variant="bodySm" className="text-gray-500">Author</Text>
    </BlockStack>
  </InlineStack>
);

const MetaInformation = ({ data }) => (
  <>
    {data.article_published !== undefined && (
      <InlineStack gap="300" align="center">
        <Divider orientation="vertical" />
        <StatusBadge 
          status={data.article_published ? 'success' : 'warning'}
          icon={data.article_published ? CheckIcon : ClockIcon}
        >
          {data.article_published ? 'Published' : 'Draft'}
        </StatusBadge>
      </InlineStack>
    )}
  </>
);

const ContentSection = ({ data }) => (
  <BlockStack gap="600">
    {data.article_body_html && (
      <Card 
        background="bg-surface"
        padding={{ xs: '400', md: '600' }}
        shadow="medium"
      >
        <div 
          className="prose prose-lg max-w-none
            prose-headings:font-semibold 
            prose-h1:text-3xl prose-h2:text-2xl
            prose-a:text-blue-600 hover:prose-a:text-blue-800
            prose-img:rounded-xl prose-img:shadow-lg
            prose-blockquote:border-l-4 prose-blockquote:border-blue-500
            prose-pre:bg-gray-50 prose-pre:border prose-pre:border-gray-200
            prose-code:text-blue-600 prose-code:bg-blue-50 prose-code:px-1 prose-code:rounded
            prose-strong:text-gray-900"
          dangerouslySetInnerHTML={{
            __html: formatContent(data.article_body_html),
          }}
        />
      </Card>
    )}
  </BlockStack>
);

const SEOSection = ({ data }) => (
  <BlockStack gap="600">
    {(data?.page_title) && (
      <Card background="bg-surface-strong">
        <Box padding="400">
          <BlockStack gap="400">
            <InlineStack gap="200" align="center">
              <SearchIcon className="w-5 h-5" />
              <Text variant="headingMd">SEO & Metadata</Text>
            </InlineStack>

            <div className="grid md:grid-cols-2 gap-4">
              {data?.page_title && (
                <Box padding="300" background="bg-surface" borderRadius="200">
                  <BlockStack gap="200">
                    <Text variant="bodySm" tone="subdued">Page Title</Text>
                    <Text variant="bodyMd">{data?.page_title}</Text>
                  </BlockStack>
                </Box>
              )}
              {data?.meta_description && (
                <Box padding="300" background="bg-surface" borderRadius="200">
                  <BlockStack gap="200">
                    <Text variant="bodySm" tone="subdued">Meta Description</Text>
                    <Text variant="bodyMd">{data?.meta_description}</Text>
                  </BlockStack>
                </Box>
              )}
              {data?.handle && (
                <Box padding="300" background="bg-surface" borderRadius="200">
                  <BlockStack gap="200">
                    <Text variant="bodySm" tone="subdued">URL Handle</Text>
                    <Text variant="bodyMd">{data?.handle}</Text>
                  </BlockStack>
                </Box>
              )}
            </div>
          </BlockStack>
        </Box>
      </Card>
    )}
  </BlockStack>
);

const SummarySection = ({ data }) => (
  <BlockStack gap="600">
    {data.article_summary_html && (
      <SidebarCard
        title="Quick Summary"
        content={
          <div 
            className="prose prose-sm"
            dangerouslySetInnerHTML={{
              __html: formatContent(data.article_summary_html),
            }}
          />
        }
      />
    )}
  </BlockStack>
);

const SidebarCard = ({ title, content }) => (
  <Card 
    background="bg-surface"
    padding="500"
    shadow="medium"
  >
    <BlockStack gap="400">
      <Text variant="headingMd" as="h3">{title}</Text>
      {content}
    </BlockStack>
  </Card>
);

const getCommentStatus = (status) => {
  const statusMap = {
    'AUTO_PUBLISHED': 'Comments Enabled',
    'CLOSED': 'Comments Disabled',
    'MODERATED': 'Comments Moderated'
  };
  return statusMap[status] || status;
};

const ProductDisplay = ({ 
  content, 
  onAction, 
  onCancel, 
  contentType, 
  isPreviewMode, 
  loading, 
  isFullScreen 
}) => {
  const data = content?.output;
  const containerClasses = isFullScreen 
    ? "w-full max-w-none h-full" 
    : "w-full max-w-3xl mx-auto h-full";

  const gridClasses = isFullScreen
    ? "grid grid-cols-1 gap-6"
    : "grid grid-cols-1 gap-6 h-full";

  const imageColumnClasses = isFullScreen
    ? "lg:col-span-1"
    : "col-span-1";

  const infoColumnClasses = isFullScreen
    ? "lg:col-span-5"
    : "col-span-1";
     
  const hasProductData = data?.title || data?.product_type || data?.status; 
  const hasMetaData = data?.page_title || data?.meta_description; 

  return (
    <Card padding="600">
      <div className={containerClasses}>
        <BlockStack gap="600">
          {hasProductData && (
            <Box background="bg-surface-strong" borderRadius="300" padding="600">
              <BlockStack gap="500">
                {data.title && (
                  <Text variant="heading3xl" as="h1" fontWeight="bold">
                    {data.title}
                  </Text>
                )}
                {data.price && (
                  <Text variant="heading2xl" as="p" fontWeight="bold">
                    {formatCurrency(data.price)}
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
          <div className={gridClasses}>
            {data.images?.length > 0 && (
              <div className={imageColumnClasses}>
                <Box background="bg-surface-strong" borderRadius="300" padding="400">
                  <ImageCarousel images={data.images} />
                </Box>
              </div>
            )}
            <div className={infoColumnClasses}>
              <BlockStack gap="400">
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
          </div>
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
                    {data?.handle && (
                      <Box padding="300" background="bg-surface" borderRadius="200">
                        <BlockStack gap="200">
                          <Text variant="bodySm" tone="subdued">URL Handle</Text>
                          <Text variant="bodyMd">{data?.handle}</Text>
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
      {isPreviewMode &&
        <FooterBar
          content={content} 
          onAction={onAction}
          onCancel={onCancel}
          eventType='PUBLISH'
          contentType={contentType}
          loading={loading}
        />
      }
    </Card>
  );
};

const renderProductContent = (
  content, 
  isFullScreen,
  onAction, 
  onCancel, 
  contentType, 
  isPreviewMode,
  loading
) => 
  <ProductDisplay 
    content={content} 
    isFullScreen={isFullScreen} 
    onAction={onAction} 
    onCancel={onCancel} 
    contentType={contentType} 
    isPreviewMode={isPreviewMode} 
    loading={loading} 
  />;

const renderArticleContent = (
  content, 
  isFullScreen, 
  onAction, 
  onCancel, 
  contentType, 
  isPreviewMode,
  loading 
  ) => 
  <BlogArticleDisplay 
    content={content} 
    isFullScreen={isFullScreen} 
    onAction={onAction} 
    onCancel={onCancel} 
    contentType={contentType} 
    isPreviewMode={isPreviewMode} 
    loading={loading} 
  />;
const renderBlogContent = (
  content, 
  isFullScreen, 
  onAction, 
  onCancel, 
  contentType, 
  isPreviewMode,
  loading 
) => 
  <BlogArticleDisplay 
    content={content} 
    isFullScreen={isFullScreen} 
    onAction={onAction} 
    onCancel={onCancel} 
    contentType={contentType} 
    isPreviewMode={isPreviewMode} 
    loading={loading} 
  />;

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
    ? "bg-white mt-6 rounded-md w-full h-full"
    : "bg-white mt-6 rounded-md w-full h-full";
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
        return renderProductContent(
          content, 
          isFullScreen, 
          onAction, 
          onCancel, 
          contentType, 
          isPreviewMode, 
          loading
        );
      case ContentCategory.BLOG:
        return renderBlogContent(
          content, 
          isFullScreen, 
          onAction, 
          onCancel, 
          contentType, 
          isPreviewMode, 
          loading
        );   
      case ContentCategory.ARTICLE:
        return renderArticleContent(
          content, 
          isFullScreen, 
          onAction, 
          onCancel, 
          contentType, 
          isPreviewMode, 
          loading
        );
      default:
        return (
          <Box padding="400" background="bg-surface-caution">
            <Text>Unsupported content type</Text>
          </Box>
        );
    }
  }, [content, onAction, onCancel, contentType, isFullScreen, loading, isPreviewMode]);
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
    </div>
  )}
);

ContentRenderedView.displayName = "ContentRenderedView";

export default ContentRenderedView;


