"use client"
import React, { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import { AppSession } from '@/types/auth';
import {
  Page,
  Layout,
  LegacyCard,
  Frame,
  TextContainer,
  Button,
  BlockStack,
  Text,
  Box,
  MediaCard,
  VideoThumbnail,
  Icon,
  Divider,
  CalloutCard,
  List,
} from "@shopify/polaris";
import {
  CheckCircleIcon,
  EditIcon,
  ChartVerticalFilledIcon,
  BlogIcon,
  ProductCostIcon,
  AutomationIcon,
} from '@shopify/polaris-icons';
import { Redirect } from '@shopify/app-bridge/actions';
import { useAppBridge } from '@/providers/AppBridgeProvider';
import { useRouter, useSearchParams } from 'next/navigation';

interface HomePageProps {
  session: AppSession;
}

function HomePage({ session }: HomePageProps) {
  const { shopifyUserEmail: email, shopName, shopifyOfflineAccessToken: accessToken } = session;
  const { app } = useAppBridge();
  const redirect = app && Redirect.create(app);
  const searchParams = useSearchParams();
  const host = searchParams?.get('host') || '';

  const handleNavigation = useCallback(() => {
    if (!shopName || !host || !redirect) {
      console.error('Missing required navigation parameters');
      return;
    }
    const queryParams = new URLSearchParams({
      shopName,
      host
    }).toString();
    const returnUrl = `/versions/light?${queryParams}`;
    redirect.dispatch(Redirect.Action.APP, {
      path: returnUrl
    });
  }, [searchParams, redirect, shopName, host]);

  return (
    <Frame>
      <Page
        title="AI Content Generator"
        subtitle="Create engaging blog posts, articles, and product descriptions in seconds"
        primaryAction={{
          content: 'Start Creating Content',
          onAction: () => handleNavigation(),
        }}
        fullWidth
      >
        <Layout>
          <Layout.Section>
            <LegacyCard sectioned>
              <BlockStack gap="500">
                <TextContainer spacing="tight">
                  <Text as="h2" variant="headingLg">
                    Transform Your Shopify Store's Content with AI
                  </Text>
                  <Text as="p" variant="bodyLg" color="subdued">
                    Generate high-converting product descriptions, engaging blog posts, and SEO-optimized articles 
                    using advanced AI technology. Save time and boost your store's visibility.
                  </Text>
                </TextContainer>
                <MediaCard
                  title="See AI Content Generation in Action"
                  description="Watch how our AI creates compelling content in seconds"
                  portrait
                  size="medium"
                >
                  <VideoThumbnail
                    videoLength={180}
                    thumbnailUrl="https://cdn.shopify.com/placeholder-image.jpg"
                    onClick={() => handleNavigation()}
                  />
                </MediaCard>
              </BlockStack>
            </LegacyCard>
          </Layout.Section>
          <Layout.Section>
            <BlockStack gap="500">
              <Text as="h3" variant="headingMd">
                Powerful Features to Boost Your Store
              </Text>
              <Layout>
                <Layout.Section oneThird>
                  <LegacyCard sectioned>
                    <BlockStack gap="400">
                      <Icon source={BlogIcon} color="base" />
                      <TextContainer spacing="tight">
                        <Text as="h3" variant="headingMd">Blog Posts & Articles</Text>
                        <Text as="p">Generate engaging blog content that drives traffic and establishes authority</Text>
                      </TextContainer>
                      <Button onClick={() => handleNavigation()}>Try Now</Button>
                    </BlockStack>
                  </LegacyCard>
                </Layout.Section>
                
                <Layout.Section oneThird>
                  <LegacyCard sectioned>
                    <BlockStack gap="400">
                      <Icon source={ProductCostIcon} color="base" />
                      <TextContainer spacing="tight">
                        <Text as="h3" variant="headingMd">Product Descriptions</Text>
                        <Text as="p">Create compelling product descriptions that convert browsers into buyers</Text>
                      </TextContainer>
                      <Button onClick={() => handleNavigation()}>Try Now</Button>
                    </BlockStack>
                  </LegacyCard>
                </Layout.Section>

                <Layout.Section oneThird>
                  <LegacyCard sectioned>
                    <BlockStack gap="400">
                      <Icon source={AutomationIcon} color="base" />
                      <TextContainer spacing="tight">
                        <Text as="h3" variant="headingMd">Bulk Generation</Text>
                        <Text as="p">Generate content for multiple products or articles in one go</Text>
                      </TextContainer>
                      <Button onClick={() => handleNavigation()}>Try Now</Button>
                    </BlockStack>
                  </LegacyCard>
                </Layout.Section>
              </Layout>
            </BlockStack>
          </Layout.Section>
          <Layout.Section>
            <CalloutCard
              title="Why Choose Our AI Content Generator?"
              illustration="https://cdn.shopify.com/placeholder-image.jpg"
              primaryAction={{
                content: 'Start Free Trial',
                onAction: () => handleNavigation(),
              }}
            >
              <BlockStack gap="400">
                <List type="bullet">
                  <List.Item>SEO-optimized content that ranks higher in search results</List.Item>
                  <List.Item>Save hours of writing time with instant content generation</List.Item>
                  <List.Item>Maintain consistent brand voice across all content</List.Item>
                  <List.Item>Multiple language support for global markets</List.Item>
                </List>
              </BlockStack>
            </CalloutCard>
          </Layout.Section>
          <Layout.Section>
            <LegacyCard sectioned>
              <BlockStack gap="400">
                <Icon source={ChartVerticalFilledIcon} color="base" />
                <TextContainer spacing="tight">
                  <Text as="h3" variant="headingMd">Track Your Content Performance</Text>
                  <Text as="p">
                    Monitor how your AI-generated content performs with built-in analytics. 
                    Track engagement, conversion rates, and SEO rankings all in one place.
                  </Text>
                </TextContainer>
                <MediaCard
                  title="Content Analytics Dashboard"
                  description="Get detailed insights into your content performance"
                  size="small"
                >
                  <VideoThumbnail
                    videoLength={120}
                    thumbnailUrl="https://cdn.shopify.com/placeholder-image.jpg"
                    onClick={() => handleNavigation()}
                  />
                </MediaCard>
              </BlockStack>
            </LegacyCard>
          </Layout.Section>
          <Layout.Section>
            <LegacyCard sectioned>
              <BlockStack gap="400" align="center">
                <TextContainer spacing="tight">
                  <Text as="h2" variant="headingLg">Ready to Transform Your Store's Content?</Text>
                  <Text as="p" variant="bodyLg">
                    Join thousands of Shopify merchants who are saving time and increasing sales with AI-generated content.
                  </Text>
                </TextContainer>
                <Button size="large" primary onClick={() => handleNavigation()}>
                  Start Free Trial
                </Button>
                <Text variant="bodySm" color="subdued">
                  No credit LegacyCard required • 14-day free trial
                </Text>
              </BlockStack>
            </LegacyCard>
          </Layout.Section>
        </Layout>
        <Box paddingBlockEnd="500" />
      </Page>
    </Frame>
  );
}

export default React.memo(HomePage);