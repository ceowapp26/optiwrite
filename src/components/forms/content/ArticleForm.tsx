"use client"
import React, { useCallback, useEffect, useState, useMemo, memo } from 'react';
import { 
  AppProvider, 
  DropZone, 
  ButtonGroup, 
  Box, 
  InlineGrid,
  InlineStack,
  Banner,
  Card,
  Text,
  Button,
  Badge,
  BlockStack,
  Checkbox,
  Page,
  TextField,
  SkeletonBodyText,
  SkeletonDisplayText,
  Toast,
  Modal,
  Spinner,
  Frame 
} from '@shopify/polaris';
import {
  MinimizeIcon,
  MaximizeIcon
} from '@shopify/polaris-icons';
import {
  RefreshCw,
  Clipboard,
  Check,
} from 'lucide-react';
import { Grid } from "@mui/material";
import { useFormContext } from 'react-hook-form';
import { type ContentUpdate } from '@/context/GeneralContextProvider';
import { useAppDispatch, useAppSelector } from "@/hooks/useLocalStore";
import { BLOG_FORM, UPDATE_ARTICLE_FORM } from '@/constants/content';
import { CONTENT, CATEGORY, ContentCategory } from '@/types/content';
import { getBlogContents } from '@/actions/content/server';
import { useShopifySubmit } from '@/hooks/useShopifySubmit';
import { ShopApiService } from '@/utils/api';
import FormGenerator from '@/components/forms/form-generator';
import AdvancedImageCarousel from '@/components/AdvancedImageCarousel';
import ButtonHandler from './ButtonHandler';
import { generateJSON, generateHTML } from '@tiptap/html';
import { editorExtensions } from '@/components/editor/lib/editor-extensions';
import ErrorBanner from '@/components/ErrorBanner';
import dynamic from 'next/dynamic';
import { CoverImageModal } from "@/components/editor/modals/CoverImageModal";
import { ImageUpload } from "@/components/editor/ImageUpload";
import { GradientLoadingCircle } from '@/components/GradientLoadingCircle';
import { addImage, removeImage, replaceImage, setFeaturedImage, addIcon, removeIcon, updateTitle } from '@/stores/features/contentSlice';
import { Toolbar } from "@/components/editor/Toolbar";
import { Cover } from "@/components/editor/Cover";
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface ToastOptions {
  duration?: number;
  position?: 'top-center' | 'top-right' | 'bottom-right' | 'bottom-center';
  className?: string;
}

const defaultOptions: ToastOptions = {
  duration: 5000,
  position: 'top-center',
  className: 'rounded-lg border shadow-lg p-4'
};

interface ToastStyleConfig {
  icon: React.ReactNode;
  className: string;
}

const toastStyles: Record<string, ToastStyleConfig> = {
  success: {
    icon: '✔',
    className: 'border-green-200 bg-green-50'
  },
  error: {
    icon: '❌',
    className: 'border-red-200 bg-red-50'
  },
  warning: {
    icon: '⚠️',
    className: 'border-yellow-200 bg-yellow-50'
  },
  loading: {
    icon:'⏳',
    className: 'border-blue-200 bg-blue-50'
  }
};

const showToast = (
  message: string,
  type: keyof typeof toastStyles,
  customOptions?: ToastOptions
) => {
  const options = { ...defaultOptions, ...customOptions };
  const style = toastStyles[type];
  toast(message, {
    ...options,
    icon: style.icon,
    className: `${options.className} ${style.className}`
  });
};

const showPromiseToast = <T,>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string;
    error: string;
  },
  customOptions?: ToastOptions
) => {
  const options = { ...defaultOptions, ...customOptions };
  return toast.promise(promise, {
    loading: `${messages.loading}`,
    success: `${messages.success}`,
    error: `${messages.error}`,
  });
};

const extractId = (gid) => {
  return gid.split('/').pop();
};

const Editor = dynamic(() => import('@/components/editor'), {
  ssr: false, 
  loading: () => <GradientLoadingCircle size={60} thickness={5} />,
});


interface BaseProps {
  shopName: string;
  userId: string;
  accessToken: string;
}

