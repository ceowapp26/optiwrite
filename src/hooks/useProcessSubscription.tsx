"use client"

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import axios from 'axios';

export const useProcessSubscription = () => {
  const searchParams = useSearchParams();
  const shop = searchParams?.get("shop");
  const processQueuedTasks = async () => {
    if (!shop) return;
    try {
      await axios.get('/api/cron/queue', {
        params: { shop }
      });
    } catch (error) {
      console.error('Failed to run tasks status:', error);
    }
  };
  useEffect(() => {
    processQueuedTasks();
    const intervalId = setInterval(processQueuedTasks, 5 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [shop]);
};