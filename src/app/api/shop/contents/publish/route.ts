import { initializeShopify } from "@/lib/shopify";
import { ShopifySessionManager } from '@/utils/storage';
import { ContentManager } from '@/utils/content';
import { ContentService } from '@/utils/content/contentService';
import { ContentHelpers } from '@/utils/content/contentHelpers';
import { handleShopifyInitError, handleContentPublishError } from '@/utils/api/customAPIErrorHandlers';
import { ContentCategory } from '@/types/content';
import { GenericAPIErrorHandler } from '@/utils/api';
import { formatProductDescription } from '@/helpers/formatHtml';
import { ContentStatus } from '@prisma/client';
import { v4 as uuidv4 } from "uuid";
export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<Response> {
  try {
    const { shopName, accessToken, category, content } = await req.json();
    if (!shopName || !accessToken) {
      return new Response('Missing credentials: shopName and accessToken are required', {
        status: 400
      });
    }
    let shopify;
    try {
      shopify = await initializeShopify(shopName, accessToken);
    } catch (error) {
      return handleShopifyInitError(error);
    }
    const shop = await ShopifySessionManager.findShopByName(shopName);
    if (!shop) {
      return new Response(JSON.stringify({ error: 'Shop not found' }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }
    const contentService = new ContentService(shopify, shop.id, shopName);
    try {
      const publishedContent = await contentService.publishContent(
        category,
        content,
        content?.input?.isNewBlog,
        content?.input?.blogId,
        content?.input?.articleIncluded
      );
      return new Response(JSON.stringify({ 
        success: true, 
        data: publishedContent 
      }), {
        status: 201,
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      return handleContentPublishError(error);
    }
  } catch (error) {
    return GenericAPIErrorHandler.handleAPIError(error);
  }
}


