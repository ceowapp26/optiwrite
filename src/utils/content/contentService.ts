import { ContentCategory } from '@/types/content';
import { ShopifyClient } from '@/lib/client';
import { ContentStatus } from '@prisma/client';
import { ContentManager } from './contentManager';
import { ContentHelpers } from './contentHelpers';
import { ContentOperations } from './contentOperation';

interface ContentServiceConfig {
  client: ShopifyClient;
  shopId: string;
  shopName: string;
  maxRetries?: number;
  retryDelay?: number;
}

interface ContentResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export class ContentService {
  private client: ShopifyClient;
  private shopId: string;
  private shopName: string;
  private operations: ContentOperations;
  private maxRetries: number;
  private retryDelay: number;

  constructor(config: ContentServiceConfig) {
    this.client = config.client;
    this.shopId = config.shopId;
    this.shopName = config.shopName;
    this.operations = new ContentOperations(config.client);
    this.maxRetries = config.maxRetries || 3;
    this.retryDelay = config.retryDelay || 1000;
  }

  private async retry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | unknown;
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (attempt < this.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
        }
      }
    }
    throw lastError instanceof Error ? lastError : new Error('Operation failed after retries');
  }

  private validateContent(content: any): void {
    if (!content || typeof content !== 'object') {
      throw new Error('Invalid content format');
    }
    if (!content.input && !content.output) {
      throw new Error('Content must include either input and output properties');
    }
  }

  async publishContent(category: string, content: any, options: {
    isNewBlog?: boolean;
    blogId?: string;
    articleIncluded?: boolean;
  } = {}): Promise<ContentResponse> {
    try {
      this.validateContent(content);
      const { isNewBlog = false, blogId, articleIncluded = false } = options;
      let publishedContent: any;
      switch (category) {
        case ContentCategory.PRODUCT:
          publishedContent = await this.retry(() => this.publishProduct(content));
          break;
        case ContentCategory.BLOG:
          if (!articleIncluded) {
            publishedContent = await this.retry(() => this.publishBlogOnly(content));
          } else {
            publishedContent = await this.retry(() => this.publishBlogWithArticle(content));
          }
          break;
        case ContentCategory.ARTICLE:
          if (isNewBlog) {
            publishedContent = await this.retry(() => this.publishBlogWithArticle(content));
          } else {
            if (!blogId) {
              throw new Error('Blog ID is required for publishing an article to an existing blog');
            }
            publishedContent = await this.retry(() => 
              this.publishArticleToExistingBlog(content, blogId)
            );
          }
          break;
        default:
          throw new Error(`Invalid category: ${category}`);
      }
      if (!publishedContent || !publishedContent?.id) {
        throw new Error('Failed to publish content: Invalid or empty response');
      }
      return {
        success: true,
        data: publishedContent
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async updateContent(category: string, content: any, contentId: string, blogId?: string): Promise<ContentResponse> {
    try {
      this.validateContent(content);
      let updatedContent: any;
      switch (category) {
        case ContentCategory.PRODUCT:
          updatedContent = await this.retry(() => this.updateProduct(content, contentId));
          break;
        case ContentCategory.BLOG:
          updatedContent = await this.retry(() => this.updateBlog(content, contentId));
          break;
        case ContentCategory.ARTICLE:
          if (!blogId) {
            throw new Error('Blog ID is required for updating an article');
          }
          updatedContent = await this.retry(() => this.updateArticle(content, contentId, blogId));
          break;
        default:
          throw new Error(`Invalid category: ${category}`);
      }
      if (!updatedContent || !updatedContent.id) {
        throw new Error('Failed to update content: Invalid or empty response');
      }
      await this.updateInDatabase(processedContent);
      const processedContent = await this.updateInDatabase(updatedContent);
      if (!processedContent) {
        throw new Error('Failed to update content in database');
      }
      return {
        success: true,
        data: processedContent
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private async publishProduct(content: any) {
    const productData = await ContentHelpers.prepareProductData(content, this.shopName);
    const createdProduct = await this.operations.createProduct(productData);
    if (!createdProduct?.id) {
      throw new Error('Failed to create product: Invalid response');
    }
    const productContent = {
      ...content,
      input: {
        ...content.input,
        category: ContentCategory.PRODUCT
      } 
    };
    const productVariants = {
      ...productData,
      optionValues: [
        {
          optionId: createdProduct?.options?.[0]?.id, 
          name: 'Default Variant'
        }
      ]
    };
    const preparedVariants = ContentHelpers.processProductVariants(productVariants);
    if (preparedVariants?.length > 0) {
      await this.retry(() => 
        this.operations.createProductVariants(createdProduct.id, preparedVariants)
      );
    }
    const retrievedProduct = await this.retry(() => 
      this.operations.retrieveProduct(createdProduct.id)
    );
    const processedPublishedContent = this.processPublishContent(ContentCategory.PRODUCT, retrievedProduct);
    await this.saveToDatabase(processedPublishedContent, productContent);
    return processedPublishedContent;
  }

  private async publishBlogWithArticle(content: any) {
    const blogData = await ContentHelpers.prepareBlogData(content);
    const createdBlog = await this.operations.createBlog(blogData);
    if (!createdBlog?.id) {
      throw new Error('Failed to create blog: Invalid response');
    }
    const blogContent = {
      ...content,
      input: {
        ...content.input,
        category: ContentCategory.BLOG
      }
    };
    const processedBlog = this.processPublishContent(ContentCategory.BLOG, createdBlog);
    await this.saveToDatabase(processedBlog, blogContent);
    const articleData = await ContentHelpers.prepareArticleData(content, createdBlog.id, this.shopName);
    const createdArticle = await this.operations.createArticle(articleData);
    const articleContent = {
      ...content,
      input: {
        ...content.input,
        category: ContentCategory.ARTICLE
      }
    };
    const processedArticle = this.processPublishContent(ContentCategory.ARTICLE, createdArticle);
    const formattedData = this.formatBlogArticleResponse(processedBlog, processedArticle);
    await this.saveToDatabase(formattedData, articleContent);
    
    return formattedData;
  }

  private async publishBlogOnly(content: any) {
    const blogData = await ContentHelpers.prepareBlogData(content);
    const createdBlog = await this.operations.createBlog(blogData);
    if (!createdBlog?.id) {
      throw new Error('Failed to create blog: Invalid response');
    }
    const blogContent = {
      ...content,
      input: {
        ...content.input,
        category: ContentCategory.BLOG
      }
    };
    const processedBlog = this.processPublishContent(ContentCategory.BLOG, createdBlog);
    await this.saveToDatabase(processedBlog, blogContent);
    return processedBlog;
  }

  private async publishArticleToExistingBlog(content: any, blogId: string) {
    if (!blogId) {
      throw new Error('Blog ID is required');
    }
    const existingBlog = await this.operations.retrieveBlog(blogId);
    if (!existingBlog?.id) {
      throw new Error('Blog not found');
    }
    const articleData = await ContentHelpers.prepareArticleData(content, blogId, this.shopName);
    const createdArticle = await this.operations.createArticle(articleData);
    const articleContent = {
      ...content,
      input: {
        ...content.input,
        category: ContentCategory.ARTICLE
      }
    };
    const processedBlog = this.processPublishContent(ContentCategory.BLOG, existingBlog);
    const processedArticle = this.processPublishContent(ContentCategory.ARTICLE, createdArticle, articleData);
    const formattedData = this.formatBlogArticleResponse(processedBlog, processedArticle);
    await this.saveToDatabase(formattedData, articleContent);
    return formattedData;
  }

  private formatBlogArticleResponse(blog: any, article: any) {
    return {
      ...article,
      blog
    };
  }

  private async updateProduct(content: any, contentId: string) {
    const productData = await ContentHelpers.prepareProductData(content, this.shopName);
    const updatedProduct = await this.operations.updateProduct(contentId, productData);
    return this.processPublishContent(ContentCategory.PRODUCT, updatedProduct);
  }

  private async updateBlog(content: any, contentId: string) {
    const blogData = await ContentHelpers.prepareBlogData(content);
    const updatedBlog = await this.operations.updateBlog(contentId, blogData);
    return this.processPublishContent(ContentCategory.BLOG, updatedBlog);
  }

  private async updateArticle(content: any, contentId: string, blogId: string) {
    const articleData = await ContentHelpers.prepareArticleData(content, blogId, this.shopName);
    const updatedArticle = await this.operations.updateArticle(contentId, articleData);
    const existingBlog = await this.operations.retrieveBlog(blogId);
    const processedBlog = this.processPublishContent(ContentCategory.BLOG, existingBlog);
    const processedArticle = this.processPublishContent(ContentCategory.ARTICLE, updatedArticle, articleData);
    return this.formatBlogArticleResponse(processedBlog, processedArticle);
  }

  private async updateInDatabase(updatedContent: any) {
    if (!updatedContent?.id) {
      throw new Error('Invalid updated content: Missing ID');
    }
    const contentData = {
      shopId: this.shopId,
      title: updatedContent?.title,
      output: updatedContent,
      metadata: {},
      status: ContentStatus.UPDATED,
    };
    await ContentManager.updateContent(contentData);
    return updatedContent;
  }

  private processPublishContent(category: ContentCategory, content: any, input?: any) {
    switch (category) {
      case ContentCategory.PRODUCT: {
        const metafields = content?.metafields?.edges || [];
        const firstVariant = content?.variants?.edges?.[0]?.node || {};
        return {
          id: content?.id,
          title: content?.title,
          handle: content?.handle,
          product_type: content?.productType,
          body_html: content?.descriptionHtml,
          vendor: content?.vendor,
          status: content?.status,
          template_suffix: content?.templateSuffix,
          images: content?.media?.edges?.map(edge => edge?.node?.preview?.image?.url).filter(Boolean) || [],
          tags: content?.tags?.join(',') || '',
          price: firstVariant?.price,
          page_title: metafields.find(edge => edge.node.key === 'page_title')?.node?.value,
          meta_description: metafields.find(edge => edge.node.key === 'meta_description')?.node?.value,
        };
      }

      case ContentCategory.BLOG: {
        const blogMetafields = content?.metafields?.edges || [];
        return {
          id: content?.id,
          title: content?.title,
          commentable: content?.commentPolicy,
          handle: content?.handle,
          template_suffix: content?.templateSuffix,
          page_title: blogMetafields.find(edge => edge.node.key === 'page_title')?.node?.value,
          meta_description: blogMetafields.find(edge => edge.node.key === 'meta_description')?.node?.value,
        };
      }

      case ContentCategory.ARTICLE: {
        const articleMetafields = content?.metafields?.edges || [];
        return {
          id: content?.id,
          title: content?.title,
          author: content?.author?.name,
          body_html: content?.body,
          handle: content?.handle,
          published: input?.isPublished,
          published_at: input?.publishDate,
          image: content?.image?.url,
          page_title: articleMetafields.find(edge => edge.node.key === 'page_title')?.node?.value,
          meta_description: articleMetafields.find(edge => edge.node.key === 'meta_description')?.node?.value,
          summary_html: content?.summary,
          tags: content?.tags?.join(',') || '',
          template_suffix: content?.templateSuffix,
        };
      }
      default:
        throw new Error(`Invalid category: ${category}`);
    }
  }

  private async saveToDatabase(publishedContent: any, content: any) {
    if (!publishedContent?.id) {
      throw new Error('Invalid published content: Missing ID');
    }
    const extractId = (gid) => {
      return gid.split('/').pop();
    };
    const contentData = {
      shopId: this.shopId,
      contentId: extractId(publishedContent.id),
      shopifyId: publishedContent.id.toString(),
      title: content?.output?.title || '',
      description: content?.input?.description || '',
      input: content?.input || {},
      category: content?.input?.category,
      output: publishedContent,
      metadata: {
        ...publishedContent
      },
      status: ContentStatus.PUBLISHED,
      version: 1
    };
    await ContentManager.createContent(contentData);
  }

  async deleteContent(contentId: string): Promise<ContentResponse> {
    try {
      if (!contentId) {
        throw new Error('Content ID is required');
      }
      const existingContent = await ContentManager.getContentByContentId(contentId);
      if (!existingContent) {
        throw new Error('Content not found in database');
      }
      switch (existingContent.category) {
        case ContentCategory.PRODUCT:
          await this.retry(() => this.operations.deleteProduct(contentId));
          break;
        case ContentCategory.BLOG:
          await this.deleteBlogAndAssociatedContent(contentId);
          break;
        case ContentCategory.ARTICLE:
          await this.retry(() => 
            this.operations.deleteArticle(contentId)
          );
          break;
        default:
          throw new Error(`Invalid category: ${existingContent.category}`);
      }
      await ContentManager.deleteContent(existingContent?.id, this.shopId);
      return {
        success: true,
        data: {
          message: `${existingContent.category} content successfully deleted`,
          contentId
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to delete content: ${error.message}`
      };
    }
  }

  private async deleteBlogAndAssociatedContent(blogId: string): Promise<void> {
    const { contents } = await ContentManager.getAllContents(this.shopName);
    const associatedArticles = contents.filter(content =>
      content.category === ContentCategory.ARTICLE &&
      content.output?.blog?.id?.toString() === blogId
    );
    for (const article of associatedArticles) {
      await this.retry(() => 
        this.operations.deleteArticle(article.contentId)
      );
      await ContentManager.deleteContent(article.id);
    }
    await this.retry(() => this.operations.deleteBlog(blogId));
  }
}