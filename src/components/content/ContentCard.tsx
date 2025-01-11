import { useState } from 'react';
import { 
  Card, 
  Thumbnail, 
  Text, 
  Badge, 
  Box, 
  Tooltip, 
  Button, 
  BlockStack 
} from '@shopify/polaris';
import { ViewIcon } from '@shopify/polaris-icons';
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
    return (content as IArticle).published_at ? 'PUBLISHED' : 'DRAFT';
  }
  return 'PUBLISHED';
};

const getContentPublishTime = (content: ShopifyContent, contentType: string) => {
  if (contentType === ContentCategory.PRODUCT) {
    return format(new Date(content.published_at), 'MMM dd, yyyy');
  }
  if (contentType === ContentCategory.ARTICLE) {
    return format(new Date(content.published_at), 'MMM dd, yyyy');
  }
  return 'PUBLISHED';
};

const getContentDescription = (content: ShopifyContent, contentType: string) => {
  switch (contentType) {
    case ContentCategory.PRODUCT:
      return (content as IProduct).body_html || 'No description available';
    case ContentCategory.BLOG:
      return (
        (content as IArticle).summary_html ||
        (content as IArticle).body_html ||
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
  if (contentType ===ContentCategory.PRODUCT || contentType === ContentCategory.BLOG) {
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
  contentType 
}) => {
  const [isDetailsVisible, setIsDetailsVisible] = useState(false);

  const image = (content as IProduct | IArticle).image?.src;
  const title = content.title || "Untitled";

  const handleMouseEnter = () => {
    setIsDetailsVisible(true);
  };

  const handleMouseLeave = () => {
    setIsDetailsVisible(false);
  };

  return (
    <div 
      className="relative rounded-md p-4 bg-surface-secondary cursor-pointer" 
      onMouseEnter={handleMouseEnter} 
      onMouseLeave={handleMouseLeave}
    >
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
    </div>
  );
};

