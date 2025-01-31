import React from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Button } from '@shopify/polaris';
import { XIcon } from '@shopify/polaris-icons';

const PopupModal = ({
  title = 'Information',
  message,
  isModalOpen,
  setIsModalOpen,
  handleConfirm,
  handleClose,
  handleClickBackdrop,
  cancelButton = true,
  children,
}: {
  title?: string;
  message?: string;
  isModalOpen?: boolean;
  setIsModalOpen: (isOpen: boolean) => void;
  handleConfirm?: () => void;
  handleClose?: () => void;
  handleClickBackdrop?: () => void;
  cancelButton?: boolean;
  children?: React.ReactNode;
}) => {
  const { t } = useTranslation();
  const _handleClose = () => {
    handleClose && handleClose();
    setIsModalOpen(false);
  };
  return (
    <Modal
      open={isModalOpen}
      onClose={_handleClose}
      title={title}
      size="large"
      primaryAction={
        handleConfirm ? {
          content: t('confirm'),
          onAction: handleConfirm
        } : undefined
      }
      secondaryActions={
        cancelButton ? [{
          content: t('cancel'),
          icon: XIcon,
          destructive: true,
          onAction: _handleClose
        }] : []
      }
    >
      <Modal.Section>
        {message && (
          <div className="flex items-start p-4 space-x-3 mb-4 bg-amber-50 border-l-4 border-amber-500 rounded-md">
            <svg className="w-6 h-6 text-amber-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
            <p className="text-amber-700 text-base font-medium">{message}</p>
          </div>
        )}
        <div className="overflow-y-auto max-h-[60vh]">
          {children}
        </div>
      </Modal.Section>
    </Modal>
  );
};

export default PopupModal;