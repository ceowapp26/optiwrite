"use client"
import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { TEMPLATE_OPTIONS } from '@/constants/template';
import {
  Page,
  Layout,
  Card,
  ResourceList,
  ResourceItem,
  Filters,
  Button,
  ChoiceList,
  EmptyState,
  Loading,
  Text,
  Pagination,
  BlockStack,
  ActionList,
  Frame,
  Tag,
  Tooltip,
  Modal,
  Spinner,
  Popover,
  Toast
} from '@shopify/polaris';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppBridge } from '@/providers/AppBridgeProvider';
import { Redirect } from '@shopify/app-bridge/actions';
import { Content } from '@/types/template';
import { HistoryContentCard } from './HistoryContentCard';
import { ContentDetailsModal } from './ContentDetailsModal';
import LoadingScreen from '@/components/LoadingScreen';
import { getUserContentHistory } from "@/actions/template";
import { AppSession } from '@/types/auth';
import { ShopApiService } from '@/utils/api';
import { PlusIcon, XIcon, ViewIcon, HeartIcon, HomeIcon, OrderIcon, ProductIcon, EditIcon, DeleteIcon, ChevronDownIcon } from '@shopify/polaris-icons';
import { ErrorType } from '@/types/form';
import { TemplateDetailsModal } from './TemplateDetailsModal';
import { useAppDispatch, useAppSelector } from '@/hooks/useLocalStore';
import { 
  addToFavorites, 
  removeFromFavorites, 
  createList, 
  updateList,
  addItemToList, 
  removeItemFromList,
  selectFavorites,
  selectTemplatesList,
  selectTemplates,
  createTemplates,
  updateTemplates,
} from '@/stores/features/templateSlice';

interface IProduct {
  id: number;
  templateId?: number;
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
  templateId?: number;
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
  templateId?: number;
  category?: string;
  title: string;
  handle: string;
  updated_at: string;
  metafield?: Record<string, any>;
  tags?: string;
}


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

const getRelevanceScore = (template: ShopifyContent, searchQuery: string): number => {
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
  if ('product_type' in template) {
    const fields = {
      title: template.title?.toLowerCase() || '',
      sku: template.variants?.[0]?.sku?.toLowerCase() || '',
      type: template.product_type?.toLowerCase() || '',
      tags: template.tags?.toLowerCase() || '',
      description: template.body_html?.toLowerCase() || ''
    };
    Object.entries(fields).forEach(([field, value]) => {
      if (value.includes(query)) {
        score += productWeights[field];
      }
    });
  } else if ('article_title' in template) {
    const fields = {
      title: template.article_title?.toLowerCase() || '',
      author: template.article_author?.toLowerCase() || '',
      tags: template.article_tags?.join(' ').toLowerCase() || '',
      description: template.article_body_html?.toLowerCase() || ''
    };

    Object.entries(fields).forEach(([field, value]) => {
      if (value.includes(query)) {
        score += articleWeights[field];
      }
    });
  } else if ('blog_title' in template) {
    const fields = {
      title: template.blog_title?.toLowerCase() || '',
      tags: template.blog_tags?.join(' ').toLowerCase() || ''
    };
    Object.entries(fields).forEach(([field, value]) => {
      if (value.includes(query)) {
        score += blogWeights[field];
      }
    });
  }
  return score;
};

type ShopifyContent = IProduct | IArticle | IBlog;

