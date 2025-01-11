"use client"

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  InlineStack,
  Box,
  Button,
  BlockStack,
  Tooltip
} from '@shopify/polaris';
import { useGeneralContext, useGeneralActions } from "@/context/GeneralContextProvider";
import { useRouter, useSearchParams } from 'next/navigation';
import { ContentDisplaySkeleton } from '@/components/content/ContentDisplaySkeleton';
import { motion } from "framer-motion";
import { Sparkles } from 'lucide-react';
import { Grid } from "@mui/material";
import { ContentCategory } from '@/types/content';
import { withAuthWrapper } from "@/providers/SessionProvider";
import { useAppBridge } from '@/providers/AppBridgeProvider';
import { Redirect } from '@shopify/app-bridge/actions';
import { TEMPLATE_OPTIONS } from '@/constants/template';
import TemplateRenderedView from '@/components/content/TemplateRenderedView';
import { useAppDispatch, useAppSelector } from '@/hooks/useLocalStore';
import { PlusIcon, XIcon, ViewIcon, HeartIcon, HomeIcon, OrderIcon, ProductIcon } from '@shopify/polaris-icons';
import { useShopifySubmit } from '@/hooks/useShopifySubmit'; 
import { 
  addToFavorites, 
  removeFromFavorites, 
  createList, 
  updateList,
  addItemToList, 
  removeItemFromList,
  selectFavorites,
  selectTemplatesList,
  selectTemplates,
  createTemplates,
  updateTemplates,
} from '@/stores/features/templateSlice';

interface BaseProps {
  appSession: AppSession;
}

interface ContentTemplatePageProps extends BaseProps {
  params: {
    templateId: string;
  };
}

interface ContentOutput {
  [key: string]: any;
}

const ContentTemplatePage = ({ params, appSession }: ContentTemplatePageProps) => {
  const { shopName, shopifyOfflineAccessToken: accessToken, shopifyUserId: userId } = appSession;
  const searchParams = useSearchParams();
  const shop = searchParams?.get("shop") || "";
  const host = searchParams?.get("host") || "";
  const dispatch = useAppDispatch();
  const { app } = useAppBridge();
  const redirect = app && Redirect.create(app);
  const { state } = useGeneralContext();
  const storedTemplates = useAppSelector(selectTemplates);
  const templateItems = useAppSelector(selectTemplatesList);
  const { 
    setIsLoading, 
    setError, 
    setAiErrors, 
    setIsSidebarOpened, 
    setIsPreviewed, 
    setIsFullScreen, 
    setOutputContent, 
    setIsEditFullScreen, 
    setBodyHtml 
  } = useGeneralActions();
  
  const { 
    isLoading, 
    error, 
    aiErrors, 
    isSidebarOpened, 
    isEditFullScreen, 
    isPreviewed, 
    isFullScreen, 
    outputContent 
  } = state;
  const { loading, onCancelAction } = useShopifySubmit({ shopName, accessToken });
  const [template, setTemplate] = useState<any>(undefined);
  const templateId = useMemo(() => params?.templateId, [params?.templateId]);

  const onNavigateBack = useCallback(() => {
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

  useEffect(() => {
    const allTemplates = Object.values(storedTemplates).flat();
    const foundTemplate = allTemplates.find(template => template.id === templateId);
    setTemplate(foundTemplate);
  }, [templateId, storedTemplates]);

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

  const handleToggleFavorite = useCallback((template: EnhancedTemplateOption) => {
    const updatedTemplates = storedTemplates[template.category].map((item) =>
      item.id === template.id
        ? { ...item, isFavorite: !item.isFavorite }
        : item
    );
    dispatch(updateTemplates({
      type: template.category,
      items: updatedTemplates
    }));
  }, [dispatch, storedTemplates]);

  const handleView = useCallback((template: Content) => {
    if (!shop || !host || !redirect) {
      console.error('Missing required navigation parameters');
      return;
    }
    const queryParams = new URLSearchParams({ shop, host }).toString();
    const returnUrl = `/template/${template.id}?${queryParams}`;
    redirect.dispatch(Redirect.Action.APP, { path: returnUrl });
  }, [redirect, shop, host]);

  const sortedTemplates = useMemo(() => {
    const flattenedTemplates = [
      ...(storedTemplates.blog || []),
      ...(storedTemplates.article || []),
      ...(storedTemplates.product || []),
    ];
    return flattenedTemplates.sort((a, b) => 
      (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0)
    );
  }, [storedTemplates]);
  const onFullscreenToggle = () => {
    setIsFullScreen(!isFullScreen);
  };

  const handleCancelAction = () => {
    onCancelAction();
  };

  const handleSaveAction = () => {
    console.log('Save action triggered');
  };

  if (template === undefined || isLoading) {
    return <ContentDisplaySkeleton />;
  }

  if (!template) {
    return (
      <div className="p-4">
        Content not found
      </div>
    );
  }

  return (
    <motion.div initial="hidden" animate="visible" className="mt-4">
      <Grid container spacing={2}>
          <Grid item xs={12}>
            <motion.div
              initial={{ x: isFullScreen ? 100 : 0, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 100, damping: 15 }}
            >
              <TemplateRenderedView 
                content={template} 
                contentType={template?.category?.toUpperCase()}
                onToggleFullScreen={onFullscreenToggle} 
                onOpenEditMode={onNavigateBack}
                isPreviewedMode={false}
              />
            </motion.div>
          </Grid>
      </Grid>

      <Box paddingBlockEnd="500" />
      <Box paddingBlockStart="300">
        <InlineStack align="space-between" blockAlign="center" gap="500">
          <div style={{ display: 'flex', gap: '8px' }}>
            <Tooltip content="View Details">
              <Button 
                icon={ViewIcon} 
                variant="secondary" 
                size="slim"
                onClick={() => handleContentAction('view', template)}
              />
            </Tooltip>
            <Tooltip content="Add to List">
              <Button 
                icon={PlusIcon} 
                variant="secondary" 
                size="slim"
                onClick={() => handleContentAction('list', template)}
              />
            </Tooltip>
            <Tooltip content={template?.isFavorite ? "Remove from Favorites" : "Add to Favorites"}>
              <Button 
                icon={HeartIcon} 
                variant={template?.isFavorite ? "primary" : "secondary"} 
                size="slim"
                onClick={() => handleContentAction('favorite', template)}
              />
            </Tooltip>
          </div>
        </InlineStack>
      </Box>
    </motion.div>
  );
};

ContentTemplatePage.displayName = 'ContentTemplatePage';

export default withAuthWrapper(ContentTemplatePage);