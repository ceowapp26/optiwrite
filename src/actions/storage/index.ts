"use server";
import { prisma } from '@/lib/prisma'
import { Session } from '@shopify/shopify-api';
import { PRODUCT } from '@/types/product'
import { Session as ShopifySession } from "@shopify/shopify-api";
import { ShopifySessionManager } from '@/utils/storage'

export async function registerProduct(data: PRODUCT) {
  try {
    const registeredProduct = await prisma.product.create({
      data: data,
    });
    return registeredProduct.id;
  } catch (error) {
    console.error('Error registering product:', error);
    return null;
  }
}

export async function updateProduct(id: string, data: PRODUCT) {
  try {
    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      throw new Error(`product with ID ${id} not found.`);
    }

    const updatedproduct = await prisma.product.update({
      where: { id },
      data,
    });

    return updatedproduct;
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
}

export async function getProductsByUserEmail(email: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { products: true },
    });

    if (!user) {
      console.error('User not found');
      return [];
    }
    return user.products;
  } catch (error) {
    console.error('Error fetching products:', error);
    return []; 
  }
}
export async function getProductIdByName(productName: string) {
  try {
    const product = await prisma.product.findFirst({
      where: {
        title: productName,
      },
    });
    return product.id;
  } catch (error) {
    console.error(`Error fetching features for productId ${productId}:`, error);
    return null; 
  }
}

export async function removeProduct(id: string) {
  try {
    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      throw new Error(`Product with ID ${id} not found.`);
    }
    await prisma.product.delete({
      where: { id },
    });
    return existingProduct.id;
  } catch (error) {
    console.error(`Error deleting product with ID ${id}:`, error);
    return null; 
  }
}

export async function updateGoogleSession(userId: string, accessToken: string, refreshToken: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) throw new Error('User not found');

    const expires = new Date();
    expires.setHours(expires.getHours() + 1); 

    const googleSession = await prisma.googleSession.upsert({
      where: { userId },
      update: {
        sessionToken: accessToken, 
        expires,
      },
      create: {
        userId,
        sessionToken: accessToken, 
        expires,
      },
    });

    await prisma.account.upsert({
      where: { 
        provider_providerAccountId: {
          provider: 'google',
          providerAccountId: userId,
        }
      },
      update: {
        access_token: accessToken, 
        refresh_token: refreshToken,
        expires_at: Math.floor(expires.getTime() / 1000),
      },
      create: {
        userId,
        type: 'oauth',
        provider: 'google',
        providerAccountId: userId,
        access_token: accessToken, 
        refresh_token: refreshToken,
        expires_at: Math.floor(expires.getTime() / 1000),
      },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { 
        accessToken, 
      },
    });

    return true;
  } catch (error) {
    console.error('Error updating Google session:', error);
    return false;
  }
}