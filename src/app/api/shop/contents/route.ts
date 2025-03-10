import { initializeShopify } from "@/lib/shopify";
import { ContentManager } from '@/utils/content';
import { handleShopifyInitError } from '@/utils/api/customAPIErrorHandlers';
import { ShopifySessionManager } from '@/utils/storage';
import { GenericAPIErrorHandler } from '@/utils/api';
import { ContentCategory, CATEGORY } from '@/types/content';
import { ContentOperations } from '@/utils/content/contentOperation';
import { shopify } from '@/lib/shopify';

export const dynamic = 'force-dynamic';

interface ShopifyProduct {
  id: number;
  images: any[];
  [key: string]: any;
}

interface ShopifyBlog {
  id: number;
  title: string;
  commentable: boolean;
  feedburner: string;
  feedburner_location: string;
  handle: string;
  tags: string[];
  template_suffix: string;
  metafield: any;
  [key: string]: any;
}

interface ShopifyArticle {
  id: number;
  blog_id: number;
  author: string;
  created_at: string;
  published_at: string;
  updated_at: string;
  summary_html: string;
  handle: string;
  title: string;
  body_html: string;
  [key: string]: any;
}

interface ShopifyContent {
  id: string | number;
  published_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface GroupedContent {
  products: { id: string | number }[];
  blogs: { id: string | number }[];
  articles: { id: string | number }[];
}

function getLatestTimestamp(content: ShopifyContent): number {
  return Math.max(
    content.published_at ? new Date(content.published_at).getTime() : 0,
    content.created_at ? new Date(content.created_at).getTime() : 0,
    content.updated_at ? new Date(content.updated_at).getTime() : 0
  );
}

class RateLimiter {
  private timestamps: number[] = [];
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number = 1000, maxRequests: number = 2) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    this.timestamps = this.timestamps.filter(time => now - time < this.windowMs);
    if (this.timestamps.length >= this.maxRequests) {
      const oldestTimestamp = this.timestamps[0];
      const waitTime = this.windowMs - (now - oldestTimestamp);
      if (waitTime > 0) {
        await delay(waitTime);
      }
    }
    this.timestamps.push(now);
  }
}

