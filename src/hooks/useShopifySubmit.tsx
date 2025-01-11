"use client";
import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { 
  ContentProps,
  getSchema, 
} from '@/schemas/content.schema';
import { PRODUCT } from '@/types/product';
import { eventEmitter } from '@/helpers/eventEmitter';
import { useFormContext } from 'react-hook-form';
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

export const useShopifySubmit = ({ shopName, accessToken }: ShopifySubmitProps) => {
  const { submitTypeRef, state } = useGeneralContext();
  const { bodyHtml } = state;
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const schema = useMemo(() => {
    const submitType = submitTypeRef?.current;
    if (submitType?.startsWith("UPDATE_")) {
      const updateCategory = extractCategory(submitType, "UPDATE_");
      return updateCategory ? getSchema(updateCategory, ["body_html"]) : null;
    }
    if (submitType?.startsWith("PUBLISH_")) {
      const publishCategory = extractCategory(submitType, "PUBLISH_");
      return publishCategory ? getSchema(publishCategory, ["body_html"]) : null;
    }
    return null;
  }, [submitTypeRef?.current]);

  const methods = useForm<ContentProps>({
    resolver: zodResolver(schema || {}),
    mode: 'all',
  });

  const handleDynamicSubmit = async (values: ContentProps) => {
    const submitType = submitTypeRef.current;
    try {
      if (submitType.startsWith("UPDATE_")) {
        const updateCategory = extractCategory(submitType, "UPDATE_");
        if (updateCategory) {
          await ShopApiService.update(
            accessToken, 
            shopName, 
            values.productId, 
            values, 
            updateCategory
          );
        }
      } else if (submitType.startsWith("PUBLISH_")) {
        const publishCategory = extractCategory(submitType, "PUBLISH_");
        if (publishCategory) {
          await ShopApiService.publish(
            shopName, 
            accessToken, 
            values, 
            publishCategory
          );
        }
      } else {
        throw new Error(`Unsupported submit type: ${submitType}`);
      }
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  };

  const onManualSubmit = async (eventType: string, data: ContentProps) => {
    const values = data?.output;
    let validationSchema = null;
    if (eventType?.startsWith("UPDATE_")) {
      const updateCategory = extractCategory(eventType, "UPDATE_");
      validationSchema = getSchema(updateCategory, []);
    }
    if (eventType?.startsWith("PUBLISH_")) {
      const publishCategory = extractCategory(eventType, "PUBLISH_");
      validationSchema = getSchema(publishCategory, []);
    }
    if (!validationSchema) {
      throw new Error(`No validation schema found for event type: ${eventType}`);
    }
    try {
      const validatedData = await validationSchema.parseAsync(values);
      setLoading(true);
      setProgress(0);
      setStatus('loading');
      setError(null);
      if (eventType.startsWith("UPDATE_")) {
        const updateCategory = extractCategory(eventType, "UPDATE_");
        if (updateCategory) {
          await ShopApiService.update(
            accessToken,
            shopName,
            validatedData.productId,
            data,
            updateCategory
          );
        }
      } else if (eventType.startsWith("PUBLISH_")) {
        const publishCategory = extractCategory(eventType, "PUBLISH_");
        if (publishCategory) {
          await ShopApiService.publish(
            shopName,
            accessToken,
            data,
            publishCategory
          );
        }
      } else {
        throw new Error(`Unsupported event type: ${eventType}`);
      }
      setStatus('success');
      eventEmitter.publish('formSubmitted', validatedData);
      toast.success('Submission successful');
      return validatedData;
    } catch (error: any) {
      if (error.issues) {
        const formattedErrors = formatZodError(error);
        const errorMessage = formattedErrors
          .map(err => `${err.path.join('.')}: ${err.message}`)
          .join('\n');
        setError(errorMessage);
        setStatus('error');
        toast.error('Validation failed:', {
          description: errorMessage
        });
        throw {
          type: 'ValidationError',
          errors: formattedErrors,
          message: 'Form validation failed'
        };
      }
      const errorMessage = error?.message || 'An unexpected error occurred';
      setError(errorMessage);
      setStatus('error');
      toast.error('Error:', {
        description: errorMessage
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const onCancelAction = () => {
    if (loading) ShopApiService.cancelOperation();
  };

  const onReset = async () => {
    try {
      methods.reset();
    } catch (error: any) {
      const errorMessage = error?.message || 'An unexpected error occurred.';
      setError(errorMessage);
      toast.error(errorMessage);
      throw error;
    }
  };
  
  const onHandleSubmit = methods.handleSubmit(async (values, e) => {
    if (!(e?.nativeEvent instanceof SubmitEvent) || 
        !(e?.nativeEvent.submitter instanceof HTMLElement) ||
        e.nativeEvent.submitter?.type !== 'submit'
      ) {
      return;  
    }  
    setLoading(true);
    setProgress(0);
    setStatus('loading');
    setError(null);
    try {
      const { input_data, ...outputValues } = values;
      await handleDynamicSubmit({ 
        input: input_data, 
        output: { body_html: bodyHtml, ...outputValues } 
      });
      setStatus('success');
      eventEmitter.publish('formSubmitted', values);
      toast.success('Submission successful');
    } catch (error: any) {
      console.error("Error in onHandleSubmit:", error);
      const errorMessage = error?.message || 'An unexpected error occurred while submitting the model.';
      setError(errorMessage);
      setStatus('error');
      toast.error(errorMessage);
    } finally {
      setLoading(false);
      methods.reset();
    }
  });

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




