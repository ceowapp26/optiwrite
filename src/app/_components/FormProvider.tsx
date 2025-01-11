import React, { useState, useEffect, useMemo, useCallback, memo } from "react";
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Card, 
  InlineStack, 
  Text, 
  Button, 
  Divider, 
  TextField, 
  TextContainer,
  Box, 
  Checkbox,
  BlockStack,
  InlineGrid,
  Scrollable,
  Frame,
  Toast,
  ChoiceList,
  Tooltip,
  EmptyState,
  Popover,
  ActionList,
  Badge,
  Icon,
  Grid,
  ButtonGroup,
  Tabs,
  ProgressBar,
  Spinner,
  Banner
} from '@shopify/polaris';
import {
  RadioGroup,
  Radio,
  cn,
} from "@nextui-org/react";
import { ToneType } from '@/constants/share';
import { useAppBridge } from '@/providers/AppBridgeProvider';
import { Redirect } from '@shopify/app-bridge/actions';
import { CATEGORY, ContentCategory } from '@/types/content';
import { 
  PlusIcon, 
  XIcon, 
  ViewIcon, 
  HeartIcon, 
  HomeIcon, 
  CheckIcon,
  OrderIcon, 
  ProductIcon, 
  EditIcon, 
  DeleteIcon, 
  ChevronDownIcon,   
  BlogIcon,
  LinkIcon,
  TextWithImageIcon,
  StoreIcon,
  MagicIcon,
  ContentFilledIcon,
  ImageIcon,
  ImportIcon,
  CategoriesIcon,
  CheckCircleIcon,
  LayoutSectionIcon
} from '@shopify/polaris-icons';
import { ImageOff, Waves } from 'lucide-react';
import { ErrorType } from '@/types/form';
import { TemplateDetailsModal } from './TemplateDetailsModal';
import { useAppDispatch, useAppSelector } from '@/hooks/useLocalStore';
import { TEMPLATE_OPTIONS } from '@/constants/template';
import { 
  addToFavorites, 
  removeFromFavorites, 
  createList, 
  addItemToList, 
  removeItemFromList,
  updateList,
  selectListById,
  selectTemplates,
  selectTemplatesList,
  createTemplates,
  updateTemplates
} from '@/stores/features/templateSlice';
import { styled } from 'styled-components';
import { motion } from 'framer-motion';

const MapIcon = {
  PlusIcon: PlusIcon,
  HomeIcon: HomeIcon,
  OrderIcon: OrderIcon,
  ProductIcon: ProductIcon,
};

