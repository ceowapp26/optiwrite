import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import { useZustandStore } from '@/stores/zustand/store';
import { importPromptCSV } from '@/utils/utilities';
import { 
  Button, 
  LegacyCard, 
  ProgressBar, 
  Banner,
  BlockStack,
  Tooltip
} from '@shopify/polaris';
import { 
  ImportIcon, 
  UploadIcon 
} from '@shopify/polaris-icons';

const ImportPrompt = () => {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [alert, setAlert] = useState<{ message: string; success: boolean } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState('');

  const handleFileUpload = () => {
    if (!inputRef.current) return;
    const file = inputRef.current.files?.[0];
    if (file) {
      setIsUploading(true);
      const reader = new FileReader();
      reader.onload = (event) => {
        const csvString = event.target?.result;
        try {
          const results = importPromptCSV(csvString);
          const prompts = useZustandStore.getState().prompts;
          const setPrompts = useZustandStore.getState().setPrompts;
          const newPrompts = results.map((data) => ({
            id: uuidv4(),
            name: Object.values(data)[0],
            prompt: Object.values(data)[1],
          }));
          setPrompts(prompts.concat(newPrompts));
          setAlert({ message: 'Successfully imported!', success: true });
        } catch (error) {
          setAlert({ message: error.message, success: false });
        }
        setIsUploading(false);
      };
      reader.readAsText(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
    }
  };

  return (
    <LegacyCard sectioned>
      <BlockStack gap="500">
        <input
          type="file"
          ref={inputRef}
          onChange={handleFileChange}
          style={{ display: 'none' }}
          accept=".csv"
        />
        <BlockStack gap="500">
          <Tooltip content={t('Upload CSV File')}>
            <Button
              icon={UploadIcon}
              onClick={() => inputRef.current?.click()}
            >
              {fileName || t('Choose CSV File')}
            </Button>
          </Tooltip>
          <Tooltip content={t('Import CSV File')}>
            <Button
              variant="primary"
              icon={ImportIcon}
              onClick={handleFileUpload}
              disabled={!fileName || isUploading}
              loading={isUploading}
            >
              {isUploading ? t('Importing...') : t('Import')}
            </Button>
          </Tooltip>
        </BlockStack>
        {isUploading && (
          <ProgressBar progress={50} size="small" />
        )}
        {alert && (
          <Banner
            status={alert.success ? 'success' : 'critical'}
            title={alert.message}
            onDismiss={() => setAlert(null)}
          />
        )}
      </BlockStack>
    </LegacyCard>
  );
};

export default ImportPrompt;
