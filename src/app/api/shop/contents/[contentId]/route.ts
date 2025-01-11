import { initializeShopify } from "@/lib/shopify";
import { GenericAPIErrorHandler } from '@/utils/api';
import { handleShopifyInitError, handleContentDeleteError } from '@/utils/api/customAPIErrorHandlers';
import { ShopifySessionManager } from '@/utils/storage';
import { ContentService } from '@/utils/content/contentService';
import { ContentManager } from "@/utils/content";
import { ContentCategory } from "@/types/content";

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
    const { shopName, accessToken, category, ...updateData } = await req.json();
    const shopify = initializeShopify(shopName, accessToken);
    const shop = await ShopifySessionManager.findShopByName(shopName);
    if (!shop) {
      throw new Error("No shop found");
    }
    const contentItem = await ContentManager.getContentById(contentId);
    if (!contentItem) {
      return new Response(JSON.stringify({ error: "Content not found in database" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }
    let updatedContent;
    let contentData;
    switch (contentItem.category) {
      case ContentCategory.PRODUCT:
        updatedContent = await shopify.product.update(contentId, updateData);
        contentData = {
          shopifyId: updatedContent.admin_graphql_api_id,
          contentId: updatedContent.id.toString(),
          title: updatedContent.title,
          description: updatedContent.body_html,
          vendor: updatedContent.vendor,
          handle: updatedContent.handle,
          status: updatedContent.status,
          productType: updatedContent.product_type,
          price: parseFloat(updatedContent.variants[0]?.price || '0'),
          compareAtPrice: parseFloat(updatedContent.variants[0]?.compare_at_price || '0'),
          tags: Array.isArray(updatedContent.tags) 
            ? updatedContent.tags
            : updatedContent.tags?.split(',').map(tag => tag.trim()) || [],
          weight: parseFloat(updatedContent.variants[0]?.weight || '0'),
          weightUnit: updatedContent.variants[0]?.weight_unit || 'kg',
          inventoryQuantity: parseInt(updatedContent.variants[0]?.inventory_quantity || '0'),
          sku: updatedContent.variants[0]?.sku || '',
          images: updatedContent.images?.map(image => image.src) || [],
          featuredImage: updatedContent.image?.src || null,
        };
        break;
      case ContentCategory.BLOG:
        updatedContent = await shopify.article.update(updateData.blogId, contentId, updateData);
        contentData = {
          shopifyId: updatedContent.admin_graphql_api_id,
          contentId: updatedContent.id.toString(),
          title: updatedContent.title,
          description: updatedContent.body_html,
          handle: updatedContent.handle,
          author: updatedContent.author,
          tags: Array.isArray(updatedContent.tags)
            ? updatedContent.tags
            : updatedContent.tags?.split(',').map(tag => tag.trim()) || [],
          featuredImage: updatedContent.image?.src || null,
          blogId: updateData.blogId
        };
        break;

      default:
        throw new Error("Invalid category specified");
    }
    const updatedDbContent = await ContentManager.updateContent({
      shopId: shop.id,
      category,
      output: contentData,
      publishedAt: updatedContent.published_at ? new Date(updatedContent.published_at) : undefined
    });

    return new Response(JSON.stringify({
      shopify: updatedContent,
      database: updatedDbContent
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
    const shopify = initializeShopify(shopName, accessToken);
    let shopifyContent;
    switch (contentItem.category) {
      case ContentCategory.PRODUCT:
        shopifyContent = await shopify.product.get(contentId);
        break;
      case ContentCategory.BLOG:
        const { blogId } = await req.json();
        shopifyContent = await shopify.article.get(blogId, contentId);
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
      await contentService.deleteContent(contentId);
      return new Response(JSON.stringify({ message: "Content deleted successfully" }), { 
        status: 200, 
        headers: { "Content-Type": "application/json" } 
      });
    } catch (error) {
      return handleContentDeleteError(error);
    }
  } catch (error: any) {
    return GenericAPIErrorHandler.handleAPIError(error);
  }
}

function calculateCompareAtPrice(price: number, profit: number): string | undefined {
  if (typeof price === 'number' && typeof profit === 'number') {
    return (price + profit).toFixed(2);
  }
  return undefined;
}