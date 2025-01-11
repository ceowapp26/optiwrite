import { supabase } from '@/lib/supabase';
import { Notification, FeatureFlag, NotificationType } from '@prisma/client';
import { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { findShopByName } from '@/actions/auth';

interface NotificationUpdatePayload {
  notificationId: string;
  updates: Partial<{
    title: string;
    message: string;
    link: string;
    isRead: boolean;
    metadata: any;
    type: NotificationType;
    expiresAt: Date;
  }>;
}

interface FeatureFlagUpdatePayload {
  flagId: string;
  updates: Partial<{
    name: string;
    description: string;
    isEnabled: boolean;
    percentage: number;
  }>;
}

interface SubscriptionOptions<T> {
  onError?: (error: any) => void;
  onSubscribed?: () => void;
  onUpdate?: (payload: T) => void;
}

interface DataResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class RealtimeSubscriptionManager {
  private channels: Map<string, RealtimeChannel> = new Map();
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  async subscribeToNotifications(
    shopName: string,
    options: SubscriptionOptions<Notification> = {}
  ): () => void {
    const shop = await findShopByName(shopName);
    const channelKey = `notifications-${shop?.id}`;
    if (this.channels.has(channelKey)) {
      this.cleanup(channelKey);
    }
    const channel = this.supabase
      .channel(channelKey)
      .on(
        'postgres_changes',
        {
          event: '*', 
          schema: 'public',
          table: 'Notification',
          filter: `shopId=eq.${shop?.id}`
        },
        (payload) => {
          options.onUpdate?.(payload.new as Notification);
        }
      )
      .subscribe(async (status) => {
        //console.log(`Notification subscription status for ${channelKey}:`, status);
        if (status === 'SUBSCRIBED') {
          this.channels.set(channelKey, channel);
          options.onSubscribed?.();
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          this.channels.delete(channelKey);
          options.onError?.(new Error(`Subscription ${status.toLowerCase()} for ${channelKey}`));
        }
      });

    return () => this.cleanup(channelKey);
  }

  subscribeToFeatureFlags(
    options: SubscriptionOptions<FeatureFlag> = {}
  ): () => void {
    const channelKey = 'feature-flags';
    if (this.channels.has(channelKey)) {
      this.cleanup(channelKey);
    }

    const channel = this.supabase
      .channel(channelKey)
      .on(
        'postgres_changes',
        {
          event: '*', 
          schema: 'public',
          table: 'FeatureFlag'
        },
        (payload) => {
          options.onUpdate?.(payload.new as FeatureFlag);
        }
      )
      .subscribe(async (status) => {
        //console.log(`FeatureFlag subscription status:`, status);
        if (status === 'SUBSCRIBED') {
          this.channels.set(channelKey, channel);
          options.onSubscribed?.();
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          this.channels.delete(channelKey);
          options.onError?.(new Error(`Subscription ${status.toLowerCase()} for ${channelKey}`));
        }
      });

    return () => this.cleanup(channelKey);
  }

  async getShopNotifications(shopName: string): Promise<DataResponse<Notification[]>> {
    try {
      const shop = await findShopByName(shopName);
      const { data, error } = await this.supabase
        .from('Notification')
        .select('*')
        .eq('shopId', shop?.id)
        .order('createdAt', { ascending: false });

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return { success: false, error: 'Failed to fetch notifications' };
    }
  }

  async getFeatureFlags(): Promise<DataResponse<FeatureFlag[]>> {
    try {
      const { data, error } = await this.supabase
        .from('FeatureFlag')
        .select('*')
        .order('createdAt', { ascending: false });

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Error fetching feature flags:', error);
      return { success: false, error: 'Failed to fetch feature flags' };
    }
  }

  async updateNotification({ notificationId, updates }: NotificationUpdatePayload): Promise<DataResponse<Notification>> {
    try {
      const { data: existingNotification } = await this.supabase
        .from('Notification')
        .select('*')
        .eq('id', notificationId)
        .single();

      if (!existingNotification) {
        throw new Error('Notification not found');
      }

      const { data, error } = await this.supabase
        .from('Notification')
        .update({
          ...updates,
          updatedAt: new Date().toISOString()
        })
        .eq('id', notificationId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating notification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update notification'
      };
    }
  }

  async updateFeatureFlag({ flagId, updates }: FeatureFlagUpdatePayload): Promise<DataResponse<FeatureFlag>> {
    try {
      const { data: existingFlag } = await this.supabase
        .from('FeatureFlag')
        .select('*')
        .eq('id', flagId)
        .single();

      if (!existingFlag) {
        throw new Error('Feature flag not found');
      }

      const { data, error } = await this.supabase
        .from('FeatureFlag')
        .update({
          ...updates,
          updatedAt: new Date().toISOString()
        })
        .eq('id', flagId)
        .select()
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Error updating feature flag:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update feature flag'
      };
    }
  }

  private async cleanup(channelKey: string): Promise<void> {
    const channel = this.channels.get(channelKey);
    if (channel) {
      try {
        await channel.unsubscribe();
        this.channels.delete(channelKey);
        //console.log(`Cleaned up subscription for ${channelKey}`);
      } catch (error) {
        console.error(`Error cleaning up subscription for ${channelKey}:`, error);
      }
    }
  }
}

const subscriptionManager = new RealtimeSubscriptionManager(supabase);

export {
  subscriptionManager,
  type NotificationUpdatePayload,
  type FeatureFlagUpdatePayload,
  type SubscriptionOptions,
  type DataResponse
};