import { createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit";

const initialProduct: PRODUCT = {
  contentId: "",
  input: {},
  output: {
    title: "",
    product_type: "",
    body_html: "",
    handle: "",
    template_suffix: null,
    image: "",
    images: [],
    vendor: "",
    tags: "",
    options: [],
    variants: [],
    status: "draft",
    page_title: "",
    meta_description: "",
  }
};

const initialBlog: BLOG = {
  contentId: "",
  input: {},
  output: {
    blog_title: "",
    blog_commentable: "no",
    blog_feedburner: null,
    blog_feedburner_location: null,
    blog_handle: "",
    blog_metafields: "[]",
    blog_tags: "",
    blog_template_suffix: null,
    article_title: "",
    article_author: "",
    article_body_html: "",
    article_handle: "",
    article_image: "",
    article_metafields: "[]",
    article_published: true,
    article_summary_html: null,
    article_tags: "",
    article_template_suffix: null
  }
};

export type CONTENT = PRODUCT | BLOG;

const initialState: { content: CONTENT | null } = {
  content: null,
};

const contentSlice = createSlice({
  name: "contents",
  initialState,
  reducers: {
    setContentData: (state, action: PayloadAction<CONTENT>) => {
      state.content = action.payload;
    },
    updateContentData: (state, action: PayloadAction<Partial<typeof initialState.content["output"]>>) => {
      if (state.content?.output) {
        state.content.output = {
          ...state.content.output,
          ...action.payload,
        };
      }
    },
    updateBodyContent: (state, action: PayloadAction<string>) => {
      if (state.content?.output) {
        if ('body_html' in state.content.output) {
          state.content.output.body_html = action.payload;
        }
        if ('article_body_html' in state.content.output) {
          state.content.output.article_body_html = action.payload;
        }
      }
    },
    addIcon: (state, action: PayloadAction<string>) => {
      if (state.content?.output && 'icon' in state.content.output) {
        state.content.output.icon = action.payload;
      }
    },
    removeIcon: (state, action: PayloadAction<void>) => {
      if (state.content?.output && 'icon' in state.content.output) {
        state.content.output.icon = null;
      }
    },
    updateTitle: (state, action: PayloadAction<string>) => {
      if (state.content?.output) {
        if ('title' in state.content.output) {
          state.content.output.title = action.payload;
        }
        if ('article_title' in state.content.output) {
          state.content.output.article_title = action.payload;
        }
      }
    },
    addImage: (state, action: PayloadAction<string>) => {
      if (state.content?.output && 'images' in state.content.output) {
        state.content.output.images = [...(state.content.output.images || []), action.payload];
      }
      if (state.content?.output && 'article_images' in state.content.output) {
        state.content.output.article_images = [...(state.content.output.article_images || []), action.payload];
      }
    },
    removeImage: (state, action: PayloadAction<string>) => {
      if (state.content?.output && 'images' in state.content.output) {
        state.content.output.images = state.content.output.images.filter(img => img !== action.payload);
      }
      if (state.content?.output && 'article_images' in state.content.output) {
        state.content.output.article_images = state.content.output.article_images.filter(img => img !== action.payload);
      }
    },
    replaceImage: (state, action: PayloadAction<{ oldUrl: string; newUrl: string }>) => {
      if (state.content?.output && 'images' in state.content.output) {
        state.content.output.images = state.content.output.images.map(img => 
          img === action.payload.oldUrl ? action.payload.newUrl : img
        );
      }
      if (state.content?.output && 'article_images' in state.content.output) {
        state.content.output.article_images = state.content.output.article_images.map(img => 
          img === action.payload.oldUrl ? action.payload.newUrl : img
        );
      }
    },
    setFeaturedImage: (state, action: PayloadAction<string>) => {
      if (state.content?.output) {
        if ('image' in state.content.output) {
          state.content.output.image = { src: action.payload };
          state.content.output.images = state.content.output.images.filter(img => img !== action.payload);
        }
        if ('article_image' in state.content.output) {
          state.content.output.article_image = { src: action.payload };
          state.content.output.article_images = state.content.output.article_images.filter(img => img !== action.payload);
        }
      }
    },
    reset: (state) => {
      state.content = null;
    }
  },
});

export const {
  setContentData,
  updateContentData,
  updateBodyContent,
  addImage,
  removeImage,
  replaceImage,
  setFeaturedImage,
  addIcon,
  removeIcon,
  updateTitle,
  reset
} = contentSlice.actions;

export const selectContentData = createSelector(
  (state: { contents: typeof initialState }) => state?.contents,
  (contents) => contents?.content
);

export const getContentData = (id: string) =>
  createSelector(
    (state: { contents: typeof initialState }) => state?.contents?.content,
    (content) => (content && content?.contentId === id ? content : null)
  );

export default contentSlice.reducer;