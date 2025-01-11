"use server";

import { prisma } from '@/lib/prisma';
import { ContentManager } from '@/utils/content';
import { revalidatePath } from 'next/cache';
import { ContentStatus, ContentType } from '@prisma/client';
import { initializeShopify } from "@/lib/shopify";
import { ContentCategory } from '@/types/content';

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

export async function getBlogContents(shopName: string) {
  try {
    const dbContent = await ContentManager.getUserContentHistory(shopName, 1, 50);
    const blogs = dbContent
      .filter((content) => content.category === ContentCategory.BLOG && !content?.output?.blog_id)
      .map((content) => ({
        contentId: content.id,
        category: content.category,
        ...content.output,
      }));
    const articles = dbContent
      .filter((content) => 
        content.category === ContentCategory.ARTICLE && 
        content?.output?.blog_id
      )
      .map((content) => ({
        contentId: content.id,
        category: content.category,
        blogId: content.output.blog_id,
        ...content.output,
      }));
    const blogArticlesMap = articles.reduce((acc, article) => {
      const blogId = article.blogId;
      if (!acc[blogId]) {
        acc[blogId] = [];
      }
      acc[blogId].push(article);
      return acc;
    }, {});
    const blogsWithArticles = blogs.map(blog => ({
      ...blog,
      articles: blogArticlesMap[blog.contentId] || []
    }));
    return { 
      success: true, 
      data: {
        blogs: blogsWithArticles,
        articles: articles
      }
    };
  } catch (error) {
    console.error('Get content history action error:', error);
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

