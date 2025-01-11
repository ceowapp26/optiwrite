import { Grid } from '@mui/material';
import { HomeIcon, OrderIcon, ChatIcon, ComposeIcon, AppsIcon } from '@shopify/polaris-icons';
import { cn } from '@/lib/utils';
import { useState, useCallback, useRef } from 'react';
import { TEMPLATE_OPTIONS } from '@/constants/template';
import { LENGTH_OPTIONS } from '@/constants/share';
import { type CONTENT } from '@/types/content';
import FullVersionForm from './FullVersionForm';
import LightVersionForm from './LightVersionForm';
import ContentRenderedView from '@/components/content/ContentRenderedView';
import { BaseFormProps } from './FormProvider';

interface DynamicLayoutProps extends BaseFormProps { 
  version: string;
  isPreview: boolean;
  isFullScreen: boolean;
  onToggleFullScreen: () => void;
  toneOptions?: any;
  selectedTone?: string;
  onSelectTone?: (id: string) => void;
  outputContent: CONTENT;
  onOpenEditMode?: (contentId: string) => void;
  onAction?: (eventType: string, values: CONTENT) => void;
  onCancelAction?: () => void;
  actionLoading?: boolean;
}

export default function DynamicLayout({ 
  version,
  isPreview, 
  isFullScreen, 
  onToggleFullScreen, 
  prompt, 
  onPromptChange, 
  urls,
  errors,
  blogs,
  toneOptions,
  selectedTone,
  onSelectTone, 
  onAddUrl, 
  onUrlChange, 
  onFormSubmit, 
  onResetForm, 
  templateOptions = TEMPLATE_OPTIONS,
  selectedTemplate,
  onSelectTemplate,
  lengthOptions = LENGTH_OPTIONS,
  selectedLength,
  onSelectLength,
  subtitleChecked,
  onSubtitleCheckedChange,
  subtitleQuantity,
  onSubtitleQuantityChange,
  subtitlePrompts,
  onSubtitlePromptChange,
  outputContent,
  selectedCategory,
  onSelectCategory,
  selectedBlog,
  onSelectBlog,
  isImportImageAvailable,
  selectedImage,
  onSelectImage,
  selectedArticle,
  onSelectArticle,
  onOpenEditMode,
  generating,
  processing,
  onAction,
  onCancelAction,
  actionLoading,
  showProcessingStatus,
  dataProgress,
  processedInputData,
  showConversionStatus,
  generateProgress,
  localContentData,
  error,
  setError,
}: DynamicLayoutProps) {
  const renderForm = (version: string) => {
    switch (version.toLowerCase()) {
      case 'light':
        return (
          <LightVersionForm 
            prompt={prompt}
            onPromptChange={onPromptChange} 
            urls={urls} 
            blogs={blogs}
            errors={errors}
            onAddUrl={onAddUrl}
            onUrlChange={onUrlChange} 
            onFormSubmit={onFormSubmit} 
            onResetForm={onResetForm}
            lengthOptions={lengthOptions}
            selectedLength={selectedLength}
            onSelectLength={onSelectLength}
            subtitleChecked={subtitleChecked}
            onSubtitleCheckedChange={onSubtitleCheckedChange}
            subtitleQuantity={subtitleQuantity}
            onSubtitleQuantityChange={onSubtitleQuantityChange}
            subtitlePrompts={subtitlePrompts}
            onSubtitlePromptChange={onSubtitlePromptChange}
            toneOptions={toneOptions}
            selectedTone={selectedTone} 
            onSelectTone={onSelectTone}
            selectedCategory={selectedCategory}
            onSelectCategory={onSelectCategory}
            selectedBlog={selectedBlog}
            onSelectBlog={onSelectBlog}
            isImportImageAvailable={isImportImageAvailable}
            selectedImage={selectedImage}
            onSelectImage={onSelectImage}
            selectedArticle={selectedArticle}
            onSelectArticle={onSelectArticle}
            generating={generating}
            processing={processing}
            showProcessingStatus={showProcessingStatus}
            dataProgress={dataProgress}
            processedInputData={processedInputData}
            showConversionStatus={showConversionStatus}
            generateProgress={generateProgress}
            localContentData={localContentData}
            error={error}
            setError={setError}
          />
        );

      case 'full':
        return (
          <FullVersionForm 
            prompt={prompt}
            onPromptChange={onPromptChange} 
            urls={urls}
            blogs={blogs}
            errors={errors}
            onAddUrl={onAddUrl}
            onUrlChange={onUrlChange} 
            onFormSubmit={onFormSubmit} 
            onResetForm={onResetForm}
            templateOptions={templateOptions} 
            selectedTemplate={selectedTemplate}
            onSelectTemplate={onSelectTemplate}
            lengthOptions={lengthOptions}
            selectedLength={selectedLength}
            onSelectLength={onSelectLength}
            subtitleChecked={subtitleChecked}
            onSubtitleCheckedChange={onSubtitleCheckedChange}
            subtitleQuantity={subtitleQuantity}
            onSubtitleQuantityChange={onSubtitleQuantityChange}
            subtitlePrompts={subtitlePrompts}
            onSubtitlePromptChange={onSubtitlePromptChange}
            toneOptions={toneOptions}
            selectedTone={selectedTone} 
            onSelectTone={onSelectTone}
            selectedCategory={selectedCategory}
            onSelectCategory={onSelectCategory}
            selectedBlog={selectedBlog}
            onSelectBlog={onSelectBlog}
            isImportImageAvailable={isImportImageAvailable}
            selectedImage={selectedImage}
            onSelectImage={onSelectImage}
            selectedArticle={selectedArticle}
            onSelectArticle={onSelectArticle}
            generating={generating}
            processing={processing}
            showProcessingStatus={showProcessingStatus}
            dataProgress={dataProgress}
            processedInputData={processedInputData}
            showConversionStatus={showConversionStatus}
            generateProgress={generateProgress}
            localContentData={localContentData}
            error={error}
            setError={setError}
          />
        );

      default:
        throw new Error(`Unsupported form version: ${version}`);
    }
  };

  return (
    <Grid container spacing={2}>
      {isFullScreen && !isPreview && outputContent ? (
        <Grid item xs={12}>
         <ContentRenderedView 
            content={outputContent} 
            contentType={selectedCategory}
            onOpenEditMode={onOpenEditMode}
            isFullScreen={isFullScreen}
            onToggleFullScreen={onToggleFullScreen} 
            onAction={onAction}
            onCancel={onCancelAction}
            isPreviewMode={isPreview} 
            loading={actionLoading}
          />
        </Grid>
      ) : (
        <>
          <Grid item xs={12} md={isPreview ? 6 : 12}>
            {renderForm(version)}
          </Grid>
          {isPreview && outputContent && (
            <Grid item xs={12} md={6}>
              <ContentRenderedView 
                content={outputContent} 
                contentType={selectedCategory}
                onOpenEditMode={onOpenEditMode}
                isFullScreen={isFullScreen}
                onToggleFullScreen={onToggleFullScreen}
                onAction={onAction}
                onCancel={onCancelAction}
                isPreviewMode={isPreview} 
                loading={actionLoading}
              />
            </Grid>
          )}
        </>
      )}
    </Grid>
  );
};