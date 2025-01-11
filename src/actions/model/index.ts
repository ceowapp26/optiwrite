"use server";
import { prisma } from '@/lib/prisma'
import { ModelManager } from '@/utils/storage';

export async function getAIModel() {
  try {
    const model = await ModelManager.getLatestModel();
    return model;
  } catch (error) {
    console.error('Error registering product:', error);
    return null;
  }
}
