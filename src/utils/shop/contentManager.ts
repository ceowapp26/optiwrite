import { prisma } from '@/lib/prisma';
import { Content, Tone } from '@prisma/client';

interface CONTENT {
  shopifyId: string;
  description?: string;
  urls?: any;
  subtitles?: any;
  length?: number;
  tone: Tone;
  mainContent?: string;
  template?: string;
  shopId: string;
  publishedAt?: string | Date;
}

export class ContentManager {
  private constructor() {}

  static async findContentByShopContent(shopId: string, shopifyId: string) {
    try {
      return await prisma.content.findUnique({
        where: {
          shopId_shopifyId: {
            shopId,
            shopifyId
          }
        }
      });
    } catch (error) {
      console.error("Content fetch by shop and shopify ID error:", error);
      throw new Error('Failed to fetch content by shop and shopify ID');
    }
  }

  static async createContent(data: CONTENT) {
    try {
      return await prisma.content.create({
        data: {
          shopifyId: data.shopifyId,
          description: data.description,
          urls: data.urls,
          subtitles: data.subtitles,
          length: data.length,
          tone: data.tone,
          mainContent: data.mainContent,
          template: data.template,
          shopId: data.shopId,
          publishedAt: data.publishedAt ? new Date(data.publishedAt) : new Date(),
        }
      });
    } catch (error) {
      console.error("Content creation error:", error);
      throw new Error('Failed to create content');
    }
  }

  static async getContent(contentId: string) {
    try {
      return await prisma.content.findUnique({
        where: { id: contentId }
      });
    } catch (error) {
      console.error("Content fetch error:", error);
      throw new Error('Failed to fetch content');
    }
  }

  static async getContentByShopifyId(shopifyId: string) {
    try {
      return await prisma.content.findFirst({
        where: { shopifyId }
      });
    } catch (error) {
      console.error("Content fetch by Shopify ID error:", error);
      throw new Error('Failed to fetch content by Shopify ID');
    }
  }

  static async updateContent(data: CONTENT) {
    try {
      const existingContent = await this.findContentByShopContent(data.shopId, data.shopifyId);
      if (!existingContent) {
        throw new Error("Content record not found");
      }
      return await prisma.content.update({
        where: { id: existingContent.id },
        data: {
          shopifyId: data.shopifyId,
          description: data.description,
          urls: data.urls,
          subtitles: data.subtitles,
          length: data.length,
          tone: data.tone,
          mainContent: data.mainContent,
          template: data.template,
          shopId: data.shopId,
          publishedAt: data.publishedAt ? new Date(data.publishedAt) : undefined,
        }
      });
    } catch (error) {
      console.error("Content update error:", error);
      throw new Error('Failed to update content');
    }
  }

  static async deleteContent(contentId: string) {
    try {
      await prisma.content.delete({
        where: { id: contentId }
      });
    } catch (error) {
      console.error("Content deletion error:", error);
      throw new Error('Failed to delete content');
    }
  }

  static async getAllContents(shopId: string) {
    try {
      return await prisma.content.findMany({
        where: { shopId },
        orderBy: { publishedAt: 'desc' }
      });
    } catch (error) {
      console.error("Contents fetch error:", error);
      throw new Error('Failed to fetch contents');
    }
  }

  static async searchContents(shopId: string, searchTerm: string) {
    try {
      return await prisma.content.findMany({
        where: {
          shopId,
          OR: [
            { description: { contains: searchTerm, mode: 'insensitive' } },
            { mainContent: { contains: searchTerm, mode: 'insensitive' } },
            { template: { contains: searchTerm, mode: 'insensitive' } }
          ]
        },
        orderBy: { publishedAt: 'desc' }
      });
    } catch (error) {
      console.error("Contents search error:", error);
      throw new Error('Failed to search contents');
    }
  }

  static async getContentsByTone(shopId: string, tone: Tone) {
    try {
      return await prisma.content.findMany({
        where: {
          shopId,
          tone
        },
        orderBy: { publishedAt: 'desc' }
      });
    } catch (error) {
      console.error("Contents fetch by tone error:", error);
      throw new Error('Failed to fetch contents by tone');
    }
  }

  static async getContentsByDateRange(shopId: string, startDate: Date, endDate: Date) {
    try {
      return await prisma.content.findMany({
        where: {
          shopId,
          publishedAt: {
            gte: startDate,
            lte: endDate
          }
        },
        orderBy: { publishedAt: 'desc' }
      });
    } catch (error) {
      console.error("Contents fetch by date range error:", error);
      throw new Error('Failed to fetch contents by date range');
    }
  }

  static async updateMainContent(contentId: string, mainContent: string) {
    try {
      return await prisma.content.update({
        where: { id: contentId },
        data: {
          mainContent
        }
      });
    } catch (error) {
      console.error("Main content update error:", error);
      throw new Error('Failed to update main content');
    }
  }

  static async getRecentContents(shopId: string, limit: number = 10) {
    try {
      return await prisma.content.findMany({
        where: { shopId },
        orderBy: { publishedAt: 'desc' },
        take: limit
      });
    } catch (error) {
      console.error("Recent contents fetch error:", error);
      throw new Error('Failed to fetch recent contents');
    }
  }
}