const TemplateCard = memo(({ template, onAction }) => {
  const [popoverActive, setPopoverActive] = useState(false);
  const [isFavorite, setIsFavorite] = useState(template?.isFavorite || false);
  const renderTemplateImage = () => {
    const imageSrc = template.article_image || template.image?.src;
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
          <Tag variant="interactive">{template.type}</Tag>
          <Tag 
            variant={template.status === 'active' ? 'success' : 'warning'}
          >
            {template.status}
          </Tag>
        </div>
      </div>
    ) : null;
  };

  const renderContentDetails = () => {
    const content = template.article_summary_html || template.body_html || 'No description available.';
    const truncatedContent = content.length > 150 
      ? `${content.substring(0, 150)}...` 
      : content;
    return (
      <BlockStack gap="200">
        <Text as="h3" variant="headingSm">{template.title || 'Untitled'}</Text>
        <Text variant="bodyMd" tone="subdued">
          {truncatedContent}
        </Text>
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          {template.category && <Tag>{template.category}</Tag>}
          {template.keywords?.length > 0 && (
            <Tag>{template.keywords.slice(0, 2).join(', ')}</Tag>
          )}
        </div>
      </BlockStack>
    );
  };

  const renderActionButtons = () => {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginTop: '16px'
      }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Tooltip content="View Details">
            <Button 
              icon={ViewIcon} 
              variant="secondary" 
              size="slim"
              onClick={() => onAction('view', template)}
            />
          </Tooltip>
          <Tooltip content="Add to List">
            <Button 
              icon={PlusIcon} 
              variant="secondary" 
              size="slim"
              onClick={() => onAction('list', template)}
            />
          </Tooltip>
          <Tooltip content={isFavorite ? "Remove from Favorites" : "Add to Favorites"}>
            <Button 
              icon={HeartIcon} 
              variant={isFavorite ? "primary" : "secondary"} 
              size="slim"
              onClick={() => onAction('favorite', template)}
            />
          </Tooltip>
        </div>
        
        <Popover
          active={popoverActive}
          activator={
            <Button 
              icon={ChevronDownIcon}
              variant="secondary"
              size="slim"
              onClick={() => setPopoverActive(!popoverActive)}
            />
          }
          onClose={() => setPopoverActive(false)}
        >
          <ActionList
            actionRole="menuitem"
            items={[
              {
                content: 'Edit',
                icon: EditIcon,
                onAction: () => onAction('edit', template)
              },
              {
                content: 'Delete',
                icon: DeleteIcon,
                destructive: true,
                onAction: () => onAction('delete', template)
              }
            ]}
          />
        </Popover>
      </div>
    );
  };

  return (
    <Card 
      key={template.id} 
      padding="400"
      background="bg-surface-secondary"
      roundedAbove="sm"
      shadow="md"
    >
      <BlockStack gap="400">
        {renderTemplateImage()}
        {renderContentDetails()}
        {renderActionButtons()}
      </BlockStack>
    </Card>
  );
});

const TemplateGrid = memo(({ templates, onAction, searchStats }: {
 templates: CONTENT[];
 onAction: (type: string, template: CONTENT) => Promise<void>;
 searchStats: SearchStats;
}) => {
 return (
   <>
     <div className="mx-4 pb-2 mb-2 border-b border-gray-400/80">
       <Text variant="bodyMd" tone="subdued">
         {searchStats.filteredResults === searchStats.totalResults ? 
           `${searchStats.totalResults} total products` : 
           `Showing ${searchStats.filteredResults} of ${searchStats.totalResults} products`}
         {Object.values(searchStats.appliedFilters).some(f => f && f.length) && (
           <span className="ml-1">
             (filtered by: {[
               searchStats.appliedFilters.search && 'search',
               searchStats.appliedFilters.status?.length && 'status',
               searchStats.appliedFilters.productType?.length && 'category',
               searchStats.priceRange?.length && 'price',
               searchStats.sortOrder !== 'relevance' && 'sort'
             ].filter(Boolean).join(', ')})
           </span>
         )}
       </Text>
     </div>
     <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4 mt-2">
       {templates.map((template) => (
         <TemplateCard key={template.id} template={template} onAction={onAction} />
       ))}
     </div>
   </>
 );
});

const VISIBLE_ITEMS = 4;
const TOTAL_VISIBLE_ITEMS = 10;
const BATCH_SIZE = 50;

