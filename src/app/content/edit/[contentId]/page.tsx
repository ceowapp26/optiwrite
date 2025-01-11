"use client";

import React, { useMemo, useCallback, useEffect, useState, memo } from "react";
import { Modal, Button, ButtonGroup, BlockStack, EmptyState, List, Box, InlineStack, Tabs, Text, Card, Page, Frame, Icon, Layout, Banner, Badge, Divider } from '@shopify/polaris';
import { Toaster, toast } from 'sonner';
import { MoonIcon, SunIcon, EditIcon, ViewIcon, ArrowLeftIcon, ExternalIcon, CreditCardIcon, TextInColumnsIcon, LayoutColumns2Icon } from '@shopify/polaris-icons';
import { useGeneralContext, useGeneralActions } from "@/context/GeneralContextProvider";
import { withAuthWrapper } from "@/providers/SessionProvider";
import { ContentDisplaySkeleton } from "@/components/content/ContentDisplaySkeleton";
import { useShopifyAI } from "@/hooks/useShopifyAI";
import { useAppDispatch, useAppSelector } from "@/hooks/useLocalStore";
import { useShopifySubmit } from '@/hooks/useShopifySubmit';
import { getContentData, updateContentData, updateBodyContent } from "@/stores/features/contentSlice";
import styled from 'styled-components';
import FormProvider from "@/components/forms/content/FormProvider";
import { useAppBridge } from '@/providers/AppBridgeProvider';
import { Redirect } from '@shopify/app-bridge/actions';
import { Grid } from "@mui/material";
import { type AppSession } from '@/types/auth';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { ShopApiService } from '@/utils/api';
import { useRouter, useSearchParams } from 'next/navigation';
import { ContentCategory } from "@/types/content";
import CarouselContentHistory from "@/components/content/CarouselContentHistory";
import ProductForm from "@/components/forms/content/ProductForm";
import BlogForm from "@/components/forms/content/BlogForm";
import ArticleForm from '@/components/forms/content/ArticleForm';
import NotificationBell from '@/components/NotificationBell';
import ButtonHandler from '@/components/forms/content/ButtonHandler';
import ContentRenderedView from "@/components/content/ContentRenderedView";
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

interface BaseProps {
  appSession: AppSession;
}

interface ContentEditPageProps extends BaseProps {
  params: {
    contentId: string;
  };
}

