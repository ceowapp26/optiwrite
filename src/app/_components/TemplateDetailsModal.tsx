'use client';

import { useState } from 'react';
import {
  Card,
  BlockStack,
  InlineStack,
  Text,
  Divider,
  Layout,
  Badge,
  Tag,
  Frame,
  LegacyCard,
  DataTable,
  Thumbnail,
  Modal,
  Avatar,
  Icon,
  Button,
  Tooltip,
  Banner,
  SkeletonDisplayText
} from '@shopify/polaris';
import { 
  EditIcon, 
  BlogIcon,
  DeleteIcon, 
  ViewMinorIcon,
  ProductIcon,
  NoteIcon,
  ProfileIcon,
  MetafieldsIcon,
  CalendarIcon,
  ChatIcon
} from '@shopify/polaris-icons';
import { format } from 'date-fns';
import { ContentCategory } from '@/types/content';

interface IProduct {
  id: number;
  contentId?: number;
  category?: string;
  title: string;
  status: string;
  body_html: string;
  vendor: string;
  updated_at: string;
  metafield?: Record<string, any>;
  image?: { src: string };
  tags?: string;
}

interface IArticle {
  id: number;
  contentId?: number;
  category?: string;
  title: string;
  created_at: string;
  published_at: string;
  updated_at: string;
  summary_html: string;
  body_html: string;
  author: string;
  handle: string;
  blog?: {
    id: number;
    title: string;
    handle: string;
    commentable: boolean;
    feedburner?: string;
    feedburner_location?: string;
    tags?: string;
    template_suffix?: string;
    metafield?: Record<string, any>;
  };
  updated_at: string;
  metafield?: Record<string, any>;
  image?: { src: string };
  tags?: string;
}

export interface IBlog {
  id: number;
  contentId?: number;
  category?: string;
  title: string;
  handle: string;
  updated_at: string;
  metafield?: Record<string, any>;
  tags?: string;
}

type ShopifyContent = IProduct | IArticle | IBlog;

interface BlogDetailsRenderProps {
  content: IArticle;
  contentType: ContentCategory;
  onSelect: (content: IArticle) => void;
  onClose: () => void;
}

const MetadataTable = ({ metadata }) => {
  if (!metadata) return null;
  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="start" gap="200">
          <MetafieldsIcon className="w-5 h-5" />
          <Text variant="headingMd" as="h3">Metadata</Text>
        </InlineStack>
        <DataTable
          columnContentTypes={['text', 'text']}
          headings={['Key', 'Value']}
          rows={Object.entries(metadata).map(([key, value]) => [
            <Text variant="bodyMd" fontWeight="bold">{key}</Text>,
            <Text variant="bodyMd">{String(value)}</Text>
          ])}
          density="compact"
        />
      </BlockStack>
    </Card>
  );
};

const TagsSection = ({ tags, icon: Icon, title }) => {
  if (!tags?.length) return null;
  return (
    <BlockStack gap="300">
      <InlineStack align="start" gap="200">
        <Icon className="w-5 h-5" />
        <Text variant="headingMd" as="h3">{title}</Text>
      </InlineStack>
      <InlineStack gap="200" wrap>
        {tags.map(tag => (
          <Tooltip key={tag} content={`Filter by ${tag}`}>
            <Tag onClick={() => {}} variant="interactive">{tag.trim()}</Tag>
          </Tooltip>
        ))}
      </InlineStack>
    </BlockStack>
  );
};

