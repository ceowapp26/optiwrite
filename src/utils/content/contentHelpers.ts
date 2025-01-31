import { ProcessedImage, Blog, Article, Product } from '@/types/content';
import { extractArticleHandleFromUrl, extractBlogHandleFromUrl, extractProductHandleFromUrl } from '@/utils/data';

interface Product {
  title: string;
  descriptionHtml: string;
  category: string;
  productType: string;
  images: CreateMediaInput[];
  tags: string;
  handle: string;
  templateSuffix?: string | null;
  vendor: string;
  status?: string;
  variants: any[];
  seo?: {
    title?: string;
    description?: string;
  };
  metafields?: any[];
}

interface CreateMediaInput {
  originalSource: string;
  mediaContentType: MediaContentType;
  alt?: string;
}

enum MediaContentType {
  EXTERNAL_VIDEO = 'EXTERNAL_VIDEO',
  IMAGE = 'IMAGE',
  MODEL_3D = 'MODEL_3D',
  VIDEO = 'VIDEO'
}

enum Status {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

enum CommentPolicy {
  AUTO_PUBLISHED = 'AUTO_PUBLISHED',
  CLOSED = 'CLOSED',
  MODERATED = 'MODERATED',
}

export class ContentHelpers {
  static async processImages(images: string[]): Promise<CreateMediaInput[]> {
    if (!images?.length) return [];
    return Promise.all(
      images.map(async (imageUrl, index) => {
        if (imageUrl.startsWith('blob:') || imageUrl.startsWith('data:')) {
          const convertedUrl = await this.convertUrlToBase64(imageUrl);
          if (convertedUrl) {
            imageUrl = `data:image/jpeg;base64,${convertedUrl}`;
          }
        }
        return {
          originalSrc: imageUrl,
          altText: this.sanitizeAltText(`Product Image ${index + 1}`)
        };
      })
    );
  }

  /**
   * Process images for Shopify GraphQL media input
   * @param images Array of image URLs or file paths
   * @returns Array of media inputs compatible with Shopify GraphQL
   */
  static async processMediaInputs(images: string[]): Promise<CreateMediaInput[]> {
    if (!images?.length) return [];
    return Promise.all(
      images.map(async (imageUrl, index) => {
        if (imageUrl.startsWith('blob:') || imageUrl.startsWith('data:')) {
          const convertedUrl = await this.convertUrlToBase64(imageUrl);
          if (convertedUrl) {
            imageUrl = `data:image/jpeg;base64,${convertedUrl}`;
          }
        }
        return {
          originalSource: imageUrl,
          mediaContentType: MediaContentType.IMAGE,
          alt: this.sanitizeAltText(`Product Image ${index + 1}`)
        };
      })
    );
  }

  static async processMediaInputs(images: string[]): Promise<CreateMediaInput[]> {
    if (!images?.length) return [];
    return Promise.all(
      images.map(async (imageUrl, index) => ({
        originalSource: imageUrl,
        mediaContentType: MediaContentType.IMAGE,
        alt: this.sanitizeAltText(`Product Image ${index + 1}`)
      }))
    );
  }

