"use client"

import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
  InlineStack,
  Box,
} from '@shopify/polaris';
import { useGeneralContext, useGeneralActions } from "@/context/GeneralContextProvider";
import SessionProvider from '@/providers/SessionProvider';
import ContentDisplay from '@/components/content/ContentDisplay';
import Topbar from '@/components/content/Topbar';
import { useRouter, useSearchParams } from 'next/navigation';
import { ContentDisplaySkeleton } from '@/components/content/ContentDisplaySkeleton';
import { useShopifyAI } from "@/hooks/useShopifyAI";
import { subscriptionManager } from '@/actions/content/client';
import { updateContent } from '@/actions/content/server';
import { useShopifySubmit } from '@/hooks/useShopifySubmit';
import { motion } from "framer-motion";
import { Sparkles } from 'lucide-react';
import FormProvider from '@/components/forms/content/FormProvider';
import { Grid, Container } from "@mui/material";
import { ContentCategory } from '@/types/content';
import { withAuthWrapper } from "@/providers/SessionProvider";
import { useAppBridge } from '@/providers/AppBridgeProvider';
import { useFlattenArticles } from '@/hooks/useFlattenArticles';
import { Redirect } from '@shopify/app-bridge/actions';
import ButtonHandler from '@/components/forms/content/ButtonHandler';
import ProductForm from '@/components/forms/content/ProductForm';
import BlogForm from '@/components/forms/content/BlogForm';
import ArticleForm from '@/components/forms/content/ArticleForm';
import ContentRenderedView from '@/components/content/ContentRenderedView';

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

