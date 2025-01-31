import React, { useEffect, useState } from 'react';
import { useZustandStore } from '@/stores/zustand/store';
import { useTranslation } from 'react-i18next';
import { 
  Button, 
  Link, 
  Tooltip, 
  Layout, 
  LegacyCard,
  ButtonGroup,
  IndexTable,
  InlineStack,
  Text,
  Select,
  PageActions,
  Modal,
  EmptyState,
  TextField,
  Box,
  Toast,
  Frame
} from '@shopify/polaris';
import { 
  PlusIcon, 
  DeleteIcon, 
  CollectionListIcon,
  XIcon,
  SearchIcon,
  ClipboardIcon,
  ImportIcon as UploadIcon,
  ExportIcon as DownloadIcon,
  CopyIcon,
} from '@shopify/polaris-icons';
import { v4 as uuidv4 } from 'uuid';
import { Prompt } from '@/types/prompt';
import ImportPrompt from './ImportPrompt';
import ExportPrompt from './ExportPrompt';
import PopupModal from './PopupModal';

export interface Prompt {
  id: string;
  name: string;
  prompt: string;
  category?: string;
}

interface EditableFieldProps {
  value: string;
  isEditing: boolean;
  onEdit: () => void;
  onChange: (value: string) => void;
  onBlur: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  placeholder: string;
  multiline?: boolean;
}

export const EditableField: React.FC<EditableFieldProps> = ({
  value,
  isEditing,
  onEdit,
  onChange,
  onBlur,
  onKeyDown,
  placeholder,
  multiline,
}) => {
  if (isEditing) {
    return (
      <TextField
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        multiline={multiline ? 3 : undefined}
        autoComplete="off"
        autoFocus
      />
    );
  }

  return (
    <span
      className="cursor-pointer text-wrap"
      onDoubleClick={onEdit}
    >
      {value || placeholder}
    </span>
  );
};

export const useToast = () => {
  const [active, setActive] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'success' | 'error'>('success');
  const showToast = ({ type, message }: { type: 'success' | 'error'; message: string }) => {
    setType(type);
    setMessage(message);
    setActive(true);
  };

  const ToastComponent = () => {
    if (!active) return null;
    return (
      <Frame>
        <Toast
          content={message}
          error={type === 'error'}
          onDismiss={() => setActive(false)}
        />
      </Frame>
    );
  };
  return { showToast, ToastComponent };
};

export const PromptLibraryButton: React.FC<{ onOpen: () => void }> = ({ onOpen }) => {
  const { t } = useTranslation();
  return (
    <Button 
      variant="primary"
      tone="success"
      icon={CollectionListIcon}
      onClick={onOpen}
      accessibilityLabel={t('promptLibrary')}
      fullWidth
    >
      {t('promptLibrary')}
    </Button>
  );
};

interface PromptLibraryModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onClose: () => void;
}

