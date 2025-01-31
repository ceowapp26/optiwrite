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
  Avatar,
  InlineStack,
  Box,
  BlockStack,
  Button,
  Select,
  Checkbox,
  Tag,
  Tooltip,
  ButtonGroup,
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
  HeartIcon,
  ClockIcon,
  PlusIcon,
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
  template: TEMPLATE;
  onAction: (action: string, template: TEMPLATE) => void;
}

const FooterBar: React.FC<TopBarProps> = ({ template, onAction }) => {
  return (
    <Box className="bg-white p-5">
      <ButtonGroup fullWidth>
        <Tooltip content="Add to List">
          <Button 
            variant="primary" 
            onClick={() => onAction('list', template)}
          >
            <InlineStack align="center" gap="300">
              <PlusIcon className="w-5 h-5" />
              <Text>Add to List</Text>
            </InlineStack>
          </Button>
        </Tooltip>
        <Tooltip content={template?.isFavorite ? "Remove from Favorites" : "Add to Favorites"}>
          <Button 
            variant={template?.isFavorite ? "primary" : "secondary"} 
            onClick={() => onAction('favorite', template)}
            tone="critical"
          >
            <InlineStack align="center" gap="300">
              <HeartIcon className="w-5 h-5" />
              <Text>Add to Favorite</Text>
            </InlineStack>
          </Button>
        </Tooltip>
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

const BlogArticleDisplay = ({ template, onAction }) => {
  const hasBothContent = template.article_title && template.blog_title;
  const hasArticleOnly = template.article_title && !template.blog_title;
  const hasBlogOnly = !template.article_title && template.blog_title;

  const blogSEOData = {
    page_title: template?.blog_page_title,
    meta_description: template?.blog_meta_description, 
    handle: template?.blog_handle
  }

  const articleSEOData = {
    page_title: template?.article_page_title,
    meta_description: template?.article_meta_description, 
    handle: template?.article_handle
  }

  const containerClasses = cn(
    "w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-12 max-w-7xl",
    {
      'bg-gradient-to-b from-gray-50/80 to-white': template.article_title || template.blog_title,
      'bg-white': !template.article_title && !template.blog_title
    }
  );

  const layoutClasses = cn(
    "grid gap-2 lg:gap-2",
    {
      'lg:grid-cols-3': hasBothContent, 
      'grid-cols-1': !hasBothContent
    }
  );

  const blogContainerClasses = cn(
    "space-y-6 relative p-6 bg-amber-50/20 rounded-lg border border-amber-200",
    { 'lg:col-span-1': hasBothContent }
  );

  const articleContainerClasses = cn(
    "space-y-6 relative p-6 bg-blue-50/20 rounded-lg border border-amber-200",
    {
      'lg:col-span-2': hasBothContent,
      'col-span-full': hasArticleOnly
    }
  );

  return (
    <div className="min-h-screen px-4">
      <Card padding="0" background="transparent">
        <div className={containerClasses}>
          <BlockStack gap="800">
            <div className={layoutClasses}>
              {template.blog_title && (
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
                            {template.blog_title}
                          </Text>
                          {template.blog_commentable && (
                            <InlineStack gap="300" align="center">
                              <Box className="flex items-center gap-4 px-4 py-2 bg-[var(--p-color-bg-fill-info)] text-gray-700 rounded-md shadow-sm">
                                <InlineStack gap="100" blockAlign="center">
                                  <ChatIcon className="w-5 h-5" />
                                  <Text className="text-sm font-medium">
                                    {getCommentStatus(template.blog_commentable)}
                                  </Text>
                                </InlineStack>
                              </Box>
                            </InlineStack>
                          )}
                        </BlockStack>
                      </Box>
                      <BlockStack gap="800">
                        <Box className="pt-6">
                          <SEOSection template={blogSEOData} />
                        </Box>
                        {template.blog_tags && (
                          <Box className="border-t border-gray-200 pt-6">
                            <TagsList tags={template.blog_tags} />
                          </Box>
                        )}
                      </BlockStack>
                    </Box>
                  </Box>
                </div>
              )}
              {template.article_title && (
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
                        {template.article_title}
                      </Text>
                      <InlineStack gap="400" align="center" wrap className="pt-2">
                        {template.article_author && (
                          <AuthorDisplay author={template.article_author} />
                        )}
                        <MetaInformation template={template} />
                      </InlineStack>
                    </BlockStack>
                  </Box>
                  <ContentSection template={template} />
                  <SummarySection template={template} />
                  <SEOSection template={articleSEOData} />
                  {template.article_tags && (
                    <Box paddingBlockStart="600" className="border-t border-gray-200">
                      <TagsList tags={template.article_tags} />
                    </Box>
                  )}
                </div>
              )}
            </div>
          </BlockStack>
        </div>
        <FooterBar
          template={template} 
          onAction={onAction}
        />
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

const MetaInformation = ({ template }) => (
  <>
    {template.article_published !== undefined && (
      <InlineStack gap="300" align="center">
        <Divider orientation="vertical" />
        <StatusBadge 
          status={template.article_published ? 'success' : 'warning'}
          icon={template.article_published ? CheckIcon : ClockIcon}
        >
          {template.article_published ? 'Published' : 'Draft'}
        </StatusBadge>
      </InlineStack>
    )}
  </>
);

const ContentSection = ({ template }) => (
  <BlockStack gap="600">
    {template.article_body_html && (
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
            __html: formatContent(template.article_body_html),
          }}
        />
      </Card>
    )}
  </BlockStack>
);

const SEOSection = ({ template }) => (
  <BlockStack gap="600">
    {(template?.page_title) && (
      <Card background="bg-surface-strong">
        <Box padding="400">
          <BlockStack gap="400">
            <InlineStack gap="200" align="center">
              <SearchIcon className="w-5 h-5" />
              <Text variant="headingMd">SEO & Metadata</Text>
            </InlineStack>

            <div className="grid md:grid-cols-2 gap-4">
              {template?.page_title && (
                <Box padding="300" background="bg-surface" borderRadius="200">
                  <BlockStack gap="200">
                    <Text variant="bodySm" tone="subdued">Page Title</Text>
                    <Text variant="bodyMd">{template?.page_title}</Text>
                  </BlockStack>
                </Box>
              )}
              {template?.meta_description && (
                <Box padding="300" background="bg-surface" borderRadius="200">
                  <BlockStack gap="200">
                    <Text variant="bodySm" tone="subdued">Meta Description</Text>
                    <Text variant="bodyMd">{template?.meta_description}</Text>
                  </BlockStack>
                </Box>
              )}
              {template?.handle && (
                <Box padding="300" background="bg-surface" borderRadius="200">
                  <BlockStack gap="200">
                    <Text variant="bodySm" tone="subdued">URL Handle</Text>
                    <Text variant="bodyMd">{template?.handle}</Text>
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

const SummarySection = ({ template }) => (
  <BlockStack gap="600">
    {template.article_summary_html && (
      <SidebarCard
        title="Quick Summary"
        content={
          <div 
            className="prose prose-sm"
            dangerouslySetInnerHTML={{
              __html: formatContent(template.article_summary_html),
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
    'yes': 'Comments Enabled',
    'no': 'Comments Disabled',
    'moderate': 'Comments Moderated'
  };
  return statusMap[status] || status;
};

const ProductDisplay = ({ template, onAction }) => {
  const containerClasses = "w-full max-w-none h-full"; 

  const gridClasses = "grid grid-cols-1 gap-6";

  const imageColumnClasses = "lg:col-span-1";

  const infoColumnClasses = "lg:col-span-5";
     
  const hasProductData = template?.title || template?.product_type || template?.status; 
  const hasMetaData = template?.page_title || template?.meta_description; 

  return (
    <Card padding="600">
      <div className={containerClasses}>
        <BlockStack gap="600">
          {hasProductData && (
            <Box background="bg-surface-strong" borderRadius="300" padding="600">
              <BlockStack gap="400">
                {template.title && (
                  <Text variant="heading3xl" as="h1" fontWeight="bold">
                    {template.title}
                  </Text>
                )}
                {(template.product_type || template.status) && (
                  <InlineStack gap="200">
                    {template.product_type && <Tag tone="success">{template.product_type}</Tag>}
                    {template.status && <Tag tone="info">{template.status}</Tag>}
                  </InlineStack>
                )}
              </BlockStack>
            </Box>
          )}
          <div className={gridClasses}>
            {template.images?.length > 0 && (
              <div className={imageColumnClasses}>
                <Box background="bg-surface-strong" borderRadius="300" padding="400">
                  <ImageCarousel images={template.images} />
                </Box>
              </div>
            )}
            <div className={infoColumnClasses}>
              <BlockStack gap="400">
                <Card background="bg-surface-strong">
                  <Box className="p-4 flex items-center align-center w-full">
                    {template.price && (
                      <Text variant="heading2xl" as="p" fontWeight="bold">
                        {formatCurrency(template.price)}
                      </Text>
                    )}
                  </Box>
                </Card>
                {template.body_html && (
                  <Card background="bg-surface-strong">
                    <Box padding="400">
                      <BlockStack gap="300">
                        <Text variant="headingMd" as="h3">Product Description</Text>
                        <div 
                          className="prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{
                            __html: formatContent(template.body_html),
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
                    {template.page_title && (
                      <Box padding="300" background="bg-surface" borderRadius="200">
                        <BlockStack gap="200">
                          <Text variant="bodySm" tone="subdued">Page Title</Text>
                          <Text variant="bodyMd">{template.page_title}</Text>
                        </BlockStack>
                      </Box>
                    )}
                    {template.meta_description && (
                      <Box padding="300" background="bg-surface" borderRadius="200">
                        <BlockStack gap="200">
                          <Text variant="bodySm" tone="subdued">Meta Description</Text>
                          <Text variant="bodyMd">{template.meta_description}</Text>
                        </BlockStack>
                      </Box>
                    )}
                  </div>
                </BlockStack>
              </Box>
            </Card>
          )}
          {template.tags && <TagsList tags={template.tags} />}
        </BlockStack>
      </div>
      <FooterBar
        template={template} 
        onAction={onAction}
      />
    </Card>
  );
};

const renderProductTemplate = (template, onAction) => <ProductDisplay template={template} onAction={onAction} />;
const renderArticleTemplate = (template, onAction) => <BlogArticleDisplay template={template} onAction={onAction} />;
const renderBlogTemplate = (template, onAction) => <BlogArticleDisplay template={template} onAction={onAction} />;

interface ContentRenderedViewProps {
  template: TEMPLATE;
  category: ContentCategory;
  onAction?: (action: string, template: TEMPLATE) => void;
}

const TemplateRenderedView = React.memo<ContentRenderedViewProps>(({
  template,
  category,
  onAction,
}) => {
  const containerClasses ="bg-transparent pt-6 rounded-md w-full h-full"
  const renderedContent = useMemo(() => {
    if (!template || !category) {
      return (
        <Box padding="400" background="bg-surface-caution">
          <Text>No content available</Text>
        </Box>
      );
    }
    switch (category) {
      case ContentCategory.PRODUCT:
        return renderProductTemplate(template, onAction);
      case ContentCategory.BLOG:
      case ContentCategory.BLOGARTICLE:
        return renderBlogTemplate(template, onAction);   
      case ContentCategory.ARTICLE:
        return renderArticleTemplate(template, onAction);
      default:
        return (
          <Box padding="400" background="bg-surface-caution">
            <Text>Unsupported content type</Text>
          </Box>
        );
    }
  }, [template, category]);

  return (
    <div className={containerClasses}>
      {renderedContent}
    </div>
  )}
);

TemplateRenderedView.displayName = "TemplateRenderedView";

export default TemplateRenderedView;


