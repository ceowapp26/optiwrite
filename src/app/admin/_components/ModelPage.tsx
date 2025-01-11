'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Page,
  Layout,
  LegacyCard,
  Banner,
  DataTable,
  Button,
  Modal,
  TextContainer,
  Toast,
  Frame,
} from '@shopify/polaris';
import { SessionContextValue } from '@/types/auth';
import { ModelForm } from './ModelForm';
import { ModelService } from '@/utils/api';
import { withAuthentication } from '@/components/AuthWrapper';
import { AIModel } from '@prisma/client';
import { useAppBridge } from '@/providers/AppBridgeProvider';
import { Redirect } from '@shopify/app-bridge/actions';
import { useSearchParams } from 'next/navigation';

interface ModelPageProps {
  session: SessionContextValue;
  isAdminUser: boolean;
}

function ModelPage({ session, isAdminUser }: ModelPageProps) {
  const { app, isAppBridgeInitialized } = useAppBridge();
  const redirect = app && Redirect.create(app);
  const [models, setModels] = useState<AIModel[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<AIModel | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [modelToDelete, setModelToDelete] = useState<AIModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const [toastProps, setToastProps] = useState({
    active: false,
    message: '',
    error: false,
  });

  const showToast = (message: string, error = false) => {
    setToastProps({ active: true, message, error });
    setTimeout(() => setToastProps({ active: false, message: '', error: false }), 5000);
  };

  const fetchModels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ModelService.getModels();
      if (!data || !Array.isArray(data)) {
        throw new Error('Invalid models data received');
      }
      setModels(data);
    } catch (error) {
      console.error("Error fetching models:", error);
      setError('Failed to fetch models');
      showToast('Failed to fetch models', true);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDelete = async () => {
    if (modelToDelete?.id) {
      try {
        setLoading(true);
        await ModelService.deleteModel(modelToDelete.id);
        showToast('Model deleted successfully');
        setDeleteModalOpen(false);
        setModelToDelete(null);
        await fetchModels();
      } catch (error) {
        showToast('Failed to delete model', true);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSubmit = async (data: Partial<AIModel>) => {
    const shop = searchParams?.get("shop");
    const host = searchParams?.get("host");
    try {
      setLoading(true);
      if (editingModel?.id) {
        await ModelService.updateModel(editingModel.id, data);
        showToast('Model updated successfully');
      } else {
        await ModelService.createModel(data);
        showToast('Model created successfully');
      }
      setIsFormOpen(false);
      setEditingModel(null);
      await fetchModels();
    } catch (error) {
      showToast(editingModel ? 'Failed to update model' : 'Failed to create model', true);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigation = (path: string) => {
    const shop = searchParams?.get("shop");
    const host = searchParams?.get("host");
    if (redirect) {
      redirect.dispatch(Redirect.Action.APP, {
        path: `${path}?shop=${shop}&host=${host}`,
      });
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);
  
  const rows = models.map((model) => [
    model.name,
    model.description,
    model.inputTokens,
    model.outputTokens,
    model.maxTokens,
    model.RPM,
    model.RPD,
    model.TPM,
    model.TPD,
    <div key={model.id} className="flex gap-2">
      <Button
        size="slim"
        onClick={() => {
          setEditingModel(model);
          setIsFormOpen(true);
        }}
      >
        Edit
      </Button>
      <Button
        size="slim"
        destructive
        onClick={() => {
          setModelToDelete(model);
          setDeleteModalOpen(true);
        }}
      >
        Delete
      </Button>
    </div>,
  ]);

  return (
    <Frame>
      <Page
        fullWidth
        title="AI Models"
        backAction={{
          content: 'Back To Homepage',
          onAction: () => handleNavigation('/admin'),
        }}
        primaryAction={{
          content: 'Add Model',
          onAction: () => setIsFormOpen(true),
        }}
      >
        <Layout>
          <Layout.Section>
            <LegacyCard>
              <DataTable
                columnContentTypes={[
                  'text', 
                  'text', 
                  'numeric', 
                  'numeric', 
                  'numeric', 
                  'numeric', 
                  'numeric', 
                  'numeric', 
                  'numeric',
                  'text' 
                ]}
                headings={[
                  'Name', 
                  'Description', 
                  'Input Tokens', 
                  'Output Tokens', 
                  'Max Tokens', 
                  'RPM', 
                  'RPD', 
                  'TPM', 
                  'TPD',
                  'Actions' 
                ]}
                rows={rows}
                loading={loading}
              />
            </LegacyCard>
          </Layout.Section>
        </Layout>

        <Modal
          open={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setEditingModel(null);
          }}
          title={editingModel ? "Edit Model" : "Add Model"}
        >
          <Modal.Section>
            <ModelForm
              initialModel={editingModel}
              onSubmit={handleSubmit}
              onClose={() => {
                setIsFormOpen(false);
                setEditingModel(null);
              }}
              loading={loading}
            />
          </Modal.Section>
        </Modal>

        <Modal
          open={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          title="Delete Model"
          primaryAction={{
            content: 'Delete',
            destructive: true,
            onAction: handleDelete,
            loading: loading,
          }}
          secondaryActions={[
            {
              content: 'Cancel',
              onAction: () => setDeleteModalOpen(false),
            },
          ]}
        >
          <Modal.Section>
            <TextContainer>
              <p>Are you sure you want to delete this model? This action cannot be undone.</p>
            </TextContainer>
          </Modal.Section>
        </Modal>

        {toastProps.active && (
          <Toast
            content={toastProps.message}
            error={toastProps.error}
            onDismiss={() => setToastProps({ active: false, message: '', error: false })}
          />
        )}
      </Page>
    </Frame>
  );
}

export default withAuthentication(ModelPage, { requireAdmin: true });
