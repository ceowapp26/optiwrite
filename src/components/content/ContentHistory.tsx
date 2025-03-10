'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import {
  Page,
  Layout,
  Box,
  Card,
  ResourceList,
  ResourceItem,
  Badge,
  Filters,
  Grid,
  Button,
  ChoiceList,
  EmptyState,
  Loading,
  Text,
  Pagination,
  BlockStack,
  Frame,
  Tag,
  Toast,
  Tooltip,
  Modal,
  Spinner,
  Popover,
  ActionList,
  TextField,
  AppProvider,
  LegacyCard,
  ContextualSaveBar,
  FormLayout,
  Navigation,
  SkeletonBodyText,
  SkeletonDisplayText,
  SkeletonPage,
  TextContainer,
  InlineStack,
  Link,
  ProgressBar,
  Banner,
  Icon
} from '@shopify/polaris';
import {
  ArrowLeftIcon,
  HomeIcon,
  OrderIcon,
  ChatIcon,
  CheckIcon,
  MoonIcon,
  SunIcon,
  ExternalIcon,
  AppsIcon,
  ViewIcon,
  PlusCircleIcon,
  CreditCardIcon,
  ChartVerticalFilledIcon,
  CheckCircleIcon,
  AlertDiamondIcon,
  DeleteIcon,
  EditIcon,
  PlusIcon,
  ComposeIcon,
  ChevronDownIcon,
  HeartIcon
} from '@shopify/polaris-icons';
import { useAppBridge } from '@/providers/AppBridgeProvider';
import LanguageIcon from '@mui/icons-material/Language';
import { Redirect } from '@shopify/app-bridge/actions';
import { Content, ContentCategory } from '@/types/content';
import { useTheme } from 'next-themes';
import { type Theme, useGeneralContext, useGeneralActions } from "@/context/GeneralContextProvider";
import { HistoryContentCard } from './HistoryContentCard';
import { ContentDetailsModal } from './ContentDetailsModal';
import LoadingScreen from '@/components/LoadingScreen';
import { getUserContentHistory } from "@/actions/content";
import { AppSession } from '@/types/auth';
import { ShopApiService } from '@/utils/api';
import { useFlattenContent } from '@/hooks/useFlattenContent';
import { eventEmitter } from '@/helpers/eventEmitter';
import { useRouter, useSearchParams } from 'next/navigation';
import { styled } from 'styled-components';
import { AnimatePresence, motion } from 'framer-motion';
import RedirectModal from './RedirectModal';
import NotificationBell from "@/components/NotificationBell";
import LanguageSelector from '@/components/LanguageSelector';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/lib/supabase';
import { LayoutContainer, layoutVariants, StyledOverlay, overlayVariants } from '@/styles/style.general';

const ThemeToggleButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 12px;
  border: 1px solid var(--p-border-subdued);
  border-radius: 6px;
  background: var(--p-surface);
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: var(--p-surface-hovered);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  svg {
    width: 20px;
    height: 20px;
    color: var(--p-text);
  }
`;

const IconWrapper = styled.span`
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--p-text);
  font-size: 14px;
  font-weight: 500;
