'use client';
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { Package } from '@prisma/client';
import { type TEMPLATE } from '@/types/template';
import { type CONTENT } from '@/types/content';
import { type AIError } from '@/types/ai';
import { type PaymentType, CurrencyCode, CreditPaymentInfo } from '@/types/billing';
import { defaultCreditPaymentInfo } from '@/constants/billing';

export interface GeneralContextType {
  state: GeneralState;
  submitTypeRef: React.RefObject<string | undefined>;
}

export type PARTIAL_TEMPLATE = Partial<TEMPLATE>;

export type ContentUpdate = Partial<Pick<CONTENT, 'title' | 'shortDescription' | 'bodyContent' |'category' | 'pageTitle' | 'metaDescription' | 'images' | 'tags' | 'urlHanle' | 'technical' | 'review' | 'product' | 'faq' | 'weight' | 'profit' | 'costPerItem' | 'price'>>;

export type Theme = "light" | "light-mobile" | "light-high-contrast-experimental" | "dark-experimental";

export interface GeneralActionsType {
  setIsLoading: (value: boolean) => void;
  setError: (value: string) => void;
  setIsSidebarOpened: (value: boolean) => void;
  setIsPreview: (value: boolean) => void; 
  setIsFullScreen: (value: boolean) => void;
  setIsEditFullScreen: (value: boolean) => void;
  setOutputContent: (value: PARTIAL_TEMPLATE) => void;
  setAiErrors: (value: AIError[]) => void;
  setCurrentStep: (value: number) => void;
  setPaymentType: (value: PaymentType) => void;  
  setBodyHtml: (value: string) => void;
  setTheme: (theme: Theme) => void;
  setCreditPaymentInfo: (value: CreditPaymentInfo) => void;
}

class GeneralState {
  outputContent: TEMPLATE = {};
  isSidebarOpened: boolean = false;
  isLoading: boolean = false;
  error: string = '';
  bodyHtml: string = '';
  isPreview: boolean = false; 
  isFullScreen: boolean = false;
  isEditFullScreen: boolean = false;
  aiErrors: AIError[] = [];
  currentStep: number = 0;
  theme: Theme = "light";
  creditPaymentInfo: defaultCreditPaymentInfo;
  paymentType: PaymentType = 'SUBSCRIPTION';

  constructor(init?: Partial<GeneralState>) {
    Object.assign(this, init);
  }
}

const InitialValues: GeneralContextType = {
  state: new GeneralState(),
  submitTypeRef: { current: undefined },
};

const GeneralContext = createContext<GeneralContextType>(InitialValues);
const GeneralActionsContext = createContext<GeneralActionsType | undefined>(undefined);

export const GeneralContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<GeneralState>(new GeneralState());
  const submitTypeRef = useRef<string | undefined>(undefined);

  const setIsLoading = useCallback((value: boolean) =>
    setState(prev => ({ ...prev, isLoading: value })), []);

  const setError = useCallback((value: string) =>
    setState(prev => ({ ...prev, error: value })), []);

  const setBodyHtml = useCallback((value: string) =>
    setState(prev => ({ ...prev, bodyHtml: value })), []);

  const setAiErrors = useCallback((value: AIError[]) =>
    setState(prev => ({ ...prev, aiErrors: value })), []);

  const setIsSidebarOpened = useCallback((value: boolean) =>
    setState(prev => ({ ...prev, isSidebarOpened: value })), []);

  const setIsPreview = useCallback((value: boolean) =>
    setState(prev => ({ ...prev, isPreview: value })), []); 

  const setIsFullScreen = useCallback((value: boolean) =>
    setState(prev => ({ ...prev, isFullScreen: value })), []);

  const setIsEditFullScreen = useCallback((value: boolean) =>
    setState(prev => ({ ...prev, isEditFullScreen: value })), []);

  const setCurrentStep = useCallback((value: number) =>
    setState(prev => ({ ...prev, currentStep: value })), []);

  const setPaymentType = useCallback((value: PaymentType) =>
    setState(prev => ({ ...prev, paymentType: value })), []);

  const setCreditPaymentInfo = useCallback((value: CreditPaymentInfo) =>
    setState(prev => ({ ...prev, creditPaymentInfo: value })), []);

  const setOutputContent = useCallback((updates: ContentUpdate) => {
    setState(prev => ({
      ...prev,
      outputContent: {
        ...prev.outputContent, 
        ...updates 
      }
    }));
  }, []);

  const setTheme = useCallback((theme: Theme) => {
    setState(prev => ({ ...prev, theme }));
    localStorage.setItem('theme', theme);
  }, []);

  return (
    <GeneralContext.Provider value={{ state, submitTypeRef }}>
      <GeneralActionsContext.Provider value={{
        setIsLoading,
        setError,
        setIsSidebarOpened,
        setIsPreview, 
        setIsFullScreen,
        setIsEditFullScreen,
        setOutputContent,
        setAiErrors,
        setTheme,
        setPaymentType,
        setCurrentStep,
        setCreditPaymentInfo,
        setBodyHtml,
      }}>
        {children}
      </GeneralActionsContext.Provider>
    </GeneralContext.Provider>
  );
};

export const useGeneralContext = () => {
  const context = useContext(GeneralContext);
  if (!context) {
    throw new Error('useGeneralContext must be used within a ContextProvider');
  }
  return context;
};

export const useGeneralActions = () => {
  const context = useContext(GeneralActionsContext);
  if (!context) {
    throw new Error('useGeneralActions must be used within a GeneralActionsProvider');
  }
  return context;
};

