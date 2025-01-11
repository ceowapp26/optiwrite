import Joyride, { STATUS, EVENTS, ACTIONS } from 'react-joyride';

export interface JoyrideStep {
  target: string;
  content: string | React.ReactNode;
  title?: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  disableBeacon?: boolean;
  isModal?: boolean;
  offset?: number;
  route?: string; 
  scrollOffset?: number;
  spotlightPadding?: number;
  styles?: {
    options?: Record<string, any>;
    tooltip?: Record<string, any>;
    buttonNext?: Record<string, any>;
    buttonBack?: Record<string, any>;
  };
}

export interface JoyrideConfig {
  steps: JoyrideStep[];
  continuous?: boolean;
  showProgress?: boolean;
  showSkipButton?: boolean;
  disableOverlayClose?: boolean;
  spotlightClicks?: boolean;
  controlled?: boolean; 
  autoStart?: boolean;
  scrollDuration?: number;
  scrollOffset?: number;
  callback?: (data: any) => void;
  beforeStepChange?: (nextIndex: number) => boolean | Promise<boolean>;
}

export interface JoyrideContextType {
  startTour: (tourId: string) => void;
  stopTour: () => void;
  registerTour: (tourId: string, config: JoyrideConfig) => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  getCurrentStep: () => number;
  isRunning: () => boolean;
}