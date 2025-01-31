import { type NextRequest } from 'next/server';
import { runWebhookQueueWorker } from '@/utils/workers/subscription_worker';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await runWebhookQueueWorker();
    return new Response('Subscription queue processed successfully', { 
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return new Response(JSON.stringify({ 
      error: `Error processing subscription queue: ${error.message}`
    }), { 
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}
