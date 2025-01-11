"use client"
import { AlertCircle, Loader2 } from 'lucide-react'; 
import { Card, Text, BlockStack, Box, Banner } from '@shopify/polaris';

const LoadingScreen = () => {
  const isLight = localStorage.getItem('theme') === 'light';
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <Card>
        <Box padding="400">
          <div className="flex flex-col items-center space-y-6">
            <div className="animate-pulse">
              <img 
                src="/images/Doc2Product-logo.png" 
                alt="Logo" 
                className="h-16 w-auto"
              />
            </div>
            <div className="flex flex-col items-center space-y-3">
              <Loader2
                className={`h-8 w-8 animate-spin ${
                  isLight ? 'text-black' : 'text-gray-300'
                }`}
              />
              <Text variant="headingSm" as="h2">
                Loading your application...
              </Text>
            </div>
          </div>
        </Box>
      </Card>
    </div>
  );
};

export default LoadingScreen;