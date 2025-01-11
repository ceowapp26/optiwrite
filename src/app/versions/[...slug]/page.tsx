"use client"
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useShopifyAI } from "@/hooks/useShopifyAI";
import { useParams } from 'next/navigation';
import {
  getWelcomeTourConfig,
  topbarTourConfig,
  headerTourConfig,
  userInfoTourConfig,
  importTourConfig,
  historyTourConfig,
  aiseoTourConfig,
} from '@/constants/joyride';
import { Box, Page, Frame } from '@shopify/polaris';
import styled from 'styled-components';
import Joyride, { STATUS, EVENTS, ACTIONS } from 'react-joyride';
import { useJoyride } from '@/context/JoyrideContextProvider';
import { Redirect } from '@shopify/app-bridge/actions';
import { useAppBridge } from '@/providers/AppBridgeProvider';
import { eventEmitter } from '@/helpers/eventEmitter';
import { useGeneralContext, useGeneralActions } from "@/context/GeneralContextProvider";
import { PRODUCT } from "@/types/product";
import { ACTION } from "@/types/ai";
import Sidebar from '@/components/Sidebar';
import PageContent from '../../_components/PageContent';
import TourCompletion from "@/components/TourCompletion";
import { PageLoader } from "@/components/PageLoader";
import SessionProvider from '@/providers/SessionProvider';
import ErrorMessage from "@/components/ErrorMessage";
import { useTheme } from 'next-themes';
import PaymentStatusModal from "@/components/PaymentStatusModal";

type PageParams = {
  slug: string[] | string;
}