const ContentUpdatePage = ({ params, appSession }: ContentUpdatePageProps) => {
  const { shopName, shopifyOfflineAccessToken: accessToken, shopifyUserId: userId } = appSession;
  const searchParams = useSearchParams();
  const { app } = useAppBridge();
  const redirect = app && Redirect.create(app);
  const { state } = useGeneralContext();
  const { setIsLoading, setError, setAiErrors, setIsSidebarOpened, setIsPreviewed, setIsFullScreen, setOutputContent, setIsEditFullScreen, setBodyHtml } = useGeneralActions();
  const { isLoading, error, aiErrors, isSidebarOpened, isEditFullScreen, isPreviewed, isFullScreen, outputContent } = state;
  const { loading, onCancelAction } = useShopifySubmit({ shopName, accessToken });
  const [content, setContent] = useState<any>(undefined);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isRealtimeEditing, setIsRealtimeEditing] = useState(false);
  const { flattenArticle } = useFlattenArticles();
  const contentId = useMemo(() => params?.contentId, [params?.contentId]);
  const { handleShopifyAI } = useShopifyAI({
    error,
    setError,
    isLoading,
    setIsLoading,
  });

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
    const returnUrl = `/versions/light?${queryParams}`;
    redirect.dispatch(Redirect.Action.APP, {
      path: returnUrl
    });
  }, [searchParams, redirect]);

  const mergeContent = (prevContent: any, updatedContent: any) => {
    if (!updatedContent?.output) {
      console.log('No output in updated content, preserving previous state');
      return prevContent;
    }
    return {
      ...prevContent,
      ...updatedContent.output,
    };
  };

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    subscriptionManager.getEditContent(contentId)
      .then(result => {
        if (!isMounted) return;
        const { success, data, error } = result;
        if (success && data?.input && data?.output) {
          const isArticle = data.input?.category === ContentCategory.ARTICLE;
          const output = isArticle ? flattenArticle(data.output) : data.output;
          setContent({ input: data.input, output });
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
      onUpdate: (updatedContent: Content) => {
        if (!isMounted) return;
        setContent(prevContent => mergeContent(prevContent, updatedContent));
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

  const refetch = async () => {
    try {
      setIsLoading(true);
      const result = await subscriptionManager.getEditContent(contentId);
      if (result.success && result.data?.output) {
        setContent(result.data.output);
      } else {
        throw new Error(result.error || 'No output data available');
      }
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Failed to refetch'));
      console.error('Error refetching content:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRealtimeContentUpdate = async (updates: Partial<Content>) => {
    try {
      const result = await subscriptionManager.updateContentRealtime({
        contentId,
        updates
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

  const handleIntermediateContentUpdate = (updates: any) => {
    setContent(prevContent => mergeContent(prevContent, { output: updates }));
  };

  const onUpdateContent = async (updates: any) => {
    try {
      if (isRealtimeEditing) {
        await handleRealtimeContentUpdate(updates);
      } else {
        handleIntermediateContentUpdate(updates);
      }
    } catch (error) {
      console.error('Error in content update:', error);
      setError(error instanceof Error ? error : new Error('Update failed'));
    }
  };

  const memoizedProps = useMemo(() => ({
    contentId,
    content,
    onContentChange: onUpdateContent,
    handleShopifyAI,
    setBodyHtml,
    isRealtimeEditing,
    setIsRealtimeEditing,
    onContentUpdate: updateContent,
    shopName,
    accessToken,
    userId,
  }), [
    contentId,
    content,
    onUpdateContent,
    handleShopifyAI,
    isRealtimeEditing,
    setIsRealtimeEditing,
    updateContent,
    shopName,
    setBodyHtml,
    accessToken,
    userId
  ]);

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

  if (content === undefined || isLoading) {
    return (
        <ContentDisplaySkeleton />
    );
  }

  if (!content) {
    return (
      <div className="p-4">
        Content not found
      </div>
    );
  }

  const onFullscreenToggle = () => {
    setIsFullScreen(!isFullScreen)
  };

  return (
    <FormProvider
      shopName={shopName}
      accessToken={accessToken}
    >
      <motion.div initial="hidden" animate="visible" className="mt-4">
        <Grid container spacing={2}>
          {isFullScreen ? (
            <Grid item xs={12}>
              <motion.div
                initial={{ x: isFullScreen ? 100 : 0, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 100, damping: 15 }}
              >
                <ContentRenderedView 
                  content={content} 
                  contentType={content?.input?.category}
                  onToggleFullScreen={onFullscreenToggle} 
                  onOpenEditMode={onNavigateBack}
                  isPreviewedMode={false}
                />
              </motion.div>
            </Grid>
          ) : (
            <>
              <Grid item xs={12} md={!isFullScreen ? 6 : 12}>
                <motion.div
                  initial={{ x: !isFullScreen ? 100 : 0, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 100, damping: 15 }}
                >
                  {generateDisplayForm(content?.input?.category)}
                </motion.div>
              </Grid>
              <Grid item xs={12} md={!isFullScreen ? 6 : 12}>
                <motion.div
                  initial={{ x: !isFullScreen ? 100 : 0, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 100, damping: 15 }}
                >
                  <ContentRenderedView 
                    content={content} 
                    contentType={content?.input?.category}
                    onToggleFullScreen={onFullscreenToggle} 
                    onOpenEditMode={onNavigateBack}
                    isPreviewedMode={false}
                  />
                </motion.div>
              </Grid>
            </>
          )}
        </Grid>
        <Box paddingBlockEnd="500" />
        <Box paddingBlockStart="300">
          <InlineStack align="space-between" blockAlign="center" gap="500">
            <ButtonHandler
              text="UPDATE"
              onClickOrType="submit"
              submitType={`UPDATE_${content?.input?.category}`}
              isDisabled={loading}
            />
            <ButtonHandler
              text="CANCEL"
              onClickOrType={onCancelAction}
              isDisabled={loading}
            />
          </InlineStack>
        </Box>
      </motion.div>
    </FormProvider>
  );
};

ContentUpdatePage.displayName = 'ContentUpdatePage';

export default withAuthWrapper(ContentUpdatePage);
