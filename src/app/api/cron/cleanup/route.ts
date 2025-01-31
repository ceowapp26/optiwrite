import { type NextRequest } from 'next/server';
import { runUninstallWorker } from '@/utils/workers/uninstall_worker';
import { runCleanupWorker } from '@/utils/workers/cleanup_worker';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shop = searchParams.get('shop');
    await runUninstallWorker(shop);
    await runCleanupWorker(shop);
    return new Response('Uninstall queue processed successfully', { 
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return new Response(JSON.stringify({ 
      error: `Error processing uninstall queue: ${error.message}`
    }), { 
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}
