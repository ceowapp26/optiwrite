import {
  SkeletonPage,
  Layout,
  LegacyCard,
  SkeletonBodyText,
  SkeletonDisplayText,
  SkeletonThumbnail,
  Box,
  LegacyStack,
} from '@shopify/polaris';
import React from 'react';

export const ContentDisplaySkeleton = () => {
  return (
    <SkeletonPage 
      title="Content Editor" 
      primaryAction 
      secondaryActions={2}
      fullWidth
    >
      <Layout>
        <Layout.Section>
          <LegacyCard sectioned>
            <LegacyStack vertical spacing="loose">
              <SkeletonDisplayText size="large" />
              <Box paddingBlock="400">
                <SkeletonBodyText lines={8} />
              </Box>
              <LegacyStack distribution="leading" spacing="loose">
                <SkeletonThumbnail size="small" />
                <SkeletonThumbnail size="small" />
                <SkeletonThumbnail size="small" />
              </LegacyStack>
            </LegacyStack>
          </LegacyCard>
          <LegacyCard sectioned title="Formatting">
            <LegacyStack distribution="leading" spacing="loose">
              <SkeletonBodyText lines={1} />
              <SkeletonBodyText lines={1} />
              <SkeletonBodyText lines={1} />
            </LegacyStack>
          </LegacyCard>
          <LegacyCard sectioned title="Media">
            <LegacyStack vertical spacing="loose">
              <LegacyStack distribution="fillEvenly">
                <SkeletonThumbnail size="medium" />
                <SkeletonThumbnail size="medium" />
                <SkeletonThumbnail size="medium" />
                <SkeletonThumbnail size="medium" />
              </LegacyStack>
              <SkeletonBodyText lines={2} />
            </LegacyStack>
          </LegacyCard>
        </Layout.Section>
        <Layout.Section variant="oneThird">
          <LegacyCard title="Publishing">
            <LegacyCard.Section>
              <SkeletonBodyText lines={2} />
            </LegacyCard.Section>
            <LegacyCard.Section>
              <SkeletonBodyText lines={2} />
            </LegacyCard.Section>
            <LegacyCard.Section>
              <SkeletonBodyText lines={1} />
            </LegacyCard.Section>
          </LegacyCard>
          <LegacyCard title="SEO" subdued>
            <LegacyCard.Section>
              <SkeletonDisplayText size="small" />
              <Box paddingTop="200">
                <SkeletonBodyText lines={3} />
              </Box>
            </LegacyCard.Section>
            <LegacyCard.Section>
              <SkeletonDisplayText size="small" />
              <Box paddingTop="200">
                <SkeletonBodyText lines={2} />
              </Box>
            </LegacyCard.Section>
          </LegacyCard>
          <LegacyCard title="Settings">
            <LegacyCard.Section>
              <SkeletonBodyText lines={3} />
            </LegacyCard.Section>
            <LegacyCard.Section>
              <SkeletonBodyText lines={2} />
            </LegacyCard.Section>
          </LegacyCard>
        </Layout.Section>
      </Layout>
    </SkeletonPage>
  );
}