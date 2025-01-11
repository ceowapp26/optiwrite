"use client"

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import axios from 'axios';

export const useProcessUninstall = () => {
  const searchParams = useSearchParams();
  const shop = searchParams?.get("shop");
  const checkUninstall = async () => {
    if (!shop) return;
    try {
      await axios.get('/api/cron/cleanup', {
        params: { shop }
      });
    } catch (error) {
      console.error('Failed to check uninstall status:', error);
    }
  };

  useEffect(() => {
    checkUninstall();
    const intervalId = setInterval(checkUninstall, 15 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [shop]);

};