export const BlogDetailsRender: React.FC<BlogDetailsRenderProps> = ({
  content,
  onSelect,
  onClose
}) => {
  const blogTags = content.blog_tags?.split(',').filter(tag => tag.trim()) || [];
  return (
    <BlockStack gap="400">
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between">
            <InlineStack gap="200">
              <BlogIcon className="w-5 h-5" />
              <Text variant="headingLg" as="h2">Blog Information</Text>
            </InlineStack>
          </InlineStack>
          <Divider />
          <Layout>
            <Layout.Section>
              <BlockStack gap="400">
                <InlineStack gap="400" wrap>
                  <Text as="h3" variant="headingMd">{content?.blog_title || 'Untitled Blog'}</Text>
                  <Badge size="small" tone={content?.blog_commentable ? 'success' : 'warning'}>
                    <InlineStack gap="200">
                      <ChatIcon className="w-5 h-5" />
                      {content?.blog_commentable ? 'Comments Enabled' : 'Comments Disabled'}
                    </InlineStack>
                  </Badge>
                </InlineStack>
                <BlockStack gap="200">
                  <Text variant="bodyMd">
                    <strong>Handle:</strong> {content?.blog_handle || 'N/A'}
                  </Text>
                  {content?.blog_url && (
                    <Button
                      icon={ViewIcon}
                      onClick={() => window.open(content.blog_url, '_blank')}
                      plain
                    >
                      View Blog
                    </Button>
                  )}
                </BlockStack>
                <TagsSection
                  tags={blogTags}
                  icon={ProductIcon}
                  title="Blog Tags"
                />
              </BlockStack>
            </Layout.Section>
          </Layout>
        </BlockStack>
      </Card>
      <MetadataTable metadata={content.blog_metafield} />
    </BlockStack>
  );
};

export const ArticleDetailsRender: React.FC<BlogDetailsRenderProps> = ({
  content,
  onSelect,
  onClose
}) => {
  const articleTags = content.article_tags?.split(',').filter(tag => tag.trim()) || [];

  return (
    <Frame>
      <BlockStack gap="400">
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between">
              <InlineStack gap="200">
                <NoteIcon className="w-5 h-5" />
                <Text variant="headingLg" as="h2">Article Details</Text>
              </InlineStack>
            </InlineStack>
            <Divider />
            {content.article_image ? (
              <div style={{ maxWidth: '100%', position: 'relative' }}>
                <img
                  src={content.article_image.src}
                  alt={content.article_title}
                  style={{
                    width: '100%',
                    height: 'auto',
                    borderRadius: '8px',
                    objectFit: 'cover'
                  }}
                />
              </div>
            ) : (
              <Banner tone="info">No featured image available</Banner>
            )}
            <BlockStack gap="400">
              <Text variant="headingXl" as="h1">
                {content?.article_title}
              </Text>
              <InlineStack align="start" gap="200">
                <Avatar customer name={content?.article_author} />
                <BlockStack>
                  <Text variant="bodyMd" fontWeight="bold">
                    {content?.article_author}
                  </Text>
                  <Text variant="bodySm" color="subdued">
                    {new Date(content?.published_at).toLocaleDateString()}
                  </Text>
                </BlockStack>
              </InlineStack>

              {content?.article_body_html && (
                <Card>
                  <BlockStack gap="400">
                    <Text variant="headingMd">Content</Text>
                    <div 
                      className="article-content"
                      dangerouslySetInnerHTML={{ 
                        __html: content.article_body_html 
                      }} 
                    />
                  </BlockStack>
                </Card>
              )}
              {content?.article_summary_html && (
                <Card>
                  <BlockStack gap="400">
                    <Text variant="headingMd">Summary</Text>
                    <div 
                      className="article-summary"
                      dangerouslySetInnerHTML={{ 
                        __html: content.article_summary_html 
                      }} 
                    />
                  </BlockStack>
                </Card>
              )}
              <TagsSection
                tags={articleTags}
                icon={ProductIcon}
                title="Article Tags"
              />
            </BlockStack>
          </BlockStack>
        </Card>
        <MetadataTable metadata={content.article_metafield} />
      </BlockStack>
    </Frame>
  );
};

