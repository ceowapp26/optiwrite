import { ContentCategory } from '@/types/content';
import { ShopifyClient } from '@/lib/shopify';
import { ContentStatus } from '@prisma/client';
import { ContentManager } from './contentManager';
import { ContentHelpers } from './contentHelpers';

export class ContentService {
  private shopify: ShopifyClient;
  private shopId: string;
  private shopName: string;

  constructor(shopify: ShopifyClient, shopId: string, shopName: string) {
    this.shopify = shopify;
    this.shopId = shopId;
    this.shopName = shopName;
  }

  async publishContent(category: string, content: any, isNewBlog: boolean = false, blogId?: string, articleIncluded: boolean = false) {
    let publishedContent: any;
    switch (category) {
      case ContentCategory.PRODUCT:
        publishedContent = await this.publishProduct(content);
        await this.saveToDatabase(publishedContent, content);
        break;
      case ContentCategory.BLOG:
        if (articleIncluded) {
          publishedContent = await this.publishBlogOnly(content);
        } else {
          publishedContent = await this.publishBlogWithArticle(content);
        }
        break;
      case ContentCategory.ARTICLE:
        if (isNewBlog) {
          publishedContent = await this.publishBlogWithArticle(content);
        } else {
          if (!blogId) {
            throw new Error('Blog ID is required for publishing an article to an existing blog');
          }
          publishedContent = await this.publishArticleToExistingBlog(content, blogId);
        }
        break;
      default:
        throw new Error("Invalid category specified");
    }
    return publishedContent;
  }

  async updateContent(category: string, content: any, contentId: string) {
    let updatedContent: any;
    switch (category) {
      case ContentCategory.PRODUCT:
        updatedContent = await this.updateProduct(content, contentId);
        await this.updateInDatabase(updatedContent, content);
        break;
      case ContentCategory.BLOG:
        updatedContent = await this.updateBlogWithArticle(content, contentId);
        break;
      case ContentCategory.ARTICLE:
        if (!content.blogId) {
          throw new Error('Blog ID is required for updating an article');
        }
        updatedContent = await this.updateArticleInBlog(content, contentId, content.blogId);
        break;
      default:
        throw new Error("Invalid category specified");
    }
    return updatedContent;
  }

  private async publishProduct(content: any) {
    const productData = await ContentHelpers.prepareProductData(content, this.shopName);
    return this.shopify.product.create(productData);
  }

  private async publishBlogWithArticle(content: any) {
    const blogData = await ContentHelpers.prepareBlogData(content);
    const createdBlog = await this.shopify.blog.create(blogData);
    const blogContent = { 
      ...content, 
      input: { 
        ...content.input, 
        category: ContentCategory.BLOG 
      } 
    };
    this.saveToDatabase(createdBlog, blogContent);
    const articleData = await ContentHelpers.prepareArticleData(content, createdBlog.id, this.shopName);
    const createdArticle = await this.shopify.article.create(createdBlog.id, articleData);
    const articleContent = { 
      ...content, 
      input: { 
        ...content.input, 
        category: ContentCategory.ARTICLE 
      } 
    };
    const formatedData = this.formatBlogArticleResponse(createdBlog, createdArticle);
    await this.saveToDatabase(formatedData, articleContent);
  }

  private async publishBlogOnly(content: any) {
    const blogData = await ContentHelpers.prepareBlogData(content);
    const createdBlog = await this.shopify.blog.create(blogData);
    const blogContent = { 
      ...content, 
      input: { 
        ...content.input, 
        category: ContentCategory.BLOG 
      } 
    };
    this.saveToDatabase(createdBlog, blogContent);
  }

  private async publishArticleToExistingBlog(content: any, blogId: string) {
    if (!blogId) {
      throw new Error('Blog ID is required');
    }
    const existingBlog = await this.shopify.blog.get(blogId);
    const articleData = await ContentHelpers.prepareArticleData(content, blogId, this.shopName);
    const createdArticle = await this.shopify.article.create(blogId, articleData);
    const articleContent = { 
      ...content, 
      input: { 
        ...content.input, 
        category: ContentCategory.ARTICLE 
      } 
    };
    const formatedData = this.formatBlogArticleResponse(existingBlog, createdArticle);
    await this.saveToDatabase(formatedData, articleContent);
  }

  private formatBlogArticleResponse(blog: any, article: any) {
    return {
      ...article,
      blog: blog
    };
  }

