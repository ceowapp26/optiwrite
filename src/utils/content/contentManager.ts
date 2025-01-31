import { prisma } from '@/lib/prisma';
import { ShopifySessionManager } from '@/utils/storage';
import { ContentCategory } from '@prisma/client';

interface CONTENT {
  shopName: string;
  input?: any;
  output?: any;
  metadata?: any;
  title?: string;
  description?: string;
  tags?: string[];
  status?: ContentStatus;
  type?: ContentType;
  version?: number;
}

enum ContentStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED'
}

enum ContentType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  DOCUMENT = 'DOCUMENT'
}

export class ContentManager {
  private constructor() {}

  private static readonly categoryMap: Record<string, ContentCategory> = {
    PRODUCT: ContentCategory.PRODUCT,
    BLOG: ContentCategory.BLOG,
    ARTICLE: ContentCategory.ARTICLE
  };

  private static getCategoryEnum(category?: string): ContentCategory {
    if (!this.categoryMap) {
      throw new Error("categoryMap is undefined. Ensure ContentCategory is imported correctly.");
    }
    return this.categoryMap[category?.toUpperCase()];
  }

  static async createContent(data: CONTENT) {
    try {
      return await prisma.content.create({
        data: {
          shopId: data.shopId,
          contentId: data.contentId,
          shopifyId: data.shopifyId,
          input: data.input,
          output: data.output,
          metadata: data.metadata,
          title: data.title,
          description: data.description,
          tags: data.tags,
          status: data.status || 'PUBLISHED',
          category: this.getCategoryEnum(data.category),
          version: data.version || 1
        }
      });
    } catch (error) {
      console.error("Content creation error:", error);
      throw new Error('Failed to create content');
    }
  }

  static async getContentById(contentId: string) {
    try {
      return await prisma.content.findUnique({
        where: { id: contentId },
        include: {
          shop: true
        }
      });
    } catch (error) {
      console.error("Content fetch error:", error);
      throw new Error('Failed to fetch content');
    }
  }

  static async getContentByContentId(contentId: string) {
    try {
      return await prisma.content.findUnique({
        where: { contentId },
        include: {
          shop: true
        }
      });
    } catch (error) {
      console.error("Content fetch error:", error);
      throw new Error('Failed to fetch content');
    }
  }

  static async getContentByShopifyId(contentId: string) {
    try {
      return await prisma.content.findUnique({
        where: { contentId },
        include: {
          shop: true
        }
      });
    } catch (error) {
      console.error("Content fetch error:", error);
      throw new Error('Failed to fetch content');
    }
  }

  static async getUserContentHistory(
    shopName: string,
    pagination: number = 1,
    limit: number = 20,
    filters?: {
      status?: ContentStatus;
      type?: ContentType;
      startDate?: Date;
      endDate?: Date;
      tags?: string[];
    }
  ) {
    try {
      const shop = await ShopifySessionManager.findShopByName(shopName);
      if (!shop) {
        throw new Error('No shop found!');
      }
      const skip = (pagination - 1) * limit;
      const whereClause: any = {
        shopId: shop.id,
        ...(filters?.status && { status: filters.status }),
        ...(filters?.type && { type: filters.type }),
        ...(filters?.tags && { tags: { hasAny: filters.tags } }),
        ...(filters?.startDate || filters?.endDate ? {
          createdAt: {
            ...(filters.startDate && { gte: filters.startDate }),
            ...(filters.endDate && { lte: filters.endDate })
          }
        } : {})
      };
      const [contents, total] = await Promise.all([
        prisma.content.findMany({
          where: whereClause,
          orderBy: { createdAt: 'desc' },
          skip,
          take: pagination * limit
        }),
        prisma.content.count({ where: whereClause })
      ]);
      return contents;
      /*return {
        contents,
        metadata: {
          total,
          pagination,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      };*/
    } catch (error) {
      console.error("Content history fetch error:", error);
      throw new Error('Failed to fetch content history');
    }
  }

  static async getAllContents(shopName: string) {
    try {
      const shop = await ShopifySessionManager.findShopByName(shopName);
      if (!shop) {
        throw new Error('No shop found!');
      }
      const whereClause = {
        shopId: shop.id
      };
      const [contents, total] = await Promise.all([
        prisma.content.findMany({
          where: whereClause,
          orderBy: {
            createdAt: 'desc'
          }
        }),
        prisma.content.count({
          where: whereClause
        })
      ]);
      return {
        contents,
        total
      };
    } catch (error) {
      console.error("Content history fetch error:", error);
      throw new Error('Failed to fetch content history');
    }
  }

  static async updateContent(contentId: string, data: Partial<CONTENT>) {
    try {
      const existingContent = await this.getContent(contentId);
      if (!existingContent) {
        throw new Error("Content not found");
      }
      const mergedData = {
        ...existingContent,
        ...data,
      };
      return await prisma.content.update({
        where: { id: contentId },
        data: {
          ...mergedData,
          version: { increment: 1 },
          lastEditedAt: new Date()
        }
      });
    } catch (error) {
      console.error("Content update error:", error);
      throw new Error('Failed to update content');
    }
  }

  
  static async deleteContent(contentId: string, shopId: string) {
    try {
      if (!contentId || !shopId) {
        throw new Error("Content not found or unauthorized");
      }
      await prisma.content.delete({
        where: { id: contentId }
      });
    } catch (error) {
      console.error("Content deletion error:", error);
      throw new Error('Failed to delete content');
    }
  }

  static async searchContents(
    shopId: string,
    searchTerm: string,
    filters?: {
      status?: ContentStatus;
      type?: ContentType;
      tags?: string[];
    }
  ) {
    try {
      return await prisma.content.findMany({
        where: {
          shopId,
          ...(filters?.status && { status: filters.status }),
          ...(filters?.type && { type: filters.type }),
          ...(filters?.tags && { tags: { hasAny: filters.tags } }),
          OR: [
            { title: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } },
            { tags: { has: searchTerm } }
          ]
        },
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      console.error("Content search error:", error);
      throw new Error('Failed to search contents');
    }
  }
}