class RateLimitMonitor {
  private static rateLimitHits = 0;
  private static readonly ALERT_THRESHOLD = 50;
  static trackRateLimit() {
    this.rateLimitHits++;
    if (this.rateLimitHits > this.ALERT_THRESHOLD) {
      console.warn(`High rate limit hits detected: ${this.rateLimitHits}`);
    }
  }
  static reset() {
    this.rateLimitHits = 0;
  }
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function getBackoffTime(retry: number, baseDelay: number): number {
  const exponential = baseDelay * Math.pow(2, retry);
  const jitter = Math.random() * 1000;
  return exponential + jitter;
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries = 3,
  baseDelay = 1000
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: any) {
       if (error?.response?.statusCode === 400) {
        throw error;
      }
      if (error?.code === 'ERR_NON_2XX_3XX_RESPONSE' && 
          error?.response?.statusCode === 429) {
        RateLimitMonitor.trackRateLimit();
        if (i === retries - 1) throw error;
        const waitTime = getBackoffTime(i, baseDelay);
        await delay(waitTime);
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries reached');
}

async function batchRequests<T>(
  items: any[],
  batchSize: number,
  processFn: (item: any) => Promise<T>,
  delayMs: number = 1000
): Promise<T[]> {
  const results: T[] = [];
  const chunks = [];
  for (let i = 0; i < items.length; i += batchSize) {
    chunks.push(items.slice(i, i + batchSize));
  }
  for (const chunk of chunks) {
    const chunkResults = await Promise.all(
      chunk.map(item => processFn(item))
    );
    results.push(...chunkResults);
    if (chunks.indexOf(chunk) < chunks.length - 1) {
      await delay(delayMs);
    }
  }
  return results.flat();
}

const RATE_LIMITER = new RateLimiter(1000, 2); 
const BATCH_SIZE = 50;
const BLOG_BATCH_SIZE = 10;
const BATCH_DELAY = 2000;

async function fetchBlogArticles(shopify: any, blogId: number): Promise<ShopifyArticle[]> {
  try {
    await RATE_LIMITER.waitIfNeeded();
    return await retryWithBackoff(() => shopify.article.list(blogId));
  } catch (error) {
    console.error(`Error fetching articles for blog ${blogId}:`, error);
    return [];
  }
}

async function fetchAllProducts(shopify: any): Promise<ShopifyProduct[]> {
  await RATE_LIMITER.waitIfNeeded();
  const products = await retryWithBackoff(() => 
    shopify.product.list()
  );
  return products;
}

async function fetchContentWithRetry(
  shopify: any,
  shopName: string,
  page: number,
  limit: number,
): Promise<any> {
  try {
    const [shopifyProducts, shopifyBlogs] = await Promise.all([
      shopify.product.list(),
      shopify.blog.list(),
    ]);
    const shopifyArticles = await fetchArticlesWithRateLimit(shopify, shopifyBlogs);
    const totalShopifyContent = shopifyProducts.length + shopifyBlogs.length + shopifyArticles.length;
    if (totalShopifyContent < limit) {
      const dbContent = await ContentManager.getUserContentHistory(shopName, page, totalShopifyContent);
      const totalContent = await ContentManager.getAllContents(shopName);
      return processContentResponse(dbContent, shopifyProducts, shopifyBlogs, shopifyArticles, totalContent);
    }
    let dbContent = [];
    let totalFound = 0;
    let currentLimit = limit;
    let multiplier = 1;
    while (multiplier <= 4 && totalFound < limit) {
      dbContent = await ContentManager.getUserContentHistory(shopName, page, currentLimit);
      const groupedContent = groupContentByType(dbContent);
      totalFound = countMatchingContent(
        groupedContent,
        shopifyProducts,
        shopifyBlogs,
        shopifyArticles
      );

      if (totalFound >= limit) break;
      if (dbContent.length < currentLimit) break; 
      if (currentLimit >= totalShopifyContent) break;
      multiplier++;
      currentLimit = Math.min(limit * multiplier, totalShopifyContent);
    }
    const totalContent = await ContentManager.getAllContents(shopName);
    return processContentResponse(dbContent, shopifyProducts, shopifyBlogs, shopifyArticles, totalContent);
  } catch (error) {
    throw new Error(`Failed to fetch content: ${error.message}`);
  }
}

async function fetchArticlesWithRateLimit(shopify: any, blogs: any[]): Promise<ShopifyArticle[]> {
  const BATCH_SIZE = 3;
  const DELAY_MS = 2000; 
  let allArticles: ShopifyArticle[] = [];
  for (let i = 0; i < blogs.length; i += BATCH_SIZE) {
    const batch = blogs.slice(i, i + BATCH_SIZE);
    const batchPromises = batch.map(blog => shopify.article.list(blog.id));
    const batchResults = await Promise.all(batchPromises);
    allArticles.push(...batchResults.flat());
    if (i + BATCH_SIZE < blogs.length) {
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
  }
  return allArticles;
}

function countMatchingContent(
  groupedContent: GroupedContent,
  shopifyProducts: ShopifyContent[],
  shopifyBlogs: ShopifyContent[],
  shopifyArticles: ShopifyContent[]
): number {
  try {
    const products = groupedContent?.products || [];
    const blogs = groupedContent?.blogs || [];
    const articles = groupedContent?.articles || [];
    const matchingProducts = (shopifyProducts || [])
      .filter(product => 
        products.some(dbProduct => 
          String(dbProduct.id) === String(product.id)
        )
      )
      .sort((a, b) => getLatestTimestamp(b) - getLatestTimestamp(a))
      .length;
    const matchingBlogs = (shopifyBlogs || [])
      .filter(blog => 
        blogs.some(dbBlog => 
          String(dbBlog.id) === String(blog.id)
        )
      )
      .sort((a, b) => getLatestTimestamp(b) - getLatestTimestamp(a))
      .length;
    const matchingArticles = (shopifyArticles || [])
      .filter(article => 
        articles.some(dbArticle => 
          String(dbArticle.id) === String(article.id)
        )
      )
      .sort((a, b) => getLatestTimestamp(b) - getLatestTimestamp(a))
      .length;
    return matchingProducts + matchingBlogs + matchingArticles;
  } catch (error) {
    console.error('Error in countMatchingContent:', error);
    return 0;
  }
}

function processContentResponse(
  dbContent: any[],
  shopifyProducts: ShopifyProduct[],
  shopifyBlogs: ShopifyBlog[],
  shopifyArticles: ShopifyArticle[],
  totalContent: any
) {
  const groupedContent = groupContentByType(dbContent);
  const enhancedArticles = groupedContent.articles.map(article => {
    const matchingBlog = groupedContent.blogs.find(blog => 
      blog.id.toString() === article.blog_id.toString()
    );
    return {
      ...article,
      blog: matchingBlog ? { ...matchingBlog } : null
    };
  });
  return {
    total: totalContent.total,
    products: groupedContent.products,
    blogs: groupedContent.blogs,
    articles: groupedContent.articles
  };
}

const dbContentsCache = new Map<string, any>();
const shopifyContentCache = new Map<string, any>();

async function getGroupedContent(
  contentOperations: any,
  shopName: string,
  pagination: number,
  limit: number,
): Promise<any> {
  try {
    const dbContent = await ContentManager.getUserContentHistory(shopName, pagination, limit);
    return processDbContentResponse(dbContent, contentOperations, pagination);
  } catch (error) {
    throw new Error(`Failed to fetch content: ${error.message}`);
  }
}

async function verifyShopifyContent(content: any, contentOperations: any): Promise<any | null> {
  const cacheKey = `${content.category}_${content.contentId}`;
  if (shopifyContentCache.has(cacheKey)) {
    return shopifyContentCache.get(cacheKey);
  }
  try {
    let shopifyContent = null;
    switch (content.category) {
      case ContentCategory.PRODUCT:
        shopifyContent = await contentOperations.retrieveProduct(content.contentId);
        break;
      case ContentCategory.BLOG:
        shopifyContent = await contentOperations.retrieveBlog(content.contentId);
        break;
      case ContentCategory.ARTICLE:
        shopifyContent = await contentOperations.retrieveArticle(content.contentId);
        break;
    }
    if (shopifyContent) {
      shopifyContentCache.set(cacheKey, shopifyContent);
    }
    return shopifyContent;
  } catch (error) {
    console.warn(`Content not found in Shopify: ${content.category} ${content.contentId}`);
    return null;
  }
}

async function processDbContentResponse(dbContent: any[], contentOperations: any, pagination: number) {
  const groupedContent = await groupContentByType(dbContent, contentOperations, pagination);
  return {
    products: groupedContent.products,
    blogs: groupedContent.blogs,
    articles: groupedContent.articles
  };
}

async function groupContentByType(dbContent: any[], contentOperations: any, pagination: number) {
  const groupedContent = {
    products: [],
    blogs: [],
    articles: []
  };
  if (pagination === 1) {
    dbContentsCache.clear();
    shopifyContentCache.clear();
  }
  for (const content of dbContent) {
    const shopifyContent = await verifyShopifyContent(content, contentOperations);
    if (!shopifyContent) continue;
    switch (content?.category) {
      case ContentCategory.PRODUCT:
        groupedContent.products.push({
          contentId: content?.contentId,
          category: content?.category,
          ...content.output
        });
        break;
      case ContentCategory.BLOG:
        groupedContent.blogs.push({
          contentId: content?.contentId,
          category: content?.category,
          ...content.output
        });
        break;
      case ContentCategory.ARTICLE:
        groupedContent.articles.push({
          contentId: content?.contentId,
          category: content?.category,
          ...content.output
        });
        break;
    }
  }
  return groupedContent;
}

export async function GET(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const shopName = url.searchParams.get('shopName');
    const accessToken = url.searchParams.get('accessToken');
    const pagination = parseInt(url.searchParams.get('pagination') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    if (!shopName || !accessToken) {
      return new Response('Missing credentials: shopName and accessToken are required', {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const [session, shop] = await Promise.all([
      ShopifySessionManager.getSessionFromStorageByAccessToken(accessToken),
      ShopifySessionManager.findShopByName(shopName)
    ]);
    if (!session) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired session' }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    if (!shop) {
      return new Response(
        JSON.stringify({ error: 'Shop not found' }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const client = new shopify.clients.Graphql({ session });
    if (!client) {
      return new Response(
        JSON.stringify({ error: 'Failed to initialize Shopify client' }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const contentOperations = new ContentOperations(client);
    try {
      const totalDbContent = await ContentManager.getAllContents(shopName);
      const groupedContent = await getGroupedContent(contentOperations, shopName, pagination, limit);
      return new Response(
        JSON.stringify({
          total: totalDbContent.total,
          products: groupedContent.products,
          blogs: groupedContent.blogs,
          articles: groupedContent.articles,
        }), {
          status: 200,
          headers: { 
            "Content-Type": "application/json",
            "Cache-Control": "no-store, max-age=0"
          }
        }
      );
    } catch (fetchError: any) {
      console.error('Fetch error:', fetchError);
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch data from Shopify',
          details: fetchError instanceof Error ? fetchError.message : 'Unknown error during data fetch',
          code: fetchError.code || 'UNKNOWN_ERROR'
        }),
        {
          status: fetchError.response?.statusCode || 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  } catch (error: any) {
    return GenericAPIErrorHandler.handleAPIError(error);
  }
}