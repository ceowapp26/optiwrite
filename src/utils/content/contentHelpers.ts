import { ProcessedImage, Blog, Article, Product } from '@/types/content';

export class ContentHelpers {
  static async processImages(images: string[]): Promise<ProcessedImage[]> {
    if (!images?.length) return [];
    return Promise.all(
      images.map(async (imageUrl) => ({
        attachment: await this.convertUrlToBase64(imageUrl)
      }))
    );
  }

  static async convertUrlToBase64(url: string): Promise<string> {
    if (!url) return null;
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer).toString('base64');
    } catch (error) {
      console.error(`Error processing image ${url}:`, error);
      throw error;
    }
  }

  static generateHandle(title: string, existingHandle?: string, category?: string): string {
    if (existingHandle) {
      if (category === 'product') return this.extractProductHandle(existingHandle);
      if (category === 'blog') return this.extractBlogHandle(existingHandle);
    }
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  static async prepareProductData(content: any, shopName: string): Promise<Product> {
    const processedImages = await this.processImages(
      Array.isArray(content?.output?.images) ? content.output.images : []
    );
    const processedImage = content?.output?.image
      ? await this.processImages([content.output.image])
      : undefined;
    return {
      title: content?.output?.title?.trim() || "Untitled Product",
      body_html: content?.output?.body_html?.trim() || "",
      vendor: content?.output?.vendor?.trim() || shopName?.trim() || "Default Vendor",
      product_type: content?.output?.product_type?.trim() || "Custom Product",
      handle: this.generateHandle(
        content?.output?.title || "untitled",
        content?.output?.handle,
        'product'
      ),
      status: ['active', 'draft', 'archived'].includes(content?.output?.status)
        ? content.output.status
        : "active",
      tags: this.processTags(content?.output?.tags),
      template_suffix: content?.output?.template_suffix?.trim(),
      image: processedImage?.[0]?.attachment,
      images: processedImages,
      options: Array.isArray(content?.output?.options) ? content.output.options : [],
      variants: this.processProductVariants(content?.output?.variants) || []
    };
  }

  static async prepareBlogData(content: any): Promise<Blog> {
    const blogTitle = content?.output?.blog_title?.trim() || 'Untitled Blog';
    return {
      title: blogTitle,
      handle: this.generateHandle(blogTitle, content?.output?.blog_handle, 'blog'),
      tags: this.processTags(content?.output?.blog_tags),
      template_suffix: content?.output?.blog_template_suffix?.trim(),
      metafield: this.processMetafields(content?.output?.blog_metafield),
      feedburner: content?.output?.blog_feedburner?.trim() || null,
      feedburner_location: null
    };
  }

  static async prepareArticleData(content: any, blogId: string, shopName: string): Promise<Article> {
    const articleTitle = content?.output?.article_title?.trim() || 'Untitled Article';
    const processedArticleImage = content?.output?.article_image
      ? await this.processImages([content.output.article_image])
      : undefined;

    return {
      title: articleTitle,
      blog_id: blogId,
      body_html: content?.output?.article_body_html?.trim() || '',
      author: content?.output?.article_author?.trim() || shopName,
      handle: this.generateHandle(articleTitle, content?.output?.article_handle, 'article'),
      published: content?.output?.article_published ?? true,
      published_at: this.processDate(content?.output?.article_published_at),
      created_at: this.processDate(content?.output?.article_created_at),
      user_id: null,
      tags: this.processTags(content?.output?.article_tags),
      template_suffix: content?.output?.article_template_suffix?.trim() || null,
      image: processedArticleImage?.[0]?.attachment,
      metafield: this.processMetafields(content?.output?.article_metafield),
      summary_html: content?.output?.article_summary_html?.trim() || null
    };
  }

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

  private static processMetafields(metafield: any): any[] {
    if (Array.isArray(metafield)) return metafield;
    if (typeof metafield === 'string') {
      try {
        return JSON.parse(metafield);
      } catch {
        return [];
      }
    }
    return [];
  }

  private static extractProductHandle(urlHandle: string): string {
    if (urlHandle.includes('myshopify.com/products/')) {
      try {
        const handle = urlHandle.split('/products/')[1];
        return handle.split('/')[0].split('?')[0];
      } catch {
        return urlHandle;
      }
    }
    return urlHandle;
  }

  private static extractBlogHandle(urlHandle: string): string {
    if (urlHandle.includes('myshopify.com/blogs/')) {
      try {
        const handle = urlHandle.split('/blogs/')[1];
        return handle.split('/')[0].split('?')[0];
      } catch {
        return urlHandle;
      }
    }
    return urlHandle;
  }

  private static processProductVariants(data) {
    if (!data) return [];
    const {
      price,
      compare_at_price,
      sku,
      inventoryQuantity,
      weight,
      weightUnit,
      title
    } = data;
    return [
      {
        price: typeof price === 'number'
          ? price.toFixed(2).toString()
          : typeof price === 'string'
            ? parseFloat(price).toFixed(2).toString()
            : "0.00",

        compare_at_price: typeof compare_at_price === 'number'
          ? compare_at_price.toFixed(2).toString()
          : typeof compare_at_price === 'string'
            ? parseFloat(compare_at_price).toFixed(2).toString()
            : "0.00",

        sku: typeof sku === 'string' && sku
          ? sku.trim()
          : "",

        inventory_management: "shopify",

        inventory_quantity: typeof inventoryQuantity === 'number'
          ? Math.max(0, Math.floor(inventoryQuantity))
          : 0,

        weight: typeof weight === 'number'
          ? Math.max(0, weight)
          : 0,

        weight_unit: ['kg', 'g', 'lb', 'oz'].includes(weightUnit)
          ? weightUnit
          : "kg",

        requires_shipping: true,
        taxable: true,

        grams: typeof weight === 'number'
          ? Math.max(0, weight * 1000)
          : 0,

        fulfillment_service: 'manual',
        inventory_policy: 'deny',
        barcode: '',
        option1: null,
        option2: null,
        option3: null,
        presentment_prices: [],
        position: 1,

        title: typeof title === 'string' && title
          ? title.trim()
          : "Untitled Product",

        tax_code: null
      }
    ];
  }

  private static generateRandomNumber(length: number): number {
    const min = Math.pow(10, length - 1); 
    const max = Math.pow(10, length) - 1; 
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}

