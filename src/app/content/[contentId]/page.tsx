"use client"

import React, { useMemo, useCallback, useEffect, useState, memo } from "react";
import { Toaster, toast } from 'sonner';
import { Modal, Button, ButtonGroup, BlockStack, EmptyState, List, Box, InlineStack, Tabs, Text, Card, Page, Frame, Icon, Layout, Banner, Badge, Divider } from '@shopify/polaris';
import { MoonIcon, SunIcon, EditIcon, ViewIcon, ArrowLeftIcon, ExternalIcon, CreditCardIcon, TextInColumnsIcon, LayoutColumns2Icon } from '@shopify/polaris-icons';
import { useGeneralContext, useGeneralActions } from "@/context/GeneralContextProvider";
import SessionProvider from '@/providers/SessionProvider';
import ContentDisplay from '@/components/content/ContentDisplay';
import Topbar from '@/components/content/Topbar';
import { useRouter, useSearchParams } from 'next/navigation';
import { ContentDisplaySkeleton } from '@/components/content/ContentDisplaySkeleton';
import { useShopifyAI } from "@/hooks/useShopifyAI";
import { subscriptionManager } from '@/actions/content/client';
import { updateContent } from '@/actions/content/server';
import { useFormContext } from 'react-hook-form';
import { useShopifySubmit } from '@/hooks/useShopifySubmit';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import styled from 'styled-components';
import { type AppSession } from '@/types/auth';
import FormProvider from "@/components/forms/content/FormProvider";
import { Grid, Container } from "@mui/material";
import { ContentCategory } from '@/types/content';
import { withAuthWrapper } from "@/providers/SessionProvider";
import { useAppBridge } from '@/providers/AppBridgeProvider';
import { useTheme } from 'next-themes';
import { useFlattenContent } from '@/hooks/useFlattenContent';
import { Redirect } from '@shopify/app-bridge/actions';
import ButtonHandler from '@/components/forms/content/ButtonHandler';
import ProductForm from '@/components/forms/content/ProductForm';
import BlogForm from '@/components/forms/content/BlogForm';
import ArticleForm from '@/components/forms/content/ArticleForm';
import ContentRenderedView from '@/components/content/ContentRenderedView';
import NotificationBell from '@/components/NotificationBell';
import CarouselContentHistory from "@/components/content/CarouselContentHistory";
import { Switch } from '@nextui-org/react';

const StyledPage = styled(motion.div)`
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  margin: ${props => props.$isFullScreen ? '0' : '0 auto'};
`;

const TabPanel = styled(motion.div)`
  background: var(--p-surface);
  border-radius: 0.8rem;
  box-shadow: var(--p-shadow-card);
  overflow: hidden;
`;

const LayoutToggle = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid var(--p-border-subdued);
`;

const LayoutOption = styled(motion.button)<{ $isActive: boolean }>`
  position: absolute;
  left: 100px;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  display: flex;
  background: var(--p-action-primary);
  color: black;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: var(--p-action-primary-hovered);
  }
`;

const GridContainer = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
  padding: 24px;
`;

const fadeAnimation = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.4, ease: "easeOut" }
};

const slideAnimation = {
  initial: { x: -20, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: 20, opacity: 0 },
  transition: { duration: 0.3, ease: "easeInOut" }
};

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

