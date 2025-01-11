import { Modal, TextContainer } from '@shopify/polaris';
import { Notification } from '@prisma/client';

interface NotificationModalProps {
  notification: Notification;
  onClose: () => void;
}

const NotificationModal = ({ notification, onClose }: NotificationModalProps) => {
  return (
    <Modal
      open={true}
      onClose={onClose}
      title={notification.title}
      primaryAction={{
        content: 'Close',
        onAction: onClose,
      }}
    >
      <Modal.Section>
        <TextContainer>
          <p>{notification.message}</p>
          {notification.metadata && (
            <div style={{ marginTop: '16px' }}>
              <pre>{JSON.stringify(notification.metadata, null, 2)}</pre>
            </div>
          )}
        </TextContainer>
      </Modal.Section>
    </Modal>
  );
};

export default NotificationModal;