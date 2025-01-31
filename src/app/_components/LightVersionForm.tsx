import React, { useState, useCallback } from "react";
import { 
  Card, 
  InlineStack, 
  Text, 
  Button, 
  Divider, 
  TextField, 
  Box, 
  Tabs, 
  Frame,
  Checkbox,
  BlockStack,
  InlineGrid,
} from '@shopify/polaris';
import { PlusIcon, HomeIcon, OrderIcon, ProductIcon } from '@shopify/polaris-icons';
import { FormType, BaseFormProps, FormProvider } from './FormProvider';

const LightVersionForm: React.FC<LightVersionFormProps> = (
  { 
    theme,
    prompt, 
    onPromptChange, 
    urls, 
    blogs,
    onLoadMoreBlogs,
    loadingMoreBlogs,
    isBlogLoading,
    blogLoadingError,
    loadingBlogProgress,
    totalBlogs,
    errors,
    onUrlChange, 
    onAddUrl, 
    onFormSubmit, 
    onResetForm, 
    lengthOptions, 
    selectedLength, 
    onSelectLength, 
    subtitleChecked, 
    onSubtitleCheckedChange, 
    subtitleQuantity, 
    onSubtitleQuantityChange, 
    subtitlePrompts, 
    onSubtitlePromptChange,
    toneOptions,
    selectedTone,
    onSelectTone,
    selectedCategory,
    onSelectCategory,
    selectedBlog,
    onSelectBlog,
    isImportImageAvailable,
    selectedImage,
    onSelectImage,
    selectedArticle,
    onSelectArticle,
    generating, 
    processing,
    showProcessingStatus,
    dataProgress,
    processedInputData,
    showConversionStatus,
    generateProgress,
    localContentData,
    error,
    setError    
  }
) => {
  return (
    <FormProvider 
      formId={FormType.LIGHT} 
      {...{
        theme,
        prompt, 
        onPromptChange, 
        urls,
        blogs,
        onLoadMoreBlogs,
        isBlogLoading,
        blogLoadingError,
        loadingMoreBlogs,
        loadingBlogProgress,
        totalBlogs,
        errors, 
        onUrlChange, 
        onAddUrl, 
        onFormSubmit, 
        onResetForm, 
        lengthOptions, 
        selectedLength, 
        onSelectLength, 
        subtitleChecked, 
        onSubtitleCheckedChange, 
        subtitleQuantity, 
        onSubtitleQuantityChange, 
        subtitlePrompts, 
        onSubtitlePromptChange,
        selectedCategory,
        onSelectCategory,
        selectedBlog,
        onSelectBlog,
        isImportImageAvailable,
        selectedImage,
        onSelectImage,
        selectedArticle,
        onSelectArticle,
        toneOptions,
        selectedTone,
        onSelectTone,
        generating,
        processing,
        showProcessingStatus,
        dataProgress,
        processedInputData,
        showConversionStatus,
        generateProgress,
        localContentData,
        error,
        setError
      }} 
    />
  );
};

LightVersionForm.displayName = "LightVersionForm";

export default LightVersionForm;


