import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useZustandStore } from '@/stores/zustand/store';
import { exportPrompts } from '@/utils/utilities';
import { 
  Button, 
  LegacyCard, 
  Modal, 
  TextContainer,
  Tooltip
} from '@shopify/polaris';
import { ExportIcon } from '@shopify/polaris-icons';

const ExportPrompt = () => {
  const { t } = useTranslation();
  const prompts = useZustandStore.getState().prompts;
  const [isExporting, setIsExporting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportPrompts(prompts);
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <LegacyCard sectioned>
        <TextContainer>
          <p className="text-md text-center font-bold mb-4">
            {t('Export Prompts')}
          </p>
          <Tooltip content={t('Export CSV File')}>
            <Button
              variant="primary"
              icon={ExportIcon}
              onClick={handleExport}
              loading={isExporting}
              fullWidth
            >
              {isExporting ? t('Exporting...') : t('Export Prompts')}
            </Button>
          </Tooltip>
        </TextContainer>
      </LegacyCard>
      <Modal
        open={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title={t('Export Successful')}
      >
        <Modal.Section>
          <TextContainer>
            <p>
              {t('Your prompts have been successfully exported to a CSV file.')}
            </p>
          </TextContainer>
        </Modal.Section>
      </Modal>
    </>
  );
};

export default ExportPrompt;