`;

interface SearchStats {
 totalResults: number;
 filteredResults: number;
 appliedFilters: {
   search?: string;
   status?: string[];
   contentType?: string[];
 };
 sortOrder?: 'relevance' | 'newest' | 'price';
 priceRange?: [ number, number ];
}

interface SearchResult extends CONTENT {
 relevanceScore: number;
}

const getRelevanceScore = (content: ShopifyContent, searchQuery: string): number => {
  if (!searchQuery) return 1;
  const query = searchQuery.toLowerCase();
    const productWeights = {
    title: 10,
    sku: 8,
    type: 6,
    tags: 4,
    description: 2
  };
  const articleWeights = {
    title: 10,
    author: 8,
    tags: 6,
    description: 4
  };
  const blogWeights = {
    title: 10,
    tags: 6
  };
  let score = 0;
  if ('product_type' in content) {
    const fields = {
      title: content.title?.toLowerCase() || '',
      sku: content.variants?.[0]?.sku?.toLowerCase() || '',
      type: content.product_type?.toLowerCase() || '',
      tags: content.tags?.toLowerCase() || '',
      description: content.body_html?.toLowerCase() || ''
    };
    Object.entries(fields).forEach(([field, value]) => {
      if (value.includes(query)) {
        score += productWeights[field];
      }
    });
  } else if ('article_title' in content) {
    const fields = {
      title: content.article_title?.toLowerCase() || '',
      author: content.article_author?.toLowerCase() || '',
      tags: content.article_tags?.join(' ').toLowerCase() || '',
      description: content.article_body_html?.toLowerCase() || ''
    };

    Object.entries(fields).forEach(([field, value]) => {
      if (value.includes(query)) {
        score += articleWeights[field];
      }
    });
  } else if ('blog_title' in content) {
    const fields = {
      title: content.blog_title?.toLowerCase() || '',
      tags: content.blog_tags?.join(' ').toLowerCase() || ''
    };
    Object.entries(fields).forEach(([field, value]) => {
      if (value.includes(query)) {
        score += blogWeights[field];
      }
    });
  }
  return score;
};

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

interface IFlattenedArticle {
  contentId: string | null;
  blog_title: string;
  blog_commentable: 'yes' | 'no';
  blog_feedburner: string;
  blog_feedburner_location: string;
  blog_handle: string;
  blog_tags: string[];
  blog_template_suffix: string;
  blog_metafield: any | null; 
  article_title: string;
  article_author: string;
  article_body_html: string;
  article_handle: string;
  article_image: string | null;
  article_metafield: any | null;
  article_published: boolean;
  article_summary_html: string;
  article_tags: string[];
  article_template_suffix: string;
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

const ContentCard = memo(({ content, onAction, loading, deletedItem }) => {
  const [popoverActive, setPopoverActive] = useState(false);
  const [isFavorite, setIsFavorite] = useState(content?.isFavorite || false);
  const renderTemplateImage = () => {
    const imageSrc = content?.article_image || content.image?.src;
    return imageSrc ? (
      <div 
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '8px',
          height: '200px',
          backgroundImage: `url(${imageSrc})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          marginBottom: '16px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}
      >
        <div 
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            display: 'flex',
            gap: '8px'
          }}
        >
          <Tag variant="interactive">{content?.category}</Tag>
          <Tag 
            variant={content?.status === 'active' ? 'success' : 'warning'}
          >
            {content?.status}
          </Tag>
        </div>
      </div>
    ) : null;
  };

  const renderContentDetails = () => {
    const bodyContent = content?.article_summary_html || content?.body_html || 'No description available.';
    const truncatedContent = bodyContent.length > 150 
      ? `${bodyContent.substring(0, 150)}...` 
      : bodyContent;
    return (
      <BlockStack gap="200">
        <Text as="h3" variant="headingSm">{content?.title || content?.article_title || content?.blog_title || "Undefined"}</Text>
        <Text variant="bodyMd" tone="subdued">
          {truncatedContent}
        </Text>
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          {content.category && <Tag>{content?.category}</Tag>}
          {content.tags && (
            <Tag>
              {Array.isArray(content.tags)
                ? content.tags.slice(0, 2).join(', ')
                : content.tags.split(',').slice(0, 2).join(', ')}
            </Tag>
          )}
        </div>
      </BlockStack>
    );
  };


  const renderActionButtons = () => {
    return (
      <div className="absolute bottom-4 left-8 right-8 flex justify-between items-center">
        <Tooltip content="View Details">
          <Button 
            icon={EditIcon} 
            variant="secondary" 
            size="slim"
            disabled={loading}
            onClick={() => onAction('edit', content)}
          />
        </Tooltip>
        <Tooltip content="Delete Content">
          <Button 
            icon={DeleteIcon} 
            variant="secondary" 
            size="slim"
            disabled={loading  && deletedItem !== content.contentId}
            loading={loading && deletedItem === content.contentId}
            onClick={() => onAction('delete', content)}
          />
        </Tooltip>
      </div>
    );
  };

  return (
    <ResourceItem
      id={content.id}
      accessibilityLabel={`View details for ${content?.title || content?.article_title}`}
      name={content?.title || content?.article_title}
    >
      <Box className="p-4 h-[400px] border border-gray-200 shadow-sm rounded-lg bg-white relative">
        <BlockStack gap="400">
          {renderTemplateImage()}
          {renderContentDetails()}
          {renderActionButtons()}
        </BlockStack>
      </Box>
    </ResourceItem>
  );
});

const VISIBLE_ITEMS = 4;
const TOTAL_VISIBLE_ITEMS = 10;
const BATCH_SIZE = 50;
const HISTORY_UPDATE_DELAY = 1000;

interface ContentHistoryPageProps {
  session: AppSession;
}

