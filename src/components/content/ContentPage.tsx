'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Page,
  Layout,
  Card,
  ResourceList,
  Filters,
  Button,
  ChoiceList,
  EmptyState,
  Loading,
  Text,
  Pagination,
  BlockStack,
  Frame,
} from '@shopify/polaris';
import { useAppBridge } from '@/providers/AppBridgeProvider';
import { Redirect } from '@shopify/app-bridge/actions';
import { Content } from '@/types/content';
import { ContentCard } from './ContentCard';
import { ContentDetailsModal } from './ContentDetailsModal';
import LoadingScreen from '@/components/LoadingScreen';
import { getUserContentHistory } from "@/actions/content";
import { AppSession } from '@/types/auth';
import { useRouter, useSearchParams } from 'next/navigation';

interface ContentHistoryPageProps {
  session: AppSession;
}

export default function ContentHistoryPage({ session }: ContentHistoryPageProps) {
  const [contents, setContents] = useState<Content[]>([]);
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queryValue, setQueryValue] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const { app } = useAppBridge();
  const redirect = app && Redirect.create(app);
  const searchParams = useSearchParams();
  const host = searchParams?.get('host') || '';
  const shop = searchParams?.get('shop') || session.shopName;    

   const fetchContentHistory = useCallback(async () => {
    if (!session.shopName) return;
    try {
      setIsLoading(true);
      setError(null);
      const result = await getUserContentHistory(session.shopName, 1, 10);
      setContents(result.data.contents || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch usage data');
    } finally {
      setIsLoading(false);
    }
  }, [session?.shopName]);

  useEffect(() => {
    fetchContentHistory();
  }, [fetchContentHistory]);

  const handleFiltersChange = useCallback(
    (filters: any) => {
      setSelectedStatus(filters.status || []);
      setSelectedTypes(filters.type || []);
    },
    [],
  );

  const handleQueryChange = useCallback(
    (value: string) => setQueryValue(value),
    [],
  );

  const handleQueryClear = useCallback(() => setQueryValue(''), []);

  const filters = [
    {
      key: 'status',
      label: 'Status',
      filter: (
        <ChoiceList
          title="Status"
          allowMultiple
          choices={[
            {value: 'PUBLISHED', label: 'Published'},
            {value: 'DRAFT', label: 'Draft'},
            {value: 'ARCHIVED', label: 'Archived'},
          ]}
          selected={selectedStatus}
          onChange={(value) => setSelectedStatus(value)}
        />
      ),
    },
    {
      key: 'type',
      label: 'Type',
      filter: (
        <ChoiceList
          title="Type"
          allowMultiple
          choices={[
            {value: 'TEXT', label: 'Text'},
            {value: 'IMAGE', label: 'Image'},
            {value: 'VIDEO', label: 'Video'},
            {value: 'AUDIO', label: 'Audio'},
            {value: 'DOCUMENT', label: 'Document'},
          ]}
          selected={selectedTypes}
          onChange={(value) => setSelectedTypes(value)}
        />
      ),
    },
  ];

  const handleEdit = (content: Content) => {
    // Implement edit logic
    console.log('Edit content:', content);
  };

  const handleDelete = async (content: Content) => {
    // Implement delete logic
    console.log('Delete content:', content);
  };

  const handleView = (content: Content) => {
    setSelectedContent(content);
    setIsModalOpen(true);
  };

  const handleNavigation = useCallback(() => {
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
  }, [searchParams, redirect, shop, host]);

  if (isLoading) {
    return (
      <LoadingScreen />
    );
  }

  const emptyStateMarkup = (
    <EmptyState
      heading="Manage your content"
      action={{content: 'Create new content', onAction: () => {}}}
      image="/empty-state-illustration.svg"
    >
      <p>Create and manage your content all in one place.</p>
    </EmptyState>
  );

  return (
    <Frame>
      <Page
       backAction={{
          content: 'Back To Homepage',
          onAction: handleNavigation,
        }}
        title={
          <Text variant="headingXl" as="h4">Content History</Text>
        }
        subtitle={
          <Text variant="headingMd" as="h4">
            All your published content is showing here.
          </Text>
        }
        compactTitle
        primaryAction={
          <Button primary url="/content/new">
            Create new content
          </Button>
        }
        fullWidth
      >
        <Layout>
          <Layout.Section>
            <Card>
              <ResourceList
                resourceName={{singular: 'content', plural: 'contents'}}
                filterControl={
                  <Filters
                    queryValue={queryValue}
                    filters={filters}
                    onQueryChange={handleQueryChange}
                    onQueryClear={handleQueryClear}
                    onClearAll={() => {
                      handleQueryClear();
                      setSelectedStatus([]);
                      setSelectedTypes([]);
                    }}
                  />
                }
                emptyState={emptyStateMarkup}
                items={contents}
                renderItem={(content) => (
                  <ResourceList.Item id={content.id}>
                    <ContentCard
                      content={content}
                      onView={handleView}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  </ResourceList.Item>
                )}
              />
            </Card>
          </Layout.Section>

          <Layout.Section>
            <BlockStack inlineAlign="center">
              <Pagination
                hasPrevious
                onPrevious={() => {}}
                hasNext
                onNext={() => {}}
              />
            </BlockStack>
          </Layout.Section>
        </Layout>

        <ContentDetailsModal
          content={selectedContent}
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </Page>
    </Frame>
  );
}