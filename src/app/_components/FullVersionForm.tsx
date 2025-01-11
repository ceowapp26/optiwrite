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
import { ToneType } from '@/constants/share';

interface FullVersionFormProps extends BaseFormProps { 
  toneOptions: any;
  selectedTone: string;
  onSelectTone: (id: string) => void;
}

const FullVersionForm: React.FC<FullVersionFormProps> = (
  { 
    prompt, 
    onPromptChange, 
    urls, 
    blogs,
    errors,
    onUrlChange, 
    onAddUrl, 
    onFormSubmit, 
    onResetForm, 
    templateOptions, 
    selectedTemplate, 
    onSelectTemplate, 
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
      formId={FormType.FULL} 
      {...{
        prompt, 
        onPromptChange, 
        urls,
        blogs,
        errors, 
        onUrlChange, 
        onAddUrl, 
        onFormSubmit, 
        onResetForm, 
        templateOptions, 
        selectedTemplate, 
        onSelectTemplate, 
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

FullVersionForm.displayName = "FullVersionForm";

export default FullVersionForm;