export const BlogArticleDetailsRender: React.FC<BlogDetailsRenderProps> = ({
  content,
  onSelect,
  onClose
}) => {
  const blogTags = content.blog_tags?.split(',').filter(tag => tag.trim()) || [];
  const articleTags = content.article_tags?.split(',').filter(tag => tag.trim()) || [];
  return (
    <>
      <BlockStack gap="400">
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between">
              <InlineStack gap="200">
                <BlogIcon className="w-5 h-5" />
                <Text variant="headingLg" as="h2">Blog Information</Text>
              </InlineStack>
            </InlineStack>
            <Divider />
            <Layout>
              <Layout.Section>
                <BlockStack gap="400">
                  <InlineStack gap="400" wrap>
                    <Text as="h3" variant="headingMd">{content?.blog_title || 'Untitled Blog'}</Text>
                    <Badge size="small" tone={content?.blog_commentable ? 'success' : 'warning'}>
                      <InlineStack gap="200">
                        <ChatIcon className="w-5 h-5" />
                        {content?.blog_commentable ? 'Comments Enabled' : 'Comments Disabled'}
                      </InlineStack>
                    </Badge>
                  </InlineStack>
                  <BlockStack gap="200">
                    <Text variant="bodyMd">
                      <strong>Handle:</strong> {content?.blog_handle || 'N/A'}
                    </Text>
                    {content?.blog_url && (
                      <Button
                        icon={ViewIcon}
                        onClick={() => window.open(content.blog_url, '_blank')}
                        plain
                      >
                        View Blog
                      </Button>
                    )}
                  </BlockStack>
                  <TagsSection
                    tags={blogTags}
                    icon={ProductIcon}
                    title="Blog Tags"
                  />
                </BlockStack>
              </Layout.Section>
            </Layout>
          </BlockStack>
        </Card>
        <MetadataTable metadata={content.blog_metafield} />
      </BlockStack>
     <BlockStack gap="400">
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between">
              <InlineStack gap="200">
                <NoteIcon className="w-5 h-5" />
                <Text variant="headingLg" as="h2">Article Details</Text>
              </InlineStack>
            </InlineStack>
            <Divider />
            {content.article_image ? (
              <div style={{ maxWidth: '100%', position: 'relative' }}>
                <img
                  src={content.article_image.src}
                  alt={content.article_title}
                  style={{
                    width: '100%',
                    height: 'auto',
                    borderRadius: '8px',
                    objectFit: 'cover'
                  }}
                />
              </div>
            ) : (
              <Banner tone="info">No featured image available</Banner>
            )}
            <BlockStack gap="400">
              <Text variant="headingXl" as="h1">
                {content?.article_title}
              </Text>
              <InlineStack align="start" gap="200">
                <Avatar customer name={content?.article_author} />
                <BlockStack>
                  <Text variant="bodyMd" fontWeight="bold">
                    {content?.article_author}
                  </Text>
                  <Text variant="bodySm" color="subdued">
                    {new Date(content?.published_at).toLocaleDateString()}
                  </Text>
                </BlockStack>
              </InlineStack>

              {content?.article_body_html && (
                <Card>
                  <BlockStack gap="400">
                    <Text variant="headingMd">Content</Text>
                    <div 
                      className="article-content"
                      dangerouslySetInnerHTML={{ 
                        __html: content.article_body_html 
                      }} 
                    />
                  </BlockStack>
                </Card>
              )}
              {content?.article_summary_html && (
                <Card>
                  <BlockStack gap="400">
                    <Text variant="headingMd">Summary</Text>
                    <div 
                      className="article-summary"
                      dangerouslySetInnerHTML={{ 
                        __html: content.article_summary_html 
                      }} 
                    />
                  </BlockStack>
                </Card>
              )}
              <TagsSection
                tags={articleTags}
                icon={ProductIcon}
                title="Article Tags"
              />
            </BlockStack>
          </BlockStack>
        </Card>
        <MetadataTable metadata={content.article_metafield} />
      </BlockStack>
    </>
  );
};

