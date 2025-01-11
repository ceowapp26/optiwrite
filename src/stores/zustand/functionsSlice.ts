import { StoreSlice } from './store';

export interface FunctionSlice {
  replaceAI: void;
  insertAboveAI: void;
  insertBelowAI: void;
  insertLeftAI: void;
  insertRightAI: void;
}

export const createFunctionSlice: StoreSlice<FunctionSlice> = (set, get) => ({
  replaceAI: null,
  insertAboveAI: null,
  insertBelowAI: null,
  insertLeftAI: null,
  insertRightAI: null,

  setReplaceAI: (replaceAI: void) => {
    set((prev: FunctionSlice) => ({
      ...prev,
      replaceAI: replaceAI,
    }));
  },
  setInsertAboveAI: (insertAboveAI: void) => {
    set((prev: FunctionSlice) => ({
      ...prev,
      insertAboveAI: insertAboveAI,
    }));
  },
  setInsertBelowAI: (insertBelowAI: void) => {
    set((prev: FunctionSlice) => ({
      ...prev,
      insertBelowAI: insertBelowAI,
    }));
  },
  setInsertLeftAI: (insertLeftAI: void) => {
    set((prev: FunctionSlice) => ({
      ...prev,
      insertLeftAI: insertLeftAI,
    }));
  },
  setInsertRightAI: (insertRightAI: void) => {
    set((prev: FunctionSlice) => ({
      ...prev,
      insertRightAI: insertRightAI,
    }));
  },
});