export const PromptLibraryModal: React.FC<PromptLibraryModalProps> = ({ 
  isOpen, 
  onOpenChange, 
  onClose 
}) => {
  const { t } = useTranslation();
  const { showToast, ToastComponent } = useToast();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const setPrompts = useZustandStore((state) => state.setPrompts);
  const prompts = useZustandStore((state) => state.prompts);
  
  const [_prompts, _setPrompts] = useState<Prompt[]>(JSON.parse(JSON.stringify(prompts)));
  const [editingCell, setEditingCell] = useState<{index: number; field: 'name' | 'prompt'} | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'general', label: 'General' },
    { id: 'blog', label: 'Blog' },
    { id: 'article', label: 'Article' },
    { id: 'product', label: 'Product' }
  ];

  const filteredPrompts = _prompts.filter(prompt => {
    const matchesSearch = prompt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         prompt.prompt.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || prompt.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handlePromptChange = (index: number, field: keyof Prompt, value: string) => {
    const newPrompts = [..._prompts];
    newPrompts[index][field] = value;
    _setPrompts(newPrompts);
  };

  const handleDoubleClick = (index: number, field: 'name' | 'prompt') => {
    setEditingCell({ index, field });
  };

  const handleBlur = () => {
    setEditingCell(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      setEditingCell(null);
    }
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      await setPrompts(_prompts);
      showToast({ type: 'success', message: t('Prompts saved successfully') });
      onClose();
    } catch (error) {
      showToast({ type: 'error', message: t('Failed to save prompts') });
    } finally {
      setIsLoading(false);
    }
  };

  const addPrompt = () => {
    _setPrompts([..._prompts, { 
      id: uuidv4(), 
      name: '', 
      prompt: '',
      category: 'custom'
    }]);
  };

  const deletePrompt = (index: number) => {
    _setPrompts(_prompts.filter((_, i) => i !== index));
  };

  const clearPrompts = () => {
    _setPrompts([]);
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(_prompts, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'prompts.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  useEffect(() => {
    _setPrompts(prompts);
  }, [prompts]);

  const resourceName = {
    singular: 'prompt',
    plural: 'prompts',
  };

   return (
    <>
      <PopupModal
        title={t('Prompt Library')}
        isModalOpen={isOpen}
        setIsModalOpen={onOpenChange}
        handleConfirm={handleSave}
        size="large"
      >
        <Box padding="4">
          <Layout>
            <Layout.Section>
              <Box paddingBlockEnd="4">
                <LegacyCard>
                  <LegacyCard.Section>
                    <InlineStack wrap={false} align="space-between">
                      <div className="flex gap-3 items-center flex-1">
                        <div className="w-1/3">
                          <TextField
                            prefix={<SearchIcon />}
                            value={searchQuery}
                            onChange={setSearchQuery}
                            placeholder={t('Search prompts...')}
                            clearButton
                            onClearButtonClick={() => setSearchQuery('')}
                          />
                        </div>
                        <div className="w-48">
                          <Select
                            value={selectedCategory}
                            onChange={setSelectedCategory}
                            options={categories.map(cat => ({
                              label: cat.label,
                              value: cat.id
                            }))}
                          />
                        </div>
                      </div>
                      <ButtonGroup>
                        <Button 
                          variant="primary"
                          tone="success"
                          size="large"
                          icon={PlusIcon}
                          onClick={addPrompt}
                          loading={isLoading}
                        >
                          {t('Add Prompt')}
                        </Button>
                        <ImportPrompt />
                        <ExportPrompt />
                        <Tooltip content={t('Clear All Prompts')}>
                          <Button 
                            variant="primary"
                            tone="critical"
                            size="large"
                            icon={DeleteIcon}
                            onClick={() => setIsDeleteModalOpen(true)}
                          >
                            Clear All
                          </Button>
                        </Tooltip>
                      </ButtonGroup>
                    </InlineStack>
                  </LegacyCard.Section>
                </LegacyCard>
              </Box>
              <LegacyCard>
                <div className="prompt-table-container">
                  <IndexTable
                    resourceName={resourceName}
                    itemCount={filteredPrompts.length}
                    headings={[
                      { title: t('Name'), width: '25%' },
                      { title: t('Prompt'), width: '55%' },
                      { title: t('Category'), width: '10%' },
                      { title: t('Actions'), width: '10%' },
                    ]}
                    selectable={false}
                    loading={isLoading}
                  >
                    {filteredPrompts.map((prompt, index) => (
                      <IndexTable.Row
                        id={prompt.id}
                        key={prompt.id}
                        position={index}
                        className="hover:bg-surface-hovered transition-colors"
                      >
                        <IndexTable.Cell>
                          <EditableField
                            value={prompt.name}
                            isEditing={editingCell?.index === index && editingCell?.field === 'name'}
                            onEdit={() => handleDoubleClick(index, 'name')}
                            onChange={(value) => handlePromptChange(index, 'name', value)}
                            onBlur={handleBlur}
                            onKeyDown={handleKeyDown}
                            placeholder={t('Enter name')}
                          />
                        </IndexTable.Cell>
                        <IndexTable.Cell>
                          <EditableField
                            value={prompt.prompt}
                            isEditing={editingCell?.index === index && editingCell?.field === 'prompt'}
                            onEdit={() => handleDoubleClick(index, 'prompt')}
                            onChange={(value) => handlePromptChange(index, 'prompt', value)}
                            onBlur={handleBlur}
                            onKeyDown={handleKeyDown}
                            placeholder={t('Enter prompt')}
                            multiline
                          />
                        </IndexTable.Cell>
                        <IndexTable.Cell>
                          <Select
                            value={prompt.category || 'custom'}
                            onChange={(value) => handlePromptChange(index, 'category', value)}
                            options={categories.slice(1).map(cat => ({
                              label: cat.label,
                              value: cat.id
                            }))}
                          />
                        </IndexTable.Cell>
                        <IndexTable.Cell>
                          <ButtonGroup>
                            <Tooltip content={t('Copy Prompt')}>
                              <Button
                                variant="secondary"
                                icon={ClipboardIcon}
                                onClick={() => {
                                  navigator.clipboard.writeText(prompt.prompt);
                                  showToast({ type: 'success', message: t('Prompt copied to clipboard') });
                                }}
                              />
                            </Tooltip>
                            <Tooltip content={t('Delete Prompt')}>
                              <Button
                                variant="secondary"
                                icon={XIcon}
                                onClick={() => deletePrompt(index)}
                              />
                            </Tooltip>
                          </ButtonGroup>
                        </IndexTable.Cell>
                      </IndexTable.Row>
                    ))}
                  </IndexTable>
                </div>
              </LegacyCard>

              {filteredPrompts.length === 0 && (
                <Box padding="5">
                  <EmptyState
                    heading={t('No prompts found')}
                    image="/empty-state-illustration.svg"
                    action={{
                      content: t('Add Your First Prompt'),
                      onAction: addPrompt
                    }}
                  >
                    <p>{t('Start building your prompt library by adding your first prompt.')}</p>
                  </EmptyState>
                </Box>
              )}
            </Layout.Section>
          </Layout>

          <Box paddingBlockStart="4">
            <PageActions
              primaryAction={{
                content: t('Save Changes'),
                onAction: handleSave,
                loading: isLoading,
                disabled: isLoading
              }}
              secondaryActions={[
                {
                  content: t('Cancel'),
                  onAction: onClose
                }
              ]}
            />
          </Box>
        </Box>
        <Modal
          open={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title={t('Clear All Prompts')}
          primaryAction={{
            content: t('Clear'),
            destructive: true,
            onAction: () => {
              clearPrompts();
              setIsDeleteModalOpen(false);
            }
          }}
          secondaryActions={[{
            content: t('Cancel'),
            onAction: () => setIsDeleteModalOpen(false)
          }]}
        >
          <Modal.Section>
            <Text as="p">{t('Are you sure? This action cannot be undone.')}</Text>
          </Modal.Section>
        </Modal>
      </PopupModal>
      <ToastComponent />
      <style jsx>{`
        .prompt-table-container {
          max-height: calc(100vh - 400px);
          overflow-y: auto;
          scrollbar-width: thin;
        }
        
        .prompt-table-container::-webkit-scrollbar {
          width: 6px;
        }
        
        .prompt-table-container::-webkit-scrollbar-thumb {
          background-color: rgba(0, 0, 0, 0.2);
          border-radius: 3px;
        }

        .prompt-table-container::-webkit-scrollbar-track {
          background-color: rgba(0, 0, 0, 0.05);
        }
      `}</style>
    </>
  );
};
