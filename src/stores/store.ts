import { configureStore, ThunkAction, Action } from '@reduxjs/toolkit';
import { persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import storage from '@/stores/utils/storage';
import authReducer from "@/stores/features/authSlice";
import coversReducer from '@/stores/features/coversSlice';
import contentReducer from "@/stores/features/contentSlice";
import templateReducer from "@/stores/features/templateSlice";
import imageReducer from "@/stores/features/imageSlice";

const persistConfigAuth = {
  key: 'auth',
  storage,
};

const persistConfigEditor = {
  key: 'editor',
  storage,
};

const persistConfigContent = {
  key: 'content',
  storage,
};

const persistConfigTemplate = {
  key: 'template',
  storage,
};

const persistConfigImage = {
  key: 'image',
  storage,
};

const persistedAuthReducer = persistReducer(persistConfigAuth, authReducer);

const persistedCoverReducer = persistReducer(persistConfigEditor, coversReducer);

const persistedContentReducer = persistReducer(persistConfigContent, contentReducer);

const persistedTemplateReducer = persistReducer(persistConfigTemplate, templateReducer);

const persistedImageReducer = persistReducer(persistConfigImage, imageReducer);

export const store = configureStore({
  reducer: {
    auth: persistedAuthReducer,
    covers: persistedCoverReducer,
    contents: persistedContentReducer,
    templates: persistedTemplateReducer,
    image: persistedImageReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export default store;
export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;