export const ProductDetailsRenderer: React.FC<ProductDetailsRendererProps> = ({
  product,
  onSelect,
  onClose
}) => {
  const tags = product.tags?.split(',').filter(tag => tag.trim()) || [];
  const getStatusBadgeProps = (status: string) => {
    const statusMap = {
      active: { tone: 'success', label: 'Active' },
      draft: { tone: 'warning', label: 'Draft' },
      archived: { tone: 'critical', label: 'Archived' }
    };
    return statusMap[status.toLowerCase()] || { tone: 'info', label: status };
  };
  return (
    <Frame>
      <BlockStack gap="400">
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between">
              <InlineStack gap="200">
                <ProductIcon className="w-5 h-5" />
                <Text variant="headingLg" as="h2">Product Details</Text>
              </InlineStack>
              <InlineStack gap="200">
                <Button onClick={() => onSelect(product)} primary>
                  Select Product
                </Button>
              </InlineStack>
            </InlineStack>
            <Divider />
            <Layout>
              <Layout.Section oneThird>
                {product.image ? (
                  <div style={{ position: 'relative' }}>
                    <img
                      src={product.image.src}
                      alt={product.title}
                      style={{
                        width: '100%',
                        height: 'auto',
                        borderRadius: '8px',
                        objectFit: 'cover'
                      }}
                    />
                  </div>
                ) : (
                  <Card>
                    <BlockStack gap="200" align="center">
                      <ProductIcon className="w-5 h-5" />
                      <Text alignment="center" color="subdued">
                        No product image available
                      </Text>
                    </BlockStack>
                  </Card>
                )}
              </Layout.Section>
              <Layout.Section>
                <BlockStack gap="400">
                  <Text variant="headingXl" as="h1">
                    {product.title}
                  </Text>
                  <InlineStack wrap gap="200">
                    <Badge {...getStatusBadgeProps(product.status)}>
                      {product.status.toUpperCase()}
                    </Badge>
                    {product.vendor && (
                      <Text variant="bodyMd" color="subdued">
                        by {product.vendor}
                      </Text>
                    )}
                  </InlineStack>
                  {product.body_html && (
                    <Card>
                      <BlockStack gap="400">
                        <Text variant="headingMd">Description</Text>
                        <div 
                          className="product-description"
                          dangerouslySetInnerHTML={{ 
                            __html: product.body_html 
                          }} 
                        />
                      </BlockStack>
                    </Card>
                  )}
                  <TagsSection
                    tags={tags}
                    icon={ProductIcon}
                    title="Product Tags"
                  />
                </BlockStack>
              </Layout.Section>
            </Layout>
          </BlockStack>
        </Card>
        <MetadataTable metadata={product.metafield} />
      </BlockStack>
    </Frame>
  );
};

export const TemplateDetailsModal: React.FC<ContentModalProps> = ({
  content,
  contentType,
  open,
  onClose,
  onView,
  onSelect,
}) => {
  console.log("this is contentType", contentType.toUpperCase())
  const renderContentDetails = () => {
    switch (contentType.toUpperCase()) {
      case ContentCategory.PRODUCT:
        return (
          <ProductDetailsRenderer
            product={content as IProduct}
            onSelect={onSelect}
            onClose={onClose}
          />
        );

      case ContentCategory.ARTICLE: {
        const article = content as IArticle;
        return (
          <Frame>
            <ArticleDetailsRender
              content={content}
              onSelect={onSelect}
              onClose={onClose}
            />
          </Frame>
        );
      }

      case ContentCategory.BLOG: {
        return (
          <Frame>
            <BlogDetailsRender
              content={content}
              onSelect={onSelect}
              onClose={onClose}
            />
          </Frame>
        );
      }

      case ContentCategory.BLOGARTICLE: {
        return (
          <Frame>
            <BlogArticleDetailsRender
              content={content}
              onSelect={onSelect}
              onClose={onClose}
            />
          </Frame>
        );
      }

      default:
        return null;
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        content.title ||
        (content as IArticle).title ||
        (content as IBlog).title ||
        'Content Details'
      }
      secondaryActions={[
      {
        content: 'Close',
        onAction: () => onClose(),
      }
      ]}
      primaryAction={{
        content: 'Select',
        onAction: () => {
          onSelect(content);
          onClose();
        },
      }}
      large
    >
      <Modal.Section>{renderContentDetails()}</Modal.Section>
    </Modal>
  );
};
