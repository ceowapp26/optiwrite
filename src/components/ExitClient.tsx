"use client"
import {
  Card,
  Frame,
  Page,
  Text,
  BlockStack,
  Spinner,
  Banner,
  Layout,
  ProgressBar
} from "@shopify/polaris";
import AppLogo from "@/components/Logo";
import { useEffect, useState } from "react";

const LoadingDots = () => (
  <span className="inline-flex ml-1">
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        className={`w-1.5 h-1.5 mx-0.5 rounded-full bg-current opacity-75 animate-bounce`}
        style={{
          animationDelay: `${i * 0.16}s`,
          animationDuration: '1.2s'
        }}
      />
    ))}
  </span>
);

const StepsIndicator = ({ currentStep }) => {
  const steps = [
    "Initializing",
    "Validating",
    "Securing Session",
    "Redirecting"
  ];

  return (
    <div className="w-full mt-4">
      <ProgressBar
        progress={Math.min(((currentStep + 1) / steps.length) * 100, 100)}
        size="small"
        color="primary"
      />
      <Text variant="bodySm" color="subdued" alignment="center" className="mt-2">
        {steps[currentStep]}
      </Text>
    </div>
  );
};

export default function ExitClient({ redirectUri }) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => (prev < 3 ? prev + 1 : prev));
    }, 1000);

    if (redirectUri) {
      const decodedRedirectUri = decodeURIComponent(redirectUri);
      setTimeout(() => {
        window.open(decodedRedirectUri, "_top");
      }, 3500); 
    }

    return () => clearInterval(stepInterval);
  }, [redirectUri]);

  return (
    <Frame>
      <Page fullWidth>
        <Layout>
          <Layout.Section>
            <div 
              style={{ 
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(to bottom, #f9fafb, #ffffff)'
              }}
            >
              <div className="w-full max-w-md px-4">
                <BlockStack gap="5">
                  <Card>
                    <div className="p-6">
                      <BlockStack gap="6">
                        {/* Logo Section */}
                        <div className="relative">
                          <div className="absolute inset-0 bg-primary/5 rounded-full blur-xl"></div>
                          <div className="relative flex justify-center">
                            <div className="animate-pulse p-4 bg-white rounded-full shadow-lg">
                              <AppLogo width={48} height={48} />
                            </div>
                          </div>
                        </div>

                        {/* Content Section */}
                        <BlockStack gap="4" align="center">
                          <div className="text-center">
                            <Text variant="headingLg" as="h2">
                              Authentication in Progress
                            </Text>
                            <div className="mt-2">
                              <Text variant="bodyMd" color="subdued">
                                Securing your session<LoadingDots />
                              </Text>
                            </div>
                          </div>

                          {/* Progress Indicator */}
                          <StepsIndicator currentStep={currentStep} />

                          {/* Spinner */}
                          <div className="flex items-center justify-center my-6">
                            <div className="relative">
                              <div className="absolute inset-0 bg-primary/10 rounded-full blur-md"></div>
                              <Spinner size="large" />
                            </div>
                          </div>

                          {/* Info Banner */}
                          <Banner status="info" className="animate-fadeIn">
                            <BlockStack gap="2">
                              <Text variant="bodyMd">
                                Please keep this window open while we complete the authentication process.
                              </Text>
                              <Text variant="bodySm" color="subdued">
                                You will be redirected automatically once complete.
                              </Text>
                            </BlockStack>
                          </Banner>
                        </BlockStack>
                      </BlockStack>
                    </div>
                  </Card>
                </BlockStack>
              </div>
            </div>
          </Layout.Section>
        </Layout>
      </Page>
    </Frame>
  );
}