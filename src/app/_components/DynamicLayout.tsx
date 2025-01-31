import React from 'react';
import { HomeIcon, OrderIcon, ChatIcon, ComposeIcon, AppsIcon } from '@shopify/polaris-icons';
import { Grid, LegacyCard, Box } from '@shopify/polaris';
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
  contentRef?: React.RefObject<HTMLFormElement>
}

export default function DynamicLayout({ 
  version,
  theme,
  isFullScreen, 
  onToggleFullScreen, 
  prompt, 
  onPromptChange, 
  urls,
  errors,
  blogs,
  onLoadMoreBlogs,
  isBlogLoading,
  blogLoadingError,
  loadingMoreBlogs,
  loadingBlogProgress,
  totalBlogs,
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
  contentRef
}: DynamicLayoutProps) {
  const renderForm = (version: string) => {
    switch (version.toLowerCase()) {
      case 'light':
        return (
          <LightVersionForm 
            theme={theme}
            prompt={prompt}
            onPromptChange={onPromptChange} 
            urls={urls} 
            blogs={blogs}
            totalBlogs={totalBlogs}
            isBlogLoading={isBlogLoading}
            blogLoadingError={blogLoadingError}
            onLoadMoreBlogs={onLoadMoreBlogs}
            loadingMoreBlogs={loadingMoreBlogs}
            loadingBlogProgress={loadingBlogProgress}
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
            theme={theme}
            prompt={prompt}
            onPromptChange={onPromptChange} 
            urls={urls}
            blogs={blogs}
            totalBlogs={totalBlogs}
            onLoadMoreBlogs={onLoadMoreBlogs}
            loadingMoreBlogs={loadingMoreBlogs}
            isBlogLoading={isBlogLoading}
            blogLoadingError={blogLoadingError}
            loadingBlogProgress={loadingBlogProgress}
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
    <Box ref={contentRef} className='w-full h-screen bg-transparent'>
      {outputContent && Object.entries(outputContent).length > 0 ? (
        isFullScreen ? (
          <ContentRenderedView
            content={outputContent}
            contentType={outputContent?.input?.category}
            onOpenEditMode={onOpenEditMode}
            isFullScreen={isFullScreen}
            onToggleFullScreen={onToggleFullScreen}
            onAction={onAction}
            onCancel={onCancelAction}
            loading={actionLoading}
            isPreviewMode
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-8">
            <div className="h-full max-h-screen overflow-y-auto flex flex-col">
              <div className="flex-1 flex flex-col -mt-4">
                {renderForm(version)}
              </div>
            </div>
            <div className="h-full flex flex-col">
              <div className="flex-1 max-h-screen overflow-y-auto flex flex-col">
                <div className="flex flex-1 flex-col">
                  <ContentRenderedView
                    content={outputContent}
                    contentType={outputContent?.input?.category}
                    onOpenEditMode={onOpenEditMode}
                    isFullScreen={isFullScreen}
                    onToggleFullScreen={onToggleFullScreen}
                    onAction={onAction}
                    onCancel={onCancelAction}
                    loading={actionLoading}
                    isPreviewMode
                  />
                </div>
              </div>
            </div>
          </div>
        )
      ) : (
        renderForm(version)
      )}
    </Box>
  );
}