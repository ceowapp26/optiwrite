import { initializeShopify } from "@/lib/shopify";
import { ShopifySessionManager } from '@/utils/storage';
import { ContentManager } from '@/utils/content';
import { ContentService } from '@/utils/content/contentService';
import { ContentHelpers } from '@/utils/content/contentHelpers';
import { handleShopifyInitError } from '@/utils/api/customAPIErrorHandlers';
import { ContentCategory } from '@/types/content';
import { GenericAPIErrorHandler } from '@/utils/api';
import { formatProductDescription } from '@/helpers/formatHtml';
import { ContentStatus } from '@prisma/client';
import { v4 as uuidv4 } from "uuid";
import { shopify } from '@/lib/shopify';

export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<Response> {
  try {
    const { shopName, accessToken, category, content } = await req.json();
    if (!shopName || !accessToken) {
      return new Response('Missing credentials: shopName and accessToken are required', {
        status: 400
      });
    }
    const shop = await ShopifySessionManager.findShopByName(shopName);
    if (!shop) {
      return new Response(JSON.stringify({ error: 'Shop not found' }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }
    const session = await ShopifySessionManager.getSessionFromStorageByAccessToken(accessToken);
    if (!session) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired session' }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const client = new shopify.clients.Graphql({ session });
    const contentService = new ContentService({ client, shopId: shop.id, shopName });
    try {
      const publishedContent = await contentService.publishContent(
        category,
        content,
        {
          isNewBlog: content?.input?.isNewBlog,
          blogId: content?.input?.blogId,
          articleIncluded: content?.input?.articleIncluded,
        }
      );
      return new Response(JSON.stringify({ 
        success: true, 
        data: publishedContent 
      }), {
        status: 201,
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error('Content publishing error:', error);
      return new Response(JSON.stringify({
        error: 'Failed to publish content',
        details: error instanceof Error ? error.message : 'Unknown operation error'
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  } catch (error) {
    return GenericAPIErrorHandler.handleAPIError(error);
  }
}


