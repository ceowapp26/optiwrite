import { createSlice, PayloadAction, createSelector } from '@reduxjs/toolkit';

interface ImageCache {
  images: any[];
  timestamp: number;
  preloaded: boolean;
}

const CACHE_DURATION = 2 * 60 * 60 * 1000;

const initialState: ImageCache = {
  images: [],
  timestamp: 0,
  preloaded: false
};

export const imageSlice = createSlice({
  name: 'image',
  initialState,
  reducers: {
    setImageCache: (state, action: PayloadAction<ImageCache>) => {
      state.images = action.payload.images;
      state.timestamp = action.payload.timestamp;
      state.preloaded = action.payload.preloaded;
    },
    clearImageCache: (state) => {
      state.images = [];
      state.timestamp = 0;
      state.preloaded = false;
    }
  }
});

export const selectImageCache = createSelector(
  (state: { image }) => state?.image,
  (image) => image
);

export const { setImageCache, clearImageCache } = imageSlice.actions;

export default imageSlice.reducer;