const ContentEditPage = ({ params, appSession }: ContentEditPageProps) => {
  const { setTheme: setNextTheme } = useTheme();
  const { shopName, shopifyOfflineAccessToken: accessToken, shopifyUserId: userId } = appSession;
  const dispatch = useAppDispatch();
  const { app } = useAppBridge();
  const redirect = app && Redirect.create(app);
  const searchParams = useSearchParams();
  const { state } = useGeneralContext();
  const {
    setTheme,
    setIsLoading,
    setError,
  } = useGeneralActions();
  const { loading, onCancelAction } = useShopifySubmit({ shopName, accessToken });
  const { theme, isLoading } = state;
  const contentId = useMemo(() => params?.contentId, [params?.contentId]);
  const content = useAppSelector((state) => getContentData(contentId)(state));
  const { handleShopifyAI } = useShopifyAI({
    error: state.error,
    setError,
    isLoading,
    setIsLoading,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalError, setModalError] = useState('');
  const [isPreviewFullScreen, setIsPreviewFullScreen] = useState<boolean>(false);
  const [isEditFullScreen, setIsEditFullScreen] = useState<boolean>(false);
  const [selectedTab, setSelectedTab] = useState(0);
  const [layoutMode, setLayoutMode] = useState<'tabs' | 'grid'>('tabs');

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
    const returnUrl = `/shops/shop=${shop}?${queryParams}`; 
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

  const onBodyContentUpdate = (value: string) => {
    dispatch(updateBodyContent(value));
  };

  const onPreviewFullscreenToggle = () => {
    setIsPreviewFullScreen(prev => !prev);
  };

  const onEditFullscreenToggle = () => {
    setIsEditFullScreen(prev => !prev);
  };

  const handleSubmitWithErrorHandling = async (submitType: string, data: any) => {
    try {
      await onManualSubmit(submitType, data);
      setIsModalOpen(false);
    } catch (error: any) {
      setModalError(error?.message || 'An unexpected error occurred');
      setIsModalOpen(true);
    }
  };

  const onContentChange = (values: Partial<typeof content>) => {
    dispatch(updateContentData(values));
  };
  
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

  const memoizedProps = useMemo(
    () => ({
      contentId,
      content,
      onContentChange,
      onBodyContentUpdate,
      handleShopifyAI,
      shopName,
      accessToken,
      isFullScreen: isEditFullScreen,
      toogleFullScreen: onEditFullscreenToggle,
      userId,
    }),
    [
      contentId, 
      content, 
      appSession, 
      shopName, 
      userId, 
      accessToken, 
      onContentChange, 
      onBodyContentUpdate, 
      handleShopifyAI,
      isEditFullScreen,
      onEditFullscreenToggle
    ]
  );

  const generateDisplayForm = (category: ContentCategory | undefined) => {
    if (!category || !shopName || !accessToken || !userId)
      return null;
    switch (category) {
      case ContentCategory.BLOG:
        return <BlogForm {...memoizedProps} />;
      case ContentCategory.ARTICLE:
        return <ArticleForm {...memoizedProps} />;
      case ContentCategory.PRODUCT:
        return <ProductForm {...memoizedProps} />;
      default:
        throw new Error("Unsupported category: " + category);
    }
  };

  const renderButtons = useMemo(() => {
    if (!content) return null;
    return (
      <Box width="100%" paddingBlock="500">
        {selectedTab === 0 ? (
          <ButtonGroup gap="loose" fullWidth>
            <ButtonHandler 
              id={`PUBLISH_${content?.input?.category}`}
              text="PUBLISH" 
              onClickOrType="submit" 
              submitType={`PUBLISH_${content?.input?.category}`}
              isDisabled={loading} 
            />
            <ButtonHandler 
              id="CANCEL"
              onClickOrType={onCancelAction}
              text="CANCEL"
            />
          </ButtonGroup>
        ) : (
          <ButtonGroup gap="loose" fullWidth>
            <Button
              id="PUBLISH_SEO"
              variant="primary" 
              onClick={() => handleSubmitWithErrorHandling(`PUBLISH_${content?.input?.category}`, content)}
              loading={loading}
              disabled={loading} 
            >
              PUBLISH
            </Button>
            <Button
              id="CANCEL"
              variant="secondary" 
              onClick={onCancelAction}
            >
              CANCEL
            </Button>
          </ButtonGroup>
        )}
      </Box>
    );
  }, [loading, onCancelAction, content, selectedTab]);

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
          <ContentRenderedView 
            content={content} 
            contentType={content?.input?.category}
            onToggleFullScreen={onPreviewFullscreenToggle} 
            onOpenEditMode={onNavigateBack}
            isPreviewedMode={false}
            isFullScreen={isPreviewFullScreen}
            layoutMode={layoutMode}
          />
        </React.Fragment>
      ),
    }
  ];

 if (content === undefined) {
    return <ContentDisplaySkeleton />;
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
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
                    <ContentRenderedView 
                      content={content} 
                      contentType={content?.input?.category}
                      onToggleFullScreen={onPreviewFullscreenToggle} 
                      onOpenEditMode={onNavigateBack}
                      isPreviewedMode={false}
                      isFullScreen={isPreviewFullScreen}
                    />
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
                <motion.div {...slideAnimation}>
                  {generateDisplayForm(content?.input?.category)}
                </motion.div>
              </Grid>
              <Grid item xs={12} md={6}>
                <motion.div {...slideAnimation}>
                  <ContentRenderedView 
                    content={content} 
                    contentType={content?.input?.category}
                    onToggleFullScreen={onPreviewFullscreenToggle} 
                    onOpenEditMode={onNavigateBack}
                    isPreviewedMode={false}
                    isFullScreen={isPreviewFullScreen}
                  />
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
                    {renderButtons}
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


export default memo(withAuthWrapper(ContentEditPage));