const CardTemplateItem = memo(({ 
  content, 
  onView, 
  onToggleFavorite, 
  onEdit,
  onDelete 
}) => {
  const [popoverActive, setPopoverActive] = useState(false);
  const [isFavorite, setIsFavorite] = useState(content.isFavorite || false);

  const handleToggleFavorite = () => {
    setIsFavorite(!isFavorite);
    onToggleFavorite?.(content);
  };

  const renderContentImage = () => {
    let imageSrc;
    switch(content.category) {
      case 'blog':
      case 'article':
        imageSrc = content.article_image;
        break;
      case 'product':
        imageSrc = content.image?.src;
        break;
      default:
        return null;
    }

    return imageSrc ? (
      <div 
        style={{
          position: 'relative',
          height: '200px',
          backgroundImage: `url(${imageSrc})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          borderRadius: '8px',
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
          <Badge tone="info">{content.category}</Badge>
          {content.isPremium && <Badge tone="success">Premium</Badge>}
        </div>
      </div>
    ) : null;
  };

  const renderContentDetails = () => {
    let title, summary, tags;
    switch(content.category) {
      case 'blog':
      case 'article':
        title = content.article_title || content.blog_title;
        summary = content.article_summary_html || 'No summary available';
        tags = content.article_tags || content.blog_tags;
        break;
      case 'product':
        title = content.title;
        summary = content.body_html || 'No description available';
        tags = content.tags;
        break;
      default:
        return null;
    }

    const stripHtml = (html) => {
      const tmp = document.createElement('DIV');
      tmp.innerHTML = html;
      return tmp.textContent || tmp.innerText || '';
    };

    const truncatedSummary = stripHtml(summary).length > 150 
      ? `${stripHtml(summary).substring(0, 150)}...` 
      : stripHtml(summary);

    return (
      <BlockStack gap="200">
        <Text as="h3" variant="headingMd">{title}</Text>
        <Text variant="bodyMd" tone="subdued">
          {truncatedSummary}
        </Text>
        {tags && (
          <InlineStack gap="100">
            {tags.split(',').slice(0, 2).map((tag, index) => (
              <Badge key={index} tone="info">{tag.trim()}</Badge>
            ))}
          </InlineStack>
        )}
      </BlockStack>
    );
  };

  const renderActionButtons = () => {
    return (
      <ButtonGroup gap="loose" fullWidth>
        <Tooltip content="View Details">
          <Button 
            icon={ViewIcon} 
            variant="secondary" 
            onClick={() => onView?.(content)}
          />
        </Tooltip>
        <Tooltip content={isFavorite ? "Remove from Favorites" : "Add to Favorites"}>
          <Button 
            icon={HeartIcon} 
            variant={isFavorite ? "primary" : "secondary"} 
            onClick={handleToggleFavorite}
          />
        </Tooltip>
         <Tooltip content={"Remove from Lists"}>
          <Button 
            icon={DeleteIcon} 
            tone="critical"
            onClick={() => onDelete?.(content)}
          />
        </Tooltip>
      </ButtonGroup>
    );
  };

  const renderAdditionalInfo = () => {
    switch(content.category) {
      case 'blog':
      case 'article':
        return (
          <InlineStack gap="200">
            <Text variant="bodySm" tone="subdued">
              Author: {content.article_author || 'Unknown'}
            </Text>
          </InlineStack>
        );
      case 'product':
        return (
          <InlineStack gap="200">
            <Text variant="bodySm" tone="subdued">
              Vendor: {content.vendor}
            </Text>
            <Text variant="bodySm" tone="subdued">
              Type: {content.product_type}
            </Text>
          </InlineStack>
        );
      default:
        return null;
    }
  };

  return (
    <Box className="bg-surface-secondary p-4 rounded-t-sm shadow-md h-[500px] flex flex-col w-full">
      <div className="flex-grow">
        <BlockStack gap="400">
          {renderContentImage()}
          {renderContentDetails()}
          {renderAdditionalInfo()}
        </BlockStack>
      </div>
      <div className="mt-auto">
        {renderActionButtons()}
      </div>
    </Box>
  );
});

interface Blog {
  blogName: string;
  blogId: string;
}

export interface BaseFormProps {
  generating?: boolean;
  isImportImageAvailable?: boolean;
  errors?: ErrorType;
  prompt?: string;
  urls: string[];
  blogs: Blog[];
  onPromptChange?: (value: string) => void;
  onUrlChange?: (index: number, value: string) => void;
  onFormSubmit?: () => void;
  onAddUrl?: () => void;
  onResetForm?: () => void;
  templateOptions?: typeof TEMPLATE_OPTIONS;
  selectedTemplate?: string;
  onSelectTemplate?: (templates: typeof TEMPLATE_OPTIONS, template: string) => void;
  lengthOptions?: string[];
  selectedLength?: string; 
  onSelectLength?: (length: string) => void;
  subtitleChecked?: boolean;
  onSubtitleCheckedChange?: (checked: boolean) => void;
  subtitleQuantity?: number;
  onSubtitleQuantityChange?: (quality: number) => void;
  subtitlePrompts?: string[];
  onSubtitlePromptChange?: (index: number, value: string) => void;
  selectedCategory?: CATEGORY;
  onSelectCategory?: (category: CATEGORY) => void;
  selectedBlog: string | null;
  onSelectBlog: (blogId: string | null) => void;
  selectedImage?: 'yes' | 'no' | 'unsplash';
  onSelectImage?: (option: string[]) => void;
  selectedArticle?: 'withArticle' | 'blogOnly';
  onSelectArticle?: (option: string[]) => void;
  toneOptions: any;
  selectedTone: string;
  onSelectTone: (id: string) => void;
  showProcessingStatus: boolean;
  processing: boolean;
  dataProgress: number;
  processedInputData: any;
  showConversionStatus: boolean;
  generateProgress: number;
  localContentData: any;
  error: string | null;
  setError: (error: string) => void;
}

const CustomRadio = (props) => {
  const {children, description, isVertical, icon: Icon, ...otherProps} = props;
  return (
    <Radio
      {...otherProps}
      classNames={{
        base: cn(
          "inline-flex m-0 bg-content hover:bg-content2/60 items-center !justify-start",
          "cursor-pointer rounded-xl gap-4 p-6 mr-4",
          `border-2 w-full ${isVertical ? `!max-w-full` : 'min-w-[300px]'} h-[200px] border-transparent transition-all duration-200`,
          "data-[selected=true]:border-primary data-[selected=true]:bg-primary/5",
          "hover:scale-[1.02] hover:shadow-md"
        ),
      }}
    >
      <div className="flex flex-1 gap-4 items-center">
        {Icon && (
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="w-6 h-6 text-primary" />
          </div>
        )}
        <div className="flex flex-col gap-1">
          <Text size="lg" weight="medium">{children}</Text>
          <Text size="sm" color="secondary">{description}</Text>
        </div>
      </div>
    </Radio>
  );
};

const ImageInclusionChoiceList = ({ isImportImageAvailable, selectedImage, onSelectImage }) => {
  const options = [
    ...(isImportImageAvailable ? [{ 
      label: "Use Import Images",
      value: "yes",
      icon: ImportIcon,
      description: "Use images from your store"
    }] : []),
    { 
      label: "Use Unsplash Images",
      value: "unsplash",
      icon: ImageIcon,
      description: "Use stock photos"
    },
    { 
      label: "No Images",
      value: "no",
      icon: ImageOff,
      description: "Text-only content"
    }
  ];

  return (
    <RadioGroup
      value={selectedImage}
      onValueChange={onSelectImage}
      orientation="horizontal"
    >
      {options.map((option) => (
        <CustomRadio
          key={option.value}
          value={option.value}
          description={option.description}
          icon={option.icon}
          isVertical={false}
        >
          {option.label}
        </CustomRadio>
      ))}
    </RadioGroup>
  );
};

const ToneSelector = ({ toneOptions, selectedTone, onSelectTone }) => {
  return (
    <Box className="w-full">
      <BlockStack gap="400">
        <InlineStack gap="300" align="start" blockAlign="center">
          <ContentFilledIcon className="w-5 h-5 text-primary" />
          <Text variant="headingMd" as="h3" className="flex items-center gap-2">
            Content Tone
          </Text>
        </InlineStack>
        <Box className="bg-gray-50 p-1 rounded-xl shadow-inner">
          <Tabs 
            tabs={toneOptions}
            selected={toneOptions.findIndex((item) => selectedTone === item.id.toUpperCase())}
            onSelect={onSelectTone}
            fitted
            className="gap-2"
            tabClassName="rounded-lg transition-all duration-200 hover:bg-white/50"
            selectedTabClassName="bg-white shadow-sm"
          />
        </Box>
      </BlockStack>
    </Box>
  );
};

const ArticleInclusionSelector = ({ selectedArticle, onSelectArticle }) => {
  return (
    <Box>
      <BlockStack gap="300">
        <BlockStack>
          <InlineStack gap="300" align="start">
            <BlogIcon className="w-5 h-5 text-primary" />
            <Text variant="headingMd" as="h3">Article Inclusion</Text>
          </InlineStack>
          <Text variant="bodyMd" color="subdued">
            Choose whether to include an article with your blog
          </Text>
        </BlockStack>
        
        <Card>
          <Box padding="400">
            <ChoiceList
              title="Article Inclusion"
              titleHidden
              choices={[
                {
                  label: (
                    <InlineStack gap="300" align="start" blockAlign="center">
                      <BlockStack gap="100">
                        <Text variant="headingSm" as="h4">Blog with Article</Text>
                        <Text variant="bodySm" color="subdued">
                          Generate a blog post with an accompanying article
                        </Text>
                      </BlockStack>
                    </InlineStack>
                  ),
                  value: "withArticle"
                },
                {
                  label: (
                    <InlineStack gap="300" align="start" blockAlign="center">
                      <BlockStack gap="100">
                        <Text variant="headingSm" as="h4">Blog Only</Text>
                        <Text variant="bodySm" color="subdued">
                          Generate just the blog post without an article
                        </Text>
                      </BlockStack>
                    </InlineStack>
                  ),
                  value: "blogOnly"
                }
              ]}
              selected={[selectedArticle ? "withArticle" : "blogOnly"]}
              onChange={(value) => onSelectArticle(value[0] === "withArticle")}
            />
          </Box>
        </Card>
      </BlockStack>
    </Box>
  );
};

const ContentTypeSelector = ({ selectedCategory, onSelectCategory }) => {
  return (
    <Box>
      <BlockStack>
        <Box paddingBlockEnd="500">
          <BlockStack gap="200">
           <InlineStack gap="300" align="start" blockAlign="center">
              <CategoriesIcon className="w-5 h-5 text-primary" />
              <Text variant="headingMd" as="h3" className="flex items-center gap-2">
                Content Catgory
              </Text>
            </InlineStack>
            <Text variant="bodyMd" color="subdued">
              Choose the type of content you want to generate
            </Text>
          </BlockStack>
        </Box>
        <RadioGroup 
          value={selectedCategory}
          onValueChange={onSelectCategory}
          isVertical
        >
          <BlockStack gap="300">
            <CustomRadio 
              description="SEO-optimized blog posts to engage your audience" 
              value="BLOG"
              icon={BlogIcon}
            >
              Blog Post
            </CustomRadio>
            <CustomRadio 
              description="In-depth articles to establish thought leadership" 
              value="ARTICLE"
              icon={TextWithImageIcon}
            >
              Article
            </CustomRadio>
            <CustomRadio
              description="Conversion-focused product descriptions"
              value="PRODUCT"
              icon={StoreIcon}
            >
              Product Listing
            </CustomRadio>
          </BlockStack>
        </RadioGroup>
      </BlockStack>
    </Box>
  );
};

const styles = `
  .shadow-subtle {
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  .shadow-success {
    box-shadow: 0 2px 8px rgba(0, 170, 0, 0.1);
  }

  .shadow-error {
    box-shadow: 0 2px 8px rgba(220, 38, 38, 0.1);
  }

  .animate-scale-in {
    animation: scaleIn 0.3s ease-out;
  }

  @keyframes scaleIn {
    from {
      transform: scale(0.8);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }

  .animate-pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
`;

interface BannerProps {
  showProcessingStatus: boolean;
  isDataProcessing: boolean;
  dataProgress: number;
  processedInputData: any;
  showConversionStatus: boolean;
  isContentGenerating: boolean;
  generateProgress: number;
  localContentData: any;
  error: string | null;
  setError: (error: string) => void;
}

const ContentStatusBanner: React.FC<BannerProps> = ({
  showProcessingStatus,
  isDataProcessing,
  dataProgress,
  processedInputData,
  showConversionStatus,
  isContentGenerating,
  generateProgress,
  localContentData,
  error,
  setError,
}) => {
  const StatusCard = ({ 
    isProcessing, 
    progress, 
    loadingText, 
    successText, 
    successData 
  }) => (
    <Box className={`p-4 w-full rounded-md ${successData ? "bg-green-200 shadow-lg" : "bg-gray-200 shadow-sm"} transition-all duration-300 ease-in-out`}>
      <BlockStack gap="400" inlineAlign="center" align="center">
        {isProcessing ? (
          <>
            <div className="animate-pulse">
              <Spinner 
                size="large" 
                appearance="primary" 
                accessibilityLabel="Processing content"
              />
            </div>
            <Text variant="bodyMd" color="text-primary">
              {loadingText}
            </Text>
            <div className="w-full px-20">
              <ProgressBar
                progress={progress}
                size="small" 
                color="primary"
                animated
                aria-label={`${progress}% complete`}
              />
            </div>
          </>
        ) : successData ? (
          <>
            <Icon
              source={CheckCircleIcon}
              color="success"
              backdrop
              className="animate-scale-in"
            />
            <Text variant="bodyMd" color="text-success" fontWeight="medium">
              {successText}
            </Text>
          </>
        ) : null}
      </BlockStack>
    </Box>
  );

  if (!isDataProcessing && !isContentGenerating) return;

  return (
    <Box paddingBlock="500" width="100%">
      <div className="space-y-400">
        {showProcessingStatus && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <StatusCard
              isProcessing={isDataProcessing}
              progress={dataProgress}
              loadingText="Retrieving content..."
              successText="Content retrieved successfully"
              successData={processedInputData}
            />
          </motion.div>
        )}

        {showConversionStatus && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <StatusCard
              isProcessing={isContentGenerating}
              progress={generateProgress}
              loadingText="Converting content..."
              successText="Content converted successfully"
              successData={localContentData}
            />
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            <Banner
              title="Error processing content"
              status="critical"
              onDismiss={() => setError('')}
              className="shadow-error"
            >
              <Text variant="bodyMd" color="text-critical">
                {error}
              </Text>
            </Banner>
          </motion.div>
        )}
      </div>
    </Box>
  );
};

const LightVersionForm = memo(({
  prompt,
  urls,
  blogs,
  errors,
  onPromptChange,
  onUrlChange,
  onAddUrl,
  onResetForm,
  onFormSubmit,
  subtitleChecked,
  onSubtitleCheckedChange,
  subtitleQuantity,
  onSubtitleQuantityChange,
  subtitlePrompts,
  onSubtitlePromptChange,
  lengthOptions,
  selectedLength,
  onSelectLength,
  selectedCategory,
  onSelectCategory,
  selectedBlog,
  onSelectBlog,
  isImportImageAvailable,
  selectedImage,
  onSelectImage,
  toneOptions,
  selectedTone,
  onSelectTone,
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
  setError,
}: BaseFormProps) => (
  <Box padding="500">
    <Card>
      <Box padding="500">
        <BlockStack gap="500">
          <TextContainer>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <MagicIcon className="w-6 h-6 text-primary" />
              </div>
              <Text variant="headingXl" as="h1">AI Content Generator</Text>
            </div>
            <Text variant="bodyLg" color="subdued">
              Create professional content for your Shopify store in minutes
            </Text>
          </TextContainer>
          <ToneSelector
            toneOptions={toneOptions}
            selectedTone={selectedTone}
            onSelectTone={onSelectTone}
          />
          <ContentTypeSelector
            selectedCategory={selectedCategory}
            onSelectCategory={onSelectCategory}
          />
          {selectedCategory === ContentCategory.BLOG && (
            <ArticleInclusionSelector 
              selectedArticle={selectedArticle} 
              onSelectArticle={onSelectArticle}
            />
          )}
          <Box>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h3">What would you like to create?</Text>
              <TextField 
                multiline={4}
                maxLength={250}
                showCharacterCount
                autoComplete="off"
                placeholder="E.g., Write a compelling product description for my eco-friendly water bottle..." 
                helpText="Be specific about your content needs for better results"
                onChange={onPromptChange}
                value={prompt}
                error={errors.prompt}
              />
            </BlockStack>
          </Box>
         {selectedCategory === ContentCategory.ARTICLE && (
            <Box padding="500" maxWidth="800px" margin="0 auto">
              <BlockStack gap="500">
                <Box 
                  display="flex" 
                  alignItems="center" 
                  justifyContent="space-between"
                  paddingBottom="400"
                  borderBottom="1px solid var(--p-border-subdued)"
                >
                  <BlockStack gap="100">
                    <Text variant="headingLg" as="h2">Blog Management</Text>
                    <Text variant="bodySm" color="subdued">
                      Select or create a blog for your article
                    </Text>
                  </BlockStack>
                  <Badge size="medium" tone="info">
                    {blogs.length} {blogs.length === 1 ? 'blog' : 'blogs'} available
                  </Badge>
                </Box>
                {/**<TextField
                  prefix={<Icon source={SearchIcon} color="subdued" />}
                  placeholder="Search your blogs..."
                  onChange={(value) => onSearchBlogs(value)}
                  clearButton
                  autoComplete="off"
                  borderRadius="300"
                  helpText="Search by blog name or description"
                />**/}
                <Box
                  padding="400"
                  background="bg-surface-secondary"
                  borderRadius="300"
                  borderWidth="1px"
                  borderStyle="solid"
                  borderColor="border"
                  shadow="low"
                >
                  <BlockStack gap="300">
                    {blogs.length < 1 ? (
                      <EmptyState
                        heading="Start Your First Blog"
                        image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                        imageWidth={200}
                      >
                        <Text variant="bodyMd" color="subdued" alignment="center">
                          Create your first blog and start publishing engaging content for your audience
                        </Text>
                        <Box paddingTop="400">
                          <Button 
                            primary 
                            icon={PlusIcon}
                            onClick={() => onSelectBlog(null)}
                          >
                            Create New Blog
                          </Button>
                        </Box>
                      </EmptyState>
                    ) : (
                      <BlockStack gap="300">
                        <Text variant="headingSm" as="h3">Your Blogs</Text>
                        <Grid columns={4} gap="300">
                          {blogs
                            .filter(blog => blog.blogName !== "new blog")
                            .map((blog) => (
                              <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 6, xl: 6}}>
                               <Button
                                  key={blog.blogId}
                                  variant={selectedBlog === blog.blogId ? "primary" : "tertiary"}
                                  onClick={() => onSelectBlog(blog.blogId)}
                                  fullWidth
                                >
                                  <Box padding="200" display="flex" alignItems="center" gap="300">
                                    <Icon source={BlogIcon} />
                                    <BlockStack gap="100">
                                      <Text variant="bodyMd" fontWeight="medium">
                                        {blog.blogName}
                                      </Text>
                                      <Text variant="bodySm" color="subdued">
                                        {blog.articleCount || 0} articles
                                      </Text>
                                    </BlockStack>
                                  </Box>
                                </Button>
                              </Grid.Cell>
                            ))}
                        </Grid>
                      </BlockStack>
                    )}
                  </BlockStack>
                </Box>
                <Card>
                  <Box padding="400">
                    <BlockStack gap="300" align="center">
                      <Text variant="headingSm" as="h3">Create New Blog</Text>
                      <Text variant="bodyMd" color="subdued" alignment="center">
                        Start fresh with a new blog for your content
                      </Text>
                      <Button
                        variant={selectedBlog === null ? "primary" : "secondary"}
                        onClick={() => onSelectBlog(null)}
                        icon={PlusIcon}
                        tone={selectedBlog === null ? "success" : undefined}
                        size="large"
                      >
                        Create New Blog
                      </Button>
                    </BlockStack>
                  </Box>
                </Card>
              </BlockStack>
            </Box>
          )}
          <Box>
            <BlockStack gap="300">
              <BlockStack>
                <InlineStack gap="400" align="start">
                  <LinkIcon className="w-5 h-5 text-primary" />
                  <Text variant="headingMd" as="h3" className="flex items-center gap-2">
                    Reference URLs
                  </Text>
                </InlineStack>
                <Text variant="bodyMd" color="subdued">
                  Add up to 4 URLs for AI to analyze and incorporate insights
                </Text>
              </BlockStack>
              <BlockStack gap="300">
                {urls.map((url, index) => (
                  <TextField 
                    key={index}
                    prefix={<Icon source={LinkIcon} />}
                    maxLength={250}
                    placeholder="https://" 
                    helpText={`Reference URL ${index + 1}`}
                    onChange={(value) => onUrlChange?.(index, value)}
                    value={url}
                    error={errors.urls?.[index]}
                  />
                ))}
              </BlockStack>
              <Button 
                icon={PlusIcon} 
                onClick={onAddUrl}
                disabled={urls.length >= 4}
                size="slim"
              >
                Add URL
              </Button>
            </BlockStack>
          </Box>
          {selectedCategory === ContentCategory.BLOG && selectedArticle === "withArticle" && (
            <>
              <Box>     
                <BlockStack gap="300">
                  <BlockStack>
                    <InlineStack gap="300" align="start">
                      <ImageIcon className="w-5 h-5 text-primary" />
                      <Text variant="headingMd" as="h3" className="flex items-center gap-2">
                        Image Inclusions
                      </Text>
                    </InlineStack>
                    <Text variant="bodyMd" color="subdued">
                      Select image inclusion options
                    </Text>
                  </BlockStack>
                  <ImageInclusionChoiceList 
                    isImportImageAvailable={isImportImageAvailable}
                    selectedImage={selectedImage}
                    onSelectImage={onSelectImage}
                  />
                </BlockStack>
              </Box>
              <Box>
                <BlockStack gap="400">
                  <BlockStack>
                    <InlineStack gap="300" align="start">
                      <LayoutSectionIcon className="w-5 h-5 text-primary" />
                      <Text variant="headingMd" as="h3" className="flex items-center gap-2">
                        Section Inclusions
                      </Text>
                    </InlineStack>
                    <Text variant="bodyMd" color="subdued">
                      Choose how many sections to include
                    </Text>
                  </BlockStack>
                  <Checkbox
                    label="Include Subtitles"
                    checked={subtitleChecked}
                    onChange={onSubtitleCheckedChange}
                  />
                  {subtitleChecked && (
                    <BlockStack gap="300">
                      <InlineStack align="space-between">
                        <Text variant="headingMd" as="h3">Add up to 4 sections for your content</Text>
                        <ButtonGroup segmented>
                          {[1, 2, 3, 4].map((num) => (
                            <Button
                              key={num}
                              pressed={subtitleQuantity === num}
                              onClick={() => onSubtitleQuantityChange(num)}
                              size="slim"
                            >
                              {num}
                            </Button>
                          ))}
                        </ButtonGroup>
                      </InlineStack>
                      {subtitleQuantity > 0 && (
                        <BlockStack gap="300">
                          {Array.from({ length: subtitleQuantity }).map((_, index) => (
                            <TextField 
                              key={index}
                              maxLength={250}
                              placeholder={`Subtitle for section ${index + 1}`}
                              helpText={`Provide title for section ${index + 1} (optional)`}
                              onChange={(value) => onSubtitlePromptChange(index, value)}
                              value={subtitlePrompts[index] || ''}
                              error={errors.subtitlePrompts?.[index]}
                            />
                          ))}
                        </BlockStack>
                      )}
                    </BlockStack>
                  )}
                </BlockStack>
              </Box>
              <Box>
                <BlockStack gap="300">
                  <BlockStack>
                    <InlineStack gap="300" align="start">
                      <Waves className="w-5 h-5 text-primary" />
                      <Text variant="headingMd" as="h3" className="flex items-center gap-2">
                        Content Length
                      </Text>
                    </InlineStack>
                    <Text variant="bodyMd" color="subdued">
                      Select Length of Content
                    </Text>
                  </BlockStack>
                  <ButtonGroup fullWidth>
                    {lengthOptions.map((option) => (
                      <Button
                        key={option.key}
                        pressed={selectedLength === option.value}
                        onClick={() => onSelectLength(option.value)}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </ButtonGroup>
                </BlockStack>
              </Box>
            </>
          )}
          <Box paddingBlockEnd="400" />
          <ContentStatusBanner
            showProcessingStatus={showProcessingStatus}
            isDataProcessing={processing}
            dataProgress={dataProgress}
            processedInputData={processedInputData}
            showConversionStatus={showConversionStatus}
            isContentGenerating={generating}
            generateProgress={generateProgress}
            localContentData={localContentData}
            error={error}
            setError={setError}
          />
          <Button 
            variant="primary"
            tone="success"
            onClick={onFormSubmit}
            loading={generating || processing}
            disabled={generating || processing}
            fullWidth
            size="large"
          >
            {generating || processing ? 'Generating Content...' : 'Generate Content'}
          </Button>
        </BlockStack>
      </Box>
    </Card>
  </Box>
));

interface EnhancedTemplateOption extends TemplateOption {
  isFavorite?: boolean;
}

const FullVersionForm = memo(({
  prompt,
  urls,
  blogs, 
  errors,
  onPromptChange,
  onUrlChange,
  onAddUrl,
  onFormSubmit,
  onResetForm,
  templateOptions,
  subtitleChecked,
  onSubtitleCheckedChange,
  subtitleQuantity,
  onSubtitleQuantityChange,
  subtitlePrompts,
  onSubtitlePromptChange,
  selectedTemplate,
  onSelectTemplate,
  lengthOptions,
  selectedLength,
  onSelectLength,
  selectedCategory,
  onSelectCategory,
  selectedBlog,
  onSelectBlog,
  isImportImageAvailable,
  selectedImage,
  onSelectImage,
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
}: BaseFormProps) => {
  const dispatch = useAppDispatch();
  const [template, setTemplate] = useState<EnhancedTemplateOption>(null);
  const [removedItems, setRemovedItems] = useState<string[]>([]);
  const [visibleTemplates, setVisibleTemplates] = useState(4); 
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; error?: boolean }>({ message: '' });
  const { app } = useAppBridge();
  const redirect = app && Redirect.create(app);
  const searchParams = useSearchParams();
  const shop = searchParams?.get("shop") || "";
  const host = searchParams?.get("host") || "";
  const storedTemplates = useAppSelector(selectTemplates);
  const templates = useAppSelector(selectTemplatesList);

  useEffect(() => {
    if (!templates.length) {
      const initialTemplates = TEMPLATE_OPTIONS.slice(0, 8).map(option => ({
        ...option,
        isFavorite: false
      }));
      dispatch(createList({
        id: 'templateList',
        name: 'Template List',
        description: 'Default template list',
        items: initialTemplates
      }));
    } else {
      const updatedTemplates = templates.map(option => {
        const storedItem = TEMPLATE_OPTIONS.find(item => item.id === option.id);
        return {
          ...option,
          isFavorite: storedItem ? storedItem.isFavorite : false,
          ...(storedItem && Object.keys(storedItem)
            .filter(key => !['id', 'title', 'subtitle', 'icon', 'category'])
            .reduce((acc, key) => ({ ...acc, [key]: storedItem[key] }), {}))
        };
      });
      const needsUpdate = JSON.stringify(
        updatedTemplates.map(({ title, subtitle, icon, category }) => 
          ({ title, subtitle, icon, category })
        )
      ) !== JSON.stringify(
        templates.map(({ title, subtitle, icon, category }) => 
          ({ title, subtitle, icon, category })
      ));
      if (needsUpdate) {
        dispatch(updateList({
          id: 'templateList',
          name: 'Template List',
          description: 'Default template list',
          items: updatedTemplates
        }));
      }
    }
  }, [dispatch]);

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
  }, [dispatch, TEMPLATE_OPTIONS]);

  const handleLoadDefaultItems = useCallback(() => {
    const defaultTemplates = templateOptions.slice(0, 8).map(option => ({
      ...option,
      isFavorite: false
    }));
    
    dispatch(createList({
      id: 'templateList',
      name: 'Template List',
      description: 'Default template list',
      items: defaultTemplates
    }));
  }, [dispatch, templateOptions]);

  const handleToggleFavorite = useCallback((option: EnhancedTemplateOption) => {
    const updatedTemplates = templates.map(template =>
      template.id === option.id
        ? { ...template, isFavorite: !option.isFavorite } 
        : template 
    );
    dispatch(updateList({
      id: "templateList",
      items: updatedTemplates
    }));
    if (option.isFavorite) {
      dispatch(removeFromFavorites({ type: option.category, id: option.id }));
    } else {
      dispatch(addToFavorites({ type: option.category, id: option.id }));
    }
  }, [dispatch, templates]);

  const handleRemoveItem = useCallback((option: EnhancedTemplateOption) => {
    if (templates.length <= 5) {
      setToast({
        message: 'Cannot remove item. Minimum 5 items required.',
        error: true
      });
      return;
    }
    dispatch(removeItemFromList({
      listId: 'templateList',
      itemId: option.id
    }));
    setToast({
      message: `Template "${option.id}" has been removed successfully.`,
      error: false
    });
  }, [templates.length, dispatch]);

  const sortedTemplates = useMemo(() => 
    Array.from(templates || []).sort((a, b) => 
      (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0)
    ),
    [templates]
  );

  const visibleTemplateOptions = useMemo(() => 
    sortedTemplates?.slice(0, visibleTemplates),
    [sortedTemplates, visibleTemplates]
  );

  const hasMoreTemplates = useMemo(() => 
    sortedTemplates?.length > visibleTemplates,
    [sortedTemplates?.length, visibleTemplates]
  );

  const toastMarkup = toast.message ? (
    <Toast 
      content={toast.message} 
      error={toast.error}
      onDismiss={() => setToast({ message: '' })}
    />
  ) : null;

  const handleLoadMore = useCallback(async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setVisibleTemplates(prev => prev + 4);
    } catch (error) {
      console.error('Error loading more templates:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRedirectToTemplatePage = useCallback(() => {
    if (!shop || !host || !redirect) return;
    const queryParams = new URLSearchParams({ shop, host }).toString();
    redirect.dispatch(Redirect.Action.APP, {
      path: `/content/templates?${queryParams}`
    });
  }, [redirect, shop, host]);

  const IconMemo = memo(({ icon }: { icon: string }) => {
    const IconComponent = MapIcon[icon]; 
    if (!IconComponent) return null; 
    return <IconComponent className="w-6 h-6" />;
  });

  const handleSelect = useCallback((template) => {
    onSelectTemplate(template);
    setIsModalOpen(false);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setTemplate(null);
  }, []);

  const handleView = useCallback((template) => {
    setIsModalOpen(true);
    setTemplate(template);
  }, []);

  return(
    <Frame>
      <Box padding="500">
        <Card>
          <Box padding="500">
            <BlockStack gap="500">
              <TextContainer>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <MagicIcon className="w-6 h-6 text-primary" />
                  </div>
                  <Text variant="headingXl" as="h1">AI Content Generator</Text>
                </div>
                <Text variant="bodyLg" color="subdued">
                  Create professional content for your Shopify store in minutes
                </Text>
              </TextContainer>
              <ToneSelector
                toneOptions={toneOptions}
                selectedTone={selectedTone}
                onSelectTone={onSelectTone}
              />
              <ContentTypeSelector
                selectedCategory={selectedCategory}
                onSelectCategory={onSelectCategory}
              />
              <Box>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h3">What would you like to create?</Text>
                  <TextField 
                    multiline={4}
                    maxLength={250}
                    showCharacterCount
                    autoComplete="off"
                    placeholder="E.g., Write a compelling product description for my eco-friendly water bottle..." 
                    helpText="Be specific about your content needs for better results"
                    onChange={onPromptChange}
                    value={prompt}
                    error={errors.prompt}
                  />
                </BlockStack>
              </Box>
              <div className="px-6">
                <div className="flex justify-between items-center">
                  <Text variant="headingMd" as="h3">Choose your template option</Text>
                  <InlineStack align="space-between">
                    <Button onClick={handleLoadDefaultItems}>
                      Load Default Items
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-primary hover:underline"
                      onClick={handleRedirectToTemplatePage}
                    >
                      View all templates
                    </Button>
                  </InlineStack>
                </div>
                <Divider borderColor="border" />
                <Scrollable horizontal shadow>
                  <div style={{ display: 'flex', gap: '16px', paddingBottom: '16px' }}>
                    {visibleTemplateOptions?.map((option, index) => (
                      <div key={index} style={{ minWidth: '280px' }}>
                        <CardTemplateItem 
                          content={option}
                          onView={handleView}
                          onToggleFavorite={handleToggleFavorite}
                          onEdit={(content) => {}}
                          onDelete={handleRemoveItem}
                        />
                      </div>
                    ))}
                    {hasMoreTemplates && (
                      <div style={{ minWidth: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Button
                          fullWidth
                          loading={isLoading}
                          onClick={handleLoadMore}
                          disabled={isLoading}
                        >
                          {isLoading ? 'Loading...' : 'Load More'}
                        </Button>
                      </div>
                    )}
                  </div>
                </Scrollable>
              </div>
             {selectedCategory === ContentCategory.ARTICLE && (
                <Box padding="500" maxWidth="800px" margin="0 auto">
                  <BlockStack gap="500">
                    <Box 
                      display="flex" 
                      alignItems="center" 
                      justifyContent="space-between"
                      paddingBottom="400"
                      borderBottom="1px solid var(--p-border-subdued)"
                    >
                      <BlockStack gap="100">
                        <Text variant="headingLg" as="h2">Blog Management</Text>
                        <Text variant="bodySm" color="subdued">
                          Select or create a blog for your article
                        </Text>
                      </BlockStack>
                      <Badge size="medium" tone="info">
                        {blogs.length} {blogs.length === 1 ? 'blog' : 'blogs'} available
                      </Badge>
                    </Box>
                    {/**<TextField
                      prefix={<Icon source={SearchIcon} color="subdued" />}
                      placeholder="Search your blogs..."
                      onChange={(value) => onSearchBlogs(value)}
                      clearButton
                      autoComplete="off"
                      borderRadius="300"
                      helpText="Search by blog name or description"
                    />**/}
                    <Box
                      padding="400"
                      background="bg-surface-secondary"
                      borderRadius="300"
                      borderWidth="1px"
                      borderStyle="solid"
                      borderColor="border"
                      shadow="low"
                    >
                      <BlockStack gap="300">
                        {blogs.length < 1 ? (
                          <EmptyState
                            heading="Start Your First Blog"
                            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                            imageWidth={200}
                          >
                            <Text variant="bodyMd" color="subdued" alignment="center">
                              Create your first blog and start publishing engaging content for your audience
                            </Text>
                            <Box paddingTop="400">
                              <Button 
                                primary 
                                icon={PlusIcon}
                                onClick={() => onSelectBlog(null)}
                              >
                                Create New Blog
                              </Button>
                            </Box>
                          </EmptyState>
                        ) : (
                          <BlockStack gap="300">
                            <Text variant="headingSm" as="h3">Your Blogs</Text>
                            <Grid columns={4} gap="300">
                              {blogs
                                .filter(blog => blog.blogName !== "new blog")
                                .map((blog) => (
                                  <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 6, xl: 6}}>
                                   <Button
                                      key={blog.blogId}
                                      variant={selectedBlog === blog.blogId ? "primary" : "tertiary"}
                                      onClick={() => onSelectBlog(blog.blogId)}
                                      fullWidth
                                    >
                                      <Box padding="200" display="flex" alignItems="center" gap="300">
                                        <Icon source={BlogIcon} />
                                        <BlockStack gap="100">
                                          <Text variant="bodyMd" fontWeight="medium">
                                            {blog.blogName}
                                          </Text>
                                          <Text variant="bodySm" color="subdued">
                                            {blog.articleCount || 0} articles
                                          </Text>
                                        </BlockStack>
                                      </Box>
                                    </Button>
                                  </Grid.Cell>
                                ))}
                            </Grid>
                          </BlockStack>
                        )}
                      </BlockStack>
                    </Box>
                    <Card>
                      <Box padding="400">
                        <BlockStack gap="300" align="center">
                          <Text variant="headingSm" as="h3">Create New Blog</Text>
                          <Text variant="bodyMd" color="subdued" alignment="center">
                            Start fresh with a new blog for your content
                          </Text>
                          <Button
                            variant={selectedBlog === null ? "primary" : "secondary"}
                            onClick={() => onSelectBlog(null)}
                            icon={PlusIcon}
                            tone={selectedBlog === null ? "success" : undefined}
                            size="large"
                          >
                            Create New Blog
                          </Button>
                        </BlockStack>
                      </Box>
                    </Card>
                  </BlockStack>
                </Box>
              )}
              <Box>
                <BlockStack gap="300">
                  <BlockStack>
                    <InlineStack gap="400" align="start">
                      <LinkIcon className="w-5 h-5 text-primary" />
                      <Text variant="headingMd" as="h3" className="flex items-center gap-2">
                        Reference URLs
                      </Text>
                    </InlineStack>
                    <Text variant="bodyMd" color="subdued">
                      Add up to 4 URLs for AI to analyze and incorporate insights
                    </Text>
                  </BlockStack>
                  <BlockStack gap="300">
                    {urls.map((url, index) => (
                      <TextField 
                        key={index}
                        prefix={<Icon source={LinkIcon} />}
                        maxLength={250}
                        placeholder="https://" 
                        helpText={`Reference URL ${index + 1}`}
                        onChange={(value) => onUrlChange?.(index, value)}
                        value={url}
                        error={errors.urls?.[index]}
                      />
                    ))}
                  </BlockStack>
                  <Button 
                    icon={PlusIcon} 
                    onClick={onAddUrl}
                    disabled={urls.length >= 4}
                    size="slim"
                  >
                    Add URL
                  </Button>
                </BlockStack>
              </Box>
              <Box>     
                <BlockStack gap="300">
                  <BlockStack>
                    <InlineStack gap="300" align="start">
                      <ImageIcon className="w-5 h-5 text-primary" />
                      <Text variant="headingMd" as="h3" className="flex items-center gap-2">
                        Image Inclusions
                      </Text>
                    </InlineStack>
                    <Text variant="bodyMd" color="subdued">
                      Select image inclusion options
                    </Text>
                  </BlockStack>
                  <ImageInclusionChoiceList 
                    isImportImageAvailable={isImportImageAvailable}
                    selectedImage={selectedImage}
                    onSelectImage={onSelectImage}
                  />
                </BlockStack>
              </Box>
              <Box>
                <BlockStack gap="400">
                  <BlockStack>
                    <InlineStack gap="300" align="start">
                      <LayoutSectionIcon className="w-5 h-5 text-primary" />
                      <Text variant="headingMd" as="h3" className="flex items-center gap-2">
                        Section Inclusions
                      </Text>
                    </InlineStack>
                    <Text variant="bodyMd" color="subdued">
                      Choose how many sections to include
                    </Text>
                  </BlockStack>
                  <Checkbox
                    label="Include Subtitles"
                    checked={subtitleChecked}
                    onChange={onSubtitleCheckedChange}
                  />
                  {subtitleChecked && (
                    <BlockStack gap="300">
                      <InlineStack align="space-between">
                        <Text variant="headingMd" as="h3">Add up to 4 sections for your content</Text>
                        <ButtonGroup segmented>
                          {[1, 2, 3, 4].map((num) => (
                            <Button
                              key={num}
                              pressed={subtitleQuantity === num}
                              onClick={() => onSubtitleQuantityChange(num)}
                              size="slim"
                            >
                              {num}
                            </Button>
                          ))}
                        </ButtonGroup>
                      </InlineStack>
                      {subtitleQuantity > 0 && (
                        <BlockStack gap="300">
                          {Array.from({ length: subtitleQuantity }).map((_, index) => (
                            <TextField 
                              key={index}
                              maxLength={250}
                              placeholder={`Subtitle for section ${index + 1}`}
                              helpText={`Provide title for section ${index + 1} (optional)`}
                              onChange={(value) => onSubtitlePromptChange(index, value)}
                              value={subtitlePrompts[index] || ''}
                              error={errors.subtitlePrompts?.[index]}
                            />
                          ))}
                        </BlockStack>
                      )}
                    </BlockStack>
                  )}
                </BlockStack>
              </Box>
              <Box>
                <BlockStack gap="300">
                  <BlockStack>
                    <InlineStack gap="300" align="start">
                      <Waves className="w-5 h-5 text-primary" />
                      <Text variant="headingMd" as="h3" className="flex items-center gap-2">
                        Content Length
                      </Text>
                    </InlineStack>
                    <Text variant="bodyMd" color="subdued">
                      Select Length of Content
                    </Text>
                  </BlockStack>
                  <ButtonGroup fullWidth>
                    {lengthOptions.map((option) => (
                      <Button
                        key={option.key}
                        pressed={selectedLength === option.value}
                        onClick={() => onSelectLength(option.value)}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </ButtonGroup>
                </BlockStack>
              </Box>
              <Box paddingBlockEnd="400" />
              <ContentStatusBanner
                showProcessingStatus={showProcessingStatus}
                isDataProcessing={processing}
                dataProgress={dataProgress}
                processedInputData={processedInputData}
                showConversionStatus={showConversionStatus}
                isContentGenerating={generating}
                generateProgress={generateProgress}
                localContentData={localContentData}
                error={error}
                setError={setError}
              />
              <Button 
                variant="primary"
                tone="success"
                onClick={onFormSubmit}
                loading={generating || processing}
                disabled={generating || processing}
                fullWidth
                size="large"
              >
                {generating || processing ? 'Generating Content...' : 'Generate Content'}
              </Button>
            </BlockStack>
          </Box>
        </Card>
      </Box>
      {toastMarkup}
      {isModalOpen && (
        <TemplateDetailsModal
          content={{}}
          contentType={template.category}
          open={isModalOpen}
          onClose={handleCloseModal}
          onView={handleView}
          onSelect={handleSelect}
        />
      )}
    </Frame>
  )
});

const URLComponent = memo(({
  prompt,
  urls,
  onPromptChange,
  onUrlChange,
  onAddUrl,
  onFormSubmit,
  onResetForm,
  templateOptions,
}: BaseFormProps) => (
  <Box>
    <Box paddingBlockEnd="200" />
    <Divider borderColor="border" />
    <Box paddingBlockEnd="500" />
    <Box paddingInlineStart="300">
      <Text>Direct URL</Text>
      <Box paddingBlockEnd="300" />
      <Box width="60%">
        <TextField 
          value={urls[0] || ""}
          onChange={(value) => onUrlChange?.(0, value)}
          placeholder="Import your direct link here"
          helpText="AI will automatically process your content."
          clearButton
          onClearButtonClick={() => onUrlChange?.(0, "")}
        />
      </Box>
      <Box paddingBlockEnd="300" />
      <Button 
        onClick={onFormSubmit}
        disabled={!urls[0]?.trim()}
      >
        Convert
      </Button>
    </Box>
  </Box>
));

export enum FormType {
  LIGHT = 'light',
  FULL = 'full',
  URL = 'url'
}

interface FormProviderProps extends BaseFormProps {
  formId: FormType;
}

export const FormProvider: React.FC<FormProviderProps> = memo(({ formId, ...props }) => {
  const renderForm = useCallback(() => {
    switch (formId) {
      case FormType.LIGHT:
        return <LightVersionForm {...props} />;
      case FormType.FULL:
        return <FullVersionForm {...props} />;
      case FormType.URL:
        return <URLComponent {...props} />;
      default:
        return null;
    }
  }, [formId, props]);

  return renderForm();
});

export const Forms = {
  Light: LightVersionForm,
  Full: FullVersionForm,
  URL: URLComponent,
};
