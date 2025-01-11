import { useState } from 'react';
import { 
  Card, 
  Thumbnail, 
  Text, 
  Badge, 
  Box, 
  Tooltip, 
  Button, 
  BlockStack, 
  ButtonGroup 
} from '@shopify/polaris';
import { ViewIcon, EditIcon, DeleteIcon } from '@shopify/polaris-icons';
import { ContentCategory } from '@/types/content'; 
import { format } from 'date-fns';

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

const getStatusColor = (status: string) => {
  switch (status?.toUpperCase()) {
    case 'ACTIVE':
    case 'PUBLISHED':
      return 'success';
    case 'DRAFT':
      return 'warning';
    case 'ARCHIVED':
      return 'critical';
    default:
      return 'default';
  }
};

const getContentStatus = (content: ShopifyContent, contentType: string) => {
  if (contentType === ContentCategory.PRODUCT) {
    return (content as IProduct).status;
  }
  if (contentType === ContentCategory.BLOG) {
    return (content as IArticle).article_published_at ? 'PUBLISHED' : 'DRAFT';
  }
  return 'PUBLISHED';
};

const getContentPublishTime = (content: ShopifyContent, contentType: string) => {
  if (contentType === ContentCategory.PRODUCT) {
    return format(new Date(content.published_at), 'MMM dd, yyyy');
  }
  if (contentType === ContentCategory.ARTICLE) {
    return format(new Date(content.article_published_at), 'MMM dd, yyyy');
  }
  return 'PUBLISHED';
};

const getContentDescription = (content: ShopifyContent, contentType: string) => {
  switch (contentType) {
    case ContentCategory.PRODUCT:
      return (content as IProduct).body_html || 'No description available';
    case ContentCategory.BLOG:
      return (
        (content as IArticle).article_summary_html ||
        (content as IArticle).article_body_html ||
        'No description available'
      );
    case ContentCategory.BLOG:
      return `Handle: ${(content as IBlog).blog_handle}`;
    default:
      return 'No description available';
  }
};

const getContentTags = (content: ShopifyContent): string[] => {
  const tags = content.tags || '';
  return tags.split(',').filter(tag => tag.trim() !== '');
};

const getContentImage = (content: ShopifyContent, contentType: string): string => {
  if (contentType === ContentCategory.PRODUCT || contentType === ContentCategory.BLOG) {
    return content.image?.src || '';
  }
  return '';
};

const getMetadataRows = (metafield: Record<string, any>) => {
  return Object.entries(metafield).map(([key, value]) => [key, String(value)]);
};

export const ContentCard: React.FC<ContentCardProps> = ({ 
  content, 
  onView,
  onEdit,
  onDelete, 
  contentType 
}) => {
  const [isDetailsVisible, setIsDetailsVisible] = useState(false);

  const image = (content as IProduct | IArticle).image?.src;
  const title = content.title || 
    (content as IArticle).article_title || 
    (content as IBlog).blog_title;

  const handleMouseEnter = () => {
    setIsDetailsVisible(true);
  };

  const handleMouseLeave = () => {
    setIsDetailsVisible(false);
  };

  return (
    <Card>
      <BlockStack gap="200">
        <Box position="relative">
          {image && (
            <Thumbnail
              source={image}
              alt={title || 'Content Image'}
              size="large"
            />
          )}
          {isDetailsVisible && (
            <Box position="absolute" insetBlockStart="300" insetInlineEnd="300">
              <Tooltip content="View Details">
                <Button 
                  icon={ViewIcon} 
                  onClick={onView} 
                  variant="tertiary" 
                />
              </Tooltip>
            </Box>
          )}
        </Box>
        <BlockStack gap="200">
          <Text variant="headingMd" as="h3">{title || 'Untitled'}</Text>
          <Text color="subdued">
            {getContentPublishTime(content, contentType)}
          </Text>
          <Badge status={getStatusColor(getContentStatus(content, contentType))}>
            {getContentStatus(content, contentType).toLowerCase()}
          </Badge>
        </BlockStack>
      </BlockStack>
      <ButtonGroup>
        <Button 
          icon={ViewIcon} 
          onClick={onView} 
          variant="primary"
        >
          View
        </Button>
        <Button 
          icon={EditIcon} 
          onClick={onEdit} 
          variant="secondary"
        >
          Edit
        </Button>
        <Button 
          icon={DeleteIcon} 
          onClick={onDelete} 
          variant="destructive"
        >
          Delete
        </Button>
      </ButtonGroup>
    </Card>
  );
};
