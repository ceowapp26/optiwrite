import React from 'react';
import { Banner, List } from '@shopify/polaris';

interface ErrorBannerProps {
  errors: string[];
  onDismiss?: () => void;
}

const ErrorBanner: React.FC<ErrorBannerProps> = ({ errors, onDismiss }) => {
  if (!errors || errors.length === 0) return null;
  return (
    <Banner
      title="Please fix the following issues"
      status="critical"
      onDismiss={onDismiss}
    >
      <List type="bullet">
        {errors.map((error, index) => (
          <List.Item key={index}>{error}</List.Item>
        ))}
      </List>
    </Banner>
  );
};

export default ErrorBanner;