import { createSlice, createSelector, PayloadAction } from "@reduxjs/toolkit";
import { ObjectMetafield,  IProductVariant, IProductImage, IProductOption } from '@/types/content';
import { processJsonData } from '@/utils/data';

interface Item {
  id: string;
  type: 'blog' | 'article' | 'product';
  icon?: any;
  blog_commentable?: 'moderate' | 'no' | 'yes';
  blog_feedburner?: string | null;
  blog_feedburner_location?: string | null;
  blog_handle?: string;
  blog_metafield?: ObjectMetafield[];
  blog_tags?: string;
  blog_template_suffix?: string | null;
  blog_title?: string;

  article_author?: string;
  article_body_html?: string;
  article_handle?: string;
  article_image?: string;
  article_metafield?: ObjectMetafield[];
  article_summary_html?: string | null;
  article_tags?: string;
  article_template_suffix?: string | null;
  article_title?: string;

  body_html?: string;
  created_at?: string;
  handle?: string;
  id?: number;
  image?: IProductImage;
  images?: IProductImage[];
  options?: IProductOption[];
  product_type?: string;
  published_at?: string;
  published_scope?: string;
  tags?: string;
  template_suffix?: string | null;
  title?: string;
  metafields_global_title_tag?: string;
  metafields_global_description_tag?: string;
  updated_at?: string;
  variants?: IProductVariant[];
  vendor?: string;
  status?: 'active' | 'archived' | 'draft';
  isFavorite?: boolean;  
}

interface List {
  id: string;
  name: string;
  description?: string;
  items: Item[]; 
}

interface CreateListPayload {
  id: string;
  name: string;
  description?: string;
  items?: Item[];
}

interface UpdateListPayload {
  id: string;
  name?: string;
  description?: string;
  items?: Item[];
}

interface TemplatesState {
  templates: {
    blog: string[];
    article: string[];
    product: string[];
  };
  favorites: {
    blog: string[];
    article: string[];
    product: string[];
  };
  lists: List[];
}

const initialState: TemplatesState = {
  templates: {
    blog: [],
    article: [],
    product: []
  },
  favorites: {
    blog: [],
    article: [],
    product: []
  },
  lists: []
};

