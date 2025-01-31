import { prisma } from '@/lib/prisma';

export const runUninstallWorker = async (shop) => {
  try {
    const now = new Date();
    const deletedRecords = await prisma.webhookLog.deleteMany({
      where: {
        shopName: shop,
        topic: 'APP_UNINSTALLED_COMPLETED',
        createdAt: {
          lte: new Date(now.getTime() - 30 * 60 * 1000), 
        },
      },
    });
    console.log(`Deleted ${deletedRecords.count} uninstall events for shop ${shop}.`);
  } catch (error) {
    console.error('Error in uninstall worker:', error);
    throw error;
  }
};