interface ContentFormProps extends BaseProps {
  contentId: string;
  content: CONTENT;
  onContentChange: (newContent: CONTENT) => void;
  onBodyContentUpdate: (newContent: CONTENT) => void;
  onUpdateTitle: (newTitle: string) => void;
  isRealtimeEditing?: boolean;
  isUpdate?: boolean;
  setIsRealtimeEditing?: React.Dispatch<React.SetStateAction<boolean>>;
  handleShopifyAI?: (shopName: string, userId: string, action: string, content: string) => Promise<any>;
}

const ArticleForm: React.FC<ContentFormProps> = ({   
  shopName,
  accessToken,
  userId,
  contentId,
  content,
  onContentChange,
  onBodyContentUpdate,
  onUpdateTitle,
  isRealtimeEditing,
  setIsRealtimeEditing, 
  handleShopifyAI,
  isUpdate = false
}) => {
  const {
    register,
    formState: { errors },
    control,
    trigger,
    setValue,
    watch
  } = useFormContext();
  const dispatch = useAppDispatch();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentImageUrl, setCurrentImageUrl] = useState("");
  const [imageCommand, setImageCommand] = useState<"replace" | "add">("add");
  const [uploadType, setUploadType] = useState<"local" | "unsplash">("local");
  const [toastActive, setToastActive] = useState(false);
  const [blogs, setBlogs] = useState<any[]>([]);
  const [selectedBlog, setSelectedBlog] = useState<string | null>(null);
  const [isBlogLoading, setIsBlogLoading] = useState<boolean>(false);
  const [blogLoadingError, setBlogLoadingError] = useState<string | null>(null);
  const [paginationLimit, setPaginationLimit] = useState(1);
  const [currentLimit, setCurrentLimit] = useState(8);
  const [totalBlogs, setTotalBlogs] = useState<number>(0);
  const [loadingBlogProgress, setLoadingBlogProgress] = useState(0);
  const [loadingMoreBlogs, setLoadingMoreBlogs] = useState(false);

  const imageLength = useMemo(() => {
    return (content?.output?.images?.length || 0);
  }, [content?.output?.images]);

  const imageArray = useMemo(() => {
    const featuredImage = content?.output?.image?.src;
    const additionalImages = content?.output?.images || [];
    const images = featuredImage ? [featuredImage] : [];
    images.push(...additionalImages.filter(img => img !== featuredImage));
    return images.filter(Boolean);
  }, [content?.output?.images, content?.output?.image?.src]);

  const fetchBlogContents = useCallback(async (pagination: number, limit: number) => {
    if (!shopName || !accessToken) return;
    try {
      setIsBlogLoading(true);
      setBlogLoadingError(null);
      setLoadingBlogProgress(25);
      const result = await getBlogContents(shopName, accessToken, pagination, limit);
      setLoadingBlogProgress(75);
      if (result?.success && result?.data) {
        const transformedBlogs = result?.data?.blogs?.map(blog => ({
          label: blog.title,
          value: extractId(blog.id).toString(),
        }));
        transformedBlogs.push({
          label: content?.output?.blog_name,
          value: content?.output?.blog_id,
        });
        setBlogs(prevBlogs => {
          const existingIds = new Set(prevBlogs.map(blog => blog.value));
          const newUniqueBlogs = transformedBlogs.filter(blog => !existingIds.has(blog.value));
          return [...prevBlogs, ...newUniqueBlogs];
        });
        if (result?.data?.totalBlogs !== totalBlogs) {
          setTotalBlogs(result?.data?.totalBlogs);
        }
        setLoadingBlogProgress(100);
      }
    } catch (err) {
      setBlogLoadingError(err instanceof Error ? err.message : 'Failed to fetch blogs');
    } finally {
      setIsBlogLoading(false);
    }
  }, [shopName, accessToken]);

  const loadMoreBlogs = useCallback(async () => {
    if (loadingMoreBlogs) return;
    const newPaginationLimit = paginationLimit + 1;
    try {
      setLoadingMoreBlogs(true);
      setLoadingBlogProgress(25);
      const result = await getBlogContents(shopName, accessToken, newPaginationLimit, currentLimit);
      setLoadingBlogProgress(75);
      if (result?.success && result?.data) {
        const transformedBlogs = result?.data?.blogs?.map(blog => ({
          label: blog.title,
          value: extractId(blog.id).toString(),
        }));
        transformedBlogs.push({
          label: content?.output?.blog_name,
          value: content?.output?.blog_id,
        });
        setBlogs(prevBlogs => {
          const existingIds = new Set(prevBlogs.map(blog => blog.value));
          const newUniqueBlogs = transformedBlogs.filter(blog => !existingIds.has(blog.value));
          return [...prevBlogs, ...newUniqueBlogs];
        });
        if (result?.data?.totalBlogs !== totalBlogs) {
          setTotalBlogs(result?.data?.totalBlogs);
        }
        setTotalBlogs(result?.data?.totalBlogs);
        setLoadingBlogProgress(100);
      }
      setPaginationLimit(newPaginationLimit);
    } catch (error) {
      console.error('Failed to load more content', error);
    } finally {
      setLoadingMoreBlogs(false);
    }
  }, [paginationLimit, currentLimit, accessToken, shopName, loadingMoreBlogs]);

  const memoizedBlogs = useMemo(() => blogs, [blogs]);

  const handleCurrentImageChange = (index: number, url: string) => {
    setCurrentImageIndex(index);
    setCurrentImageUrl(url);
  };

  const isSupabaseImageUrl = (url: string): boolean => {
    try {
      const parsedUrl = new URL(url);
      const isSupabaseDomain = parsedUrl.hostname.endsWith(".supabase.co");
      const isValidPath =
        parsedUrl.pathname.startsWith("/storage/v1/object/public/") &&
        /\.(jpg|jpeg|png|gif|webp|svg|bmp|tiff|heic|heif|avif)$/i.test(parsedUrl.pathname);
      return isSupabaseDomain && isValidPath;
    } catch (error) {
      console.error("Invalid URL:", url);
      return false;
    }
  };

  const removeImageFromStorage = useCallback(
    async (fileUrl: string) => {
      try {
        let filePath: string;
        if (fileUrl.includes('/optiwrite-images/')) {
          filePath = fileUrl.split('/optiwrite-images/')[1].toLowerCase();
        } else if (fileUrl.includes('/object/public/')) {
          filePath = fileUrl.split('/object/public/optiwrite-images/')[1].toLowerCase();
        } else {
          throw new Error("Invalid file path format");
        }
        filePath = filePath.replace(/^\/+|\/+$/g, '');
        const { error } = await supabase.storage
          .from('optiwrite-images')
          .remove([filePath]);
        if (error) {
          console.error("Supabase error during file removal:", error);
          throw error;
        }
      } catch (error) {
        console.error("Error deleting image from storage:", error);
        throw error;
      }
    },
    []
  );

  const removeManyImagesFromStorage = async (filePaths: string[]) => {
    try {
      const { error } = await supabase.storage
        .from(`optiwrite-images`)
        .remove(filePaths);
      if (error) {
        throw error;
      }
      return true;
    } catch (error) {
      console.error("Error removing images from storage:", error);
      toast("Failed to remove images from storage");
      return false;
    }
  };
  
  const handleAddImage = useCallback(async (url: string) => {
    const promise = async () => {
      dispatch(addImage(url));
      handleCurrentImageChange(imageLength, url);
    };
    await showPromiseToast(
      promise(),
      {
        loading: 'Uploading image...',
        success: 'Image uploaded successfully',
        error: 'Failed to upload image'
      }
    );
  }, [dispatch, imageLength, handleCurrentImageChange, showPromiseToast]);

  const handleRemoveImage = useCallback(async (url: string) => {
    const firstImage = content?.output?.images?.[0] || content?.output?.image?.src || null;
    const promise = async () => {
      if (!isSupabaseImageUrl(url)) {
        dispatch(removeImage(url));
        handleCurrentImageChange(0, firstImage);
        return;
      }
      try {
        await removeImageFromStorage(url);
        dispatch(removeImage(url));
        handleCurrentImageChange(0, firstImage);
      } catch (error) {
        throw new Error("Failed to remove image from storage");
      }
    };
    await showPromiseToast(
      promise(),
      {
        loading: 'Removing image...',
        success: 'Image removed successfully',
        error: 'Failed to remove image'
      }
    );
  }, [dispatch, content?.output, removeImage, removeImageFromStorage, handleCurrentImageChange, showPromiseToast]);

  const handleReplaceImage = useCallback(async (url?: string) => {
    const promise = async () => {
      let newUrl = url;
      if (imageCommand === "replace" && uploadType === "local") {
        if (!currentImageUrl) {
          throw new Error("Missing required parameters for image replacement.");
        }
        await removeImageFromStorage(currentImageUrl);
      }
      if (newUrl) {
        try {
          new URL(newUrl);
          dispatch(replaceImage({ oldUrl: currentImageUrl, newUrl }));
          handleCurrentImageChange(currentImageIndex, newUrl);
        } catch (error) {
          throw new Error("Invalid URL provided for image replacement");
        }
      } else {
        dispatch(replaceImage({ oldUrl: currentImageUrl, newUrl: currentImageUrl }));
        handleCurrentImageChange(currentImageIndex, currentImageUrl);
      }
    };
     await showPromiseToast(
      promise(),
      {
        loading: 'Replacing image...',
        success: 'Image replaced successfully',
        error: 'Failed to replace image'
      }
    );
  }, [
    dispatch,
    removeImageFromStorage,
    currentImageUrl,
    currentImageIndex,
    imageCommand,
    uploadType,
    replaceImage,
    showPromiseToast
  ]);

  const handleSetFeaturedImage = useCallback((url: string) => {
    dispatch(setFeaturedImage(url));
    handleCurrentImageChange(0, url);
  }, [dispatch]);

  const handleAddIcon = useCallback(async (icon: string) => {
    dispatch(addIcon(icon));
  }, [dispatch]);

  const handleRemoveIcon = useCallback(async (icon: string) => {
    dispatch(removeIcon(icon));
  }, [dispatch]);

  const generateContentHTML = (content: any): string => {
    try {
      if (!content) return '';
      if (typeof content === 'string') return content;
      if (typeof content === 'object') {
        const html = generateHTML(content, editorExtensions);
        onBodyContentUpdate(html);
        return html;
      }
      return '';
    } catch (error) {
      console.error('Error generating HTML content:', error);
      return '';
    }
  };

  const renderFormFields = useMemo(() => {
    const selectedForm = isUpdate ? UPDATE_ARTICLE_FORM : BLOG_FORM;
    const outputKeys = Object.keys(content?.output || {});
    let filteredFields = selectedForm.filter((field) => 
      outputKeys.includes(field.name)
    );
    
    if (content?.input?.category === ContentCategory.ARTICLE && isUpdate) {
      const articleBlogsField = {
        id: '23',
        inputType: 'select',
        placeholder: 'Select Blog',
        name: 'article_blogs',
        label: 'Select Blog',
        options: memoizedBlogs
      };
      filteredFields.push(articleBlogsField);
    }
    const groupedFields = filteredFields.reduce((acc, field) => {
      if (field.name.startsWith('blog_')) {
        acc.blogFields.push(field);
      } else if (field.name.startsWith('article_')) {
        acc.articleFields.push(field);
      } else {
        acc.otherFields.push(field);
      }
      return acc;
    }, { blogFields: [], articleFields: [], otherFields: [] });

    const renderField = (field) => (
      <FormGenerator
        key={field.name}
        defaultValue={
          (() => {
            switch (field.name) {
              case "article_id":
                return content?.output?.article_id || "";
              case "input_data":
                return content?.input || "{}";
              case "article_image":
                return content?.input?.urls?.[0] || "";
              case "article_blogs":
                return content?.output?.blog_id || "";
              default:
                return content?.output?.[field.name] || "";
            }
          })()
        }
        {...field}
        register={register}
        errors={errors}
        control={control}
        setValue={setValue}
        watch={watch}
        trigger={trigger}
        content={content}
        setContent={onContentChange}
        handleShopifyAI={handleShopifyAI}
        shopName={shopName}
        userId={userId}
        isBlogLoading={isBlogLoading}
        blogLoadingError={blogLoadingError}
        blogOptions={memoizedBlogs}
        totalBlogs={totalBlogs}
        loadMoreBlogs={loadMoreBlogs}
        loadingMoreBlogs={loadingMoreBlogs}
        loadingBlogProgress={loadingBlogProgress}
        aiEnabled
      />
    );

    return (
      <Box className="w-full py-10 px-6">
        {groupedFields.blogFields.length > 0 && (
          <Box className="mb-8">
            <BlockStack gap="500">
              <Text variant="headingMd">Blog Details</Text>
              {groupedFields.blogFields.map(renderField)}
            </BlockStack>
          </Box>
        )}
        {groupedFields.articleFields.length > 0 && (
          <Box className="mb-8">
            <BlockStack gap="500">
              <Text variant="headingMd">Article Details</Text>
              {groupedFields.articleFields.map(renderField)}
            </BlockStack>
          </Box>
        )}
      </Box>
    );
  }, [
    content?.output,
    content?.input,
    register,
    errors,
    control,
    setValue,
    watch,
    trigger,
    onContentChange,
    handleShopifyAI,
    shopName,
    userId,
    blogs,
    isUpdate
  ]);

  useEffect(() => {
    let mounted = true;
    const initializeBlogContents = async () => {
      if (content?.input?.category === ContentCategory.ARTICLE && isUpdate) {
        try {
          await fetchBlogContents(1, currentLimit);
        } catch (error) {
          console.error('Failed to initialize blog contents:', error);
        }
      }
    };
    initializeBlogContents();
    return () => {
      mounted = false;
    };
  }, [content?.input?.category, isUpdate, currentLimit, fetchBlogContents]);

  return (
    <Box paddingBlockEnd="300" background="bg-surface" borderRadius="300">
      <Box paddingBlockStart="300" paddingBlockEnd="600">
        <Badge size="large" progress="complete" tone="warning">
          <Text variant="headingMd" as="h3" fontWeight="bold">
            Edit Preview
          </Text>
        </Badge>
      </Box>
      <Box paddingBlockEnd="100" />
      <Card>
        <React.Fragment>
          {((content?.output?.images?.length > 0) || content?.output?.image?.src) && (
            <AdvancedImageCarousel 
              images={imageArray}
              featuredImageUrl={content?.output?.image?.src} 
              currentIndex={currentImageIndex}
              setCurrentIndex={setCurrentImageIndex}
              onCurrentImageChange={handleCurrentImageChange}            
            />
          )}
          <ImageUpload 
            initialData={content?.output} 
            url={currentImageUrl} 
            onSelectUploadType={setUploadType}
            onSelectImageCommand={setImageCommand}
            onSetFeaturedImage={handleSetFeaturedImage}
            onRemoveImage={handleRemoveImage}
          />
          <CoverImageModal 
            shopName={shopName}
            currentImageUrl={currentImageUrl}
            setCurrentImageUrl={setCurrentImageUrl}
            handleAddImage={handleAddImage}
            handleReplaceImage={handleReplaceImage}
            uploadType={uploadType}
            onSelectUploadType={setUploadType}
            imageCommand={imageCommand}
          />
          <Box className="mb-6 pt-2 ml-[17px] px-1">
            <Text variant="headingMd" as="h2">Description</Text>
          </Box>
          <Toolbar
            shopName={shopName}
            userId={userId}
            initialData={content?.output}
            url={currentImageUrl}
            onSelectUploadType={setUploadType}
            onSelectImageCommand={setImageCommand}
            onAddIcon={handleAddIcon}
            onRemoveIcon={handleRemoveIcon}
            onUpdateTitle={onUpdateTitle}
            handleShopifyAI={handleShopifyAI}
          />
          <Editor
            contentId={contentId}
            onChange={generateContentHTML}
            initialContent={content?.output?.article_body_html}
            contentTitle={content?.output?.article_title}
            handleShopifyAI={handleShopifyAI}
          />
          {renderFormFields}
        </React.Fragment>
      </Card>
    </Box>
  );
};

export default memo(ArticleForm);


