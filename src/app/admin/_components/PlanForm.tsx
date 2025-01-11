"use client"
import {
  Modal,
  Form,
  FormLayout,
  TextField,
  Select,
  BlockStack,
  Banner,
  Spinner
} from '@shopify/polaris';
import { useState, useCallback, useEffect } from 'react';

interface PlanFormProps {
  plan?: any;
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isSubmitting?: boolean;
}

export function PlanForm({ plan, open, onClose, onSubmit, isSubmitting = false }: PlanFormProps) {
  const [formData, setFormData] = useState({
    name: 'FREE',
    description: '',
    price: 0,
    interval: 'EVERY_30_DAYS',
    trialDays: 0,
    features: {
      aiAPILimit: 0,
      crawlAPILimit: 0
    }
  });

  useEffect(() => {
    if (plan) {
      setFormData({
        name: plan.name || 'FREE',
        description: plan.description || '',
        price: plan.price || 0,
        interval: plan.interval || 'EVERY_30_DAYS',
        trialDays: plan.trialDays || 0,
        features: {
          aiAPILimit: plan.features?.aiAPILimit || 0,
          crawlAPILimit: plan.features?.crawlAPILimit || 0
        }
      });
    }
  }, [plan]);

  const handleSubmit = useCallback(() => {
    onSubmit(formData);
  }, [formData, onSubmit]);

  const handleChange = useCallback((field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleFeatureChange = useCallback((field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      features: {
        ...prev.features,
        [field]: parseInt(value) || 0
      }
    }));
  }, []);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={plan ? 'Edit Plan' : 'Create New Plan'}
      primaryAction={{
        content: plan ? 'Update' : 'Create',
        onAction: handleSubmit,
        loading: isSubmitting,
        disabled: isSubmitting
      }}
      secondaryActions={[
        {
          content: 'Cancel',
          onAction: onClose,
          disabled: isSubmitting
        },
      ]}
    >
      <Modal.Section>
        <Form onSubmit={handleSubmit}>
          <FormLayout>
            {isSubmitting && (
              <Banner status="info">
                <BlockStack alignment="center">
                  <Spinner size="small" />
                  <p>{plan ? 'Updating' : 'Creating'} plan...</p>
                </BlockStack>
              </Banner>
            )}

            <Select
              label="Plan Name"
              options={[
                { label: 'Free', value: 'FREE' },
                { label: 'Standard', value: 'STANDARD' },
                { label: 'Pro', value: 'PRO' },
                { label: 'Ultimate', value: 'ULTIMATE' },
              ]}
              value={formData.name}
              onChange={(value) => handleChange('name', value)}
              disabled={isSubmitting}
            />

            <TextField
              label="Description"
              value={formData.description}
              onChange={(value) => handleChange('description', value)}
              multiline={4}
              disabled={isSubmitting}
            />

            <TextField
              label="Price"
              type="number"
              value={String(formData.price)}
              onChange={(value) => handleChange('price', parseFloat(value) || 0)}
              disabled={isSubmitting}
            />

            <Select
              label="Interval"
              options={[
                { label: 'Monthly', value: 'EVERY_30_DAYS' },
                { label: 'Yearly', value: 'ANNUAL' },
              ]}
              value={formData.interval}
              onChange={(value) => handleChange('interval', value)}
              disabled={isSubmitting}
            />

            <TextField
              label="Trial Days"
              type="number"
              value={String(formData.trialDays)}
              onChange={(value) => handleChange('trialDays', parseInt(value) || 0)}
              disabled={isSubmitting}
            />

            <BlockStack gap="4">
              <TextField
                label="AI API Limit"
                type="number"
                value={String(formData.features.aiAPILimit)}
                onChange={(value) => handleFeatureChange('aiAPILimit', value)}
                disabled={isSubmitting}
              />

              <TextField
                label="Crawl API Limit"
                type="number"
                value={String(formData.features.crawlAPILimit)}
                onChange={(value) => handleFeatureChange('crawlAPILimit', value)}
                disabled={isSubmitting}
              />
            </BlockStack>
          </FormLayout>
        </Form>
      </Modal.Section>
    </Modal>
  );
}
