import { ContentCategory } from '@/types/content';

export function processJsonData<T extends 'object' | 'array'>(data: any, type: T): T extends 'object' ? Record<string, any> : any[] {
  try {
    if (typeof data === 'string' && data.trim()) {
      if ((data.trim().startsWith('{') && data.trim().endsWith('}')) || (data.trim().startsWith('[') && data.trim().endsWith(']'))) {
        const parsedData = JSON.parse(data);
        if (type === 'object' && typeof parsedData === 'object' && !Array.isArray(parsedData)) {
          return parsedData as Record<string, any>;
        }
        if (type === 'array' && Array.isArray(parsedData)) {
          return parsedData as any[];
        }
      }
    } else if (typeof data === 'object' && data !== null) {
      if (type === 'object' && !Array.isArray(data)) {
        return data as Record<string, any>;
      }
      if (type === 'array' && Array.isArray(data)) {
        return data as any[];
      }
    }
  } catch (error) {
  }
  return (type === 'object' ? {} : []) as T extends 'object' ? Record<string, any> : any[];
}


interface UrlParsingResult {
  success: boolean;
  handle?: string;
  error?: string;
}

export const normalizeHandle = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-') 
    .replace(/^-+|-+$/g, '');    
};

export const extractArticleHandleFromUrl = (url: string, title?: string): UrlParsingResult => {
  try {
    if (!url && !title) {
      return { success: false, error: 'Both URL and title are empty' };
    }
    if (!url && title) {
      return { success: true, handle: normalizeHandle(title) };
    }
    if (!url.includes('/')) {
      return { success: true, handle: url.toLowerCase() };
    }
    if (url.startsWith('/')) {
      return { success: true, handle: url.substring(1).toLowerCase() };
    }
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      const articlesIndex = pathParts.indexOf('articles');
      if (articlesIndex !== -1 && pathParts[articlesIndex + 1]) {
        return { success: true, handle: pathParts[articlesIndex + 1].toLowerCase() };
      }
      return { success: true, handle: pathParts[pathParts.length - 1].toLowerCase() };
    } catch (urlError) {
      const articlesMatch = url.split('/articles/')[1];
      if (articlesMatch) {
        return { success: true, handle: articlesMatch.toLowerCase() };
      }
      if (title) {
        return { success: true, handle: normalizeHandle(title) };
      }
    }
    return { success: false, error: 'Could not extract article handle' };
  } catch (error) {
    if (title) {
      return { success: true, handle: normalizeHandle(title) };
    }
    return { 
      success: false, 
      error: `Failed to parse URL: ${error.message}` 
    };
  }
};

export const extractBlogHandleFromUrl = (url: string, title?: string): UrlParsingResult => {
  try {
    if (!url && !title) {
      return { success: false, error: 'Both URL and title are empty' };
    }
    if (!url && title) {
      return { success: true, handle: normalizeHandle(title) };
    }
    if (!url.includes('/')) {
      return { success: true, handle: url.toLowerCase() };
    }
    if (url.startsWith('/')) {
      return { success: true, handle: url.substring(1).toLowerCase() };
    }
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      const blogsIndex = pathParts.indexOf('blogs');
      if (blogsIndex !== -1 && pathParts[blogsIndex + 1]) {
        return { success: true, handle: pathParts[blogsIndex + 1].toLowerCase() };
      }
      return { success: true, handle: pathParts[pathParts.length - 1].toLowerCase() };
    } catch (urlError) {
      const blogsMatch = url.split('/blogs/')[1];
      if (blogsMatch) {
        const handle = blogsMatch.split('/')[0];
        return { success: true, handle: handle.toLowerCase() };
      }
      if (title) {
        return { success: true, handle: normalizeHandle(title) };
      }
    }
    return { success: false, error: 'Could not extract blog handle' };
  } catch (error) {
    if (title) {
      return { success: true, handle: normalizeHandle(title) };
    }
    return { 
      success: false, 
      error: `Failed to parse URL: ${error.message}` 
    };
  }
};