   private async updateProduct(content: any, contentId: string) {
    const productData = await ContentHelpers.prepareProductData(content, this.shopName);
    return this.shopify.product.update(contentId, productData);
  }

  private async updateBlogWithArticle(content: any, contentId: string) {
    const blogData = await ContentHelpers.prepareBlogData(content);
    const updatedBlog = await this.shopify.blog.update(contentId, blogData);
    const blogContent = { 
      ...content, 
      input: { 
        ...content.input, 
        category: ContentCategory.BLOG 
      } 
    };
    this.updateInDatabase(updatedBlog, blogContent);
    
    if (content.articleId) {
      const articleData = await ContentHelpers.prepareArticleData(content, updatedBlog.id, this.shopName);
      const updatedArticle = await this.shopify.article.update(content.articleId, articleData);
      const articleContent = { 
        ...content, 
        input: { 
          ...content.input, 
          category: ContentCategory.ARTICLE 
        } 
      };
      const formatedData = this.formatBlogArticleResponse(updatedBlog, updatedArticle);
      await this.updateInDatabase(formatedData, articleContent);
    }

    return updatedBlog;
  }

  private async updateArticleInBlog(content: any, contentId: string, blogId: string) {
    const articleData = await ContentHelpers.prepareArticleData(content, blogId, this.shopName);
    const updatedArticle = await this.shopify.article.update(contentId, articleData);
    const articleContent = { 
      ...content, 
      input: { 
        ...content.input, 
        category: ContentCategory.ARTICLE 
      } 
    };
    const existingBlog = await this.shopify.blog.get(blogId);
    const formatedData = this.formatBlogArticleResponse(existingBlog, updatedArticle);
    await this.updateInDatabase(formatedData, articleContent);
    
    return formatedData;
  }

  private formatBlogArticleResponse(blog: any, article: any) {
    return {
      ...article,
      blog: blog
    };
  }

  private async updateInDatabase(updatedContent: any, content: any) {
    const contentData = {
      shopId: this.shopId,
      contentId: updatedContent.id.toString(),
      shopifyId: updatedContent.admin_graphql_api_id,
      title: content?.output?.title || content?.input?.title,
      description: content?.input?.description,
      input: content?.input,
      category: content?.input?.category,
      output: updatedContent,
      metadata: {},
      status: ContentStatus.UPDATED,
      version: (await ContentManager.getLatestContentVersion(this.shopId, updatedContent.id.toString())) + 1
    };

    await ContentManager.updateContent(contentData);
  }


  private async saveToDatabase(publishedContent: any, content: any) {
    const contentData = {
      shopId: this.shopId,
      contentId: publishedContent.id.toString(),
      shopifyId: publishedContent.admin_graphql_api_id,
      title: content?.output?.title,
      description: content?.input?.description,
      input: content?.input,
      category: content?.input?.category,
      output: publishedContent,
      metadata: {},
      status: ContentStatus.PUBLISHED,
      version: 1
    };

    await ContentManager.createContent(contentData);
  }

  async deleteContent(contentId: string) {
    const existingContent = await ContentManager.getContentById(contentId);
    if (!existingContent) {
      throw new Error('Content not found in database');
    }
    try {
      switch (existingContent?.category) {
        case ContentCategory.PRODUCT:
          await this.shopify.product.delete(contentId);
          break;
        case ContentCategory.BLOG:
          const { contents } = await ContentManager.getAllContents(this.shopName);
          const associatedArticles = contents.filter(content => 
            content.category === ContentCategory.ARTICLE && 
            content.output?.blog?.id?.toString() === contentId
          );
          for (const article of associatedArticles) {
            await this.shopify.article.delete(contentId, article.contentId);
            await ContentManager.deleteContent(article.contentId);
          }
          await this.shopify.blog.delete(contentId);
          break;
        case ContentCategory.ARTICLE:
          if (!existingContent?.output?.blog_id) {
            throw new Error('Blog ID is required for deleting an article');
          }
          await this.shopify.article.delete(existingContent?.output?.blog_id, contentId);
          break;
          
        default:
          throw new Error("Invalid category specified");
      }
      await ContentManager.deleteContent(contentId, this.shopId);
      return {
        success: true,
        message: `${existingContent?.category} content successfully deleted`,
        contentId
      };
    } catch (error) {
      throw new Error(`Failed to delete content: ${error.message}`);
    }
  }
}

