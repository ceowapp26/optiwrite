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
  article_title: string;
  article_created_at: string;
  article_published_at: string;
  article_updated_at: string;
  article_summary_html: string;
  article_body_html: string;
  article_author: string;
  article_handle: string;
  blog?: {
    blog_id: number;
    blog_title: string;
    blog_handle: string;
    blog_commentable: boolean;
    blog_feedburner?: string;
    blog_feedburner_location?: string;
    blog_tags?: string;
    blog_template_suffix?: string;
    blog_metafield?: Record<string, any>;
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
  blog_title: string;
  blog_handle: string;
  updated_at: string;
  metafield?: Record<string, any>;
  tags?: string;
}

type ShopifyContent = IProduct | IArticle | IBlog;

interface BlogDetailsRenderProps {
  content: IArticle;
  contentType: ContentCategory;
  viewMode: 'blog' | 'article' | 'both';
  onEdit: (content: IArticle) => void;
  onDelete: (content: IArticle) => void;
}

export const BlogDetailsRender: React.FC<BlogDetailsRenderProps> = ({
  content,
  contentType,
  viewMode,
  onChangeViewMode,
  onEdit,
  onDelete
}) => {
  const blogTags = content.blog?.blog_tags?.split(',').filter(tag => tag.trim()) || [];
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
                  <strong>Blog Title:</strong> {content.blog?.blog_title || 'N/A'}
                </Text>
                <Text>
                  <strong>Blog Handle:</strong> {content.blog?.blog_handle || 'N/A'}
                </Text>
                <Badge status={content.blog?.blog_commentable ? 'success' : 'warning'}>
                  {content.blog?.blog_commentable ? 'Comments Enabled' : 'Comments Disabled'}
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
              alt={content.article_title}
              size="large"
            />
          )}

          <BlockStack gap="200">
            <Text variant="headingLg" as="h1">
              {content.article_title}
            </Text>

            <Layout>
              <Layout.Section oneHalf>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Avatar customer name={content.article_author} />
                  <Text variant="bodyMd">
                    <ProfileIcon /> {content.article_author}
                  </Text>
                </div>
              </Layout.Section>
              <Layout.Section oneHalf>
                <Text variant="bodyMd">
                  <CalendarIcon /> Published: {formatDate(content.article_published_at)}
                </Text>
              </Layout.Section>
            </Layout>

            {content.article_summary_html && (
              <Card>
                <Text variant="bodyMd">
                  <div 
                    dangerouslySetInnerHTML={{ 
                      __html: content.article_summary_html 
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
              onClick={() => onEdit(content)}
            >
              Edit
            </Button>
          </Tooltip>
          <Tooltip content="Delete Content">
            <Button 
              destructive 
              icon={DeleteIcon} 
              onClick={() => onDelete(content)}
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
  onEdit, 
  onDelete 
}: { 
  product: IProduct, 
  onEdit: (content: IProduct) => void, 
  onDelete: (content: IProduct) => void 
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
                onClick={() => onEdit(product)}
              >
                Edit
              </Button>
            </Tooltip>
            <Tooltip content="Delete Product">
              <Button 
                destructive 
                icon={DeleteIcon} 
                onClick={() => onDelete(product)}
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

export const ContentDetailsModal: React.FC<ContentModalProps> = ({
  content,
  contentType,
  open,
  onClose,
  onView,
  onEdit,
  onDelete,
}) => {
  const [viewMode, setViewMode] = useState<'blog' | 'article' | 'both'>('both');

  const renderContentDetails = () => {
    switch (contentType) {
      case ContentCategory.PRODUCT:
        return (
          <ProductDetailsRenderer
            product={content as IProduct}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        );

      case ContentCategory.ARTICLE: {
        const article = content as IArticle;
        return (
          <Frame>
            <BlogDetailsRender
              content={content}
              contentType={contentType}
              onEdit={onEdit}
              onDelete={onDelete}
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
              onEdit={onEdit}
              onDelete={onDelete}
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
        (content as IArticle).article_title ||
        (content as IBlog).blog_title ||
        'Content Details'
      }
      primaryAction={{
        content: 'Edit',
        onAction: () => onEdit(content),
      }}
      secondaryActions={[
        {
          content: 'Delete',
          destructive: true,
          onAction: () => onDelete(content),
        },
      ]}
      large
    >
      <Modal.Section>{renderContentDetails()}</Modal.Section>
    </Modal>
  );
};
