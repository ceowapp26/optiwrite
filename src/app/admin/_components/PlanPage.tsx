'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Page,
  Layout,
  Card,
  DataTable,
  Button,
  Toast,
  Modal,
  Text,
  Frame,
  BlockStack,
  Spinner,
  ProgressBar,
} from '@shopify/polaris';
import { SessionContextValue } from '@/types/auth';
import { withAuthentication } from '@/components/AuthWrapper';
import { useAppBridge } from '@/providers/AppBridgeProvider';
import { Redirect } from '@shopify/app-bridge/actions';
import { PlanForm } from './PlanForm';
import { PlanService, IPlan } from '@/utils/api';
import { useSearchParams } from 'next/navigation';

interface PlanPageProps {
  session: SessionContextValue;
  isAdminUser: boolean;
}

function PlanPage({ session, isAdminUser }: PlanPageProps) {
  const { app, isAppBridgeInitialized } = useAppBridge();
  const redirect = app && Redirect.create(app);
  const [plans, setPlans] = useState<IPlan[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [editingPlan, setEditingPlan] = useState<IPlan | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<IPlan | null>(null);
  const [showRedirectModal, setShowRedirectModal] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState('');
  const searchParams = useSearchParams();
  
  const [toast, setToast] = useState({
    active: false,
    message: '',
    error: false,
  });

  const showToast = (message: string, error = false) => {
    setToast({ active: true, message, error });
    setTimeout(() => setToast({ active: false, message: '', error: false }), 5000);
  };

  const fetchPlans = useCallback(async () => {
    try {
      const data = await PlanService.getPlans();
      if (!data || !Array.isArray(data)) {
        throw new Error('Invalid plans data received');
      }
      setPlans(data);
    } catch (error) {
      console.error("Error fetching plans:", error);
      showToast('Failed to fetch plans', true);
    }
  }, []);

  const handleSubmit = async (data: IPlan) => {
    setIsSubmitting(true);
    try {
      if (editingPlan?.id && editingPlan?.shopifyId) {
        const updatedPlan = await PlanService.updatePlan(
          editingPlan.id, 
          editingPlan.shopifyId, 
          data
        );
        if (updatedPlan.confirmationUrl) {
          setRedirectUrl(updatedPlan.confirmationUrl);
          setShowRedirectModal(true);
          setTimeout(() => {
            redirect.dispatch(Redirect.Action.REMOTE, updatedPlan.confirmationUrl);
          }, 3000);
        }
        showToast('Redirect to confirmation URL.....');
      } else {
        const newPlan = await PlanService.createPlan(data);
        if (newPlan.confirmationUrl) {
          redirect.dispatch(Redirect.Action.REMOTE, newPlan.confirmationUrl);
        }
        showToast('Redirect to confirmation URL.....');
      }
      setIsFormOpen(false);
      setEditingPlan(null);
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error || 
        (editingPlan ? 'Failed to update plan' : 'Failed to create plan');
      showToast(errorMessage, true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!planToDelete?.id || !planToDelete?.shopifyId) return;
    try {
      await PlanService.deletePlan(planToDelete.id, planToDelete.shopifyId);
      setPlans(prev => prev.filter(plan => plan.id !== planToDelete.id));
      showToast('Plan deleted successfully');
      setDeleteModalOpen(false);
      setPlanToDelete(null);
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error || 'Failed to delete plan';
      showToast(errorMessage, true);
      setDeleteModalOpen(false);
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
    fetchPlans();
  }, []);

  const rows = plans.map((plan) => [
    plan.name,
    plan.description,
    `$${plan.price}`,
    plan.interval,
    plan.trialDays,
    <div key={plan.id} className="flex gap-2">
      <Button
        size="slim"
        onClick={() => {
          setEditingPlan(plan);
          setIsFormOpen(true);
        }}
      >
        Edit
      </Button>
      <Button
        size="slim"
        destructive
        onClick={() => {
          setPlanToDelete(plan);
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
        title="Subscription Plans"
        backAction={{
          content: 'Back To Homepage',
          onAction: () => handleNavigation('/admin'),
        }}
        primaryAction={{
          content: 'Add Plan',
          onAction: () => setIsFormOpen(true),
        }}
      >
        <Layout>
          <Layout.Section>
            <Card>
              <DataTable
                columnContentTypes={['text', 'text', 'numeric', 'text', 'numeric', 'text']}
                headings={['Name', 'Description', 'Price', 'Interval', 'Trial Days', 'Actions']}
                rows={rows}
              />
            </Card>
          </Layout.Section>
        </Layout>
        {isFormOpen && (
          <PlanForm
            open={isFormOpen}
            plan={editingPlan}
            onClose={() => {
              setIsFormOpen(false);
              setEditingPlan(null);
            }}
            isSubmitting={isSubmitting}
            onSubmit={handleSubmit}
          />
        )}
        <Modal
          open={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          title="Delete Plan"
          primaryAction={{
            content: 'Delete',
            destructive: true,
            onAction: handleDelete,
          }}
          secondaryActions={[
            {
              content: 'Cancel',
              onAction: () => setDeleteModalOpen(false),
            },
          ]}
        >
          <Modal.Section>
            <Text>
              <p>Are you sure you want to delete this plan? This action cannot be undone.</p>
            </Text>
          </Modal.Section>
        </Modal>
        {showRedirectModal && (
          <Modal
            open={showRedirectModal}
            onClose={() => setShowRedirectModal(false)}
            title="Redirecting to Billing"
            primaryAction={{
              content: 'Continue now',
              onAction: () => redirect?.dispatch(Redirect.Action.REMOTE, redirectUrl),
            }}
          >
            <Modal.Section>
              <BlockStack align="center" inlineAlign="center" spacing="loose">
                <Text>You are being redirected to complete your subscription process.</Text>
                <Spinner size="large" />
                <ProgressBar progress={75} size="small" />
              </BlockStack>
            </Modal.Section>
          </Modal>
        )}
        {toast.active && (
          <Toast
            content={toast.message}
            error={toast.error}
            onDismiss={() => setToast({ active: false, message: '', error: false })}
          />
        )}
      </Page>
    </Frame>
  );
}

export default withAuthentication(PlanPage, { requireAdmin: true });


