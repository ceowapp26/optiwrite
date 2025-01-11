import {
  ActionList,
  AppProvider,
  LegacyCard,
  ContextualSaveBar,
  FormLayout,
  Frame,
  Layout,
  Loading,
  Modal,
  Navigation,
  Page,
  Box,
  SkeletonBodyText,
  SkeletonDisplayText,
  SkeletonPage,
  TextContainer,
  TextField,
  Toast,
  InlineStack,
  BlockStack,
  Button,
  Text,
  Link,
  Spinner,
  ProgressBar,
  Card,
  Banner,
  Icon,
  Popover,
  Tooltip,
  Badge
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
  ViewIcon,
  PlusCircleIcon,
  CreditCardIcon,
  ChartVerticalFilledIcon,
  CheckCircleIcon,
  AlertDiamondIcon
} from '@shopify/polaris-icons';
import { ComposeIcon, AppsIcon } from '@shopify/polaris-icons';
import { cn } from '@/lib/utils';
import { z } from 'zod';
import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDataProcessing } from '@/hooks/useDataProcessing';
import { styled } from 'styled-components';
import { AnimatePresence, motion } from 'framer-motion';
import { BaseFormProps, FormType } from './FormProvider';
import { useAppBridge } from '@/providers/AppBridgeProvider';
import { useShopifySubmit } from '@/hooks/useShopifySubmit';
import { Redirect } from '@shopify/app-bridge/actions';
import { type Theme } from '@/context/GeneralContextProvider';
import { useAppDispatch, useAppSelector } from '@/hooks/useLocalStore'; 
import { setContentData, selectContentData } from '@/stores/features/contentSlice';
import DynamicLayout from './DynamicLayout';
import LoadingScreen from '@/components/LoadingScreen';
import { TONE_OPTIONS } from '@/constants/share';
import { DEFAULT_TEMPLATES } from '@/constants/template';
import { BASE_ARTICLE_OUTPUT_FORMAT, BASE_BLOG_OUTPUT_FORMAT, BASE_PRODUCT_OUTPUT_FORMAT } from '@/constants/prompt';
import { type COMMAND } from '@/types/share';
import { getBlogContents } from '@/actions/content/server';
import { eventEmitter } from '@/helpers/eventEmitter';
import { ContentCategory } from '@prisma/client';
import NotificationBell from "@/components/NotificationBell";
import { getUsageStateAction } from '@/actions/usage';
import { LayoutContainer, layoutVariants, StyledOverlay, overlayVariants } from '@/styles/style.general';
import { validateField, textFieldValidationSchema } from '@/schemas/form.schema';
import { v4 as uuidv4 } from "uuid";
import RedirectModal from './RedirectModal';
import { supabase } from '@/lib/supabase';

const USAGE_UPDATE_DELAY = 1000;

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

interface CreditBadgeProps {
  remainingCredits: number;
  isPopoverOpened: boolean;
  isOverLimit: boolean;
  isApproachingLimit: boolean;
  handleRedirectToBilling: () => void;
  handleRedirectToDashboard: () => void;
  handleTooglePopover: () => void;
}

