import { WebhookQueue } from '@/utils/webhooks';

export const runWebhookQueueWorker = async () => {
  try {
    return WebhookQueue.processSubscriptionTasks();
  } catch (error) {
    console.error('Error occurred while executing queued tasks:', error);
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
    } else {
      console.error('Error details:', error);  
    }
    throw error;
  }
};
