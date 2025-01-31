import { initializeShopify } from "@/lib/shopify";
import { GenericAPIErrorHandler } from '@/utils/api';
import { handleShopifyInitError } from '@/utils/api/customAPIErrorHandlers';
import { ShopifySessionManager } from '@/utils/storage';
import { ContentService } from '@/utils/content/contentService';
import { ContentOperations } from '@/utils/content/contentOperation';
import { ContentManager } from "@/utils/content";
import { ContentCategory } from "@/types/content";
import { shopify } from '@/lib/shopify';

export const dynamic = 'force-dynamic';

export async function PUT(
  req: Request,
  { params }: { params: { contentId: string } }
): Promise<Response> {
  try {
    const contentId = params.contentId;
    if (!contentId) {
      return new Response(JSON.stringify({ error: 'Content ID and category are required' }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const { shopName, accessToken, updatedContent } = await req.json();
    const shop = await ShopifySessionManager.findShopByName(shopName);
    if (!shop) {
      throw new Error("No shop found");
    }
    const contentItem = await ContentManager.getContentByShopifyId(contentId);
    if (!contentItem) {
      return new Response(JSON.stringify({ error: "Content not found in database" }), {
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
    switch (contentItem.category) {
      case ContentCategory.PRODUCT:
        await contentService.updateContent(contentItem.category, updatedContent, contentId);
        break;
      case ContentCategory.BLOG:
        await contentService.updateContent(contentItem.category, updatedContent, contentId);
      case ContentCategory.ARTICLE:
        await contentService.updateContent(contentItem.category, updatedContent, contentId, updatedContent?.output?.blog_id);
        break;
      default:
        throw new Error("Invalid category specified");
    }
    return new Response(JSON.stringify({
      success: true,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error: any) {
    return GenericAPIErrorHandler.handleAPIError(error);
  }
}

export async function GET(
  req: Request,
  { params }: { params: { contentId: string } }
): Promise<Response> {
  try {
    const contentId = params.contentId;
    if (!contentId) {
      return new Response(JSON.stringify({ error: 'Content ID is required' }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const { shopName, accessToken } = await req.json();
    const contentItem = await ContentManager.getContentById(contentId);
    if (!contentItem) {
      return new Response(JSON.stringify({ error: "Content not found in database" }), {
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
    const contentOperations = new ContentOperations(client);
    let shopifyContent;
    switch (contentItem.category) {
      case ContentCategory.PRODUCT:
        shopifyContent = await contentOperations.retrieveProduct(contentId);
        break;
      case ContentCategory.BLOG:
        shopifyContent = await contentOperations.retrieveBlog(contentId);
        break;
      case ContentCategory.ARTICLE:
        shopifyContent = await contentOperations.retrieveArticle(contentId);
        break;
      default:
        throw new Error("Invalid category specified");
    }
    return new Response(JSON.stringify(shopifyContent), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error: any) {
    return GenericAPIErrorHandler.handleAPIError(error);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { contentId: string } }
): Promise<Response> {
  try {
    const contentId = params.contentId;
    const searchParams = new URL(req.url).searchParams;
    const shopName = searchParams.get('shopName');
    const accessToken = searchParams.get('accessToken');
    if (!contentId || !shopName || !accessToken) {
      return new Response(JSON.stringify({ 
        error: "Content ID, shop name, and access token are required" 
      }), { 
        status: 400, 
        headers: { "Content-Type": "application/json" } 
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
      await contentService.deleteContent(contentId);
      return new Response(JSON.stringify({ message: "Content deleted successfully" }), { 
        status: 200, 
        headers: { "Content-Type": "application/json" } 
      });
    } catch (error) {
      console.error('Content deletion error:', error);
      return new Response(JSON.stringify({
        error: 'Failed to delete content',
        details: error instanceof Error ? error.message : 'Unknown operation error'
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  } catch (error: any) {
    return GenericAPIErrorHandler.handleAPIError(error);
  }
}