const tabVariants = {
  enter: { opacity: 0, y: 20 },
  center: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

interface FormSubmissionErrorModalProps {
  isModalOpen: boolean;
  handleModalClose: () => void;
  modalError: string;
  validationErrors: string[];
}

const FormSubmissionErrorModal: React.FC<FormSubmissionErrorModalProps> = ({
  isModalOpen,
  handleModalClose,
  modalError,
  validationErrors,
}) => {
  return (
    <Modal
      open={isModalOpen}
      onClose={handleModalClose}
      title="Error Details"
      primaryAction={{
        content: 'Close',
        onAction: handleModalClose,
      }}
    >
      <Modal.Section>
        <BlockStack gap="400">
          <Text variant="bodyMd" as="p" color="critical">
            {modalError}
          </Text>
          {validationErrors && validationErrors.length > 0 && (
            <List type="bullet">
              {validationErrors.map((error, index) => (
                <List.Item key={index}>
                  <Text color="critical">{error}</Text>
                </List.Item>
              ))}
            </List>
          )}
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
};

const RenderButtons = memo(({
  category,
  selectedTab,
  isFormSubmitting,
  onCancelAction,
  handleSubmitWithErrorHandling,
  content,
  handleManualCancel,
}) => {
  if (!content) return null;
  const {
    formState: { isSubmitting },
  } = useFormContext();
  const isLoading = useMemo(() => isSubmitting || isFormSubmitting, [isSubmitting, isFormSubmitting]);
  return (
    <Box width="100%" paddingBlock="500">
      {selectedTab === 0 ? (
        <ButtonGroup gap="loose" fullWidth>
          <ButtonHandler
            id={`UPDATE_${category}`}
            text={`UPDATE ${category}`} 
            onClickOrType="submit" 
            submitType={`UPDATE_${category}`}
            tooltipContent="Publish this product to your Shopify shop."
            loading={isLoading}
          />
          <ButtonHandler
            id="CANCEL"
            tooltipContent="Cancel the publishing process."
            onClickOrType={onCancelAction}
            text="CANCEL"
            loading={isLoading}
          />
        </ButtonGroup>
      ) : (
        <ButtonGroup gap="loose" fullWidth>
          <Button
            id={`UPDATE_${category}`}
            tooltipContent="Publish this product to your Shopify shop."
            variant="primary"
            onClick={() => handleSubmitWithErrorHandling(`UPDATE_${category}`, content)}
            loading={isLoading}
            disabled={isLoading}
          >
            {`UPDATE ${category}`} 
          </Button>
          <Button
            id="CANCEL"
            tooltipContent="Cancel the publishing process."
            variant="secondary"
            onClick={handleManualCancel}
            disabled={!isLoading}
          >
            CANCEL
          </Button>
        </ButtonGroup>
      )}
    </Box>
  );
});

interface BaseProps {
  appSession: AppSession;
}

interface ContentUpdatePageProps extends BaseProps {
  params: {
    contentId: string;
  };
}

interface ContentOutput {
  [key: string]: any;
}

const ContentPage = ({ params, appSession }: ContentUpdatePageProps) => {
  const { setTheme: setNextTheme } = useTheme();
  const { shopName, shopifyOfflineAccessToken: accessToken, shopifyUserId: userId } = appSession;
  const searchParams = useSearchParams();
  const { app } = useAppBridge();
  const redirect = app && Redirect.create(app);
  const { state } = useGeneralContext();
  const { setIsLoading, setError, setTheme } = useGeneralActions();
  const { theme, isLoading, error } = state;
  const { loading, onCancelAction, onManualSubmit } = useShopifySubmit({ shopName, accessToken });
  const [content, setContent] = useState<any>(undefined);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isRealtimeEditing, setIsRealtimeEditing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalError, setModalError] = useState('');
  const [isFormSubmitting, setIsFormSubmitting] = useState<boolean>(false);
  const [isPreviewFullScreen, setIsPreviewFullScreen] = useState<boolean>(false);
  const [isEditFullScreen, setIsEditFullScreen] = useState<boolean>(false);
  const [selectedTab, setSelectedTab] = useState(0);
  const [layoutMode, setLayoutMode] = useState<'tabs' | 'grid'>('tabs');
  const contentId = useMemo(() => params?.contentId, [params?.contentId]);
  const { flattenArticle, flattenBlog, flattenProduct } = useFlattenContent();
  const { handleShopifyAI } = useShopifyAI({
    error,
    setError,
    isLoading,
    setIsLoading,
  });

  const handleTabChange = useCallback(
    (selectedTabIndex: number) => setSelectedTab(selectedTabIndex),
    [],
  );

  const toggleDisplayMode = useCallback(() => {
    setIsGridView(prev => !prev);
  }, []);

  const showToast = useCallback((message: string, status: 'success' | 'error' | 'warning') => {
    toast[status](message, {
      position: 'top-center',
      duration: 5000,
      icon: status === 'success' ? '✨' : undefined,
      style: {
        background: status === 'error' ? '#FEE2E2' : 
                   status === 'warning' ? '#FEF3C7' : 
                   '#ECFDF5',
      }
    });
  }, []);

  const onNavigateBack = useCallback(() => {
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
    const returnUrl = `/content/history?${queryParams}`; 
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

  const onPreviewFullscreenToggle = () => {
    setIsPreviewFullScreen(prev => !prev);
  };

  const onEditFullscreenToggle = () => {
    setIsEditFullScreen(prev => !prev);
  };

  const handleSubmitWithErrorHandling = useCallback(async (submitType: string, data: CONTENT) => {
    if (isFormSubmitting) return;
    try {
      setIsFormSubmitting(true);
      await onManualSubmit(submitType, data);
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred';
      setModalError(errorMessage);
      setIsModalOpen(true);
    } finally {
      setIsFormSubmitting(false);
    }
  }, [onManualSubmit, isFormSubmitting]);

  const handleManualCancel = useCallback(() => {
    onCancelAction();
    setIsFormSubmitting(false);
  }, []);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    subscriptionManager.getEditContent(contentId)
      .then(result => {
        if (!isMounted) return;
        const { success, data, error } = result;
        if (success && data?.input && data?.output) {
          const isArticle = data.input?.category === ContentCategory.ARTICLE;
          const isBlog = data.input?.category === ContentCategory.BLOG;
          const output = isArticle
            ? flattenArticle(data.output)
            : isBlog
            ? flattenBlog(data.output)
            : flattenProduct(data.output);
          setContent({ contentId: data.id || contentId, input: data.input, output });
        } else {
          throw new Error(error || 'No output data available');
        }
      })
      .catch(error => {
        if (!isMounted) return;
        setError(error instanceof Error ? error : new Error('Unknown error'));
        console.error('Error fetching content:', error);
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    const cleanup = subscriptionManager.subscribe(contentId, {
      onUpdate: (updatedContent) => {
        if (!isMounted) return;
        setContent(prevContent => {
          if (!prevContent) return prevContent;
          const isArticle = prevContent.input?.category === ContentCategory.ARTICLE;
          const isBlog = prevContent.input?.category === ContentCategory.BLOG;
          const newOutput = isArticle
            ? flattenArticle(updatedContent?.output)
            : isBlog
            ? flattenBlog(updatedContent?.output)
            : flattenProduct(updatedContent?.output);
          return {
            ...prevContent,
            output: {
              ...prevContent.output,
              ...newOutput
            }
          };
        });
      },
      onError: (error) => {
        if (!isMounted) return;
        const formattedError = error instanceof Error 
          ? error 
          : new Error('Subscription error');
        setError(formattedError);
        setIsSubscribed(false);
        console.error('Subscription error:', error);
      },
      onSubscribed: () => {
        if (!isMounted) return;
        setIsSubscribed(true);
        setError(null);
        console.log('Successfully subscribed to updates');
      }
    });

    return () => {
      isMounted = false;
      cleanup();
    };
  }, [contentId]);

  const handleRealtimeContentUpdate = async (updates: Partial<FlattenedArticle> | any) => {
    try {
      let finalUpdates = updates;
      if (content?.input?.category === ContentCategory.ARTICLE || 
          content?.input?.category === ContentCategory.BLOG) {
        finalUpdates = transformUpdates(updates);
      }
      const result = await subscriptionManager.updateContentRealtime({
        contentId,
        updates: finalUpdates
      });
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    } catch (error) {
      console.error('Error updating content:', error);
      throw error;
    }
  };

  const transformUpdates = useCallback((updates: Partial<FlattenedArticle>): Partial<Article> => {
    const transformed: Partial<Article> = {};
    let metafields: Metafield[] | undefined;
    Object.entries(updates).forEach(([key, value]) => {
      if (key.startsWith('article_')) {
        const newKey = key.replace('article_', '');
        transformed[newKey] = value;
      } else if (key.startsWith('blog_')) {
        const newKey = key.replace('blog_', '');
        transformed[newKey] = value;
      } else {
        transformed[key] = value;
      }
    });
    if (metafields) {
      transformed.metafield = metafields;
    }
    return transformed;
  }, []);

  const onUpdateContent = useCallback(async (updates: Partial<FlattenedArticle> | any) => {
    try {
      await handleRealtimeContentUpdate(updates);
    } catch (error) {
      console.error("Error in content update:", error);
      setError(error instanceof Error ? error : new Error("Update failed"));
    }
  }, [handleRealtimeContentUpdate]);

  const onBodyContentUpdate = useCallback(async (value: string) => {
    try {
      const updates = content?.input?.category === ContentCategory.ARTICLE || 
                      content?.input?.category === ContentCategory.BLOG
        ? { article_body_html: value }
        : { body_html: value };
      await handleRealtimeContentUpdate(updates);
    } catch (error) {
      console.error("Error updating content:", error);
      setError(error instanceof Error ? error : new Error("Failed to update content"));
    }
  }, [content?.input?.category, handleRealtimeContentUpdate]);

  const onUpdateTitle = useCallback(async (value: string) => {
    try {
      const updates = content?.input?.category === ContentCategory.ARTICLE || 
                      content?.input?.category === ContentCategory.BLOG
        ? { article_title: value }
        : { title: value };
      await handleRealtimeContentUpdate(updates);
    } catch (error) {
      console.error("Error updating content:", error);
      setError(error instanceof Error ? error : new Error("Failed to update content"));
    }
  }, [content?.input?.category, handleRealtimeContentUpdate]);

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

  const memoizedFormProps = useMemo(() => ({
    contentId,
    content,
    onContentChange: onUpdateContent,
    onBodyContentUpdate,
    onUpdateTitle,
    handleShopifyAI,
    shopName,
    accessToken,
    isFullScreen: isEditFullScreen,
    toogleFullScreen: onEditFullscreenToggle,
    userId,
    isUpdate: true
  }), [
    contentId,
    content,
    onBodyContentUpdate,
    onUpdateContent,
    onUpdateTitle,
    appSession, 
    shopName, 
    userId, 
    accessToken, 
    handleShopifyAI,
    isEditFullScreen,
    onEditFullscreenToggle
  ]);

 const memoizedRenderProps = useMemo(() => ({
    content,
    contentType: content?.input?.category,
    onToggleFullScreen: onPreviewFullscreenToggle,
    onOpenEditMode: onNavigateBack,
    isPreviewedMode: false,
    isFullScreen: isPreviewFullScreen,
    layoutMode,
  }), [
    content,
    onPreviewFullscreenToggle,
    onNavigateBack,
    isPreviewFullScreen,
    layoutMode
  ]);

  const generateDisplayForm = (category: ContentCategory | undefined) => {
    if (!category || !shopName || !accessToken || !userId)
      return null;
    switch (category) {
      case ContentCategory.BLOG:
        return <BlogForm {...memoizedFormProps} />;
      case ContentCategory.ARTICLE:
        return <ArticleForm {...memoizedFormProps} />;
      case ContentCategory.PRODUCT:
        return <ProductForm {...memoizedFormProps} />;
      default:
        throw new Error("Unsupported category: " + category);
    }
  };

  const tabs = [
    {
      id: 'edit',
      content: 'Edit',
      icon: EditIcon,
      component: (
        <React.Fragment>
          {generateDisplayForm(content?.input?.category)}
        </React.Fragment>
      ),
    },
    {
      id: 'preview',
      content: 'Preview',
      icon: ViewIcon,
      component: (
        <React.Fragment>
          <ContentRenderedView {...memoizedRenderProps} />
        </React.Fragment>
      ),
    }
  ];

 if (content === undefined) {
    return <ContentDisplaySkeleton />;
  }

  if (!content) {
    return (
      <Page fullWidth>
        <Card>
          <EmptyState
            heading="content not found"
            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          >
            <BlockStack gap="600">
              <Text variant="bodyMd" as="h3">
                This content may have been removed or is temporarily unavailable.
              </Text>
              <Button 
                variant="primary"
                onClick={() => onNavigateBack()}
                icon={ArrowLeftIcon}
              >
                Go back
              </Button>
            </BlockStack>
          </EmptyState>
        </Card>
      </Page>
    );
  }
  
  const LayoutToggleComponent = () => {
    const isTabsMode = layoutMode === 'tabs';
    return (
      <LayoutToggle>
        <Text variant="headingSm">Layout:</Text>
        <LayoutOption
          $isActive={isTabsMode}
          onClick={() => setLayoutMode(isTabsMode ? 'grid' : 'tabs')}
          whileTap={{ scale: 0.95 }}
        >
          {isTabsMode ? (
            <>
              <Icon source={LayoutColumns2Icon} />
              Grid
            </>
          ) : (
            <>
              <Icon source={TextInColumnsIcon} />
              Tabs
            </>
          )}
        </LayoutOption>
      </LayoutToggle>
    );
  };

  const renderContent = () => {
    if (layoutMode === 'tabs') {
      return (
        <motion.div {...fadeAnimation}>
          <div className="px-6">
            <Tabs
              selected={selectedTab}
              onSelect={handleTabChange}
              tabs={tabs.map(({ id, content, icon }) => ({
                id,
                content: (
                  <InlineStack gap="200" align="center">
                    <Icon source={icon} />
                    <Text>{content}</Text>
                  </InlineStack>
                ),
              }))}
              fitted
            />
            <AnimatePresence mode="wait">
              <TabPanel
                key={selectedTab}
                {...slideAnimation}
              >
                {tabs[selectedTab].component}
              </TabPanel>
            </AnimatePresence>
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div 
        initial="hidden" 
        animate="visible" 
        variants={fadeAnimation}
        className="mt-4"
      >
        <Grid container spacing={2}>
          {isPreviewFullScreen || isEditFullScreen ? (
            <>
              {isPreviewFullScreen && (
                <Grid item xs={12}>
                  <motion.div {...slideAnimation}>
                    <ContentRenderedView {...memoizedRenderProps} />
                  </motion.div>
                </Grid>
              )}
              {isEditFullScreen && (
                <Grid item xs={12}>
                  <motion.div {...slideAnimation}>
                    {generateDisplayForm(content?.input?.category)}
                  </motion.div>
                </Grid>
              )}
            </>
          ) : (
            <>
              <Grid item xs={12} md={6}>
                <motion.div className="flex flex-col h-full max-h-screen overflow-y-auto" {...slideAnimation}>
                  {generateDisplayForm(content?.input?.category)}
                </motion.div>
              </Grid>
              <Grid item xs={12} md={6}>
                <motion.div className="flex flex-col h-full max-h-screen overflow-y-auto" {...slideAnimation}>
                  <ContentRenderedView {...memoizedRenderProps} />
                </motion.div>
              </Grid>
            </>
          )}
        </Grid>
      </motion.div>
    );
  };

  return (
    <Frame>
      <StyledPage
        $isFullScreen={isEditFullScreen || isPreviewFullScreen}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Page
          fullWidth
          backAction={{
            content: '← Return to Dashboard',
            onAction: onNavigateBack,
          }}
          title={
            <Text variant="headingXl" as="h1">Advanced Content Editor</Text>
          }
          titleMetadata={<Badge tone="success">Premium Feature</Badge>}
          subtitle={
            <Text variant="bodyLg" as="p" color="subdued">
              Craft exceptional content with AI-powered assistance and advanced editing tools
            </Text>
          }
          primaryAction={
            <ThemeToggleButton id="theme-toggle-btn" onClick={toggleTheme} aria-label="Toggle theme">
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
              content: <NotificationBell shopName={shopName} />,
              onAction: () => {},
            },
            {
              content: 'Support Center',
              icon: ExternalIcon,
              onAction: onNavigateToSupport,
            },
            {
              content: 'Upgrade Plan',
              icon: CreditCardIcon,
              onAction: onNavigateToBilling,
            },
          ]}
        >
          <Layout>
            <Layout.Section>
              <BlockStack gap="400">
                <Banner
                  title="Your changes are automatically saved"
                  status="info"
                  tone="emphasis"
                >
                  <Text>All modifications are stored as drafts until you publish them</Text>
                </Banner>
                <FormProvider shopName={shopName} accessToken={accessToken}>
                  <Box className="w-full">
                    <Card>
                      <LayoutToggleComponent />
                      <AnimatePresence mode="wait">
                        {renderContent()}
                      </AnimatePresence>
                    </Card>
                    <Divider />
                    <RenderButtons
                      category={content?.input?.category}
                      content={content}
                      selectedTab={selectedTab}
                      isFormSubmitting={isFormSubmitting}
                      onCancelAction={onCancelAction}
                      handleSubmitWithErrorHandling={handleSubmitWithErrorHandling}
                      handleManualCancel={handleManualCancel}
                    />
                  </Box>
                </FormProvider>
              </BlockStack>
            </Layout.Section>
            <Layout.Section>
              <CarouselContentHistory 
                session={appSession}
              />
            </Layout.Section>
          </Layout>
        </Page>
        <FormSubmissionErrorModal
          isModalOpen={isModalOpen}
          handleModalClose={() => setIsModalOpen(false)}
          modalError={modalError}
          validationErrors={[]}
        />
        <Toaster />
    </StyledPage>
    </Frame>
  );
};

export default memo(withAuthWrapper(ContentPage));

