"use client";
import { useState, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { 
  ContentProps,
  getSchema, 
} from '@/schemas/content.schema';
import { ContentCategory } from '@/types/content';
import { eventEmitter } from '@/helpers/eventEmitter';
import { useGeneralContext } from '@/context/GeneralContextProvider';
import { ShopApiService } from '@/utils/api';

interface ShopifySubmitProps {
  shopName: string;
  accessToken: string;
}

type SubmitStatus = 'idle' | 'loading' | 'success' | 'error';

interface ValidationError {
  path: (string | number)[];
  message: string;
}

interface IApiState {
  status: 'idle' | 'loading' | 'success' | 'error' | 'cancelled';
  message?: string;
}

const formatZodError = (error: any): ValidationError[] => {
  if (error.issues) {
    return error.issues.map((issue: any) => ({
      path: issue.path,
      message: issue.message
    }));
  }
  return [{ path: [], message: 'Unknown validation error' }];
};

const extractCategory = (submitType: string, prefix: string): string | null => {
  return submitType.startsWith(prefix) ? submitType.replace(prefix, '') : null;
};

const getUpdatedContentID = (updateCategory: string, values: any): string | null => {
  switch (updateCategory) {
    case ContentCategory.PRODUCT:
      return values?.output?.product_id;
    case ContentCategory.BLOG:
      return values?.output?.blog_id;
    case ContentCategory.ARTICLE:
      return values?.output?.article_id;
    default:
      return null;
  }
};

export const useShopifySubmit = ({ shopName, accessToken }: ShopifySubmitProps) => {
  const { submitTypeRef } = useGeneralContext();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const schema = useMemo(() => {
    const submitType = submitTypeRef?.current;
    if (submitType?.startsWith("UPDATE_")) {
      const updateCategory = extractCategory(submitType, "UPDATE_");
      return updateCategory ? getSchema(updateCategory, 'UPDATE', []) : null;
    }
    if (submitType?.startsWith("PUBLISH_")) {
      const publishCategory = extractCategory(submitType, "PUBLISH_");
      return publishCategory ? getSchema(publishCategory, 'PUBLISH', []) : null;
    }
    return null;
  }, [submitTypeRef?.current]);

  const methods = useForm<ContentProps>({
    resolver: zodResolver(schema || {}),
    mode: 'all',
  });

  const handleDynamicSubmit = useCallback(async (submitType: string, values: ContentProps) => {
    if (!values || !Object.entries(values)?.length) {
      return;
    }
    let result: { data: any, state: IApiState } | undefined;
    let state: IApiState;
    try {
      setLoading(true);
      setProgress(0);
      setStatus('loading');
      if (submitType.startsWith("UPDATE_")) {
        const updateCategory = extractCategory(submitType, "UPDATE_");
        if (updateCategory) {
          const updatedContentID = getUpdatedContentID(updateCategory, values);
          result = await ShopApiService.update(
            accessToken,
            shopName,
            updatedContentID,
            values,
          );
        }
      } else if (submitType.startsWith("PUBLISH_")) {
        const publishCategory = extractCategory(submitType, "PUBLISH_");
        if (publishCategory) {
          result = await ShopApiService.publish(
            shopName,
            accessToken,
            values,
            publishCategory,
          );
        }
      }
      state = result?.state;
      if (state?.status === 'cancelled') {
        setStatus('idle');
        toast.info('Operation cancelled', {
          icon: '❌',
          duration: 3000,
          position: 'top-center',
          className: 'success-toast'
        });
        return;
      }
      if (state?.status === 'success') {
        setStatus('success');
        eventEmitter.publish('formSubmitted', values);
        toast.success(`Content ${submitType.toLowerCase().includes('update') ? 'updated' : 'published'} successfully`, {
          icon: '✅',
          duration: 3000,
          position: 'top-center',
          className: 'success-toast'
        });
      }
    } catch (error: any) {
      setStatus('error');
      const errorMessage = error?.message || 'Failed to submit data';
      toast.error(errorMessage, {
        icon: '❌',
        duration: 4000,
        position: 'top-center',
        className: 'error-toast'
      });
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [accessToken, shopName]);

  const onManualSubmit = useCallback(async (eventType: string, data: ContentProps) => {
    const values = data?.output;
    let validationSchema = null;
    if (eventType?.startsWith("UPDATE_")) {
      const updateCategory = extractCategory(eventType, "UPDATE_");
      validationSchema = updateCategory ? getSchema(updateCategory, 'UPDATE', []) : null;
    } else if (eventType?.startsWith("PUBLISH_")) {
      const publishCategory = extractCategory(eventType, "PUBLISH_");
      validationSchema = publishCategory ? getSchema(publishCategory, 'PUBLISH', []) : null;
    }
    if (!validationSchema) {
      throw new Error(`No validation schema found for event type: ${eventType}`);
    }
    try {
      setLoading(true);
      setProgress(0);
      setStatus('loading');
      setError(null);
      const validatedData = await validationSchema.parseAsync(values);
      const fetchedData = {
        input: data?.input,
        output: validatedData
      }
      await handleDynamicSubmit(eventType, fetchedData);
      return validatedData;
    } catch (error: any) {
      if (error.issues) {
        const formattedErrors = formatZodError(error);
        const errorMessage = formattedErrors
          .map(err => `${err.path.join('.')}: ${err.message}`)
          .join('\n');
        setError(errorMessage);
        setStatus('error');
        toast.error('Validation failed', { description: errorMessage });
        throw {
          type: 'ValidationError',
          errors: formattedErrors,
          message: 'Form validation failed'
        };
      }
      const errorMessage = error?.message || 'An unexpected error occurred';
      setError(errorMessage);
      setStatus('error');
      toast.error('Error', { description: errorMessage });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [handleDynamicSubmit]);

  const onCancelAction = useCallback(() => {
    ShopApiService.cancelOperation();
    setStatus('idle');
  }, []);

  const onReset = useCallback(() => {
    try {
      methods.reset();
    } catch (error: any) {
      const errorMessage = error?.message || 'An unexpected error occurred.';
      setError(errorMessage);
      toast.error(errorMessage);
      throw error;
    }
  }, [methods]);

  const onHandleSubmit = useCallback(
    methods.handleSubmit(async (values, e) => {
      if (
        !(e?.nativeEvent instanceof SubmitEvent) || 
        !(e?.nativeEvent.submitter instanceof HTMLElement) || 
        e.nativeEvent.submitter?.type !== 'submit'
      ) {
        return;
      }
      try {
        const { input_data, ...outputValues } = values;
        await handleDynamicSubmit(submitTypeRef?.current, {
          input: input_data,
          output: outputValues,
        });
      } catch (error: any) {
        console.error("Error in onHandleSubmit:", error);
        const errorMessage =
          error?.message || "An unexpected error occurred while submitting the model.";
        toast.error(errorMessage);
      }
    }), 
    [methods, handleDynamicSubmit, submitTypeRef]
  );

  return {
    methods,
    onHandleSubmit,
    onReset,
    onCancelAction,
    onManualSubmit,
    loading,
    progress,
    status,
    error,
  };
};