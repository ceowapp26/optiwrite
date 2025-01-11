import React, { useCallback, useMemo, useRef, useState } from "react";
import { Modal, Button, Tooltip, TextContainer, Card, Banner } from '@shopify/polaris';
import axios from "axios";
import { toast } from "sonner";
import { API } from "@/constants/api";
import { getAIModel } from '@/actions/model';
import { useUsageStore } from '@/hooks/useUsageStore';
import { debounce } from 'lodash';
import { AlertCircleIcon, CheckCircle2Icon, ScissorsIcon } from 'lucide-react';
import { validateData, validateFieldLength, chopHtmlContent, type LengthValidationError, processJsonData } from '@/utils/data';
import { useAppDispatch, useAppSelector } from '@/hooks/useLocalStore';
import { storeContextData, selectContextData } from "@/stores/features/contextSlice";
import { AppBridgeState, ClientApplication } from '@shopify/app-bridge';
import { convertModelName } from '@/utils/ai';
import { CATEGORY, ContentCategory } from '@/types/content';
import { Command, AIError } from '@/types/ai';
import { GENERIC_FORM, DEFAULT_VALUES } from '@/constants/product';
import { countTokens } from '@/utils/ai';
import { useCompletion } from 'ai/react';
import { unsplash } from "@/hooks/useUnsplashCoverImage";

interface UseShopifyAIProps {
  app?: ClientApplication<AppBridgeState>;
  error?: string;
  isLoading?: boolean;
  setIsLoading?: React.Dispatch<React.SetStateAction<boolean>>;
  setError?: React.Dispatch<React.SetStateAction<string>>;
  setAiErrors?: React.Dispatch<React.SetStateAction<AIError[]>>;
}

interface APITokenCounts {
  input_tokens: number;
  output_tokens: number;
}

interface APIRateLimits {
  limitPerMinute: number;
  remainingPerMinute: number;
  resetPerMinute: number;
  limitPerDay: number;
  remainingPerDay: number;
  resetPerDay: number;
}

interface APIState {
  tokenCounts: APITokenCounts | null;
  rateLimits: APIRateLimits | null;
}

interface ModalConfig {
  isOpen: boolean;
  title: string;
  message: string;
  action?: {
    content: string;
    onAction: () => void;
  };
}

interface ShopifyAIResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

const responseCache = new Map<string, ShopifyAIResult<any>>();

