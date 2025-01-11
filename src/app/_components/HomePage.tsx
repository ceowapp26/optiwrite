"use client"
import React from "react";
import { AppSession } from '@/types/auth';
import { Page, Layout, Card, TextContainer, Button, BlockStack, Text } from "@shopify/polaris";

interface HomePageProps {
  session: AppSession;
}

function HomePage({ session }: HomePageProps) {
  return (
    <Page title="Welcome to Your Shopify App" subtitle="Manage your store efficiently with our tools">
      <Layout>
        <Layout.Section>
          <Card sectioned>
            <BlockStack>
              <Text>Grow Your Store with Powerful Tools</Text>
              <TextContainer>
                Use this app to optimize your operations, increase conversions, and improve customer satisfaction.
              </TextContainer>
              <Button primary onClick={() => console.log("Getting Started")}>
                Get Started
              </Button>
            </BlockStack>
          </Card>
        </Layout.Section>
        <Layout.Section>
          <Layout>
            <Layout.Section oneThird>
              <Card title="Feature 1" sectioned>
                <TextContainer>
                  Learn how to manage your inventory effectively and save time.
                </TextContainer>
                <Button onClick={() => console.log("Learn More about Feature 1")}>Learn More</Button>
              </Card>
            </Layout.Section>
            <Layout.Section oneThird>
              <Card title="Feature 2" sectioned>
                <TextContainer>
                  Improve your customer experience with our built-in tools.
                </TextContainer>
                <Button onClick={() => console.log("Learn More about Feature 2")}>Learn More</Button>
              </Card>
            </Layout.Section>
            <Layout.Section oneThird>
              <Card title="Feature 3" sectioned>
                <TextContainer>
                  Analyze your sales data and make data-driven decisions.
                </TextContainer>
                <Button onClick={() => console.log("Learn More about Feature 3")}>Learn More</Button>
              </Card>
            </Layout.Section>
          </Layout>
        </Layout.Section>
        <Layout.Section>
          <Card sectioned>
            <TextContainer>
              <BlockStack>
                <Text>Ready to Explore?</Text>
                <Button primary onClick={() => console.log("Explore Now")}>
                  Explore Now
                </Button>
              </BlockStack>
            </TextContainer>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
};

export default React.memo(HomePage);
