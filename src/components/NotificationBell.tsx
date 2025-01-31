import { useEffect, useState, useCallback } from 'react';
import { Button, Icon, Popover, Box, Text, Badge, Card, BlockStack, InlineStack, Avatar } from '@shopify/polaris';
import { NotificationIcon, AlertCircleIcon, CheckCircleIcon, InfoIcon } from '@shopify/polaris-icons';
import { Notification, FeatureFlag } from '@prisma/client';
import { formatDistanceToNow } from 'date-fns';
import { DateTime } from 'luxon';
import { useTheme } from 'next-themes';
import { subscriptionManager } from '@/actions/notification';
import NotificationModal from './NotificationModal';
import FeatureFlagModal from './FeatureFlagModal';
import styled from 'styled-components';

const NotificationWrapper = styled.div`
  position: relative;
  z-index: 30;
  width: 100%;
  height: 100%;
  transition: transform 0.2s ease;

  &:hover {
    transform: scale(1.05);
  }
`;

const NotificationList = styled.div`
  max-height: 400px;
  margin-top: 10px;
  overflow-y: auto;
  width: 360px;
  scrollbar-width: thin;
  scrollbar-color: var(--p-border-subdued) transparent;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background-color: var(--p-border-subdued);
    border-radius: 3px;
  }
`;

const BadgeWrapper = styled.div`
  position: absolute;
  z-index: 30;
  bottom: 14px;
  left: 14px;
  animation: pulse 2s infinite;

  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); }
  }
`;

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'success':
      return <CheckCircleIcon className="w-5 h-5 fill-green-500" />;
    case 'warning':
      return <AlertCircleIcon className="w-5 h-5 fill-yellow-500" />;
    default:
      return <InfoIcon className="w-5 h-5 fill-blue-500" />;
  }
};

interface NotificationBellProps {
  shopName: string;
}

