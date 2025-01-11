'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Page,
  Layout,
  Card,
  DataTable,
  Button,
  Modal,
  Text,
  Form,
  FormLayout,
  TextField,
  Banner,
  Loading,
  Frame,
} from '@shopify/polaris';
import { useAppBridge } from '@/providers/AppBridgeProvider';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { Redirect } from '@shopify/app-bridge/actions';
import { SessionContextValue } from '@/types/auth';
import { AdminService } from '@/utils/api';
import { withAuthentication } from '@/components/AuthWrapper';
import { GoogleUserData, AdminUserData } from '@/utils/storage';

interface AdminPageProps {
  session: SessionContextValue;
  isAdminUser: boolean;
}

interface ExtendedAdminUserData extends AdminUserData {
  userId?: string;
}

function AdminPage({ session, isAdminUser }: AdminPageProps) {
  const { app, isAppBridgeInitialized } = useAppBridge();
  const redirect = app && Redirect.create(app);
  const [users, setUsers] = useState<GoogleUserData[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<GoogleUserData | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<GoogleUserData | null>(null);
  const [loading, setLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState<ExtendedAdminUserData>({
    email: '',
    firstName: '',
    lastName: '',
    image: '',
  });
  const [toastProps, setToastProps] = useState({
    active: false,
    message: '',
    error: false,
  });
  
  const showToast = (message: string, error = false) => {
    setToastProps({ active: true, message, error });
    setTimeout(() => setToastProps({ active: false, message: '', error: false }), 5000);
  };

  const fetchUsers = useCallback(async () => {
    try {
      const data = await AdminService.getAdminUsers();
      if (!data || !Array.isArray(data)) {
        throw new Error('Invalid models data received');
      }
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
      showToast('Failed to fetch users', true);
    }
  }, []);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      if (editingUser) {
        await AdminService.updateAdminUser(formData.userId, formData);
        showToast('User updated successfully');
      } else {
        const { userId, ...createData } = formData;
        await AdminService.createAdminUser(createData);
        showToast('User created successfully');
      }
      setIsFormOpen(false);
      setEditingUser(null);
      setFormData({ email: '', firstName: '', lastName: '', image: '' });
      await fetchUsers();
    } catch (error) {
      showToast(`Failed to ${editingUser ? 'update' : 'create'} user`, true);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!userToDelete?.userId) return;
    try {
      setLoading(true);
      await AdminService.deleteAdminUser(userToDelete.userId);
      showToast('User deleted successfully');
      setDeleteModalOpen(false);
      setUserToDelete(null);
      await fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      showToast('Failed to delete user', true);
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

  const rows = users.map((user) => [
    user.email,
    user.firstName,
    user.lastName,
    user.emailVerified ? 'Yes' : 'No',
    <div key={user.userId} className="flex gap-2">
      <Button
        size="slim"
        onClick={() => {
          setEditingUser(user);
          setFormData({
            userId: user.userId,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            image: user.image,
          });
          setIsFormOpen(true);
        }}
      >
        Edit
      </Button>
      <Button
        size="slim"
        destructive
        onClick={() => {
          setUserToDelete(user);
          setDeleteModalOpen(true);
        }}
      >
        Delete
      </Button>
    </div>,
  ]);

  useEffect(() => {
    fetchUsers();
  }, []);

  if (loading) {
    return (
      <Frame>
        <Loading />
      </Frame>
    )
  }

  return (
    <Page
      fullWidth
      title="User Management"
      backAction={{
        content: 'Back To Homepage',
        onAction: () => handleNavigation('/admin'),
      }}
      primaryAction={{
        content: 'Add User',
        onAction: () => {
          setEditingUser(null);
          setFormData({ email: '', firstName: '', lastName: '', image: '' });
          setIsFormOpen(true);
        },
      }}
    >
      <Layout>
        <Layout.Section>
          <Card>
            <DataTable
              columnContentTypes={['text', 'text', 'text', 'text', 'text']}
              headings={['Email', 'First Name', 'Last Name', 'Verified', 'Actions']}
              rows={rows}
            />
          </Card>
        </Layout.Section>
      </Layout>

      <Modal
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingUser(null);
          setFormData({ email: '', firstName: '', lastName: '', image: '' });
        }}
        title={editingUser ? 'Edit User' : 'Add User'}
      >
        <Modal.Section>
          <Form onSubmit={handleSubmit}>
            <FormLayout>
              {editingUser && (
                <TextField
                  label="User ID"
                  value={formData.userId || ''}
                  disabled
                  autoComplete="off"
                />
              )}
              <TextField
                label="Email"
                value={formData.email}
                onChange={(value) => setFormData({ ...formData, email: value })}
                autoComplete="email"
                required
              />
              <TextField
                label="First Name"
                value={formData.firstName}
                onChange={(value) => setFormData({ ...formData, firstName: value })}
                autoComplete="given-name"
                required
              />
              <TextField
                label="Last Name"
                value={formData.lastName}
                onChange={(value) => setFormData({ ...formData, lastName: value })}
                autoComplete="family-name"
                required
              />
              <TextField
                label="Image URL"
                value={formData.image}
                onChange={(value) => setFormData({ ...formData, image: value })}
                autoComplete="image"
              />
              <Button submit>{editingUser ? 'Update' : 'Save'}</Button>
            </FormLayout>
          </Form>
        </Modal.Section>
      </Modal>

      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete User"
        primaryAction={{
          content: 'Delete',
          destructive: true,
          loading: loading,
          onAction: handleDelete
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => {
              setDeleteModalOpen(false);
              setUserToDelete(null);
            },
          },
        ]}
      >
        <Modal.Section>
          <Text>
            <p>Are you sure you want to delete this user? This action cannot be undone.</p>
          </Text>
        </Modal.Section>
      </Modal>
      {toastProps.active && (
        toastProps.error ? (
          <Banner status="critical">
            <p>{toastProps.message}</p>
          </Banner>
        ) : (
          <Banner status="success">
            <p>{toastProps.message}</p>
          </Banner>
        )
      )}
    </Page>
  );
}

export default withAuthentication(AdminPage, { requireAdmin: true });

