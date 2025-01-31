"use server";

import { prisma } from '@/lib/prisma';
import { ContentManager } from '@/utils/content';
import { revalidatePath } from 'next/cache';
import { ContentStatus, ContentType } from '@prisma/client';
import { initializeShopify } from "@/lib/shopify";
import { ShopifySessionManager } from "@/utils/storage";
import { ContentOperations } from "@/utils/content/contentOperation";
import { ContentCategory } from '@/types/content';
import { shopify } from '@/lib/shopify';

 async function createContent(data: CONTENT) {
  try {
    const content = await ContentManager.createContent(data);
    revalidatePath('/versions'); 
    return { success: true, data: content };
  } catch (error) {
    console.error('Create content action error:', error);
    return { success: false, error: 'Failed to create content' };
  }
}

async function getContent(contentId: string) {
  try {
    const content = await ContentManager.getContent(contentId);
    return { success: true, data: content };
  } catch (error) {
    console.error('Get content action error:', error);
    return { success: false, error: 'Failed to fetch content' };
  }
}

async function getUserContentHistory(
  shopName: string,
  page: number = 1,
  limit: number = 10,
  filters?: {
    status?: ContentStatus;
    type?: ContentType;
    startDate?: Date;
    endDate?: Date;
    tags?: string[];
  }
) {
  try {
    const result = await ContentManager.getUserContentHistory(
      shopName,
      page,
      limit,
      filters
    );
    return { success: true, data: result };
  } catch (error) {
    console.error('Get content history action error:', error);
    return { success: false, error: 'Failed to fetch content history' };
  }
}

const shopifyBlogsCache = new Map<string, any>();

export async function getBlogContents(shopName: string, accessToken: string, pagination: number, limit: number) {
  try {
    const session = await ShopifySessionManager.getSessionFromStorageByAccessToken(accessToken);
    if (!session) {
      return new Response(JSON.stringify({ error: 'Invalid or expired session' }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const client = new shopify.clients.Graphql({ session });
    if (!client) {
      return new Response(JSON.stringify({ error: 'Failed to initialize Shopify client' }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const blogOperations = new ContentOperations(client);
    const fetchLimit = pagination * limit + 2;
    let lastPageInfo = { hasNextPage: false, endCursor: null };
    if (pagination === 1) {
      shopifyBlogsCache.clear();
    }
    const cachedBlogs = Array.from(shopifyBlogsCache.values());
    if (cachedBlogs.length < fetchLimit) {
      const response = await blogOperations.listBlogs(
        Math.min(fetchLimit, 50),
        lastPageInfo.endCursor,
        undefined,
        'ID',
        false
      );
      if (response?.blogs?.length) {
        response.blogs.forEach(blog => {
          shopifyBlogsCache.set(blog.id, blog);
        });
        lastPageInfo = response.pageInfo;
      }
    }
    const allBlogs = Array.from(shopifyBlogsCache.values());
    const requestedBlogs = allBlogs.slice(0, pagination * limit);
    return { 
      success: true, 
      data: {
        blogs: requestedBlogs,
        totalBlogs: allBlogs?.length,
        pageInfo: lastPageInfo
      }
    };
  } catch (error) {
    console.error('Get blog content history action error:', error);
    return { 
      success: false, 
      error: 'Failed to fetch blog content' 
    };
  }
}

async function updateContent(contentId: string, data: Partial<CONTENT>) {
  try {
    const content = await ContentManager.updateContent(contentId, data);
    revalidatePath('/versions'); // Adjust path as needed
    return { success: true, data: content };
  } catch (error) {
    console.error('Update content action error:', error);
    return { success: false, error: 'Failed to update content' };
  }
}

async function deleteContent(contentId: string, shopName: string) {
  try {
    await ContentManager.deleteContent(contentId, shopName);
    revalidatePath('/versions');
    return { success: true };
  } catch (error) {
    console.error('Delete content action error:', error);
    return { success: false, error: 'Failed to delete content' };
  }
}

 async function searchContents(
  shopName: string,
  searchTerm: string,
  filters?: {
    status?: ContentStatus;
    type?: ContentType;
    tags?: string[];
  }
) {
  try {
    const contents = await ContentManager.searchContents(
      shopName,
      searchTerm,
      filters
    );
    return { success: true, data: contents };
  } catch (error) {
    console.error('Search contents action error:', error);
    return { success: false, error: 'Failed to search contents' };
  }
}

export {
  createContent,
  getContent,
  getUserContentHistory,
  updateContent,
  deleteContent,
  searchContents,
};

