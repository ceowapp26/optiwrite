"use client";
import { AlertCircle, Loader2 } from "lucide-react";
import { Card, Text, BlockStack, Box, Banner, Frame, Page } from "@shopify/polaris";

const AuthRedirectScreen = ({ message }: { message: string }) => {
  return (
    <Frame>
      <Page fullWidth>
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4">
          <Card>
            <BlockStack gap="400">
              <Box padding="400">
                <div className="flex flex-col items-center space-y-6">
                  <div className="animate-pulse">
                    <img
                      src="/images/Doc2Product-logo.png"
                      alt="Logo"
                      className="h-16 w-auto"
                    />
                  </div>

                  <Banner
                    title="Authentication Required"
                    tone="warning"
                    icon={AlertCircle}
                  >
                    <BlockStack gap="400">
                      <Text as="p">{message}</Text>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Redirecting to authentication page...</span>
                      </div>
                    </BlockStack>
                  </Banner>
                </div>
              </Box>
            </BlockStack>
          </Card>
        </div>
      </Page>
    </Frame>
  );
};

export default AuthRedirectScreen;
