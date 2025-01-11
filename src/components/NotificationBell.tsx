import { useEffect, useState, useCallback } from 'react';
import { Button, Icon, Popover, Box, Text, Badge, Card, BlockStack, InlineStack, Avatar } from '@shopify/polaris';
import { NotificationIcon, AlertCircleIcon, CheckCircleIcon, InfoIcon } from '@shopify/polaris-icons';
import { Notification, FeatureFlag } from '@prisma/client';
import { formatDistanceToNow } from 'date-fns';
import { subscriptionManager } from '@/actions/notification';
import NotificationModal from './NotificationModal';
import FeatureFlagModal from './FeatureFlagModal';
import styled from 'styled-components';

const NotificationWrapper = styled.div`
  position: relative;
  z-index: 999;
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
  z-index: 999;
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
      return <Icon source={CheckCircleIcon} color="success" />;
    case 'warning':
      return <Icon source={AlertCircleIcon} color="warning" />;
    default:
      return <Icon source={InfoIcon} color="highlight" />;
  }
};

interface NotificationBellProps {
  shopName: string;
}

const NotificationBell = ({ shopName }: NotificationBellProps) => {
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
                    <BlockStack align="center" gap="200">
                      <Icon source={NotificationIcon} color="subdued" />
                      <Text alignment="center" color="subdued">No notifications yet</Text>
                    </BlockStack>
                  </Box>
                ) : (
                  notifications.slice(0, 20).map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}                      
                      style={{
                        cursor: 'pointer',
                        backgroundColor: notification.isRead
                          ? 'rgba(241, 241, 241, 1)'
                          : 'rgba(220, 240, 255, 1)',
                        padding: '16px',
                        borderRadius: '8px',
                        border: '1px solid var(--p-border-subdued)',
                        transition: 'all 0.2s ease',
                        marginBottom: '12px',
                        boxShadow: 'none',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = notification.isRead
                          ? 'rgba(230, 230, 230, 1)' 
                          : 'rgba(200, 230, 255, 1)'; 
                        e.currentTarget.style.boxShadow = 'var(--p-shadow-button)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = notification.isRead
                          ? 'rgba(241, 241, 241, 1)' 
                          : 'rgba(220, 240, 255, 1)'; 
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <InlineStack align="space-between" blockAlign="center">
                        <BlockStack gap="200">
                          <Text variant="bodyMd" fontWeight="bold">
                            {notification.title}
                          </Text>
                          <Text variant="bodySm" color="subdued">
                            {notification.message}
                          </Text>
                          <Text variant="bodySm" color="subdued">
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
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