const AppPage = () => {
  const params = useParams<PageParams>();
  const { setTheme: setNextTheme } = useTheme();
  const version = Array.isArray(params.slug) 
    ? params.slug[0] 
    : params.slug;
  const { state } = useGeneralContext();
  const { setTheme, setIsLoading, setError, setAiErrors, setIsSidebarOpened, setIsPreview, setIsFullScreen, setOutputContent, setIsEditFullScreen } = useGeneralActions();
  const { theme, isLoading, error, aiErrors, isSidebarOpened, isEditFullScreen, isPreview, isFullScreen, outputContent } = state;
  const [activeSection, setActiveSection] = useState(0);
  const [showTourCompletion, setShowTourCompletion] = useState(false);
  const { app } = useAppBridge();
  const { registerTour, startTour, stopTour, moveToNextTour, nextStep, tours } = useJoyride();
  const hasSeenTour = localStorage.getItem('hasSeenTour');
  const tourFunctionsRef = useRef({
    registerTour,
    startTour,
    stopTour,
    moveToNextTour
  });
  const { 
    handleShopifyAI, 
    apiErrorModal,
  } = useShopifyAI({
    app,
    error,
    setError,
    isLoading,
    setIsLoading,
  });
  const onEditFullscreenClose = () => setIsEditFullScreen(false);
  const onEditFullscreenOpen = () => setIsEditFullScreen(true);
  const onSidebarOpen = () => setIsSidebarOpened(true);
  const onSidebarClose = () => setIsSidebarOpened(false);
  const onSidebarToggle = () => setIsSidebarOpened(!isSidebarOpened);
  const onPreviewToggle = () => setIsPreview(!isPreview);
  const onOpenPreview = () => setIsPreview(true);

  const onFullscreenToggle = () => {
    setIsFullScreen(!isFullScreen)
    setIsPreview(isFullScreen);
  };

  const handleCompleteTour = useCallback(() => {
    eventEmitter.publish('SHOW_TOUR_COMPLETION');
  }, []);

  const handleTourEvent = useCallback((data) => {
    const { action, type, status } = data;
    if (action === ACTIONS.SKIP || type === EVENTS.SKIP) {
      handleCompleteTour();
      toast.info("Tour skipped! Feel free to restart it anytime.", {
        duration: 5000,
        position: 'top-center',
      });
      return;
    }
  }, [handleCompleteTour]);

  useEffect(() => {
    const handleTourCompletion = () => {
      setShowTourCompletion(true);
    };
    const tourCompletions = [
      eventEmitter.subscribe('SHOW_TOUR_COMPLETION', handleTourCompletion)
    ];
    return () => tourCompletions.forEach(unsubscribe => unsubscribe());
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '0px', threshold: 0.5 }
    );
    const sectionElements = document.querySelectorAll('.section');
    sectionElements.forEach((section) => {
      observer.observe(section);
    });

    return () => {
      observer.disconnect();
    };
    
  }, [setActiveSection]);
  
  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'light' ? 'dark-experimental' : 'light';
    const _newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    setNextTheme(_newTheme);
    localStorage.setItem('theme', newTheme);
  }, [theme, setTheme]);

  useEffect(() => {
    const storedTheme = localStorage.getItem('theme') || 'light';
    const _newTheme = storedTheme === 'light' ? 'light' : 'dark';
    setTheme(storedTheme);
    setNextTheme(_newTheme);
  }, []);

  useEffect(() => {
    tourFunctionsRef.current = {
      registerTour,
      startTour,
      stopTour,
      moveToNextTour
    };
  }, [registerTour, startTour, stopTour, registerTour]);

  const TOUR_CONFIG = [
    {
      name: 'welcomeTour',
      config: getWelcomeTourConfig({ 
        stopTour: (...args) => tourFunctionsRef.current.stopTour(...args), 
        startTour: (...args) => tourFunctionsRef.current.startTour(...args),
      }),
      callback: (data) => {
        handleTourEvent(data);
      },
    },
    {
      name: 'headerTour',
      config: {
        ...headerTourConfig,
        callback: (data) => {
          handleTourEvent(data);
        },
      },
    },
    {
      name: 'userInfoTour',
      config: {
        ...userInfoTourConfig,
        callback: (data) => {
          handleTourEvent(data);
        },
      },
    },
    {
      name: 'importTour',
      config: {
        ...importTourConfig,
        callback: (data) => {
          handleTourEvent(data);
        },
      },
    },
    {
      name: 'historyTour',
      config: {
        ...historyTourConfig,
        callback: (data) => {
          handleTourEvent(data);
        },
      },
    },
    {
      name: 'aiseoTour',
      config: {
        ...aiseoTourConfig,
        callback: (data) => {
          handleTourEvent(data);
          if (data.status === STATUS.FINISHED) {
            handleCompleteTour();
            toast.success(
              "Tour completed! You're ready to start optimizing your products.",
              {
                duration: 5000,
                position: 'top-center',
              }
            );
          }
        },
      },
    },
  ];
  const registerTours = useCallback(() => {
    const clearExistingTours = () => {
      tourFunctionsRef.current.stopTour();
    };
    clearExistingTours();        
    TOUR_CONFIG.forEach(({ name, config }) => {
      tourFunctionsRef.current.registerTour(name, {
        ...config,
        disabled: false
      });
    });
  }, []);

  useEffect(() => {
    const cleanup = registerTours();
    return cleanup;
  }, []);

  useEffect(() => {
    if (!hasSeenTour) {
      setTimeout(() => {
        startTour('welcomeTour');
        localStorage.setItem('hasSeenTour', 'true');
      }, 1000);
    }
  }, [hasSeenTour]);

  const handleStartTour = useCallback(() => {
    const startNewTour = async () => {
      registerTours();
      await new Promise(resolve => setTimeout(resolve, 100));
      startTour('welcomeTour');
    };
    startNewTour();
  }, [registerTours, startTour, stopTour]);

  const navigationMarkup = (
    <Sidebar
      isOpen={isSidebarOpened} 
      onToggle={onSidebarToggle} 
      onOpen={onSidebarOpen}
      onClose={onSidebarClose}
    />
  );
  
  return (
    <SessionProvider>
      {({ session, appSession }) => (
         <Frame navigation={navigationMarkup}>
          {showTourCompletion && <TourCompletion />}
          <PaymentStatusModal />
          {apiErrorModal}
          <PageContent
            session={appSession}
            version={version}
            theme={theme}
            toggleTheme={toggleTheme}
            handleStartTour={handleStartTour}
            isFullscreen={isFullScreen} 
            isPreview={isPreview}
            onOpenPreview={onOpenPreview}
            setIsFullScreen={setIsFullScreen}
            onOpenFullscreen={onFullscreenToggle}
            onClosePreview={onPreviewToggle}
            isOpenSidebar={isSidebarOpened} 
            onToggleSidebar={onSidebarToggle} 
            onOpenSidebar={onSidebarOpen}
            onCloseSidebar={onSidebarClose}
            handleShopifyAI={handleShopifyAI}
            aiErrors={aiErrors}
            setAiErrors={setAiErrors}
            error={error}
            setError={setError}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            outputContent={outputContent}
            setOutputContent={setOutputContent}
          />
        )
        </Frame>
      )}
    </SessionProvider>
  );
}

AppPage.displayName = 'AppPage';

export default AppPage;
