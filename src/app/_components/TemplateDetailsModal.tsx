'use client';

import { useState } from 'react';
import { 
  Modal, 
  BlockStack, 
  Select, 
  Button, 
  ButtonGroup,
  Frame,
  Text,
  Card,
  Divider,
  Tooltip,
  Thumbnail,
  Badge,
  Layout,
  LegacyCard,
  DataTable,
  Tag,
  Avatar
} from '@shopify/polaris';
import { 
  EditIcon, 
  DeleteIcon, 
  ViewMinorIcon,
  ProductIcon,
  NoteIcon,
  ProfileIcon,
  CalendarIcon,
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
  viewMode: 'blog' | 'article' | 'both';
  onSelect: (content: IArticle) => void;
  onClose: () => void;
}

export const BlogDetailsRender: React.FC<BlogDetailsRenderProps> = ({
  content,
  contentType,
  viewMode,
  onChangeViewMode,
  onSelect,
  onClose
}) => {
  const blogTags = content.blog?.tags?.split(',').filter(tag => tag.trim()) || [];
  const articleTags = content.tags?.split(',').filter(tag => tag.trim()) || [];
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMMM d, yyyy');
    } catch {
      return dateString;
    }
  };
  const renderBlogDetails = () => {
    if (viewMode === 'article') return null;
    return (
      <Card>
        <BlockStack gap="200">
          <Text variant="headingMd" as="h2">
            <NoteIcon /> Blog Information
          </Text>
          <Divider />
          <Layout>
            <Layout.Section>
              <BlockStack gap="200">
                <Text>
                  <strong>Blog Title:</strong> {content.blog?.title || 'N/A'}
                </Text>
                <Text>
                  <strong>Blog Handle:</strong> {content.blog?.handle || 'N/A'}
                </Text>
                <Badge status={content.blog?.commentable ? 'success' : 'warning'}>
                  {content.blog?.commentable ? 'Comments Enabled' : 'Comments Disabled'}
                </Badge>
                {blogTags.length > 0 && (
                  <div>
                    <Text variant="bodyMd">
                      <ProductIcon /> Blog Tags
                    </Text>
                    {blogTags.map(tag => (
                      <Tag key={tag} variant="subtle">{tag.trim()}</Tag>
                    ))}
                  </div>
                )}
              </BlockStack>
            </Layout.Section>
          </Layout>
        </BlockStack>
      </Card>
    );
  };

  const renderArticleDetails = () => {
    if (viewMode === 'blog') return null;

    return (
      <Card>
        <BlockStack gap="300">
          <Text variant="headingMd" as="h2">
            <NoteIcon /> Article Details
          </Text>
          <Divider />
          
          {content.image && (
            <Thumbnail
              source={content.image.src}
              alt={content.title}
              size="large"
            />
          )}

          <BlockStack gap="200">
            <Text variant="headingLg" as="h1">
              {content.title}
            </Text>

            <Layout>
              <Layout.Section oneHalf>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Avatar customer name={content.author} />
                  <Text variant="bodyMd">
                    <ProfileIcon /> {content.author}
                  </Text>
                </div>
              </Layout.Section>
              <Layout.Section oneHalf>
                <Text variant="bodyMd">
                  <CalendarIcon /> Published: {formatDate(content.published_at)}
                </Text>
              </Layout.Section>
            </Layout>

            {content.summary_html && (
              <Card>
                <Text variant="bodyMd">
                  <div 
                    dangerouslySetInnerHTML={{ 
                      __html: content.summary_html 
                    }} 
                  />
                </Text>
              </Card>
            )}

            {articleTags.length > 0 && (
              <div>
                <Text variant="bodyMd">
                  <ProductIcon /> Article Tags
                </Text>
                {articleTags.map(tag => (
                  <Tag key={tag} variant="subtle">{tag.trim()}</Tag>
                ))}
              </div>
            )}
          </BlockStack>
        </BlockStack>
      </Card>
    );
  };

  const renderMetadata = () => {
    if (!content.metafield) return null;

    return (
      <LegacyCard title="Metadata">
        <DataTable
          columnContentTypes={['text', 'text']}
          headings={['Key', 'Value']}
          rows={Object.entries(content.metafield).map(([key, value]) => [
            key, 
            String(value)
          ])}
        />
      </LegacyCard>
    );
  };

  return (
    <Frame>
      <BlockStack gap="300">
        {(contentType === ContentCategory.BLOG || contentType === ContentCategory.ARTICLE) && (
          <Select
            label="View Mode"
            options={[
              { label: 'Blog', value: 'blog' },
              { label: 'Article', value: 'article' },
              { label: 'Combined', value: 'both' }
            ]}
            value={viewMode}
            onChange={(value) => onChangeViewMode(value)}
          />
        )}

        {renderBlogDetails()}
        {renderArticleDetails()}
        {renderMetadata()}

        <ButtonGroup fullWidth>
          <Tooltip content="Edit Content">
            <Button 
              primary 
              icon={EditIcon} 
              onClick={() => onSelect(content)}
            >
              Edit
            </Button>
          </Tooltip>
          <Tooltip content="Delete Content">
            <Button 
              destructive 
              icon={DeleteIcon} 
              onClick={() => onClose()}
            >
              Delete
            </Button>
          </Tooltip>
        </ButtonGroup>
      </BlockStack>
    </Frame>
  );
};