export default function ContentHistory({ session }: ContentHistoryPageProps) {
  const { state } = useGeneralContext();
  const { setTheme: setNextTheme } = useTheme();
  const { setTheme, setIsSidebarOpened } = useGeneralActions();
  const { theme, isSidebarOpened } = state;  
  const [contents, setContents] = useState<ShopifyContent[]>([]);
  const [deletedItem, setDeletedItem] = useState(null);
  const [isDeleting, setIsDeleting] = useState(null);
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentLimit, setCurrentLimit] = useState(8);
  const [paginationLimit, setPaginationLimit] = useState(1);
  const [totalContents, setTotalContents] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchDebounce, setSearchDebounce] = useState('');
  const [taggedWith, setTaggedWith] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchField, setSearchField] = useState<'title' | 'product_type' | 'all'>('all');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<'relevance' | 'newest' | 'price'>('relevance');
  const [selectedContentTypes, setSelectedContentTypes] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [minMaxPrices, setMinMaxPrices] = useState<{ min: number; max: number }>({ min: 0, max: 1000 });
  const searchTimeout = useRef<NodeJS.Timeout>();
  const [toastMessage, setToastMessage] = useState("");
  const [toastActive, setToastActive] = useState(false);
  const [showRedirectModal, setShowRedirectModal] = useState(false);
  const [isSetupLoading, setIsSetupLoading] = useState<boolean>(false);
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [confirmDeleteModal, setConfirmDeleteModal] = useState(false);
  const { shopName, shopifyOfflineAccessToken: accessToken } = session;
  const { flattenArticles, flattenBlogs, flattenProducts } = useFlattenContent();
  const { app } = useAppBridge();
  const redirect = app && Redirect.create(app);
  const searchParams = useSearchParams();
  const shop = searchParams?.get("shop") || "";
  const host = searchParams?.get("host") || "";

  const onSidebarOpen = () => setIsSidebarOpened(true);
  const onSidebarClose = () => setIsSidebarOpened(false);
  const onSidebarToggle = () => setIsSidebarOpened(!isSidebarOpened);

  const calculatePriceRange = useCallback((contents: CONTENT[]) => {
    const prices = contents
      .map(p => Number(p.variants?.[0]?.price) || 0)
      .filter(price => price > 0);
    
    if (prices.length === 0) {
      return { min: 0, max: 1000 };
    }
    
    return {
      min: Math.floor(Math.min(...prices)),
      max: Math.ceil(Math.max(...prices))
    };
  }, []);

  useEffect(() => {
    const { min, max } = calculatePriceRange(contents);
    setMinMaxPrices({ min, max });
    setPriceRange([min, max]);
  }, [contents, calculatePriceRange]);

   useEffect(() => {
     if (searchTimeout.current) {
       clearTimeout(searchTimeout.current);
     }
     searchTimeout.current = setTimeout(() => {
       setSearchQuery(searchDebounce);
     }, 300);

     return () => {
       if (searchTimeout.current) {
         clearTimeout(searchTimeout.current);
       }
     };
   }, [searchDebounce]);

    const handleTaggedWithChange = useCallback(
      (value: string) => setTaggedWith(value),
      [],
    );

  const fetchContentHistory = useCallback(async (pagination: number, limit: number) => {
    if (!shopName) return;
    try {
      setIsLoading(true);
      setError(null);
      const result = await ShopApiService.getList(
        accessToken, 
        shopName,
        paginationLimit,
        limit
      );
      const flattenedArticles = flattenArticles(result?.articles);
      const flattenedBlogs = flattenBlogs(result?.blogs);
      const flattenedProducts = flattenProducts(result?.products);
      const combinedArray = [
        ...flattenedArticles,
        ...flattenedBlogs,
        ...flattenedProducts
      ];
      setContents(combinedArray);
      setTotalContents(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch usage data');
    } finally {
      setIsLoading(false);
    }
  }, [shopName]);

  const memoizedContents = useMemo(() => contents, [contents]);

  const loadMoreContents = useCallback(async () => {
    const newPaginationLimit = paginationLimit + 1;
    try {
      setLoadingMore(true);
      const result = await ShopApiService.getList(
        accessToken, 
        shopName,
        newPaginationLimit,
        currentLimit
      );
      const flattenedArticles = flattenArticles(result?.articles);
      const flattenedBlogs = flattenBlogs(result?.blogs);
      const flattenedProducts = flattenProducts(result?.products);
      const combinedArray = [
        ...flattenedArticles,
        ...flattenedBlogs,
        ...flattenedProducts
      ];
      setContents(combinedArray);
      setPaginationLimit(newPaginationLimit);
      setTotalContents(result.total);
    } catch (error) {
      console.error('Failed to load more content', error);
    } finally {
      setLoadingMore(false);
    }
  }, [currentLimit, paginationLimit, session]);

  useEffect(() => {
    if (isLoading) return;
    fetchContentHistory(paginationLimit, currentLimit);
  }, [fetchContentHistory]);

  useEffect(() => {
    const unsubscribe = eventEmitter.subscribe('formSubmitted', () => {
      setIsPublishing(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isPublishing) {
      const timer = setTimeout(() => {
        setPaginationLimit(1);
        fetchContentHistory(paginationLimit, currentLimit);
        setIsPublishing(false);
      }, HISTORY_UPDATE_DELAY);
      return () => clearTimeout(timer);
    }
  }, [isPublishing, fetchContentHistory, currentLimit, paginationLimit]);

  const filteredContents = useMemo(() => {
    let filtered = contents.map(content => ({
     ...content,
     relevanceScore: getRelevanceScore(content, searchQuery)
    }));
    filtered.sort((a, b) => {
      const dateA = new Date('updated_at' in a ? a.updated_at : a.article_published_at).getTime();
      const dateB = new Date('updated_at' in b ? b.updated_at : b.article_published_at).getTime();
      return dateB - dateA;
    });
    if (taggedWith) {
      filtered = filtered.filter(content => {
        const tags = 'article_tags' in content 
          ? content.article_tags 
          : content.tags;
        return tags?.toLowerCase().includes(taggedWith.toLowerCase());
      });
    }
    if (priceRange[0] > minMaxPrices.min || priceRange[1] < minMaxPrices.max) {
      filtered = filtered.filter(content => {
        if (!('product_type' in content)) return true;
        const price = Number(content.variants?.[0]?.price) || 0;
        return price >= priceRange[0] && price <= priceRange[1];
      });
    }
    if (selectedContentTypes.length > 0) {
      filtered = filtered.filter(content => {
        if ('product_type' in content) return selectedContentTypes.includes('PRODUCT');
        if ('article_title' in content) return selectedContentTypes.includes('ARTICLE');
        if ('blog_title' in content) return selectedContentTypes.includes('BLOG');
        return false;
      });
    }
    if (selectedStatuses.length > 0) {
      filtered = filtered.filter(content => {
        if ('product_type' in content) {
          return selectedStatuses.includes(content.status);
        } else if ('article_title' in content) {
          const articleStatus = content.article_published ? 'published' : 'draft';
          return selectedStatuses.includes(articleStatus);
        }
        return true; 
      });
    }

   if (searchQuery) {
      filtered = filtered.filter(content => {
        const searchableFields = {
          title: ('article_title' in content ? content.article_title : content.title)?.toLowerCase() || '',
          description: ('article_body_html' in content ? content.article_body_html : content.body_html)?.toLowerCase() || '',
          author: ('article_author' in content ? content.article_author : '')?.toLowerCase() || '',
          type: ('product_type' in content ? content.product_type : '')?.toLowerCase() || ''
        };

        switch (searchField) {
          case 'title':
            return searchableFields.title.includes(searchQuery.toLowerCase());
          case 'product_type':
            return searchableFields.type.includes(searchQuery.toLowerCase());
          case 'all':
          default:
            return Object.values(searchableFields).some(field => 
              field.includes(searchQuery.toLowerCase())
            );
        }
      });
    }
  switch (sortOrder) {
    case 'newest':
      filtered.sort((a, b) => {
        const dateA = new Date('updated_at' in a ? a.updated_at : a.article_published_at).getTime();
        const dateB = new Date('updated_at' in b ? b.updated_at : b.article_published_at).getTime();
        return dateB - dateA;
      });
      break;
    case 'price':
      filtered.sort((a, b) => {
        if (!('product_type' in a) || !('product_type' in b)) return 0;
        return (Number(a.variants?.[0]?.price) || 0) - (Number(b.variants?.[0]?.price) || 0);
      });
      break;
    case 'relevance':
    default:
      filtered.sort((a, b) => b.relevanceScore - a.relevanceScore);
      break;
  }
  return filtered;
}, [contents, searchQuery, searchField, selectedStatuses, selectedContentTypes, sortOrder, priceRange, minMaxPrices, taggedWith]);

const searchStats: SearchStats = useMemo(() => ({
   totalResults: contents.length,
   filteredResults: filteredContents.length,
   appliedFilters: {
     search: searchQuery,
     status: selectedStatuses,
     contentType: selectedContentTypes
   },
   sortOrder,
   priceRange: priceRange[0] || priceRange[1] ? priceRange : undefined
 }), [contents.length, filteredContents.length, searchQuery, selectedStatuses, selectedContentTypes, sortOrder, priceRange]);

  const setUpShopStorage = useCallback(async () => {
    if (!shopName) return;
    setIsSetupLoading(true);
    try {
      const { data: existingFiles, error: listError } = await supabase.storage
        .from('optiwrite-images')
        .list(`${shopName}`);
      if (listError) {
        console.error("Error checking folder:", listError);
        throw listError;
      }
      if (existingFiles && existingFiles.length > 0) {
        const filesToRemove = existingFiles.map((file) => `${shopName}/${file.name}`);
        const { error: removeError } = await supabase.storage
          .from('optiwrite-images')
          .remove(filesToRemove);
        if (removeError) {
          console.error("Error clearing folder:", removeError);
          throw removeError;
        }
      }
    } catch (error) {
      console.error("Error setting up storage:", error);
      throw error;
    } finally {
      setIsSetupLoading(false);
    }
  }, [shopName]);

  const handleCreateNewContent = useCallback(() => {
    if (!shop || !host || !redirect) return;
    const queryParams = new URLSearchParams({ shop, host }).toString();
    redirect.dispatch(Redirect.Action.APP, {
      path: `/versions/light?${queryParams}`
    });
  }, [redirect, shop, host]);

  const handleEdit = useCallback(async(contentId: string) => {
    if (!shop || !host || !redirect) {
      console.error('Missing required navigation parameters');
      return;
    }
    const queryParams = new URLSearchParams({ shop, host }).toString();
    await setUpShopStorage();
    const returnUrl = `/content/${contentId}?${queryParams}`;
    redirect.dispatch(Redirect.Action.APP, { path: returnUrl });
  }, [redirect, setUpShopStorage, shop, host]);

  const onOpenEditView = useCallback(async () => {
    setShowRedirectModal(true);
  }, []);

  const handleDelete = useCallback(async(contentId: string) => {
    if (!shopName || !accessToken) {
      console.error('Missing required credential parameters');
      return;
    }
    try {
      setIsDeleting(true);
      setDeletedItem(contentId);
      await ShopApiService.delete(accessToken, shopName, contentId);
      setContents(contents.filter(content => content.contentId !== contentId));
    } catch (err) {
      console.error('Failed to delete content:', err);
      setError('Failed to delete content!!')
    } finally {
      setDeletedItem(null);
      setIsDeleting(false);
    }
  }, [shopName, accessToken]);

  const handleContentAction = (type: 'view' | 'edit' | 'delete', content: ShopifyContent) => {
    switch (type) {
      case 'view':
        setSelectedContent(content);
        setIsModalOpen(true);
        break;
      case 'edit':
        setSelectedContent(content);
        onOpenEditView();
        break;
      case 'delete':
        setSelectedContent(content);
        setConfirmDeleteModal(true);
        break;
    }
  };

  const enhancedFilters = [
   {
     key: 'searchField',
     label: 'Search In',
     filter: (
       <ChoiceList
         title="Search Field"
         choices={[
           { value: 'all', label: 'All Fields' },
           { value: 'title', label: 'Title' },
         ]}
         selected={[searchField]}
         onChange={(value) => setSearchField(value[0] as 'title' | 'all')}
       />
     ),
   },
   {
    key: 'contentType',
    label: 'Content Type',
    filter: (
        <ChoiceList
          title="Content Type"
          allowMultiple
          choices={[
            { value: ContentCategory.PRODUCT, label: 'Products' },
            { value: ContentCategory.ARTICLE, label: 'Articles' },
            { value: ContentCategory.BLOG, label: 'Blogs' }
          ]}
          selected={selectedContentTypes}
          onChange={setSelectedContentTypes}
          disabled={contents.length === 0}
        />
      ),
    },
   {
     key: 'status',
     label: 'Status',
     filter: (
       <ChoiceList
         title="Status"
         allowMultiple
         choices={[
           { value: 'active', label: 'Active' },
           { value: 'archived', label: 'Archived' },
           { value: 'draft', label: 'Draft' }
         ]}
         selected={selectedStatuses}
         onChange={setSelectedStatuses}
       />
     ),
   },
   {
      key: 'taggedWith',
      label: 'Tagged with',
      filter: (
        <TextField
          label="Tagged with"
          value={taggedWith}
          onChange={handleTaggedWithChange}
          autoComplete="off"
          labelHidden
          disabled={contents.length === 0}
          placeholder="Enter tags..."
        />
      ),
    },
    {
      key: 'price',
      label: 'Price Range',
      filter: (
        <div className="w-full px-4">
          <div className="flex items-center gap-4 mb-2">
            <TextField
              label="Min Price"
              type="number"
              value={String(priceRange[0])}
              onChange={(value) => {
                const newMin = Math.max(minMaxPrices.min, Math.min(Number(value), priceRange[1]));
                setPriceRange([newMin, priceRange[1]]);
              }}
              autoComplete="off"
              prefix="$"
              disabled={contents.length === 0}
            />
            <TextField
              label="Max Price"
              type="number"
              value={String(priceRange[1])}
              onChange={(value) => {
                const newMax = Math.min(minMaxPrices.max, Math.max(Number(value), priceRange[0]));
                setPriceRange([priceRange[0], newMax]);
              }}
              autoComplete="off"
              prefix="$"
              disabled={contents.length === 0}
            />
          </div>
        </div>
      ),
    },
    {
     key: 'sort',
     label: 'Sort By',
     filter: (
       <ChoiceList
         title="Sort by"
         choices={[
           { label: 'Best Match', value: 'relevance' },
           { label: 'Newest', value: 'newest' },
           { label: 'Price', value: 'price' }
         ]}
         selected={[sortOrder]}
         onChange={(value) => setSortOrder(value[0] as typeof sortOrder)}
       />
     ),
   }
  ].map(filter => ({
    ...filter,
    filter: contents.length === 0 ? React.cloneElement(filter.filter, { disabled: true }) : filter.filter
  }));
  
  const handleNavigation = useCallback(() => {
    if (!shop || !host || !redirect) {
      console.error('Missing required navigation parameters');
      return;
    }
    const queryParams = new URLSearchParams({
      shop,
      host
    }).toString();
    const returnUrl = `/versions/light?${queryParams}`;
    redirect.dispatch(Redirect.Action.APP, {
      path: returnUrl
    });
  }, [searchParams, redirect, shop, host]);

  const onNavigateToSupport = useCallback(() => {
    const shop = searchParams?.get("shop");
    const host = searchParams?.get("host");
    if (!shop || !host || !redirect) {
      console.error('Missing required navigation parameters');
      return;
    }
    const queryParams = new URLSearchParams({
      shop,
      host
    }).toString();
    const returnUrl = `/support?${queryParams}`; 
    redirect.dispatch(Redirect.Action.APP, {
      path: returnUrl
    });
  }, [searchParams, redirect]);

  const onNavigateToBilling = useCallback(() => {
    const shop = searchParams?.get("shop");
    const host = searchParams?.get("host");
    if (!shop || !host || !redirect) {
      console.error('Missing required navigation parameters');
      return;
    }
    const queryParams = new URLSearchParams({
      shop,
      host
    }).toString();
    const returnUrl = `/billing?${queryParams}`; 
    redirect.dispatch(Redirect.Action.APP, {
      path: returnUrl
    });
  }, [searchParams, redirect]);

  const onNavigateToDashboard = useCallback(() => {
    const shop = searchParams?.get("shop");
    const host = searchParams?.get("host");
    if (!shop || !host || !redirect) {
      console.error('Missing required navigation parameters');
      return;
    }
    const queryParams = new URLSearchParams({
      shop,
      host
    }).toString();
    const returnUrl = `/dashboard?${queryParams}`; 
    redirect.dispatch(Redirect.Action.APP, {
      path: returnUrl
    });
  }, [searchParams, redirect]);

  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'light' ? 'dark-experimental' : 'light';
    const _newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    setNextTheme(_newTheme);
    localStorage.setItem('theme', newTheme);
  }, [theme, setTheme]);

  useEffect(() => {
    const storedTheme = localStorage.getItem('theme') || 'light';
    const _newTheme = storedTheme === 'light' ? 'light' : 'dark';
    setTheme(storedTheme);
    setNextTheme(_newTheme);
  }, []);

  const navigationMarkup = (
    <Sidebar
      isOpen={isSidebarOpened} 
      onToggle={onSidebarToggle} 
      onOpen={onSidebarOpen}
      onClose={onSidebarClose}
    />
  );

  const topBarMarkup = (
    <Box className="bg-white p-4 mt-6 rounded-md shadow-lg px-10 w-full">
      <InlineStack align="space-between" blockAlign="center" gap="400">
        <InlineStack align="center" gap="400">
          <Text variant="headingLg" as="h1">
            Optiwrite
          </Text>

          <InlineStack align="center" gap="400">
            <Tooltip content="Toggle navigation">
              <Button
                variant="tertiary"
                onClick={() => onToggleSidebar()}
              >
                <AppsIcon className="w-6 h-6 fill-gray-500" />
              </Button>
            </Tooltip>
            <Tooltip content="Create new form">
              <Button
                variant="primary"
                tone="success"
                icon={ComposeIcon}
                onClick={() => handleCreateNewContent()}
              >
                Create new
              </Button>
            </Tooltip>
          </InlineStack>
        </InlineStack>
      </InlineStack>
    </Box>
  );

  const toastMarkup = toastActive ? (
    <Toast
      content={toastMessage}
      error={toastType === "error"}
      onDismiss={() => setToastActive(false)}
      duration={4000}
    />
  ) : null;

  const memoizedContent = useMemo(() => (
    <div className=" mt-10 h-full w-full max-h-[800px] rounded-xl border border-gray-400/60 !overflow-y-auto shadow-md transition-all duration-300 bg-[--p-color-bg-surface]">
      <div className="flex flex-col h-full bg-surface dark:bg-surface-dark">
        <div className="sticky top-0 z-10 bg-white dark:bg-[var(--p-color-bg-surface)] bg-py-4 px-4 border-b border-gray-200 z-20">
          <BlockStack gap="400">
            <div className="flex justify-between items-center mt-3">
              <div>
                <h2 className="text-2xl font-semibold text-emphasis dark:text-emphasis-dark">
                  Publish History
                </h2>
                <Text variant="bodySm" tone="subdued">
                  Manage and track your product listings
                </Text>
              </div>
              <Button
                variant="primary"
                onClick={handleCreateNewContent}
                icon={PlusIcon}
              >
                Publish New Product
              </Button>
            </div>

            <TextField
              label="Search contents"
              value={searchDebounce}
              onChange={setSearchDebounce}
              placeholder="Search by title, category, vendor, tags, or SKU..."
              clearButton
              onClearButtonClick={() => {
                setSearchDebounce('');
                setSearchQuery('');
              }}
              autoComplete="off"
            />
            <Filters
              queryValue={searchQuery}
              filters={enhancedFilters}
              onQueryChange={setSearchQuery}
              appliedFilters={[
                ...(selectedStatuses.length > 0 ? [{
                  key: 'status',
                  label: `Status: ${selectedStatuses.join(', ')}`,
                  onRemove: () => setSelectedStatuses([])
                }] : []),
                ...(taggedWith ? [{
                  key: 'taggedWith',
                  label: `Tags: ${taggedWith}`,
                  onRemove: () => setTaggedWith('')
                }] : []),
                ...(priceRange[0] > minMaxPrices.min || priceRange[1] < minMaxPrices.max ? [{
                  key: 'price',
                  label: `Price: $${priceRange[0]} - $${priceRange[1]}`,
                  onRemove: () => setPriceRange([minMaxPrices.min, minMaxPrices.max])
                }] : []),
                ...(sortOrder !== 'relevance' ? [{
                  key: 'sort',
                  label: `Sort: ${sortOrder}`,
                  onRemove: () => setSortOrder('relevance')
                }] : [])
              ]}
              onClearAll={() => {
                setSearchDebounce('');
                setSearchQuery('');
                setSelectedStatuses([]);
                setSelectedContentTypes([]);
                setTaggedWith('');
                setPriceRange([minMaxPrices.min, minMaxPrices.max]);
                setSortOrder('relevance');
              }}
            />
            <div className="mt-2">
              <Text variant="bodyMd" tone="subdued">
                {searchStats.filteredResults === searchStats.totalResults ?
                  `${searchStats.totalResults} total items` :
                  `Showing ${searchStats.filteredResults} of ${searchStats.totalResults} items`}
                {Object.values(searchStats.appliedFilters).some(f => f && f.length) && (
                  <span className="ml-1">
                    (filtered by: {[searchStats.appliedFilters.search && 'search',
                      searchStats.appliedFilters.status?.length && 'status',
                      searchStats.appliedFilters.productType?.length && 'category',
                      searchStats.priceRange?.length && 'price',
                      searchStats.sortOrder !== 'relevance' && 'sort']
                      .filter(Boolean).join(', ')})
                  </span>
                )}
              </Text>
            </div>
          </BlockStack>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Spinner size="large" />
            </div>
          ) : (
            <div className="flex flex-col max-w-8xl mx-auto px-4 sm:px-6 py-4">
              {filteredContents.length > 0 ? (
                <Grid
                  columns={{
                    xs: 6,
                    sm: 6,
                    md: 12,
                    lg: 12,
                    xl: 12
                  }}
                  gap={{
                    xs: '20px',
                    sm: '20px',
                    md: '20px',
                    lg: '20px'
                  }}
                >
                  {filteredContents.map((item, index) => (
                    <Grid.Cell
                      key={item.id}
                      columnSpan={{
                        xs: 6,
                        sm: 6,
                        md: 6,
                        lg: 3,
                        xl: 3
                      }}
                    >
                      <ContentCard
                        key={item.id}
                        content={item}
                        loading={isLoading || isDeleting}
                        deletedItem={deletedItem}
                        onAction={handleContentAction}
                      />
                    </Grid.Cell>
                  ))}
                </Grid>
              ) : (
                <EmptyState
                  heading="No items found"
                  action={{
                    content: 'Publish your first product',
                    onAction: handleCreateNewContent,
                  }}
                >
                  <p>Get started by publishing your first product to begin tracking your inventory</p>
                </EmptyState>
              )}

              {filteredContents.length < totalContents && (
                <div className="flex justify-center py-6">
                  <Button
                    onClick={loadMoreContents}
                    loading={loadingMore}
                    size="large"
                    variant="secondary"
                  >
                    Load More Contents
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
        <Modal
          open={confirmDeleteModal}
          onClose={() => setConfirmDeleteModal(false)}
          title="Confirm Delete"
          primaryAction={{
            content: 'Delete',
            destructive: true,
            onAction: async () => {
              setConfirmDeleteModal(false);
              await handleDelete(selectedContent?.contentId);
            }
          }}
          secondaryActions={[{
            content: 'Cancel',
            onAction: () => setConfirmDeleteModal(false)
          }]}
        >
          <Modal.Section>
            <Text>
              Are you sure you want to delete "{selectedContent?.title || selectedContent?.article_title || selectedContent?.blog_title}"? 
              This action cannot be undone.
            </Text>
          </Modal.Section>
        </Modal>
      </div>
    </div>
  ), [
    searchDebounce,
    searchQuery,
    selectedStatuses,
    taggedWith,
    priceRange,
    sortOrder,
    filteredContents,
    isLoading,
    totalContents,
    loadingMore,
    confirmDeleteModal,
    selectedContent,
    isDeleting,
    deletedItem,
    handleCreateNewContent,
    handleContentAction,
    handleDelete,
    loadMoreContents,
  ]);

  const pageMarkup = (
    <Page
      title="Content Publish History"
      subtitle="View Publish Content Here"
      fullWidth
      backAction={{
        content: 'Back To Main Page',
        onAction: handleCreateNewContent,
      }}
      primaryAction={
        <ThemeToggleButton id="theme-toogle-btn" onClick={toggleTheme} aria-label="Toggle theme">
          <IconWrapper>
            {theme === 'light' ? (
              <>
                <Icon source={MoonIcon} />
                Dark mode
              </>
            ) : (
              <>
                <Icon source={SunIcon} />
                Light mode
              </>
            )}
          </IconWrapper>
        </ThemeToggleButton>
      }
      secondaryActions={[
        {
          id: 'notification-bell',
          content: <NotificationBell shopName={shopName} />,
          onAction: () => {}, 
        },
        {
          id: 'purchase-button',
          content: 'Upgrade',
          icon: CreditCardIcon,
          onAction: () => onNavigateToBilling()
        },
        {
          id: 'language-button',
          content: 
          <LanguageSelector 
            IconComponent={LanguageIcon}
            fullWidth={true}
          />,
          onAction: () => {}, 
        },
      ]}
    >
    <Layout>
      {memoizedContent}
    </Layout>
  </Page>
  );

  return (
    <AnimatePresence>
      <LayoutContainer
        className="py-10"
        initial={false}
        animate={isSidebarOpened ? 'expanded' : 'collapsed'}
        variants={layoutVariants}
        transition={{ type: 'tween', duration: 0.3 }}
      >
        {isSidebarOpened && (
          <StyledOverlay
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={overlayVariants}
            transition={{ duration: 0.2 }}
          />
        )}
        {pageMarkup}
        {toastMarkup}
        {showRedirectModal && (
          <RedirectModal
            content={selectedContent} 
            isOpen={showRedirectModal}
            onClose={() => setShowRedirectModal(false)}
            onProceed={handleEdit}
            loading={isSetupLoading}
          />
        )}
      </LayoutContainer>
    </AnimatePresence>
  );
}


