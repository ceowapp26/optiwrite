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
import { PRODUCT_FORM } from '@/constants/content';
import { CONTENT, CATEGORY, ContentCategory } from '@/types/content';
import { useShopifySubmit } from '@/hooks/useShopifySubmit';
import { ShopApiService } from '@/utils/api';
import FormGenerator from '@/components/forms/form-generator';
import AdvancedImageCarousel from '@/components/AdvancedImageCarousel';
import ButtonHandler from './ButtonHandler';
import { useAppDispatch, useAppSelector } from "@/hooks/useLocalStore";
import { generateJSON, generateHTML } from '@tiptap/html';
import { editorExtensions } from '@/components/editor/lib/editor-extensions';
import ErrorBanner from '@/components/ErrorBanner';
import dynamic from 'next/dynamic';
import { CoverImageModal } from "@/components/editor/modals/CoverImageModal";
import { GradientLoadingCircle } from '@/components/GradientLoadingCircle';
import { ImageUpload } from "@/components/editor/ImageUpload";
import { supabase } from '@/lib/supabase';
import { addImage, removeImage, replaceImage, setFeaturedImage, addIcon, removeIcon, updateTitle } from '@/stores/features/contentSlice';
import { Toolbar } from "@/components/editor/Toolbar";
import { Cover } from "@/components/editor/Cover";
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
  onContentUpdate: (newContent: CONTENT) => void;
  isRealtimeEditing?: boolean;
  setIsRealtimeEditing?: React.Dispatch<React.SetStateAction<boolean>>;
  handleShopifyAI?: (shopName: string, userId: string, action: string, content: CONTENT) => Promise<any>;
}

const ProductForm: React.FC<ContentFormProps> = ({   
  shopName,
  accessToken,
  userId,
  contentId,
  content,
  onContentChange,
  onContentUpdate,
  isRealtimeEditing,
  setIsRealtimeEditing, 
  handleShopifyAI,
}) => {
  const {
    register,
    formState: { errors },
    control,
    watch,
    setValue,
    trigger
  } = useFormContext();
  const dispatch = useAppDispatch();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentImageUrl, setCurrentImageUrl] = useState("");
  const [imageCommand, setImageCommand] = useState<"replace" | "add">("add");
  const [uploadType, setUploadType] = useState<"local" | "unsplash">("local");
  const [toastActive, setToastActive] = useState(false);
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

  const {
    register,
    formState: { errors },
    control,
    trigger,
    setValue,
    watch
  } = useFormContext();

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

  /*const updateImageInStorage = async (fileUrl: string, newFile: File) => {
    const isSupabaseImage = isSupabaseImageUrl(fileUrl);
    if (!isSupabaseImage) return;  
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
      /*const { data: existingFile, error: listError } = await supabase.storage
        .from("optiwrite-images")
        .list('uploads', {
          search: filePath
        });

      if (listError) {
        throw listError;
      }
      if (!existingFile || existingFile.length === 0) {
        throw new Error("Image not found in storage");
      }
      const { data, error } = await supabase.storage
      .from(`optiwrite-images`)
      .update(filePath, newFile, {
        cacheControl: "3600",
        upsert: true,
      });

      if (error) {
        console.error("Supabase storage error details:", error);
        throw error;
      }
      const { data: { publicUrl } } = supabase.storage
        .from(`optiwrite-images`)
        .getPublicUrl(filePath);
      toast.success("Image updated successfully.");
      return publicUrl;
    } catch (error) {
        console.error("Error updating image:", error);
      if (error instanceof Error) {
        if (error.message === "Invalid file path format") {
          toast.error("Invalid file path format");
        } else {
         toast.error("Error updating the image. Please try again.");
        }
      }
      throw error;
    }
  };*/

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

  const handleUpdateTitle = useCallback((value: string) => {
    dispatch(updateTitle(value));
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
     const filteredFields = PRODUCT_FORM.filter((field) => 
        Object.keys(content?.output || {}).includes(field.name)
      );
      return (
      <Box className="w-full py-10 px-6">
        {filteredFields.map((field) => (
          <FormGenerator
            key={field.name}
            defaultValue={content?.output[field.name]?.toString()}
            {...field}
            register={register}
            errors={errors}
            control={control}
            trigger={trigger}
            setValue={setValue}
            watch={watch}
            content={content}
            handleShopifyAI={handleShopifyAI}
            setContent={onContentChange}
            shopName={shopName}
            userId={userId}
            aiEnabled
          />
        ))}
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
    userId
  ]);

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
            onUpdateTitle={handleUpdateTitle}
            handleShopifyAI={handleShopifyAI}
          />
          <Editor
            contentId={contentId}
            onChange={generateContentHTML}
            initialContent={content?.output?.body_html}
            contentTitle={content?.output?.title}
            handleShopifyAI={handleShopifyAI}
          />
          {renderFormFields()}
        </React.Fragment>
      </Card>
    </Box>
  );
};

export default memo(ProductForm);