const CreditBadge: React.FC<CreditBadgeProps> = ({
  remainingCredits, 
  isPopoverOpened,
  isOverLimit, 
  isApproachingLimit, 
  handleRedirectToBilling, 
  handleRedirectToDashboard, 
  handleTooglePopover 
}) => {
  const getStatusColor = () => {
    if (isOverLimit) return 'critical';
    if (isApproachingLimit) return 'warning';
    return 'success';
  };
  const getBadgeContent = () => {
    if (isOverLimit) {
      return (
        <InlineStack align="center" gap="200">
          <Icon source={AlertDiamondIcon} tone="critical" />
          <Text variant="bodySm" as="span">No credits remaining</Text>
        </InlineStack>
      );
    }
    return (
      <InlineStack align="center" gap="200">
        <Icon 
          source={isApproachingLimit ? AlertCircleIcon : CheckCircleIcon} 
          tone={getStatusColor()} 
        />
        <Text variant="bodySm" as="span">
          {remainingCredits} {remainingCredits === 1 ? 'credit' : 'credits'} remaining
        </Text>
      </InlineStack>
    );
  };

  return (
    <Box padding="300">
      <InlineStack align="center" gap="300">
        <Popover
          active={isPopoverOpened}
          preferredPosition="bottom"
          activator={
            <Button
              variant="monochromePlain"
              tone={getStatusColor()}
              onClick={() => handleTooglePopover()}
            >
              {getBadgeContent()}
            </Button>
          }
        >
          <Box padding="400" maxWidth="280px">
            <BlockStack gap="300">
              <Text variant="headingSm" as="h3">
                {isOverLimit 
                  ? 'Credit limit reached' 
                  : 'Credits running low'}
              </Text>
              <Text variant="bodyMd" as="p">
                {isOverLimit 
                  ? 'Purchase more credits to continue using the service.' 
                  : 'Consider purchasing more credits to ensure uninterrupted service.'}
              </Text>
              <Button
                variant="primary"
                tone={isOverLimit ? 'critical' : 'warning'}
                onClick={() => handleRedirectToBilling()}
                icon={PlusCircleIcon}
              >
                Purchase Credits
              </Button>
            </BlockStack>
          </Box>
        </Popover>

        {(isOverLimit || isApproachingLimit) && (
          <Tooltip content="View credit usage">
            <Button
              variant="tertiary"
              icon={ChartVerticalFilledIcon}
              onClick={() => handleRedirectToDashboard()}
            />
          </Tooltip>
        )}
      </InlineStack>
    </Box>
  );
};


interface PageContentProps {
  version: string;
  session: AppSession;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  isFullscreen: boolean;
  isPreview: boolean;
  theme: Theme;
  toggleTheme: () => void;
  handleStartTour: () => void;
  onOpenPreview: () => void;
  onClosePreview: () => void;
  onOpenFullscreen: () => void;
  isOpenSidebar: boolean;
  onToggleSidebar: () => void;
  onOpenSidebar: () => void;
  onCloseSidebar: () => void;
  handleShopifyAI: (shopName: string, userId: string, action: string, content: string) => Promise<any>;
  error: string;
  setError: React.Dispatch<React.SetStateAction<string>>;
  aiErrors: AIError[];
  setAiErrors: React.Dispatch<React.SetStateAction<AIError[]>>;
  outputContent: any;
  setOutputContent: (data: any) => void;
  setIsFullScreen: (value: boolean) => void;
}