export const useShopifyAI = ({
  app,
  error: initialError,
  isLoading,
  setIsLoading,
  setError,
  setAiErrors,
}: UseShopifyAIProps = {}) => {
  const dispatch = useAppDispatch();
  const defaultValues = useAppSelector(selectContextData);
  const appRef = useRef(app);
  const apiStateRef = useRef<APIState>({ tokenCounts: null, rateLimits: null });
  const stateRef = useRef({
    isProcessing: false,
    isStreaming: false,
  });
  const [modalConfig, setModalConfig] = useState<ModalConfig>({ 
    isOpen: false, 
    title: '', 
    message: '' 
  });
  const { getAiApi, setShopDetails, checkAiAPILimit, updateAiUsage, redirectToBilling } = useUsageStore();
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchSearchPhotos = useCallback(async (searchValue: string, quantity: number = 3) => {
    try {
      const result = await unsplash.search.getPhotos({ 
        query: searchValue, 
        page: 1, 
        perPage: quantity * 3 
      });
      if (result.response?.results) {
        return result.response.results.slice(0, quantity).map(photo => photo.urls.regular);
      }
      return [];
    } catch (error) {
      console.error('Error fetching Unsplash images:', error);
      return [];
    } 
  }, []);

  const validateDefaultValues = useCallback((values: Record<string, any>) => {
    if (!values || typeof values !== 'object') return false;
    const requiredFields = GENERIC_FORM
      .filter(field => field.required)
      .map(field => field.name);
    const hasRequiredFields = requiredFields.every(field => field in values);
    if (!hasRequiredFields) return false;
    const { isValid } = validateData(values);
    return isValid;
  }, []);

  const getFallbackValues = useCallback(() => {
    if (defaultValues && validateDefaultValues(defaultValues)) {
      return defaultValues;
    }
    if (!DEFAULT_VALUES || typeof DEFAULT_VALUES !== 'object') {
      const emptyDefaults = GENERIC_FORM
        .filter(field => field.required)
        .reduce((acc, field) => ({
          ...acc,
          [field.name]: ''
        }), {});
      return emptyDefaults;
    }
    return DEFAULT_VALUES;
  }, [defaultValues, validateDefaultValues]);

  const handleRateLimitHeaders = useCallback((headers: Headers): APIRateLimits => {
    const rateLimits = {
      limitPerMinute: parseInt(headers.get('X-Rate-Limit-Limit-Minute') || '0'),
      limitPerDay: parseInt(headers.get('X-Rate-Limit-Limit-Day') || '0'),
      remainingPerMinute: parseInt(headers.get('X-Rate-Limit-Remaining-Minute') || '0'),
      remainingPerDay: parseInt(headers.get('X-Rate-Limit-Remaining-Day') || '0'),
      resetPerMinute: parseInt(headers.get('X-Rate-Limit-Reset-Minute') || '0'),
      resetPerDay: parseInt(headers.get('X-Rate-Limit-Reset-Day') || '0')
    };
    const missingHeaders = Object.entries(rateLimits)
      .filter(([_, value]) => value === 0)
      .map(([key]) => key);
    if (missingHeaders.length > 0) {
      console.warn('Missing rate limit headers:', missingHeaders);
    }
    return rateLimits;
  }, []);

  const handleError = useCallback(async (error: any) => {
    if (!error) return null;
    const errorConfig: ModalConfig = {
      isOpen: true,
      title: 'Error',
      message: 'An unexpected error occurred',
      action: undefined
    };
    try {
      if (error?.response) {
        const { status, data: responseData, headers } = error.response;
        switch (status) {
          case 401:
            throw new Error('Authentication failed. Please check your API credentials.');
            break;
          case 429: {
            const retryAfter = headers['retry-after'];
            errorConfig.title = 'Rate Limit Exceeded';
            errorConfig.message = responseData?.details || 
              (retryAfter ? `Please try again in ${retryAfter} seconds.` : 'Please try again later.');
            break;
          }
          case 413:
            throw new Error('Input size too large. Please reduce the length of your prompt.');
            break;
          case 402:
            errorConfig.title = 'Usage Limit Reached';
            errorConfig.message = 'Usage limit reached for this billing cycle.';
            errorConfig.action = {
              content: 'Upgrade',
              onAction: () => app && redirectToBilling(app)
            };
            break;
          case 500:
            throw new Error('Server error. Please try again later.');
            break;
          default:
            errorConfig.message = responseData?.error || error.message || 'An unexpected error occurred';
        }
      } else if (error instanceof Error) {
        errorConfig.message = error.message;
      }
    } catch {
      return;
    }
    setError?.(errorConfig.message);
    setModalConfig(errorConfig);
  }, [setError, app, redirectToBilling]);

  const handleResponseError = useCallback((status: number, errorData?: any, headers?: Headers): never => {
    if (!errorData) return null;
    const errorConfig: ModalConfig = {
      isOpen: true,
      title: 'Error',
      message: 'An unexpected error occurred',
      action: undefined
    };
    try {
      switch (status) {
        case 401:
          throw new Error('Authentication failed. Please check your API credentials.');
          break;
        case 429: {
          const retryAfter = headers['retry-after'];
          errorConfig.title = 'Rate Limit Exceeded';
          errorConfig.message = errorData?.details || 
            (retryAfter ? `Please try again in ${retryAfter} seconds.` : 'Please try again later.');
          break;
        }
        case 413:
          throw new Error('Input size too large. Please reduce the length of your prompt.');
          break;
        case 402:
          errorConfig.title = 'Usage Limit Reached';
          errorConfig.message = 'Usage limit reached for this billing cycle.';
          errorConfig.action = {
            content: 'Upgrade',
            onAction: () => app && redirectToBilling(app)
          };
          break;
      case 422:
        throw new Error(`Invalid request: ${errorData?.error || errorData?.message || 'Unknown validation error'}`);
        break;
        case 500:
          throw new Error('Server error. Please try again later.');
          break;
        default:
          throw new Error(errorData?.error || errorData?.message || 'An unexpected error occurred');
      }
    } catch {
      throw new Error('An unexpected error occurred');
    }
    setError?.(errorConfig.message);
    setModalConfig(errorConfig);
  }, [setError, app, redirectToBilling]);

  const fetchAPI = useCallback(async ({
    prompt,
    option,
    modelName,
    shopName
  }: {
    prompt: string | Record<string, any>;
    option: Command;
    modelName: string;
    shopName: string;
  }) => {
    const aiApiState = getAiApi();
    if (!aiApiState) {
      throw new Error('API configuration not found');
    }
    const requestConfig = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'X-Shop-Name': shopName,
      },
      body: JSON.stringify({
        prompt,
        category: option,
        model: modelName,
        shopName,
        config: {
          RPM: aiApiState.rpm,
          RPD: aiApiState.rpd,
          max_tokens: aiApiState?.maxTokens || 4096,
        }
      }),
      signal: abortControllerRef.current?.signal
    };
    try {
      const response = await fetch(API.openAI, requestConfig);
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        handleResponseError(response.status, errorData, response.headers);
      }
      const contentType = response.headers.get('Content-Type');
      if (!contentType?.includes('text/event-stream')) {
        throw new Error('Invalid response format from server');
      }
      const rateLimits = handleRateLimitHeaders(response.headers);
      return { response, rateLimits };
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request was cancelled');
        }
        throw error;
      }
      throw new Error('An unexpected error occurred while making the request');
    }
  }, [getAiApi, handleResponseError, handleRateLimitHeaders]);

  const flattenedContentData = useCallback((category, output, articleIncluded = false, isNewBlog = null) => {
    const getBlogFields = (data) => ({
      blog_title: data.title,
      blog_commentable: data.commentable ? 'yes' : 'no',
      blog_feedburner: data.feedburner,
      blog_feedburner_location: data.feedburner_location,
      blog_handle: data.handle,
      blog_tags: data.tags,
      blog_template_suffix: data.template_suffix,
      blog_metafield: processJsonData(data.metafield),
    });
    const getArticleFields = (data) => ({
      article_title: data.title,
      article_author: data.author,
      article_body_html: data.body_html,
      article_handle: data.handle,
      article_image: '',
      article_metafield: processJsonData(data.metafield),
      article_published: true,
      article_summary_html: data.summary_html,
      article_tags: data.tags,
      article_template_suffix: data.template_suffix,
    });
    if (category === ContentCategory.BLOG) {
      const blogFields = getBlogFields(output);
      return articleIncluded 
        ? { ...blogFields, ...getArticleFields(output.article) }
        : blogFields;
    }
    if (category === ContentCategory.ARTICLE) {
      return isNewBlog
        ? { ...getBlogFields(output), ...getArticleFields(output.article) }
        : getArticleFields(output);
    }

    if (category === ContentCategory.PRODUCT) {
      return {
        ...output,
        page_title: output.seo.page_title,
        meta_description: output.seo.meta_description,
      };
    }

    return {};
  }, []);

  const processAIResponse = useCallback(async (category: CATEGORY, completion: string, shopName?: string, articleIncluded?: boolean, isNewBlog?: string | null) => {
    try {
      const flattenedData = flattenedContentData(category, completion, articleIncluded, isNewBlog);
      const { isValid, data, errors } = validateData(flattenedData, shopName, category);
      const fieldValidations = Object.entries(data).reduce((acc: { data: Record<string, any> }, [key, value]) => {
        if (typeof value === 'string') {
          const validation = validateFieldLength(key, value);
          acc.data[key] = !validation.isValid && validation.error ?
            (key === 'bodyContent' ? 
              chopHtmlContent(value, validation.error.constraint.max || value.length) :
              value.slice(0, validation.error.constraint.max || value.length)) :
            value;
        } else {
          acc.data[key] = value;
        }
        return acc;
      }, { data: { ...data } });

      if (!isValid && setAiErrors) {
        setAiErrors(errors);
      }
      dispatch(storeContextData(fieldValidations.data));
      return fieldValidations.data;
    } catch (e) {
      console.error('Error parsing completion:', e);
      setAiErrors?.([{
        name: 'ParseError',
        code: 'INVALID_JSON',
        message: 'Failed to parse AI response. Using default values.',
      }]);
      handleError(e);
      return getFallbackValues();
    }
  }, [getFallbackValues, setAiErrors, handleError, dispatch]);

  const updateAPIState = useCallback(async (
    model: string,
    tokenData: APIState['tokenCounts'],
    rateLimitsData: APIState['rateLimits'],
    currentApp: typeof app
  ) => {
    if (!tokenData || !rateLimitsData || !currentApp) return;
    try {
      await updateAiUsage(
        model,
        Number(tokenData.input_tokens) || 0,
        Number(tokenData.output_tokens) || 0,
        1,
        Number(rateLimitsData.limitPerMinute) || 0,
        Number(rateLimitsData.limitPerDay) || 0,
        Number(rateLimitsData.remainingPerMinute) || 0,
        Number(rateLimitsData.remainingPerDay) || 0,
        Number(rateLimitsData.resetPerMinute) || 0,
        Number(rateLimitsData.resetPerDay) || 0,
        currentApp
      );
    } catch (error) {
      console.error('Failed to update API state:', error);
    }
  }, [updateAiUsage]);

  const handleCompletion = useCallback(async (modelName: string, prompt: string, completion: string, rateLimits: APIRateLimits) => {
    if (stateRef.current.isProcessing) return;
    stateRef.current.isProcessing = true;
    try {
      const tokenCount = await countTokens({
        input: prompt,
        completion,
        model: convertModelName(modelName)
      });
      const tokenCounts = {
        input_tokens: tokenCount?.inputTokens ?? 0,
        output_tokens: tokenCount?.outputTokens ?? 0
      };
      if (rateLimits) {
        await updateAPIState(
          modelName,
          tokenCounts,
          rateLimits,
          appRef.current
        );
      }
    } finally {
      stateRef.current.isProcessing = false;
    }
  }, []);

  const processStream = useCallback(async (response: Response) => {
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No reader available');
    const decoder = new TextDecoder();
    let accumulatedData = '';
    let buffer = '';
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i].trim();
          if (line.startsWith('data: ')) {
            const data = line.slice(5).trim();
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              accumulatedData += parsed.content || '';
            } catch (e) {
              console.error('Error parsing chunk:', e, {
                rawLine: line,
                data: data,
                buffer: buffer
              });
            }
          }
        }
        buffer = lines[lines.length - 1];
      }
      if (buffer.trim()) {
        const line = buffer.trim();
        if (line.startsWith('data: ')) {
          const data = line.slice(5).trim();
          if (data !== '[DONE]') {
            try {
              const parsed = JSON.parse(data);
              accumulatedData += parsed.content || '';
            } catch (e) {
              console.error('Error parsing final chunk:', e, {
                rawLine: line,
                data: data
              });
            }
          }
        }
      }
      return accumulatedData;
    } finally {
      reader.releaseLock();
    }
  }, []);

  const getParsedData = useCallback(async (response: Response): Promise<any> => {
    try {
      const completionText = await processStream(response);
      const parsedData = typeof completionText === "string" ? JSON.parse(completionText) : completionText;
      return parsedData; 
    } catch (error) {
      console.error("Error parsing data:", error);
      throw error; 
    }
  }, []);

  const handleShopifyAI = useCallback(async (
    shopName: string,
    userId: string,
    option: CATEGORY,
    prompt: string | Record<string, any>,
  ) => {
    if (!shopName || !userId) {
      return { success: false, error: 'Missing credentials!' };
    }
    const { imageIncluded, articleIncluded, isNewBlog, ...restPrompt } = prompt;
    apiStateRef.current = { tokenCounts: null, rateLimits: null };
    stateRef.current.isStreaming = true;
    abortControllerRef.current = new AbortController();
    if (option !== "SEOSINGLE") setIsLoading?.(true);
    try {
      await setShopDetails(shopName, userId);
      const model = await getAIModel();
      const modelName = model?.name || 'gpt_4o_mini';
      const normalizedModelName = convertModelName(modelName);
      const canProcess = await checkAiAPILimit(
        prompt, 
        modelName, 
        1, 
        appRef.current,
        () => {
          abortControllerRef.current?.abort();
          abortControllerRef.current = null;
        }
      );
      if (!canProcess) {
        return {
          success: false,
          error: 'Usage limit reached for this billing cycle'
        };
      }
      const { response, rateLimits } = await fetchAPI({
        prompt,
        category: option,
        modelName: normalizedModelName,
        shopName
      });
      apiStateRef.current.rateLimits = rateLimits;
      const completionData = await getParsedData(response);
      await handleCompletion(modelName, prompt, completionData, rateLimits);
      let finalResponse = completionData;
      let modifiedPrompt = { ...prompt };
      if (imageIncluded === 'unsplash') {
        const searchQuery = completionData?.data?.query || option;
        const unsplashImages = await fetchSearchPhotos(searchQuery);
        const modifiedPrompt = {
          ...prompt,
          imageIncluded: 'no',
          context: {
            ...(prompt.context || {}),
            medias: unsplashImages
          }
        };
        const result = await fetchAPI({
          prompt: modifiedPrompt,
          category: option,
          modelName: normalizedModelName,
          shopName
        });
        finalResponse = result?.response;
        await handleCompletion(modelName, prompt, finalResponse, result?.rateLimits);
      }
      const processedData = option.startsWith("CONTENT_") 
        ? completionData 
        : await processAIResponse(option, completionData, shopName, articleIncluded, isNewBlog);
      return {
        success: true,
        data: processedData as T,
      };
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        return {
          success: false,
          data: getFallbackValues() as T,
          error: 'Operation cancelled'
        };
      }
      handleError(e);
      return {
        success: false,
        data: getFallbackValues() as T,
        error: e instanceof Error ? e.message : 'An unexpected error occurred'
      };
    } finally {
      setIsLoading?.(false);
      stateRef.current.isStreaming = false;
      abortControllerRef.current = null;
    }
  }, [
    fetchAPI,
    processStream,
    handleError,
    handleCompletion,
    processAIResponse,
    getFallbackValues,
    setShopDetails,
    checkAiAPILimit
  ]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      stateRef.current.isProcessing = false;
      stateRef.current.isStreaming = false;
    };
  }, []);

  return {
    handleShopifyAI,
    stop: useCallback(() => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
      stateRef.current.isProcessing = false;
      stateRef.current.isStreaming = false;
    }, []),
    error: initialError,
    apiErrorModal: useMemo(() => (
      modalConfig.isOpen && (
        <Modal
          open={modalConfig.isOpen}
          onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
          title={modalConfig.title}
          primaryAction={modalConfig.action}
        >
          <Modal.Section>
            <TextContainer>
              <p>{modalConfig.message}</p>
            </TextContainer>
          </Modal.Section>
        </Modal>
      )
    ), [modalConfig]),
    isLoading
  };
};

