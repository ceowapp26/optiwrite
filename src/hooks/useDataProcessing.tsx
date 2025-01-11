import { useState, useCallback, useEffect, useRef } from 'react';
import { API } from '@/constants/api';
import { useUsageStore } from '@/hooks/useUsageStore';
import { AppBridgeState, ClientApplication } from '@shopify/app-bridge';
import { Service } from '@prisma/client';
import axios from 'axios';

interface UseDataProcessingProps {
  app: ClientApplication<AppBridgeState>;
  onError?: (error: string) => void;
}

export const useDataProcessing = ({ app, onError }: UseDataProcessingProps) => {
  const appRef = useRef(app);
  const [error, setError] = useState('');
  const { setShopDetails, checkCrawlLimit, updateCrawlUsage } = useUsageStore();
  
  const processData = useCallback(async (shopName: string, userId: string, urls: string[]) => {
    if (!shopName || !userId) {
      throw new Error('Missing credentials!'); 
    }
    try {
      await setShopDetails(shopName, userId);
      const canProcess = await checkCrawlLimit(1, appRef.current);
      if (!canProcess) {
        throw new Error('Usage limit reached for this billing cycle');
        return;
      }
      const endpoint = API.scrapeWebData;
      const data = { 
        urls,
        config: {
          shopName: shopName,
          userId: userId
        }
      };
      const response = await axios.post(endpoint, data, {
        headers: { 'Content-Type': 'application/json' }
      });
      const resData = response.data;
      if (resData) await updateCrawlUsage(1, appRef.current);
      return resData;
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error || 'Error fetching content';
      console.error('Error fetching content:', error);
      setError(errorMessage);
      onError?.(errorMessage);
      throw new Error(errorMessage);
    }
  }, [onError, checkCrawlLimit, updateCrawlUsage, setShopDetails]); 

  return {
    processData,
    error,
    setError
  };
};