const NotificationBell = ({ shopName }: NotificationBellProps) => {
  const { theme } = useTheme();
  const [popoverActive, setPopoverActive] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [selectedFeatureFlag, setSelectedFeatureFlag] = useState<FeatureFlag | null>(null);

  const togglePopoverActive = useCallback(() => setPopoverActive((active) => !active), []);

  const handleNotificationClick = useCallback((notification: Notification) => {
    setSelectedNotification(notification);
    setPopoverActive(false);
    subscriptionManager.updateNotification({
      notificationId: notification.id,
      updates: { isRead: true }
    });
  }, []);

  useEffect(() => {
    let isSubscribed = true;

    const loadInitialData = async () => {
      try {
        const notificationResult = await subscriptionManager.getShopNotifications(shopName);
        if (isSubscribed && notificationResult.success && notificationResult.data) {
          setNotifications(notificationResult.data);
          setUnreadCount(notificationResult.data.filter(n => !n.isRead).length);
        }
        const flagResult = await subscriptionManager.getFeatureFlags();
        if (isSubscribed && flagResult.success && flagResult.data) {
          setFeatureFlags(flagResult.data);
        }
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    };
    loadInitialData();
    let notificationUnsub: (() => void) | undefined;
    try {
      notificationUnsub = subscriptionManager.subscribeToNotifications(shopName, {
        onUpdate: (notification) => {
          if (!isSubscribed) return;
          setNotifications(prev => {
            const updated = [...prev];
            const index = updated.findIndex(n => n.id === notification.id);
            if (index >= 0) {
              updated[index] = notification;
            } else {
              updated.unshift(notification);
            }
            return updated;
          });
          setUnreadCount(prev => notification.isRead ? prev - 1 : prev + 1);
        }
      });
    } catch (error) {
      console.error('Error setting up notification subscription:', error);
    }
    let flagUnsub: (() => void) | undefined;
    try {
      flagUnsub = subscriptionManager.subscribeToFeatureFlags({
        onUpdate: (featureFlag) => {
          if (!isSubscribed) return;
          setFeatureFlags(prev => {
            const updated = [...prev];
            const index = updated.findIndex(f => f.id === featureFlag.id);
            if (index >= 0) {
              updated[index] = featureFlag;
            } else {
              updated.unshift(featureFlag);
            }
            return updated;
          });
          setSelectedFeatureFlag(featureFlag);
        }
      });
    } catch (error) {
      console.error('Error setting up feature flag subscription:', error);
    }
    return () => {
      isSubscribed = false;
      if (typeof notificationUnsub === 'function') {
        notificationUnsub();
      }
      if (typeof flagUnsub === 'function') {
        flagUnsub();
      }
    };
  }, [shopName]);

  const getBackgroundColor = (isRead: boolean, isDark: boolean) => {
    if (isDark) {
      return isRead ? 'rgba(45, 45, 45, 1)' : 'rgba(0, 55, 95, 0.8)';
    }
    return isRead ? 'rgba(241, 241, 241, 1)' : 'rgba(220, 240, 255, 1)';
  };

  const getHoverBackgroundColor = (isRead: boolean, isDark: boolean) => {
    if (isDark) {
      return isRead ? 'rgba(55, 55, 55, 1)' : 'rgba(0, 65, 110, 0.9)';
    }
    return isRead ? 'rgba(230, 230, 230, 1)' : 'rgba(200, 230, 255, 1)';
  };

  const getBorderColor = (isDark: boolean) => {
    return isDark ? 'rgba(75, 75, 75, 1)' : 'var(--p-border-subdued)';
  };

  const getTextColor = (isDark: boolean, isSubdued: boolean = false) => {
    if (isDark) {
      return isSubdued ? 'rgba(175, 175, 175, 1)' : 'rgba(255, 255, 255, 0.95)';
    }
    return isSubdued ? 'var(--p-text-subdued)' : 'var(--p-text)';
  };

  const activator = (
    <NotificationWrapper>
      <div
        id="notif-btn"
        className="cursor-pointer flex items-center relative"
        onClick={togglePopoverActive}
      >
        <NotificationIcon className="w-5 h-5"/>
        {unreadCount > 0 && (
          <BadgeWrapper>
            <Badge tone="info">{unreadCount}</Badge>
          </BadgeWrapper>
        )}
      </div>
    </NotificationWrapper>
  );

  return (
    <>
      <Popover
        active={popoverActive}
        activator={activator}
        onClose={togglePopoverActive}
        preferredAlignment="right"
        preferredPosition="below"
      >
        <Card>
          <Box>
            <BlockStack gap="200">
              <Box paddingBlockStart="50" />
              <Text variant="headingLg" as="h3">Notifications</Text>
              <NotificationList>
                {notifications.length === 0 ? (
                  <Box padding="400">
                    <BlockStack inlineAlign="center" align="center" gap="200">
                      <NotificationIcon className="w-5 h-5" />
                      <Text alignment="center" tone="subdued">No notifications yet</Text>
                    </BlockStack>
                  </Box>
                ) : (
                  notifications.slice(0, 20).map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}                      
                      style={{
                        cursor: 'pointer',
                        backgroundColor: getBackgroundColor(notification.isRead, theme === 'dark'),
                        padding: '16px',
                        borderRadius: '8px',
                        border: `1px solid ${getBorderColor(theme === 'dark')}`,
                        transition: 'all 0.2s ease',
                        marginBottom: '12px',
                        boxShadow: 'none',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = getHoverBackgroundColor(
                          notification.isRead,
                          theme === 'dark'
                        );
                        e.currentTarget.style.boxShadow = 'var(--p-shadow-button)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = getBackgroundColor(
                          notification.isRead,
                          theme === 'dark'
                        );
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <InlineStack align="space-between" blockAlign="center" wrap={false} gap="300">
                        <BlockStack gap="200">
                          <Text variant="bodyMd" fontWeight="bold">
                            {notification.title}
                          </Text>
                          <Text variant="bodySm" tone="subdued">
                            {notification.message}
                          </Text>
                          <Text variant="bodySm" tone="subdued">
                            {formatDistanceToNow(DateTime.fromISO(notification.createdAt, { zone: 'utc' }).toLocal().toJSDate(), { addSuffix: true })}
                          </Text>
                        </BlockStack>
                        <BlockStack>
                          {getNotificationIcon(notification.type)}
                        </BlockStack>
                      </InlineStack>
                    </div>
                  ))
                )}
              </NotificationList>
            </BlockStack>
          </Box>
        </Card>
      </Popover>
      {selectedNotification && (
        <NotificationModal
          notification={selectedNotification}
          onClose={() => setSelectedNotification(null)}
        />
      )}

      {selectedFeatureFlag && (
        <FeatureFlagModal
          featureFlag={selectedFeatureFlag}
          onClose={() => setSelectedFeatureFlag(null)}
        />
      )}
    </>
  );
};

export default NotificationBell;

