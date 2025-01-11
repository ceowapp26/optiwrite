import { StoreApi, create } from 'zustand';
import { persist } from 'zustand/middleware';
import { FunctionSlice, createFunctionSlice } from './functionsSlice';
import { migrateV0 } from './migrate';

export type StoreState = FunctionSlice;

export type StoreSlice<T> = (
  set: StoreApi<StoreState>['setState'],
  get: StoreApi<StoreState>['getState']
) => T;

export const createPartializedState = (state: StoreState) => ({
  replaceAI: state.replaceAI,
  insertAboveAI: state.insertAboveAI,
  insertBelowAI: state.insertBelowAI,
  insertLeftAI: state.insertLeftAI,
  insertRightAI: state.insertRightAI,
});

export const useContentStore = create<StoreState>()(
  persist(
    (set, get) => ({
      ...createFunctionSlice(set, get),
    }),
    {
      name: 'optiwrite-editor',
      partialize: (state) => createPartializedState(state),
      version: 3,
      migrate: (persistedState, version) => {
        switch (version) {
          case 0:
            migrateV0(persistedState as any);
            break;
        }
        return persistedState as StoreState;
      },
    }
  )
);