export const extractProductHandleFromUrl = (url: string, title?: string): UrlParsingResult => {
  try {
    if (!url && !title) {
      return { success: false, error: 'Both URL and title are empty' };
    }
    if (!url && title) {
      return { success: true, handle: normalizeHandle(title) };
    }
    if (!url.includes('/')) {
      return { success: true, handle: url.toLowerCase() };
    }
    if (url.startsWith('/')) {
      return { success: true, handle: url.substring(1).toLowerCase() };
    }
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      const blogsIndex = pathParts.indexOf('products');
      if (blogsIndex !== -1 && pathParts[blogsIndex + 1]) {
        return { success: true, handle: pathParts[blogsIndex + 1].toLowerCase() };
      }
      return { success: true, handle: pathParts[pathParts.length - 1].toLowerCase() };
    } catch (urlError) {
      const blogsMatch = url.split('/products/')[1];
      if (blogsMatch) {
        const handle = blogsMatch.split('/')[0];
        return { success: true, handle: handle.toLowerCase() };
      }
      if (title) {
        return { success: true, handle: normalizeHandle(title) };
      }
    }
    return { success: false, error: 'Could not extract product handle' };
  } catch (error) {
    if (title) {
      return { success: true, handle: normalizeHandle(title) };
    }
    return { 
      success: false, 
      error: `Failed to parse URL: ${error.message}` 
    };
  }
};

export const constructArticleUrl = (
  shopName: string, 
  blogTitle: string, 
  urlHandle: string
): UrlParsingResult => {
  try {
    if (!shopName || !blogTitle || !urlHandle) {
      return { 
        success: false, 
        error: 'Missing required parameters' 
      };
    }
    const cleanShopName = shopName.trim().toLowerCase();
    const cleanBlogTitle = blogTitle
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-') 
      .replace(/^-+|-+$/g, '');
    const cleanHandle = urlHandle
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '');
    if (!cleanShopName || !cleanBlogTitle || !cleanHandle) {
      return { 
        success: false, 
        error: 'Invalid parameters after cleaning' 
      };
    }
    const url = `https://${cleanShopName}.myshopify.com/blogs/${cleanBlogTitle}/${cleanHandle}`;
    return { success: true, handle: url };
  } catch (error) {
    return { 
      success: false, 
      error: `Failed to construct URL: ${error.message}` 
    };
  }
};

export const constructBlogUrl = (
  shopName: string, 
  urlHandle: string
): UrlParsingResult => {
  try {
    if (!shopName || !urlHandle) {
      return { 
        success: false, 
        error: 'Missing required parameters' 
      };
    }
    const cleanShopName = shopName.trim().toLowerCase();
    const cleanHandle = urlHandle
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '');
    if (!cleanShopName || !cleanHandle) {
      return { 
        success: false, 
        error: 'Invalid parameters after cleaning' 
      };
    }
    const url = `https://${cleanShopName}.myshopify.com/blogs/${cleanHandle}`;
    return { success: true, handle: url };
  } catch (error) {
    return { 
      success: false, 
      error: `Failed to construct URL: ${error.message}` 
    };
  }
};

export const constructProductUrl = (
  shopName: string, 
  urlHandle: string
): UrlParsingResult => {
  try {
    if (!shopName || !urlHandle) {
      return { 
        success: false, 
        error: 'Missing required parameters' 
      };
    }
    const cleanShopName = shopName.trim().toLowerCase();
    const cleanHandle = urlHandle
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '');
    if (!cleanShopName || !cleanHandle) {
      return { 
        success: false, 
        error: 'Invalid parameters after cleaning' 
      };
    }
    const url = `https://${cleanShopName}.myshopify.com/blogs/${cleanHandle}`;
    return { success: true, handle: url };
  } catch (error) {
    return { 
      success: false, 
      error: `Failed to construct URL: ${error.message}` 
    };
  }
};

export function processHandle(data, category, shopName, blogTitle = null) {
  let handle = data.handle;
  switch (category) {
    case ContentCategory.BLOG:
      const blogExtractResult = extractBlogHandleFromUrl(data.handle, data.title);
      if (blogExtractResult.success) {
        const blogFinalResult = constructBlogUrl(shopName, blogExtractResult.handle);
        handle = blogFinalResult.success ? blogFinalResult.handle : data.handle;
      }
      break;
    case ContentCategory.ARTICLE:
      const articleExtractResult = extractArticleHandleFromUrl(data.handle, data.title);
      if (articleExtractResult.success && blogTitle) {
        const articleFinalResult = constructArticleUrl(
          shopName,
          blogTitle,
          articleExtractResult.handle
        );
        handle = articleFinalResult.success ? articleFinalResult.handle : data.handle;
      }
      break;
    case ContentCategory.PRODUCT:
      const productExtractResult = extractProductHandleFromUrl(data.handle, data.title);
      if (productExtractResult.success) {
        const productFinalResult = constructProductUrl(shopName, productExtractResult.handle);
        handle = productFinalResult.success ? productFinalResult.handle : data.handle;
      }
      break;
      
    default:
      break;
  }
  return handle;
}