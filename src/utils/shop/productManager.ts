import { prisma } from '@/lib/prisma';
import { Product } from '@prisma/client';
import { PRODUCT } from '@/types/product';

export class ProductManager {
  private constructor() {}

  static async findProductByShopProduct(shopId: string, productId: string) {
    try {
      return await prisma.product.findUnique({
        where: {
          shopId_productId: {
            shopId,
            productId
          }
        }
      });
    } catch (error) {
      console.error("Product fetch by shop and product ID error:", error);
      throw new Error('Failed to fetch product by shop and product ID');
    }
  }

  static async createProduct(data: PRODUCT) {
    try {
      return await prisma.product.create({
        data: {
          shopifyId: data.shopifyId,
          productId: data.productId,
          title: data.title,
          description: data.description,
          vendor: data.vendor,
          handle: data.handle,
          status: data.status,
          productType: data.productType,
          price: data.price,
          cost: data.cost,
          profit: data.profit,
          compareAtPrice: data.compareAtPrice,
          pageTitle: data.pageTitle,
          metaDescription: data.metaDescription,
          tags: data.tags,
          weight: data.weight,
          weightUnit: data.weightUnit,
          inventoryQuantity: data.inventoryQuantity,
          sku: data.sku,
          shopId: data.shopId,
          images: data.images || [],
          featuredImage: data.featuredImage,
          publishedAt: data.publishedAt ? new Date(data.publishedAt) : new Date(),
        }
      });
    } catch (error) {
      console.error("Product creation error:", error);
      throw new Error('Failed to create product');
    }
  }

  static async getProduct(productId: string) {
    try {
      return await prisma.product.findUnique({
        where: { id: productId },
        include: {
          images: true
        }
      });
    } catch (error) {
      console.error("Product fetch error:", error);
      throw new Error('Failed to fetch product');
    }
  }

  static async getProductByShopifyId(shopifyId: string) {
    try {
      return await prisma.product.findFirst({
        where: { shopifyId },
        include: {
          images: true
        }
      });
    } catch (error) {
      console.error("Product fetch by Shopify ID error:", error);
      throw new Error('Failed to fetch product by Shopify ID');
    }
  }

  static async updateProduct(data: PRODUCT) {
    try {
      const existingProduct = await this.findProductByShopProduct(data.shopId, data.productId);
      if (!existingProduct) {
        throw new Error("Product record not found");
      }
      return await prisma.product.update({
        where: { id: existingProduct.id },
        data: {
          shopifyId: data.shopifyId,
          productId: data.productId,
          title: data.title,
          description: data.description,
          vendor: data.vendor,
          handle: data.handle,
          status: data.status,
          productType: data.productType,
          price: data.price,
          cost: data.cost,
          profit: data.profit,
          compareAtPrice: data.compareAtPrice,
          pageTitle: existingProduct.pageTitle,
          metaDescription: existingProduct.metaDescription,
          tags: data.tags,
          weight: data.weight,
          weightUnit: data.weightUnit,
          inventoryQuantity: data.inventoryQuantity,
          sku: data.sku,
          shopId: data.shopId,
          images: data.images,
          featuredImage: data.featuredImage,
          publishedAt: data.publishedAt ? new Date(data.publishedAt) : undefined,
        }
      });
    } catch (error) {
      console.error("Product update error:", error);
      throw new Error('Failed to update product');
    }
  }

  static async deleteProduct(productId: string) {
    try {
      await prisma.product.delete({
        where: { id: productId }
      });
    } catch (error) {
      console.log("Product deletion error:", error);
      throw new Error('Failed to delete product');
    }
  }

  static async getAllProducts(shopId: string) {
    try {
      return await prisma.product.findMany({
        where: { shopId },
        orderBy: { publishedAt: 'desc' }
      });
    } catch (error) {
      console.error("Products fetch error:", error);
      throw new Error('Failed to fetch products');
    }
  }

  static async getProductsByType(shopId: string, productType: string) {
    try {
      return await prisma.product.findMany({
        where: {
          shopId,
          productType
        },
        include: {
          images: true
        },
        orderBy: { title: 'asc' }
      });
    } catch (error) {
      console.error("Products fetch by type error:", error);
      throw new Error('Failed to fetch products by type');
    }
  }

  static async searchProducts(shopId: string, searchTerm: string) {
    try {
      return await prisma.product.findMany({
        where: {
          shopId,
          OR: [
            { title: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } },
            { tags: { contains: searchTerm, mode: 'insensitive' } },
            { sku: { contains: searchTerm, mode: 'insensitive' } },
            { vendor: { contains: searchTerm, mode: 'insensitive' } }
          ]
        },
        include: {
          images: true
        },
        orderBy: { title: 'asc' }
      });
    } catch (error) {
      console.error("Products search error:", error);
      throw new Error('Failed to search products');
    }
  }

  static async updateInventory(productId: string, quantity: number) {
    try {
      return await prisma.product.update({
        where: { id: productId },
        data: {
          inventoryQuantity: quantity
        }
      });
    } catch (error) {
      console.error("Inventory update error:", error);
      throw new Error('Failed to update inventory');
    }
  }

  static async getProductsByStatus(shopId: string, status: string) {
    try {
      return await prisma.product.findMany({
        where: {
          shopId,
          status
        },
        include: {
          images: true
        },
        orderBy: { title: 'asc' }
      });
    } catch (error) {
      console.error("Products fetch by status error:", error);
      throw new Error('Failed to fetch products by status');
    }
  }
}