import React from 'react';
import { AppBridgeState, ClientApplication } from '@shopify/app-bridge';
import { Modal, Button } from '@shopify/app-bridge/actions';

interface GenericNotificationModalProps {
  app: ClientApplication<AppBridgeState>;
  title: string;
  message: string;
  primaryButton?: {
    label: string;
    action: () => void;
  };
}

const GenericNotificationModal: React.FC<GenericNotificationModalProps> = ({ app, title, message, primaryButton }) => {
  const primaryButtonInstance = primaryButton
    ? Button.create(app, { label: primaryButton.label })
    : null;

  if (primaryButtonInstance) {
    primaryButtonInstance.subscribe(Button.Action.CLICK, primaryButton.action);
  }
  const cancelButton = Button.create(app, { label: 'Cancel' });
  const modal = Modal.create(app, {
    title,
    message,
    footer: {
      buttons: {
        primary: primaryButtonInstance,
        secondary: [cancelButton],
      },
    },
  });
  modal.dispatch(Modal.Action.OPEN);
  return null;
};

export { GenericNotificationModal };