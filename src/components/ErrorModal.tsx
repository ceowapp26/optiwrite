import React, { useEffect } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Text } from '@shopify/polaris';
import { AlertMajor } from '@shopify/polaris-icons'; 

const ErrorModal = ({ error, onClose }) => {
  const [active, setActive] = React.useState(false);

  useEffect(() => {
    if (error) {
      setActive(true);
    }
  }, [error]);

  const handleClose = () => {
    setActive(false);
    onClose();
  };

  return (
    <Modal
      open={active}
      onClose={handleClose}
      title="Error Occurred"
      primaryAction={{
        content: 'Close',
        onAction: handleClose,
        destructive: true,
      }}
    >
      <Modal.Header>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <AlertMajor color="critical" />
          <Text variant="headingMd" as="h2" color="critical" style={{ marginLeft: '8px' }}>
            Error Occurred
          </Text>
        </div>
      </Modal.Header>
      <Modal.Body>
        <div style={{ backgroundColor: '#f8d7da', border: '1px solid #f5c6cb', borderRadius: '4px', padding: '16px' }}>
          <Text color="critical">{error}</Text>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button onClick={handleClose} primary>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ErrorModal;