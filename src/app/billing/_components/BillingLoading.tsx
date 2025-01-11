"use client"
import { 
  Page, 
  Layout, 
  Card, 
  BlockStack, 
  Text,
  ProgressBar,
  Spinner,
  InlineStack,
  Box,
} from '@shopify/polaris';
import { useState, useEffect } from 'react';

function BillingLoading() {
  const [progress, setProgress] = useState(0);
  const [loadingSteps, setLoadingSteps] = useState({
    connecting: false,
    fetching: false,
    processing: false,
    finalizing: false
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prev => Math.min(prev + 1, 100));
    }, 150);
    setTimeout(() => setLoadingSteps(prev => ({ ...prev, connecting: true })), 1000);
    setTimeout(() => setLoadingSteps(prev => ({ ...prev, fetching: true })), 3000);
    setTimeout(() => setLoadingSteps(prev => ({ ...prev, processing: true })), 5000);
    setTimeout(() => setLoadingSteps(prev => ({ ...prev, finalizing: true })), 7000);

    return () => clearInterval(timer);
  }, []);

  return (
    <Box padding="500">
      <div className="loading-container">
        <Card>
          <BlockStack gap="800">
            <div className="header-section animate-fade-in">
              <BlockStack gap="400">
                <div className="flex items-center justify-between">
                  <Text variant="headingLg" as="h2">
                    Preparing Your Billing Dashboard
                  </Text>
                  <div className="loading-indicator">
                    <span className="animate-bounce">💫</span>
                  </div>
                </div>
                <ProgressBar progress={progress} size="medium" color="primary" />
              </BlockStack>
            </div>
            <div className="status-cards grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { icon: "🔄", title: "Connecting", done: loadingSteps.connecting },
                { icon: "📡", title: "Fetching Data", done: loadingSteps.fetching },
                { icon: "⚡", title: "Processing", done: loadingSteps.processing },
                { icon: "✨", title: "Finalizing", done: loadingSteps.finalizing }
              ].map((step, index) => (
                <div 
                  key={index} 
                  className={`status-card animate-slide-up ${step.done ? 'completed' : ''}`}
                  style={{ animationDelay: `${index * 0.2}s` }}
                >
                  <Card>
                    <BlockStack gap="300">
                      <div className="status-icon">
                        <span className={`icon ${step.done ? 'done' : ''}`}>
                          {step.done ? "✅" : step.icon}
                        </span>
                      </div>
                      <Text as="p" variant="bodyMd" alignment="center">
                        {step.title}
                      </Text>
                    </BlockStack>
                  </Card>
                </div>
              ))}
            </div>
            <Card>
              <BlockStack gap="400" inlineAlign="center">
                <InlineStack gap="200" align="center">
                  <Spinner size="small" />
                  <Text as="p" variant="bodyMd">
                    {progress < 100 ? 
                      "Loading your billing information..." : 
                      "Almost ready!"}
                  </Text>
                </InlineStack>
                <Text as="p" variant="bodySm" color="subdued">
                  Estimated time remaining: {Math.ceil((100 - progress) / 20)} seconds
                </Text>
              </BlockStack>
            </Card>
          </BlockStack>
        </Card>
      </div>

      <style jsx>{`
        .loading-container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .loading-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .status-icon {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 60px;
          font-size: 24px;
        }

        .status-card {
          transition: all 0.3s ease;
        }

        .status-card.completed {
          transform: translateY(-4px);
        }

        .icon {
          opacity: 0.6;
          transition: all 0.3s ease;
        }

        .icon.done {
          opacity: 1;
          transform: scale(1.1);
        }

        .animate-fade-in {
          animation: fadeIn 0.8s ease-out;
        }

        .animate-slide-up {
          opacity: 0;
          animation: slideUp 0.6s ease-out forwards;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 768px) {
          .status-cards {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 480px) {
          .status-cards {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </Box>
  );
}

export default BillingLoading;