export default function PageContent({
  version,
  session,
  theme,
  toggleTheme,
  handleStartTour,
  isFullscreen,
  isPreview,
  onOpenPreview,
  onClosePreview,
  onOpenFullscreen,
  setIsFullScreen,
  isOpenSidebar,
  onToggleSidebar,
  onOpenSidebar,
  onCloseSidebar,
  isLoading,
  setIsLoading,
  error,
  aiErrors,
  setError,
  setAiErrors,
  outputContent,
  setOutputContent,
  handleShopifyAI,
}: PageContentProps) {
  const { app } = useAppBridge();
  const redirect = app && Redirect.create(app);
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const localContentData = useAppSelector(selectContentData);
  const skipToContentRef = useRef<HTMLAnchorElement>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [mobileNavigationActive, setMobileNavigationActive] = useState(false);
  const [modalActive, setModalActive] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [processedInputData, setProcessedInputData] = useState(undefined);
  const [submittedData, setSubmittedData] = useState({});
  const [isDataGenerating, setIsDataGenerating] = useState(false);
  const [urls, setUrls] = useState<string[]>(['']); 
  const [selectedTemplate, setSelectedTemplate] = useState(false);
  const [subtitleChecked, setSubtitleChecked] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<'withArticle' | 'blogOnly'>('withArticle');
  const [subtitleQuantity, setSubtitleQuantity] = useState(1);
  const [subtitlePrompts, setSubtitlePrompts] = useState<string[]>([]);
  const [selectedLength, setSelectedLength] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CATEGORY>('BLOG');
  const [selectedTone, setSelectedTone] = useState(TONE_OPTIONS[0].id.toUpperCase());
  const [isDataProcessing, setIsDataProcessing] = useState(false);
  const [isContentGenerating, setIsContentGenerating] = useState(false);
  const [dataProgress, setDataProgress] = useState(0);
  const [generateProgress, setGenerateProgress] = useState(0);
  const [toastMessage, setToastMessage] = useState("");
  const [toastActive, setToastActive] = useState(false);
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [showProcessingStatus, setShowProcessingStatus] = useState(false);
  const [showConversionStatus, setShowConversionStatus] = useState(false);
  const [isNewBlog, setIsNewBlog] = useState<boolean>(false);
  const [blogs, setBlogs] = useState([]);
  const [isImportImageAvailable, setIsImportImageAvailable] = useState<boolean>(false);
  const [selectedImage, setSelectedImage] = useState<'yes' | 'no' | 'unsplash'>('no');
  const [selectedBlog, setSelectedBlog] = useState<string | null>(null);
  const [isBlogLoading, setIsBlogLoading] = useState<boolean>(false);
  const [blogLoadingError, setBlogLoadingError] = useState<string | null>(null);
  const [usageData, setUsageData] = useState(null);
  const [isUsageStateLoading, setIsUsageStateLoading] = useState(false);
  const [usageStateError, setUsageStateError] = useState<string | null>("");
  const [isUsageUpdated, setIsUsageUpdated] = useState(false);
  const [isPopoverOpened, setIsPopoverOpened] = useState(false);
  const [showRedirectModal, setShowRedirectModal] = useState(false);
  const [isSetupLoading, setIsSetupLoading] = useState<boolean>(false);

  const onTogglePopover = useCallback(() => setIsPopoverOpened((active) => !active), []);

  const { shopName, shopifyOfflineAccessToken: accessToken, shopifyUserId: userId } = session;
  const { 
    loading: actionLoading, 
    progress, 
    status, 
    error: actionError, 
    onManualSubmit,
    onCancelAction, 
  } = useShopifySubmit({ shopName, accessToken });
  const categoryMap = {
    BLOG: ContentCategory.BLOG,
    PRODUCT: ContentCategory.PRODUCT,
  };
  const fetchUsageData = useCallback(async () => {
    if (!shopName) return;
    try {
      setIsUsageStateLoading(true);
      setUsageStateError(null);
      const data = await getUsageStateAction(shopName);
      setUsageData(data);
    } catch (err) {
      setUsageStateError(err.message || 'Failed to fetch usage data');
    } finally {
      setIsUsageStateLoading(false);
    }
  }, [shopName]);

  const initViewUsage = useCallback(() => {
    if (!usageData && !isUsageStateLoading) {
      fetchUsageData();
    }
  }, [usageData, isUsageStateLoading, fetchUsageData]);

  const fetchBlogContents = useCallback(async () => {
    if (!shopName || !accessToken) return;
    try {
      setIsBlogLoading(true);
      setBlogLoadingError(null);
      const result = await getBlogContents(shopName);
      if (result.success && result?.data) {
        const transformedBlogs = result?.data?.map(blog => ({
          blogName: blog.title,
          blogId: blog.id.toString(),
          articleCount: blog.articles.length,
        }));
        setBlogs(transformedBlogs);
      }
    } catch (err) {
      setBlogLoadingError(err instanceof Error ? err.message : 'Failed to fetch blogs');
    } finally {
      setIsBlogLoading(false);
    }
  }, [shopName, accessToken]);

  useEffect(() => {
    const subscriptions = [
      eventEmitter.subscribe('aiUsageUpdated', () => setIsUsageUpdated(true)),
      eventEmitter.subscribe('crawlUsageUpdated', () => setIsUsageUpdated(true))
    ];
    return () => subscriptions.forEach(unsubscribe => unsubscribe());
  }, []);

  useEffect(() => {
    fetchBlogContents();
  }, [fetchBlogContents]);

  useEffect(() => {
    initViewUsage()
  }, [initViewUsage]);

  const memoizedBlogs = useMemo(() => blogs, [blogs]);

  useEffect(() => {
    if (!isUsageUpdated) return;
    const timer = setTimeout(() => {
      fetchUsageData();
      setIsUsageUpdated(false);
    }, USAGE_UPDATE_DELAY);
    return () => clearTimeout(timer);
  }, [isUsageUpdated, fetchUsageData]);

  useEffect(() => {
    if (!isDataProcessing && processedInputData) {
      const timer = setTimeout(() => {
        setShowProcessingStatus(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isDataProcessing, processedInputData]);

  useEffect(() => {
    if (!isContentGenerating && localContentData) {
      const timer = setTimeout(() => {
        setShowConversionStatus(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isContentGenerating, localContentData]);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToastMessage(message);
    setToastType(type);
    setToastActive(true);
  }, []);

  const handleError = useCallback((error: Error | string) => {
    const errorMessage = error instanceof Error ? error.message : error;
    setError(errorMessage);
    showToast(errorMessage, "error");
    setTimeout(() => {
      setError("");
    }, 4000);
  }, [setError, showToast]);

  const { processData } = useDataProcessing({ 
    onError: handleError, 
    app 
  });

  const [errors, setErrors] = useState<{
    prompt?: string;
    urls?: string[];
    subtitlePrompts?: string[];
  }>({});

  const handleToneChange = useCallback(
    (selectedTabIndex: number) => { 
      setSelectedTone(TONE_OPTIONS[selectedTabIndex].id.toUpperCase());
    },
    [],
  );

  const handleSelectImage = useCallback((value: string | string[]) => {
    if (Array.isArray(value)) {
      setSelectedImage(value[0]);
    } else {
      setSelectedImage(value);
    }
  }, []);

  const handleSelectArticleChange = useCallback((value: string | string[]) => {
    if (Array.isArray(value)) {
      setSelectedArticle(value[0]);
    } else {
      setSelectedArticle(value);
    }
  }, []);

  const handleSubtitleCheckedChange = useCallback((checked: boolean) => {
    setSubtitleChecked(checked);
    if (!checked) {
      setSubtitleQuantity(1);
      setSubtitlePrompts([]);
    }
  }, []);

  const handleSubtitleQuantityChange = useCallback((quality: number) => {
    setSubtitleQuantity(quality);
    setSubtitlePrompts(prev => {
      const newPrompts = [...prev];
      if (quality > prev.length) {
        return [...prev, ...Array(quality - prev.length).fill('')];
      } else {
        return prev.slice(0, quality);
      }
    });
  }, []);

  const handleSubtitlePromptChange = useCallback((index: number, value: string) => {
    const error = validateField('subtitlePrompts', value, index);
    setErrors(prev => ({
      ...prev,
      subtitlePrompts: {
        ...prev.subtitlePrompts,
        [index]: error
      }
    }));
    setSubtitlePrompts(prev => {
      const newPrompts = [...prev];
      newPrompts[index] = value;
      return newPrompts;
    });
  }, []);

  const handlePromptChange = useCallback((value: string) => {
    setPrompt(value);
    setErrors(prev => ({ ...prev, prompt: error }));
  }, []);

  const handleSelectBlog = useCallback((blogId: string | null) => {
    if (!blogId) 
      setIsNewBlog(true),
      setSelectedBlog(null);
    else 
    setIsNewBlog(false),
    setSelectedBlog(blogId);
  }, []);

  const handleLengthChange = useCallback((value: string) => {
    setSelectedLength(value);
  }, []);

  const handleUrlChange = useCallback((index: number, value: string) => {
    const error = validateField('urls', value, index);
    setErrors(prev => ({
      ...prev,
      urls: {
        ...prev.urls,
        [index]: error
      }
    }));
    setUrls(prevUrls => {
      const newUrls = [...prevUrls];
      newUrls[index] = value;
      return newUrls;
    });
  }, []);

  const handleAddUrl = useCallback(() => {
    if (urls.length < 4) {
      setUrls(prevUrls => [...prevUrls, '']);
    }
  }, [urls]);
  
  const handleTemplateChange = useCallback((templates: Template[], templateId: string) => {
    const selectedTemplate = templates.find(template => template.id === templateId);
    setSelectedTemplate(selectedTemplate);
  }, [setSelectedTemplate]);

  const handleResetForm = useCallback(() => {
    setPrompt('');
    setUrls(['']);
    setSubtitleChecked(false);
    setSubtitleQuantity(0);
    setSubtitlePrompts([]);

  }, []);

  const validateForm = () => {
    try {
      textFieldValidationSchema.parse({
        prompt,
        urls,
        subtitlePrompts: subtitleChecked ? subtitlePrompts : undefined
      });
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors = {};
        error.errors.forEach(err => {
          const path = err.path.join('.');
          newErrors[path] = err.message;
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleGenerateContent = useCallback(async (data: any) => {
    setIsContentGenerating(true);
    setGenerateProgress(0);
    setShowConversionStatus(true);
    dispatch(setContentData(null));
    setIsFullScreen(false);
    try {
      setGenerateProgress(50);
      const parsedData = await handleShopifyAI(
        shopName,
        userId,
        data?.category,
        data
      );
      const processedData = { ...parsedData, images: data?.context?.medias?.images || []};
      setGenerateProgress(100);
      setOutputContent(processedData);
      dispatch(setContentData({ id: uuidv4(), input: { category: data?.category, ...data }, output: processedData }));
      showToast("Content Generateed successfully!", "success");
      return processedData;
    } catch (error) {
      handleError(error);
      throw error;
    } finally {
      setIsContentGenerating(false);
    }
  }, [shopName, userId, handleShopifyAI, handleError, showToast]);

  const handleProcessData = useCallback(async (data: any) => {
    if (errors?.urls?.length > 0) {
      errors.urls.forEach(url => {
        showToast(`Url ${url} is invalid. Please enter a valid URL`, "error");
      });
      return;
    }
    try {
      if (data?.urls?.length > 0) {
        setIsDataProcessing(true);
        setDataProgress(30);
        setShowProcessingStatus(true);
        const processedData = await processData(shopName, userId, data.urls);
        let slicedImages;
        if (data?.sections?.quantity > 0) {
          const sliceCount = 3 * data?.sections?.quantity;
          slicedImages = processedData?.medias?.images?.slice(0, sliceCount);
        } else {
          slicedImages = processedData?.medias?.images?.slice(0, 3);  
        }
        if (slicedImages?.length > 0) setIsImportImageAvailable(true)
        else setIsImportImageAvailable(false);
        setDataProgress(100);
        setProcessedInputData({ 
          ...processedData, 
          medias: { images: slicedImages } 
        });
        setIsDataProcessing(false);
        showToast("Content successfully retrieved!", "success");
        return await handleGenerateContent({ context: processedData, ...data });
      } else {
        return await handleGenerateContent(data);
      }
    } catch (error) {
      handleError(error);
      setIsDataProcessing(false);
    }
  }, [errors.urls, shopName, userId, urls, processData, handleGenerateContent, handleError, showToast]);

  const handleFormSubmit = useCallback(async(formType: FormType) => {
    const sections = subtitleChecked ? {
      quantity: subtitleQuantity,
      prompts: subtitlePrompts
    } : null;
    const template = formType === FormType.FULL ? selectedTemplate : {};
    let includedFields;
    includedFields = selectedCategory === ContentCategory.BLOG
      ? Object.keys(BASE_BLOG_OUTPUT_FORMAT)
      : Object.keys(BASE_PRODUCT_OUTPUT_FORMAT);
    const includedArticleFields = selectedCategory === ContentCategory.BLOG && selectedArticle === "withArticle"
      ? Object.keys(BASE_ARTICLE_OUTPUT_FORMAT)
      : [];
    if (selectedCategory === ContentCategory.BLOG && selectedArticle === "withArticle") {
      includedFields = includedFields.filter(field => field !== 'article');
      includedFields.push({
        article: includedArticleFields 
      });
    }
    const inputData = {
      description: prompt,
      urls: urls.filter(url => url !== ''),
      sections,
      tone: selectedTone,
      category: selectedCategory,
      length: selectedLength,
      includedFields,
      imageIncluded: selectedImage,
      ...(selectedCategory === ContentCategory.BLOG && { articleIncluded: selectedArticle }),
      ...(selectedCategory === ContentCategory.ARTICLE && { isNewBlog }),
      ...(selectedCategory === ContentCategory.ARTICLE && { blogId: selectedBlog }),
      ...(formType === FormType.FULL && selectedTemplate && { template: seletectedTemplate })
    };
    try {
      if (validateForm())
      setSubmittedData(inputData);  
      const outputData = await handleProcessData(inputData);  
      setToastActive(true);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsDataGenerating(false);
      onOpenPreview();
      //handleResetForm();
    }
  }, [
    shopName,
    prompt, 
    urls, 
    subtitleChecked,
    subtitleQuantity,
    subtitlePrompts,
    selectedLength,
    selectedTemplate,
    selectedCategory,
    selectedImage,
    selectedArticle,
    setToastActive,
    shopName,
  ]);

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

  const onOpenEditMode = useCallback((contentId) => {
    const shop = searchParams?.get("shop");
    const host = searchParams?.get("host");
    if (!shop || !host || !redirect) {
      console.error('Missing required navigation parameters');
      return;
    }
    setShowRedirectModal(true);
    const queryParams = new URLSearchParams({
      shop,
      host
    }).toString();
    await setUpShopStorage();
    const returnUrl = `/content/edit/${contentId}?${queryParams}`;
    redirect.dispatch(Redirect.Action.APP, {
      path: returnUrl
    });
    onClosePreview();
  }, [searchParams, redirect, setUpShopStorage, setShowRedirectModal]);

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

  const commonProps: BaseFormProps = {
    prompt,
    urls,
    errors,
    onPromptChange: handlePromptChange,
    onUrlChange: handleUrlChange,
    onFormSubmit: handleFormSubmit,
    onAddUrl: handleAddUrl,
    onResetForm: handleResetForm,
    subtitleChecked,
    onSubtitleCheckedChange: handleSubtitleCheckedChange,
    subtitleQuantity,
    onSubtitleQuantityChange: handleSubtitleQuantityChange,
    subtitlePrompts,
    onSubtitlePromptChange: handleSubtitlePromptChange,
    seletectedTemplate: selectedTemplate,
    onSelectTemplate: handleTemplateChange,
    selectedLength: selectedLength,
    onSelectLength: handleLengthChange,
    toneOptions: TONE_OPTIONS,
    selectedTone: selectedTone,
    onSelectTone: handleToneChange,
    selectedCategory: selectedCategory,
    onSelectCategory: setSelectedCategory,
    selectedBlog,
    blogs: memoizedBlogs,
    onSelectBlog: handleSelectBlog,
    selectedImage,
    onSelectImage: handleSelectImage,
    selectedArticle,
    onSelectArticle: handleSelectArticleChange,
    isImportImageAvailable,
    generating: isContentGenerating,
    processing: isDataProcessing,
    showProcessingStatus,
    dataProgress,
    processedInputData,
    showConversionStatus,
    generateProgress,
    localContentData,
    error,
    setError,
  };

  const onCreateNewForm = () => {
    handleResetForm();
  };

  const memorizedCreditBadge = useMemo(() => {
    if (isUsageStateLoading) {
      return (
        <Box padding="400">
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Spinner size="large" />
          </div>
        </Box>
      );
    }
    if (usageStateError) {
      return (
        <Banner tone="critical">
          <p>{usageStateError}</p>
        </Banner>
      );
    }
    if (usageData) {
      const { remainingCredits, isOverLimit, isApproachingLimit } = usageData.totalUsage || {};
      const idPopoverOpened = (isOverLimit || isApproachingLimit) && isPopoverOpened;
      return (
        <CreditBadge
          remainingCredits={remainingCredits}
          idPopoverOpened={idPopoverOpened}
          handleTooglePopover={onTogglePopover}
          isOverLimit={isOverLimit}
          isApproachingLimit={isApproachingLimit}
          handleRedirectToBilling={onNavigateToBilling}
          handleRedirectToDashboard={onNavigateToDashboard}
        />
      );
    }
    return null;
  }, [
    isUsageStateLoading, 
    usageStateError, 
    usageData, 
    isPopoverOpened, 
    onTogglePopover, 
    onNavigateToBilling, 
    onNavigateToDashboard
  ]);

  const topBarMarkup = (
    <Box className="bg-white p-4 mt-6 rounded-md shadow-lg px-10 mx-6 w-full">
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
                onClick={() => onCreateNewForm()}
              >
                Create new
              </Button>
            </Tooltip>
          </InlineStack>
        </InlineStack>
        {memorizedCreditBadge}
      </InlineStack>
    </Box>
  );

  const skipToContentTarget = (
    <a id="SkipToContentTarget" ref={skipToContentRef} tabIndex={-1} />
  );
   const actualPageMarkup = (
      <Page
        fullWidth
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
        ]}
      >
      <Layout>
        {skipToContentTarget}
        {topBarMarkup}
        <DynamicLayout
          {...commonProps}
          version={version}
          onToggleFullScreen={onOpenFullscreen} 
          outputContent={localContentData}
          isPreview={isPreview}  
          isFullScreen={isFullscreen}
          onOpenEditMode={onOpenEditMode}
          onAction={onManualSubmit}
          onCancelAction={onCancelAction}
          actionLoading={actionLoading}
        />
      </Layout>
    </Page>
  );
  
  const loadingPageMarkup = (
    <LoadingScreen />
  );

  const pageMarkup = isLoading ? loadingPageMarkup : actualPageMarkup;

  const toastMarkup = toastActive ? (
    <Toast
      content={toastMessage}
      error={toastType === "error"}
      onDismiss={() => setToastActive(false)}
      duration={4000}
    />
  ) : null;

  return (
    <AnimatePresence>
      <LayoutContainer
        initial={false}
        animate={isOpenSidebar ? 'expanded' : 'collapsed'}
        variants={layoutVariants}
        transition={{ type: 'tween', duration: 0.3 }}
      >
        <AnimatePresence>
          {isOpenSidebar && (
            <StyledOverlay
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={overlayVariants}
              transition={{ duration: 0.2 }}
            />
          )}
        </AnimatePresence>
        {pageMarkup}
        {toastMarkup}
        {showRedirectModal && (
          <RedirectModal
            content={outputContent} 
            isOpen={showRedirectModal}
            onClose={() => setShowRedirectModal(false)}
            onProceed={onOpenEditMode}
            loading={isSetupLoading}
          />
        )}
      </LayoutContainer>
    </AnimatePresence>
  );
}