const templatesSlice = createSlice({
  name: 'templates',
  initialState,
  reducers: {
    createTemplates(state, action: PayloadAction<{ 
      type: 'blog' | 'article' | 'product', 
      items: Item[] 
    }>) {
      const { type, items } = action.payload;
      const processedItems = items.map(item => ({
        ...item,
        id: item.id || uuidv4(),
        type,
        isFavorite: item.isFavorite || false
      }));
      state.templates[type] = processedItems;
    },

    updateTemplates(state, action: PayloadAction<{ 
      type: 'blog' | 'article' | 'product', 
      items: Item[] 
    }>) {
      const { type, items } = action.payload;
      const existingTemplates = state.templates[type];
      const updatedTemplates = items.map(newItem => {
        const existingItem = existingTemplates.find(item => item.id === newItem.id);
        return {
          ...existingItem,
          ...newItem,
          id: newItem.id || existingItem?.id || uuidv4(),
          type
        };
      });
      state.templates[type] = updatedTemplates;
    },

    deleteTemplate(state, action: PayloadAction<{ 
      type: 'blog' | 'article' | 'product', 
      id: string 
    }>) {
      const { type, id } = action.payload;
      state.templates[type] = state.templates[type].filter(template => template.id !== id);
      state.favorites[type] = state.favorites[type].filter(favoriteId => favoriteId !== id);
      state.lists = state.lists.map(list => ({
        ...list,
        items: list.items.filter(item => 
          !(item.type === type)
        )
      }));
    },

    clearTemplatesByType(state, action: PayloadAction<'blog' | 'article' | 'product'>) {
      const type = action.payload;
      state.templates[type] = [];
      state.favorites[type] = [];
      state.lists = state.lists.map(list => ({
        ...list,
        items: list.items.filter(item => item.type !== type)
      }));
    },

    addToFavorites(state, action: PayloadAction<{ 
      type: 'blog' | 'article' | 'product', 
      id: string 
    }>) {
      const { type, id } = action.payload;
      if (!state.favorites[type].includes(id)) {
        state.favorites[type].push(id);
      }
    },

    removeFromFavorites(state, action: PayloadAction<{ 
      type: 'blog' | 'article' | 'product', 
      id: string 
    }>) {
      const { type, id } = action.payload;
      state.favorites[type] = state.favorites[type].filter(
        favoriteId => favoriteId !== id
      );
    },

    createList(state, action: PayloadAction<CreateListPayload>) {
      const { id, name, description, items = [] } = action.payload;
      const newList: List = {
        id,
        name,
        description: description || '',
        items
      };
      state.lists.push(newList);
    },

    deleteList(state, action: PayloadAction<string>) {
      state.lists = state.lists.filter(list => list.id !== action.payload);
    },

    updateList(state, action: PayloadAction<UpdateListPayload>) {
      const { id, name, description, items } = action.payload;
      const listIndex = state.lists.findIndex(list => list.id === id);
      if (listIndex !== -1) {
        state.lists[listIndex] = {
          ...state.lists[listIndex],
          ...(name && { name }),
          ...(description && { description }),
          ...(items && { items }),
        };
      }
    },

    addItemToList(state, action: PayloadAction<{ 
      listId: string, 
      item: Item 
    }>) {
      const { listId, item } = action.payload;
      const listIndex = state.lists.findIndex(list => list.id === listId);
      if (listIndex !== -1) {
        const isDuplicate = state.lists[listIndex].items.some(
          existingItem => existingItem.id === item.id
        );
        if (!isDuplicate) {
          state.lists[listIndex].items.push(item);
        }
      }
    },

    removeItemFromList(state, action: PayloadAction<{ 
      listId: string, 
      itemId: string 
    }>) {
      const { listId, itemId } = action.payload;
      const listIndex = state.lists.findIndex(list => list.id === listId);
      if (listIndex !== -1) {
        state.lists[listIndex].items = state.lists[listIndex].items.filter(
          item => item.id !== itemId
        );
      }
    },

    clearFavoritesByType(state, action: PayloadAction<'blog' | 'article' | 'product'>) {
      state.favorites[action.payload] = [];
    },

    clearAllFavorites(state) {
      state.favorites = {
        blog: [],
        article: [],
        product: []
      };
    }
  }
});

export const { 
  createTemplates,
  updateTemplates,
  deleteTemplate,
  clearTemplatesByType,
  addToFavorites,
  removeFromFavorites,
  clearFavoritesByType,
  clearAllFavorites,
  createList,
  deleteList,
  updateList,
  addItemToList,
  removeItemFromList
} = templatesSlice.actions;

const selectTemplatesState = (state: { templates: TemplatesState }) => state.templates;

export const selectTemplatesByType = (state: { templates: TemplatesState }) => 
  state.templates.templates;

export const selectTemplateByTypeAndId = (
  state: { templates: TemplatesState }, 
  type: 'blog' | 'article' | 'product', 
  id: string
) => state.templates.templates[type].find(template => template.id === id);

export const selectTemplates = createSelector(
  [selectTemplatesState],
  (state) => state.templates
);

export const selectFavorites = createSelector(
  [selectTemplatesState],
  (state) => state.favorites
);

export const selectLists = createSelector(
  [selectTemplatesState],
  (state) => state.lists
);

export const selectListById = createSelector(
  [selectLists, (state, listId: string) => listId],
  (lists, listId) => lists.find(list => list.id === listId)
);

export const selectTemplatesList = createSelector(
  [(state) => selectListById(state, 'templateList')],
  (list) => {
    try {
      const processed = processJsonData(list?.items || []);
      return Array.isArray(processed) ? processed : [];
    } catch (error) {
      console.error('Error in template selector:', error);
      return [];
    }
  }
);

export const selectFavoritesByType = createSelector(
  [selectFavorites, (state, type: 'blog' | 'article' | 'product') => type],
  (favorites, type) => favorites[type]
);

export const selectListsWithItems = createSelector(
  [selectLists],
  (lists) => lists
);

export default templatesSlice.reducer;