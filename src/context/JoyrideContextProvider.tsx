"use client"
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';
import Joyride, { STATUS, EVENTS, ACTIONS } from 'react-joyride';
import { JoyrideStep, JoyrideConfig, JoyrideContextType } from '@/types/joyride';

type ExtendedJoyrideConfig = JoyrideConfig & {
  disabled?: boolean;
};

const JoyrideContext = createContext<JoyrideContextType>({
  startTour: () => {},
  stopTour: () => {},
  registerTour: () => {},
  nextStep: () => {},
  prevStep: () => {},
  goToStep: () => {},
  getCurrentStep: () => 0,
  isRunning: () => false,
  moveToNextTour: () => {},
});

export const JoyrideProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [runTour, setRunTour] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [tours, setTours] = useState<Record<string, JoyrideConfig>>({});
  const [activeTour, setActiveTour] = useState<string | null>(null);
  const pendingRouteChange = useRef<{ route: string; stepIndex: number } | null>(null);
  const currentTourIndexRef = useRef<number>(0);

  useEffect(() => {
    if (pendingRouteChange.current && pathname === pendingRouteChange.current.route) {
      setStepIndex(pendingRouteChange.current.stepIndex);
      pendingRouteChange.current = null;
    }
  }, [pathname]);

  const scrollToTarget = async (target: string, offset = 0, duration = 1000) => {
    const element = document.querySelector(target);
    if (element) {
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      await new Promise<void>((resolve) => {
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
        setTimeout(resolve, duration);
      });
    }
  };

  const registerTour = useCallback((tourId: string, config: ExtendedJoyrideConfig) => {
    setTours(prev => ({
      ...prev,
      [tourId]: {
        ...config      
    }
    }));
  }, []);

  const startTour = useCallback((tourId: string) => {
    if (!tours[tourId]) return;
    if (tourId === 'welcomeTour') currentTourIndexRef.current = 0;
    setTours(prev =>
      Object.keys(prev).reduce((acc, key) => {
        acc[key] = {
          ...prev[key],
          disabled: key !== tourId, 
        };
        return acc;
      }, {} as typeof prev)
    );
    setStepIndex(0);
    setActiveTour(tourId);
    setRunTour(true);
    const firstStep = tours[tourId].steps[0];
    if (firstStep.route && firstStep.route !== pathname) {
      pendingRouteChange.current = { route: firstStep.route, stepIndex: 0 };
      router.push(firstStep.route);
    }
  }, [tours, pathname, router]);

  const stopTour = useCallback(() => {
    setRunTour(false);
    setActiveTour(null);
    setStepIndex(0);
    pendingRouteChange.current = null;
  }, []);

  const moveToNextTour = useCallback(async () => {
    const tourSequence = Object.keys(tours).filter(
      tourId => tourId !== 'welcomeTour' && tourId !== 'headerTour'
    );
    if (currentTourIndexRef.current < tourSequence.length) {
      const nextTourId = tourSequence[currentTourIndexRef.current];
      const nextTour = tours[nextTourId];
      if (nextTour) {
        const firstStepTarget = nextTour.steps[0]?.target;
        const targetElement = firstStepTarget ? document.querySelector(firstStepTarget) : null;
        if (targetElement || !firstStepTarget) {
          await new Promise(resolve => setTimeout(resolve, 500));
          startTour(nextTourId);
          currentTourIndexRef.current++;
        } else {
          currentTourIndexRef.current++;
          moveToNextTour();
        }
      } else {
        currentTourIndexRef.current++;
        moveToNextTour();
      }
    } else {
      currentTourIndexRef.current = 0;
      toast.success(
        "Tour completed! You're ready to start using the app.",
        {
          duration: 5000,
          position: 'top-center',
        }
      );
    }
  }, [tours, startTour]);

  const handleBeforeStep = useCallback(async (nextStepIndex: number): Promise<boolean> => {
    if (!activeTour) return true;
    const currentTour = tours[activeTour];
    if (currentTour.beforeStepChange) {
      const canProceed = await currentTour.beforeStepChange(nextStepIndex);
      if (!canProceed) return false;
    }
    const nextStep = currentTour.steps[nextStepIndex];
    if (nextStep?.route && nextStep.route !== pathname) {
      pendingRouteChange.current = { route: nextStep.route, stepIndex: nextStepIndex };
      router.push(nextStep.route);
      return false;
    }
    if (nextStep?.target) {
      await scrollToTarget(
        nextStep.target,
        nextStep.scrollOffset || currentTour.scrollOffset || 0,
        currentTour.scrollDuration || 1000
      );
    }

    return true;
  }, [activeTour, tours, pathname, router]);

  const nextStep = useCallback(() => {
    if (activeTour) {
      if (stepIndex < tours[activeTour].steps.length - 1) {
        setTimeout(() => {
          setStepIndex(prev => prev + 1);
        }, 500); 
      } else {
        stopTour();
        moveToNextTour();
      }
    }
  }, [activeTour, tours, stepIndex, stopTour]);

  const prevStep = useCallback(() => {
    if (stepIndex > 0) {
      setTimeout(() => {
        setStepIndex(prev => prev - 1);
      }, 500);
    }
  }, [stepIndex]);

  const goToStep = useCallback((step: number) => {
    if (activeTour && step >= 0 && step < tours[activeTour].steps.length) {
      setTimeout(() => {
        setStepIndex(step);
      }, 500);
    }
  }, [activeTour, tours]);

  const getCurrentStep = useCallback(() => stepIndex, [stepIndex]);
  const isRunning = useCallback(() => runTour, [runTour]);

  const handleJoyrideCallback = useCallback(async (data: any) => {
    const { status, type, action, index } = data;
    if (type === EVENTS.STEP_BEFORE) {
      const canProceed = await handleBeforeStep(index);
      if (!canProceed) return;
    }
    if (type === 'error:target_not_found') {
      console.error('Tour target not found');
      stopTour();
      return;
    }
    if (type === EVENTS.STEP_AFTER) {
      if (action === ACTIONS.PREV) {
        prevStep();
      } else if (action === ACTIONS.NEXT) {
        nextStep();
      }
    }
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      if (activeTour && tours[activeTour].callback && !tours[activeTour].disabled) {
        const callbackData = {
          ...data,
          tourId: activeTour,
          currentStep: stepIndex,
        };
        tours[activeTour].callback!(callbackData);
      }
      stopTour();
      return;
    }
  }, [activeTour, tours, handleBeforeStep, stopTour, stepIndex, nextStep, prevStep]);

  return (
    <JoyrideContext.Provider 
      value={{ 
        tours,
        startTour, 
        stopTour, 
        registerTour,
        nextStep,
        prevStep,
        goToStep,
        getCurrentStep,
        isRunning,
        activeTour,
        stepIndex,
        moveToNextTour
      }}
    >
      {activeTour && !tours[activeTour]?.disabled && (
        <Joyride
          {...tours[activeTour]}
          run={runTour}
          stepIndex={stepIndex}
          steps={tours[activeTour].steps}
          continuous={tours[activeTour].continuous ?? true}
          showProgress={tours[activeTour].showProgress ?? true}
          showSkipButton={tours[activeTour].showSkipButton ?? true}
          disableOverlayClose={tours[activeTour].disableOverlayClose ?? false}
          spotlightClicks={tours[activeTour].spotlightClicks ?? false}
          callback={handleJoyrideCallback}
          styles={{
            options: {
              zIndex: 10000,
              ...tours[activeTour].steps[stepIndex]?.styles?.options
            },
            tooltip: {
              ...tours[activeTour].steps[stepIndex]?.styles?.tooltip
            },
            buttonNext: {
              ...tours[activeTour].steps[stepIndex]?.styles?.buttonNext
            },
            buttonBack: {
              ...tours[activeTour].steps[stepIndex]?.styles?.buttonBack
            }
          }}
        />
      )}
      {children}
    </JoyrideContext.Provider>
  );
};

export const useJoyride = () => {
  const context = useContext(JoyrideContext);
  if (!context) {
    throw new Error('useJoyride must be used within a JoyrideProvider');
  }
  return context;
};