  /**
   * Convert image URL to base64 with robust error handling
   * @param url Image URL to convert
   * @returns Base64 encoded image or null
   */
  static async convertUrlToBase64(url: string): Promise<string | null> {
    if (!url) return null;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`Failed to fetch image: ${url}`);
        return null;
      }
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer).toString('base64');
    } catch (error) {
      console.error(`Error processing image ${url}:`, error);
      return null;
    }
  }

  /**
   * Generate a URL-friendly handle from a title
   * @param title Product title
   * @param existingHandle Optional existing handle
   * @param category Optional product category
   * @returns Sanitized product handle
   */
  static generateHandle(handleUrl: string, title?: string): string {
    const extractResult = this.extractProductHandleFromUrl(handleUrl, title);
    return extractResult.handle;
  }


  private static processDescription(body_html?: string): string {
    if (!body_html) {
      return 'Product Description';
    }
    const cleanContent = body_html.trim();
    if (!cleanContent) {
      return 'Product Description';
    }
    const isPlainText = (text: string): boolean => {
      return !/<[^>]*>/g.test(text);
    };

    const hasValidHTMLStructure = (text: string): boolean => {
      const commonTags = /<(p|div|span|h[1-6]|ul|ol|li|table|strong|em|b|i|br|a|img)[\s>]/i;
      const htmlEntities = /&[a-z]+;/i;
      const htmlComments = /<!--[\s\S]*?-->/;
      const inlineStyles = /style=["'][^"']*["']/i;
      return commonTags.test(text) || 
             htmlEntities.test(text) || 
             htmlComments.test(text) ||
             inlineStyles.test(text);
    };
    const containsURLs = (text: string): boolean => {
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      return urlRegex.test(text);
    };
    const containsNewlines = (text: string): boolean => {
      return /\n|\r/.test(text);
    };
    if (isPlainText(cleanContent)) {
      if (containsURLs(cleanContent)) {
        const withLinks = cleanContent.replace(
          /(https?:\/\/[^\s]+)/g,
          '<a href="$1" target="_blank">$1</a>'
        );
        return `<p>${withLinks}</p>`;
      }
      if (containsNewlines(cleanContent)) {
        const paragraphs = cleanContent
          .split(/\n\s*\n/)
          .map(para => para.trim())
          .filter(para => para.length > 0)
          .map(para => `<p>${para.replace(/\n/g, '<br>')}</p>`)
          .join('');
        return paragraphs;
      }
      return `<p><strong>${cleanContent}</strong></p>`;
    }
    if (hasValidHTMLStructure(cleanContent)) {
      if (!cleanContent.match(/^<(p|div|section|article)/i)) {
        return `<div>${cleanContent}</div>`;
      }
      return cleanContent;
    }
    return `<p>${cleanContent}</p>`;
  }

  /**
   * Process date to ISO format
   * @param date Input date
   * @returns ISO formatted date
   */
  private static processDate(date: string): string {
    if (date) {
      try {
        return new Date(date).toISOString();
      } catch {
        return new Date().toISOString();
      }
    }
    return new Date().toISOString();
  }

  /**
   * Process tags into a comma-separated string
   * @param tags Tags input
   * @returns Processed tags
   */
  private static processTags(tags: string | string[]): string {
    if (typeof tags === 'string') return tags;
    if (Array.isArray(tags)) {
      return tags
        .filter(tag => typeof tag === 'string' && tag)
        .map(tag => tag.trim())
        .join(', ');
    }
    return '';
  }

  /**
   * Process metafields for SEO
   * @param pageTitle Page title
   * @param metaDescription Meta description
   * @returns Processed metafields
   */
  private static processMetafields(pageTitle: string, metaDescription: string): any[] {
    return [
      {
        key: "page_title",
        value: pageTitle || 'Page title',
        type: "string",
        namespace: "seo"
      },
      {
        key: "meta_description",
        value: metaDescription || 'MetaDescription',
        type: "string",
        namespace: "seo"
      }
    ];
  }

  /**
   * Process product variants
   * @param data Product variant data
   * @returns Processed variants
   */
  private static processProductVariants(data: any): any[] {
    if (!data) return [];
    return [{
      price: this.formatPrice(data?.price),
      compareAtPrice: this.calculateCompareAtPrice(data?.price, data?.profit) || null,
      inventoryItem: {
        measurement: {
          weight: {
            unit: this.sanitizeWeightUnit(data?.weightUnit),
            value: this.sanitizeWeight(data?.weight),   
          }
        }
      },
      optionValues: data?.optionValues
    }];
  }

  /**
   * Sanitize and format price
   * @param price Input price
   * @returns Formatted price string
   */
  private static formatPrice(price: any): string {
    return typeof price === 'number' 
      ? price.toFixed(2) 
      : typeof price === 'string' 
        ? parseFloat(price).toFixed(2) 
        : '0.00';
  }

  private static calculateCompareAtPrice(price: number, profit: number): string | undefined {
    if (typeof price === 'number' && typeof profit === 'number') {
      return (price + profit).toFixed(2);
    }
    return undefined;
  }

  /**
   * Sanitize SKU
   * @param sku Input SKU
   * @returns Sanitized SKU
   */
  private static sanitizeSku(sku: any): string {
    return typeof sku === 'string' && sku ? sku.trim() : '123';
  }

  /**
   * Sanitize inventory quantity
   * @param quantity Input quantity
   * @returns Sanitized quantity
   */
  private static sanitizeInventoryQuantity(quantity: any): number {
    return typeof quantity === 'number' 
      ? Math.max(0, Math.floor(quantity)) 
      : 0;
  }

  /**
   * Sanitize weight
   * @param weight Input weight
   * @returns Sanitized weight
   */
  private static sanitizeWeight(weight: any): number {
    return typeof weight === 'number' 
      ? Math.max(0, weight) 
      : 0;
  }

  /**
   * Sanitize weight unit
   * @param unit Input weight unit
   * @returns Sanitized weight unit
   */
  private static sanitizeWeightUnit(unit: string): string {
    const validUnits = ['GRAMS', 'KILOGRAMS', 'OUNCES', 'POUNDS'];
    return validUnits.includes(unit) ? unit : 'KILOGRAMS';
  }

  /**
   * Sanitize alt text
   * @param altText Raw alt text
   * @returns Sanitized alt text
   */
  static sanitizeAltText(altText?: string): string {
    if (!altText) return 'Product Image';
    return altText
      .trim()
      .replace(/[<>]/g, '')
      .substring(0, 255);
  }

  /**
   * Extract product handle from URL
   * @param url Input URL
   * @returns Handle extraction methods
   */
  private static extractProductHandleFromUrl = (url: string, title?: string): UrlParsingResult => {
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

  /**
   * Generate random number
   * @param length Desired number length
   * @returns Random number
   */
  private static generateRandomNumber(length: number): number {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Prepare simple product data for Shopify GraphQL
   * @param content Raw product content
   * @param shopName Shop name
   * @returns Processed product data
   */

  static async prepareProductData(content: any, shopName: string): Promise<Product> {
    if (!content?.output) {
      throw new Error('Invalid content: missing output data');
    }
    const {
      title,
      body_html,
      vendor,
      product_type,
      handle,
      status,
      tags,
      template_suffix,
      page_title,
      meta_description,
      images
    } = content.output;
    const imageArray = Array.isArray(images) ? images : 
                      Array.isArray(content?.images) ? content.images : [];
    const processedImages = await this.processMediaInputs(imageArray);
    return {
      title: title?.trim() || "Untitled Product",
      descriptionHtml: this.processDescription(body_html?.trim()),
      vendor: vendor?.trim() || shopName?.trim() || "Default Vendor",
      productType: product_type?.trim() || "Custom Product",
      handle: this.generateHandle(handle || title),
      status: ['ACTIVE', 'DRAFT', 'ARCHIVED'].includes(status)
        ? status
        : Status.ACTIVE,
      tags: this.processTags(tags),
      templateSuffix: template_suffix?.trim() || null,
      media: processedImages.slice(0, 10),
      images: imageArray,
      seo: {
        title: page_title?.trim() || '',
        description: meta_description?.trim() || ''
      },
      metafields: this.processMetafields(
        page_title?.trim(),
        meta_description?.trim()
      )
    };
  }

  static async prepareBlogData(content: any): Promise<Blog> {
    if (!content?.output) {
      throw new Error('Invalid content: missing output data');
    }
    const {
      blog_title,
      blog_handle,
      blog_commentable,
      blog_template_suffix,
      blog_page_title,
      blog_meta_description
    } = content.output;
    const blogTitle = blog_title?.trim() || 'Untitled Blog';
    return {
      title: blogTitle,
      handle: this.generateHandle(blog_handle || blogTitle),
      commentPolicy: ['AUTO_PUBLISHED', 'CLOSED', 'MODERATED'].includes(blog_commentable)
        ? blog_commentable
        : CommentPolicy.AUTO_PUBLISHED,
      templateSuffix: blog_template_suffix?.trim() || null,
      metafields: this.processMetafields(
        blog_page_title?.trim(),
        blog_meta_description?.trim()
      ),
    };
  }

  static async prepareArticleData(content: any, blogId: string, shopName: string): Promise<Article> {
    if (!content?.output) {
      throw new Error('Invalid content: missing output data');
    }
    const {
      article_title,
      article_author,
      article_handle,
      article_image,
      article_published,
      article_published_at,
      article_summary_html,
      article_body_html,
      article_tags,
      article_meta_description,
      article_page_title,
      article_template_suffix,
      blog_id
    } = content.output;
    const articleTitle = article_title?.trim() || 'Untitled Article';
    const processedArticleImage = article_image && article_image !== '' 
      ? await this.processImages([article_image])
      : undefined;
    const shopifyGid = blogId.includes('gid://shopify/Blog/') 
      ? blogId 
      : `gid://shopify/Blog/${blogId}`;
    return {
      title: articleTitle,
      blogId: shopifyGid,
      body: this.processDescription(article_body_html?.trim()),
      author: {
        name: article_author?.trim() || shopName
      },
      handle: this.generateHandle(article_handle || articleTitle),
      isPublished: article_published ?? true,
      publishDate: this.processDate(article_published_at),
      tags: this.processTags(article_tags),
      templateSuffix: article_template_suffix?.trim() || null,
      image: processedArticleImage?.[0],
      metafields: this.processMetafields(
        article_page_title,
        article_meta_description
      ),
      summary: this.processDescription(article_summary_html?.trim()),
    };
  }
}