interface ContentTemplateProps {
  session: AppSession;
}

export default function ContentTemplate({ session }: ContentTemplateProps) {
  const [templates, setTemplates] = useState(TEMPLATE_OPTIONS);
  const [template, setTemplate] = useState(null);
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentLimit, setCurrentLimit] = useState(16);
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
  const [confirmDeleteModal, setConfirmDeleteModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; error?: boolean }>({ message: '' });
  const { app } = useAppBridge();
  const redirect = app && Redirect.create(app);
  const searchParams = useSearchParams();
  const shop = searchParams?.get("shop") || "";
  const host = searchParams?.get("host") || "";
  const dispatch = useAppDispatch();
  const storedTemplates = useAppSelector(selectTemplates);
  const templateItems = useAppSelector(selectTemplatesList);

  const calculatePriceRange = useCallback((templates: CONTENT[]) => {
    const prices = templates
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
    const { min, max } = calculatePriceRange(templates);
    setMinMaxPrices({ min, max });
    setPriceRange([min, max]);
  }, [templates, calculatePriceRange]);

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

  const loadMoreTemplate = useCallback(async () => {
    const newLimit = currentLimit + 16;
    try {
      setLoadingMore(true);
      const paginatedArray = TEMPLATE_OPTIONS.slice(0, newLimit)
      setTemplates(paginatedArray);
      setCurrentLimit(newLimit);
      setTotalContents(TEMPLATE_OPTIONS.length);
    } catch (error) {
      console.error('Failed to load more template', error);
    } finally {
      setLoadingMore(false);
    }
  }, [currentLimit, session]);

  const handleAddItem = useCallback((template: EnhancedTemplateOption) => {
    if (templateItems.length >= 20) {
      setToast({
        message: 'Cannot add item. Maximum 20 items required.',
        error: true
      });
      return;
    }
    dispatch(addItemToList({
      listName:'templateList', 
      item: {
        ...template
      }
    }));
    setToast({
      message: `Template "${template.id}" has been added successfully.`,
      error: false
    });
  }, [templateItems.length, dispatch]);

  const handleToggleFavorite = useCallback((template: EnhancedTemplateOption) => {
    const updatedTemplates = storedTemplates[template.category].map((item) =>
      item.id === template.id
        ? { ...item, isFavorite: !item.isFavorite }
        : item
    );
    dispatch(updateTemplates({
      type: template.category,
      items: updatedTemplates
    }));
  }, [dispatch, storedTemplates]);

  const handleView = useCallback((template: Content) => {
    if (!shop || !host || !redirect) {
      console.error('Missing required navigation parameters');
      return;
    }
    const queryParams = new URLSearchParams({ shop, host }).toString();
    const returnUrl = `/content/templates/${template.id}?${queryParams}`;
    redirect.dispatch(Redirect.Action.APP, { path: returnUrl });
  }, [redirect, shop, host]);

  const sortedTemplates = useMemo(() => {
    const flattenedTemplates = [
      ...(storedTemplates.blog || []),
      ...(storedTemplates.article || []),
      ...(storedTemplates.product || []),
    ];
    return flattenedTemplates.sort((a, b) => 
      (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0)
    );
  }, [storedTemplates]);

  const handleCreateNewContent = useCallback(() => {
    if (!shop || !host || !redirect) return;
    const queryParams = new URLSearchParams({ shop, host }).toString();
    redirect.dispatch(Redirect.Action.APP, {
      path: `/versions/light?${queryParams}`
    });
  }, [redirect, shop, host]);

  const handleContentAction = (type: 'view' | 'favorite' | 'list', template: ShopifyContent) => {
    switch (type) {
      case 'view':
        handleView(template);
        break;
      case 'favorite':
        handleToggleFavorite(template);
        break;
      case 'list':
        handleAddItem(template);
        break;
    }
  };

  useEffect(() => {
    const templatesByCategory = TEMPLATE_OPTIONS.reduce((acc, option) => {
      const { category } = option;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push({
        ...option,
        id: option.id || uuidv4(),
        isFavorite: false
      });
      return acc;
    }, {} as Record<'blog' | 'article' | 'product', Template[]>);
    if (!storedTemplates || Object.values(storedTemplates).every(arr => arr.length === 0)) {
      Object.entries(templatesByCategory).forEach(([type, items]) => {
        dispatch(createTemplates({
          type: type as 'blog' | 'article' | 'product',
          items
        }));
      });
    } else {
      Object.entries(templatesByCategory).forEach(([type, newTemplates]) => {
        const storedTemplatesForType = storedTemplates[type] || [];
        const updatedTemplates = newTemplates.map(newTemplate => {
          const existingTemplate = storedTemplatesForType.find(
            stored => stored.id === newTemplate.id
          );
          return {
            ...newTemplate,
            id: existingTemplate?.id || newTemplate.id || uuidv4(),
            isFavorite: existingTemplate?.isFavorite || false,
            ...(existingTemplate && Object.keys(existingTemplate)
              .filter(key => !['id', 'title', 'subtitle', 'icon', 'category', 'type'].includes(key))
              .reduce((acc, key) => ({ ...acc, [key]: existingTemplate[key] }), {}))
          };
        });
        const needsUpdate = JSON.stringify(
          newTemplates.map(({ title, subtitle, icon, category }) => 
            ({ title, subtitle, icon, category })
          )
        ) !== JSON.stringify(
          storedTemplatesForType.map(({ title, subtitle, icon, category }) => 
            ({ title, subtitle, icon, category })
          )
        );
        if (needsUpdate) {
          dispatch(updateTemplates({
            type: type as 'blog' | 'article' | 'product',
            items: updatedTemplates
          }));
        }
      });
    }
    setTemplates(storedTemplates);
  }, [dispatch, TEMPLATE_OPTIONS]);

  const filteredContents = useMemo(() => {
    let filtered = templates.map(template => ({
     ...template,
     relevanceScore: getRelevanceScore(template, searchQuery)
    }));
    filtered.sort((a, b) => {
      const dateA = new Date('updated_at' in a ? a.updated_at : a.article_published_at).getTime();
      const dateB = new Date('updated_at' in b ? b.updated_at : b.article_published_at).getTime();
      return dateB - dateA;
    });
    if (taggedWith) {
      filtered = filtered.filter(template => {
        const tags = 'article_tags' in template 
          ? template.article_tags 
          : template.tags;
        return tags?.toLowerCase().includes(taggedWith.toLowerCase());
      });
    }
    if (priceRange[0] > minMaxPrices.min || priceRange[1] < minMaxPrices.max) {
      filtered = filtered.filter(template => {
        if (!('product_type' in template)) return true; // Skip non-products
        const price = Number(template.variants?.[0]?.price) || 0;
        return price >= priceRange[0] && price <= priceRange[1];
      });
    }
    if (selectedContentTypes.length > 0) {
      filtered = filtered.filter(template => {
        if ('product_type' in template) return selectedContentTypes.includes('PRODUCT');
        if ('article_title' in template) return selectedContentTypes.includes('ARTICLE');
        if ('blog_title' in template) return selectedContentTypes.includes('BLOG');
        return false;
      });
    }
    if (selectedStatuses.length > 0) {
      filtered = filtered.filter(template => {
        if ('product_type' in template) {
          return selectedStatuses.includes(template.status);
        } else if ('article_title' in template) {
          const articleStatus = template.article_published ? 'published' : 'draft';
          return selectedStatuses.includes(articleStatus);
        }
        return true; 
      });
    }

   if (searchQuery) {
      filtered = filtered.filter(template => {
        const searchableFields = {
          title: ('article_title' in template ? template.article_title : template.title)?.toLowerCase() || '',
          description: ('article_body_html' in template ? template.article_body_html : template.body_html)?.toLowerCase() || '',
          author: ('article_author' in template ? template.article_author : '')?.toLowerCase() || '',
          type: ('product_type' in template ? template.product_type : '')?.toLowerCase() || ''
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
          disabled={templates.length === 0}
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
          disabled={templates.length === 0}
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
              disabled={templates.length === 0}
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
              disabled={templates.length === 0}
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
    filter: templates.length === 0 ? React.cloneElement(filter.filter, { disabled: true }) : filter.filter
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

  if (isLoading) {
    return (
      <LoadingScreen />
    );
  }

  const toastMarkup = toast.message ? (
    <Toast 
      content={toast.message} 
      error={toast.error}
      onDismiss={() => setToast({ message: '' })}
    />
  ) : null;

  return (
    <Frame>
      <Page
        title="Content Templates"
        subtitle="Manage and track your template"
        primaryAction={
          <Button primary onClick={handleCreateNewContent}>
            Create New Content
          </Button>
        }
      >
        <Layout>
          <Modal.Section>
            <div className="h-[calc(100vh-200px)] flex flex-col">
              <div className="sticky top-0 z-10 bg-surface py-2">
                <BlockStack gap="400">
                  <TextField
                    label="Search products"
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
                    appliedFilters={[
                      ...(selectedStatuses.length > 0
                        ? [
                            {
                              key: 'status',
                              label: `Status: ${selectedStatuses.join(', ')}`,
                              onRemove: () => setSelectedStatuses([]),
                            },
                          ]
                        : []),
                      ...(taggedWith
                        ? [
                            {
                              key: 'taggedWith',
                              label: `Tags: ${taggedWith}`,
                              onRemove: () => setTaggedWith(''),
                            },
                          ]
                        : []),
                      ...(priceRange[0] > minMaxPrices.min ||
                      priceRange[1] < minMaxPrices.max
                        ? [
                            {
                              key: 'price',
                              label: `Price: $${priceRange[0]} - $${priceRange[1]}`,
                              onRemove: () =>
                                setPriceRange([minMaxPrices.min, minMaxPrices.max]),
                            },
                          ]
                        : []),
                      ...(sortOrder !== 'relevance'
                        ? [
                            {
                              key: 'sort',
                              label: `Sort: ${sortOrder}`,
                              onRemove: () => setSortOrder('relevance'),
                            },
                          ]
                        : []),
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
                    hideQueryField
                  />
                </BlockStack>
              </div>
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="flex justify-center items-center h-64">
                    <Spinner size="large" />
                  </div>
                ) : filteredTemplates.length > 0 ? (
                  <TemplateGrid
                    products={filteredTemplates}
                    onAction={handleContentAction}
                    searchStats={searchStats}
                  />
                ) : (
                  <EmptyState
                    image=""
                    heading="No templates found"
                    action={{
                      content: 'Clear filters',
                      onAction: () => {
                        setSearchDebounce('');
                        setSearchQuery('');
                        setSelectedStatuses([]);
                        setSelectedContentTypes([]);
                        setTaggedWith('');
                        setPriceRange([minMaxPrices.min, minMaxPrices.max]);
                        setSortOrder('relevance');
                      },
                    }}
                  >
                    {error ? (
                      <Banner
                        title="Error loading templates"
                        tone="critical"
                        onDismiss={() => setError(null)}
                      >
                        <p>{error}</p>
                      </Banner>
                    ) : (
                      <Text>Try adjusting your search or filters for better results</Text>
                    )}
                  </EmptyState>
                )}
                {filteredTemplates.length < totalTemplates && (
                  <div className="p-4 flex justify-center">
                    <Button onClick={loadMoreTemplates} loading={loadingMore}>
                      Load More
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Modal.Section>
        </Layout>
        {toastMarkup}
      </Page>
    </Frame>
  );
};