const ProductDetailsRenderer = ({ 
  product, 
  onSelect, 
  onClose 
}: { 
  product: IProduct, 
  onSelect: (content: IProduct) => void, 
  onClose: () => void 
}) => {
  const tags = product.tags?.split(',').filter(tag => tag.trim()) || [];

  return (
    <Layout>
      <Layout.Section>
        <BlockStack gap="400">
          <Card>
            <BlockStack gap="200">
              <Text variant="headingLg" as="h2">
                <ProductIcon /> Product Overview
              </Text>
              <Divider />
              <Layout>
                <Layout.Section oneThird>
                  {product.image && (
                    <Thumbnail
                      source={product.image.src}
                      alt={product.title}
                      size="large"
                    />
                  )}
                </Layout.Section>
                <Layout.Section twoThirds>
                  <BlockStack gap="200">
                    <Text variant="headingMd">{product.title}</Text>
                    <Text variant="bodyMd" color="subdued">
                      Vendor: {product.vendor}
                    </Text>
                    <Badge status={
                      product.status === 'active' ? 'success' : 
                      product.status === 'draft' ? 'warning' : 
                      'critical'
                    }>
                      {product.status.toUpperCase()}
                    </Badge>
                  </BlockStack>
                </Layout.Section>
              </Layout>
            </BlockStack>
          </Card>

          <Card>
            <BlockStack gap="200">
              <Text variant="headingMd">
                <NoteIcon /> Product Description
              </Text>
              <Divider />
              <div 
                dangerouslySetInnerHTML={{ 
                  __html: product.body_html || 'No description available' 
                }} 
              />
            </BlockStack>
          </Card>

          <Card>
            <BlockStack gap="200">
              <Text variant="headingMd">
                <ProductIcon /> Product Tags
              </Text>
              <Divider />
              <div>
                {tags.length > 0 ? (
                  tags.map(tag => (
                    <Tag key={tag} variant="subtle">{tag.trim()}</Tag>
                  ))
                ) : (
                  <Text color="subdued">No tags</Text>
                )}
              </div>
            </BlockStack>
          </Card>

          {product.metafield && (
            <LegacyCard title="Metadata">
              <DataTable
                columnContentTypes={['text', 'text']}
                headings={['Key', 'Value']}
                rows={Object.entries(product.metafield).map(([key, value]) => [
                  key, 
                  String(value)
                ])}
              />
            </LegacyCard>
          )}

          <ButtonGroup fullWidth>
            <Tooltip content="Edit Product">
              <Button 
                primary 
                icon={EditIcon} 
                onClick={() => onSelect(product)}
              >
                Edit
              </Button>
            </Tooltip>
            <Tooltip content="Delete Product">
              <Button 
                destructive 
                icon={DeleteIcon} 
                onClick={() => onClose()}
              >
                Delete
              </Button>
            </Tooltip>
          </ButtonGroup>
        </BlockStack>
      </Layout.Section>
    </Layout>
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
  const [viewMode, setViewMode] = useState<'blog' | 'article' | 'both'>('both');

  const renderContentDetails = () => {
    switch (contentType) {
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
            <BlogDetailsRender
              content={content}
              contentType={contentType}
              onSelect={onSelect}
              viewMode={viewMode}
              onChangeViewMode={setViewMode} 
            />
          </Frame>
        );
      }

      case ContentCategory.BLOG: {
        return (
          <Frame>
            <BlogDetailsRender
              content={content}
              contentType={contentType}
              onSelect={onSelect}
              viewMode={viewMode}
              onChangeViewMode={setViewMode} 
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
      primaryAction={{
        content: 'Edit',
        onAction: () => onSelect(content),
      }}
      secondaryActions={[
        {
          content: 'Delete',
          destructive: true,
          onAction: () => onClose(),
        },
      ]}
      large
    >
      <Modal.Section>{renderContentDetails()}</Modal.Section>
    </Modal>
  );
};
