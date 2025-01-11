"use client"
import { useSearchParams } from "next/navigation";
import { Page, Card, Button, Banner, Layout, Text, BlockStack } from '@shopify/polaris';
import { navigate } from "@shopify/app-bridge/actions";
import { useAppBridge } from '@/providers/AppBridgeProvider';

const getErrorMessage = (error: string | null) => {
  switch (error) {
    case "Configuration":
      return {
        title: "Configuration Error",
        description: "There was a problem with the authentication configuration. Please contact support.",
        status: "critical"
      };
    case "AccessDenied":
      return {
        title: "Access Denied",
        description: "You do not have permission to sign in. Please use an authorized account.",
        status: "warning"
      };
    case "Verification":
      return {
        title: "Verification Error",
        description: "The verification link has expired or has already been used.",
        status: "warning"
      };
    case "OAuthSignin":
      return {
        title: "Sign In Error",
        description: "Error occurred while trying to sign in. Please try again.",
        status: "critical"
      };
    case "OAuthCallback":
      return {
        title: "Authentication Error",
        description: "Error occurred during authentication. Please try again.",
        status: "critical"
      };
    case "EmailSignin":
      return {
        title: "Email Sign In Error",
        description: "The email sign in link is invalid or has expired.",
        status: "warning"
      };
    case "CredentialsSignin":
      return {
        title: "Invalid Credentials",
        description: "The credentials you provided are invalid. Please check and try again.",
        status: "warning"
      };
    case "SessionRequired":
      return {
        title: "Session Required",
        description: "Please sign in to access this page.",
        status: "info"
      };
    default:
      return {
        title: "Authentication Error",
        description: "An unexpected error occurred. Please try again later.",
        status: "critical"
      };
  }
};

export default function AuthErrorPage() {
  const { app } = useAppBridge();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const { title, description, status } = getErrorMessage(error);

  const handleBack = () => {
    navigate.history.back(app);
  };

  const handleRetry = () => {
    const shop = searchParams.get("shop");
    const host = searchParams.get("host");
    if (shop && host) {
      const loginUrl = `/api/auth/google?shop=${shop}&host=${host}`;
      window.location.href = loginUrl;
    } else {
      window.location.href = '/login';
    }
  };

  return (
    <Page fullWidth title="Authentication Error">
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="4" padding="4">
              <Banner
                title={title}
                status={status as "critical" | "warning" | "info"}
              >
                <Text as="p">{description}</Text>
              </Banner>

              <BlockStack gap="2">
                <Text as="h2" variant="headingMd">
                  What would you like to do?
                </Text>
                <BlockStack gap="2" alignment="end">
                  <Button onClick={handleBack}>Go Back</Button>
                  <Button primary onClick={handleRetry}>
                    Try Again
                  </Button>
                </BlockStack>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}