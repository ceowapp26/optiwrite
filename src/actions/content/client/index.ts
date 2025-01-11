import { supabase } from '@/lib/supabase';
import { Content } from '@prisma/client';
import { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

interface ContentUpdatePayload {
  contentId: string;
  updates: Partial<{
    input: any;
    output: any;
    metadata: any;
    title: string;
    description: string;
    tags: string[];
    status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
    type: 'PRODUCT' | 'BLOG' | 'ARTICLE';
  }>;
}

interface ContentUpdate {
  id: string;
  title: string | null;
  description: string | null;
  input: any;
  output: any;
  metadata: any;
  tags: string[];
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  type: 'PRODUCT' | 'BLOG' | 'ARTICLE' | null;
  version: number;
  updatedAt: string;
}

interface SubscriptionOptions {
  onError?: (error: any) => void;
  onSubscribed?: () => void;
  onUpdate?: (payload: Content) => void;
}

interface ContentResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class ContentSubscriptionManager {
  private channels: Map<string, RealtimeChannel> = new Map();
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  subscribe(
    contentId: string, 
    options: SubscriptionOptions = {}
  ): () => void {
    const channelKey = `content-${contentId}`;
    if (this.channels.has(channelKey)) {
      this.cleanup(channelKey);
    }
    const channel = this.supabase
      .channel(channelKey)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'Content',
          filter: `id=eq.${contentId}`
        },
        (payload) => {
          options.onUpdate?.(payload.new as Content);
        }
      )
      .subscribe(async (status) => {
        console.log(`Subscription status for ${channelKey}:`, status);
        if (status === 'SUBSCRIBED') {
          this.channels.set(channelKey, channel);
          options.onSubscribed?.();
        } else if (status === 'CLOSED') {
          this.channels.delete(channelKey);
          options.onError?.(new Error(`Subscription closed for ${channelKey}`));
        } else if (status === 'CHANNEL_ERROR') {
          this.channels.delete(channelKey);
          options.onError?.(new Error(`Subscription error for ${channelKey}`));
        }
      });
    return () => {
      this.cleanup(channelKey);
    };
  }

  async getEditContent(contentId: string): Promise<ContentResponse<Content>> {
    try {
      const { data, error } = await this.supabase
        .from('Content')
        .select(`
          *,
          shop:Shop(
            id,
            name,
            createdAt
          )
        `)
        .eq('id', contentId)
        .single();
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching content:', error);
      return { success: false, error: 'Failed to fetch content' };
    }
  }

  async triggerRevalidation(path: string): Promise<void> {
    try {
      const response = await fetch('/api/content/revalidate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Revalidation failed:', error);
        throw new Error(error.error);
      }

      const result = await response.json();
      console.log('Revalidation successful:', result);
    } catch (error) {
      console.error('Error triggering revalidation:', error);
      throw error;
    }
  }

  async updateContentRealtime({ contentId, updates }: ContentUpdatePayload): Promise<ContentResponse<Content>> {
    try {
      const { data: existingContent } = await this.supabase
        .from('Content')
        .select('*')
        .eq('id', contentId)
        .single();
      if (!existingContent) {
        throw new Error('Content not found');
      }
      const mergedUpdates = {
        ...updates,
        output: {
          ...existingContent.output,
          images: [
            ...(existingContent.output?.images || []),
            ...(updates.output?.images || [])
          ].filter((value, index, self) => self.indexOf(value) === index),
          title: updates.title,
        },
        updatedAt: new Date().toISOString(),
        lastEditedAt: new Date().toISOString()
      };
      const { data, error } = await this.supabase
        .from('Content')
        .update(mergedUpdates)
        .eq('id', contentId)
        .select()
        .single();
      if (error) {
        console.error('Update error:', error);
        throw error;
      }
      setTimeout(() => {
        this.triggerRevalidation(`/content/${contentId}`).catch(console.error);
      }, 100);
      return { success: true, data };
    } catch (error) {
      console.error('Error in updateContentRealtime:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update content' 
      };
    }
  }

  private async cleanup(channelKey: string): Promise<void> {
    const channel = this.channels.get(channelKey);
    if (channel) {
      try {
        await channel.unsubscribe();
        this.channels.delete(channelKey);
        console.log(`Cleaned up subscription for ${channelKey}`);
      } catch (error) {
        console.error(`Error cleaning up subscription for ${channelKey}:`, error);
      }
    }
  }
}

const subscriptionManager = new ContentSubscriptionManager(supabase);

export { subscriptionManager, type ContentUpdatePayload, type ContentUpdate, type SubscriptionOptions };


