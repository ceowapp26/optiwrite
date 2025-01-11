'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  Page,
  Layout,
  Card,
  DataTable,
  Button,
  DatePicker,
  Loading,
  Frame,
  Banner,
  Text,
  Box,
  BlockStack,
} from '@shopify/polaris';
import { useAppBridge } from '@/providers/AppBridgeProvider';
import { Redirect } from '@shopify/app-bridge/actions';
import { SessionContextValue } from '@/types/auth';
import { useSearchParams } from 'next/navigation';
import { PaymentApiService } from '@/utils/api';
import { PaymentStatus } from '@/types/billing';
import { withAuthentication } from '@/components/AuthWrapper';
import { DateTime } from 'luxon';
import { Dialog } from '@/components/ui/dialog';

interface PaymentPageProps {
  session: SessionContextValue;
  isAdminUser: boolean;
}

function PaymentPage({ session, isAdminUser }: PaymentPageProps) {
  const { app, isAppBridgeInitialized } = useAppBridge();
  const redirect = app && Redirect.create(app);
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [statistics, setStatistics] = useState<PaymentStatistics | null>(null);
  const [dateRange, setDateRange] = useState({
    start: DateTime.now().minus({ months: 1 }).toJSDate(),
    end: DateTime.now().toJSDate()
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const searchParams = useSearchParams();

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await PaymentApiService.getPayments(currentPage);
      setPayments(data.payments);
      setTotalPages(data.totalPages);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [currentPage]);

  const fetchStatistics = useCallback(async () => {
    try {
      const stats = await PaymentApiService.getStatistics(
        dateRange.start,
        dateRange.end
      );
      setStatistics(stats);
    } catch (error) {
      setError(error.message);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchPayments();
    fetchStatistics();
  }, [fetchPayments, fetchStatistics]);

  const handleRefundClick = (paymentId: string) => {
    setSelectedPaymentId(paymentId);
    setRefundDialogOpen(true);
  };

  const handleRefundConfirm = async () => {
    if (!selectedPaymentId) return;
    
    try {
      await PaymentApiService.refundPayment(selectedPaymentId, refundReason);
      setRefundDialogOpen(false);
      setRefundReason('');
      fetchPayments();
      fetchStatistics();
    } catch (error) {
      setError(error.message);
    }
  };

  const rows = payments.map((payment) => [
    payment.id,
    payment.amount.toFixed(2),
    payment.currency,
    payment.status,
    DateTime.fromJSDate(payment.createdAt).toFormat('yyyy-MM-dd HH:mm'),
    payment.status === PaymentStatus.SUCCEEDED ? (
      <Button
        size="slim"
        destructive
        onClick={() => handleRefundClick(payment.id)}
      >
        Refund
      </Button>
    ) : null,
  ]);

  const handleNavigation = (path: string) => {
    const shop = searchParams?.get("shop");
    const host = searchParams?.get("host");
    if (redirect) {
      redirect.dispatch(Redirect.Action.APP, {
        path: `${path}?shop=${shop}&host=${host}`,
      });
    }
  };

  if (loading) {
    return (
      <Frame>
        <Loading />
      </Frame>
    );
  }

  return (
    <Page
      title="Payment Statistics"
      subtitle="View and manage payment information"
      backAction={{
        content: 'Back To Homepage',
        onAction: () => handleNavigation('/admin'),
      }}
      fullWidth
    >
      <Layout>
        {error && (
          <Layout.Section>
            <Banner status="critical">
              <p>{error}</p>
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <Card title="Date Range">
            <Box padding="4">
              <DatePicker
                month={dateRange.start.getMonth()}
                year={dateRange.start.getFullYear()}
                onChange={({ start, end }) => {
                  setDateRange({ start, end });
                }}
                selected={{
                  start: dateRange.start,
                  end: dateRange.end,
                }}
                allowRange
              />
            </Box>
          </Card>
        </Layout.Section>

        {statistics && (
          <Layout.Section>
            <Card title="Payment Statistics">
              <Box padding="4">
                <BlockStack gap="4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <Text variation="strong">
                        Total Amount: ${statistics.totalAmount.toFixed(2)}
                      </Text>
                    </div>
                    <div>
                      <Text variation="strong">
                        Net Amount: ${statistics.netAmount.toFixed(2)}
                      </Text>
                    </div>
                    <div>
                      <Text variation="strong">
                        Refunded Amount: ${statistics.refundedAmount.toFixed(2)}
                      </Text>
                    </div>
                    <div>
                      <Text variation="positive">
                        Successful: {statistics.successfulPayments}
                      </Text>
                    </div>
                    <div>
                      <Text variation="negative">
                        Failed: {statistics.failedPayments}
                      </Text>
                    </div>
                    <div>
                      <Text variation="subdued">
                        Refunded: {statistics.refundedPayments}
                      </Text>
                    </div>
                  </div>
                </BlockStack>
              </Box>
            </Card>
          </Layout.Section>
        )}

        <Layout.Section>
          <Card title="Payment History">
            <DataTable
              columnContentTypes={['text', 'numeric', 'text', 'text', 'text', 'text']}
              headings={['ID', 'Amount', 'Currency', 'Status', 'Date', 'Actions']}
              rows={rows}
              pagination={{
                hasNext: currentPage < totalPages,
                hasPrevious: currentPage > 1,
                onNext: () => setCurrentPage(p => p + 1),
                onPrevious: () => setCurrentPage(p => p - 1),
              }}
            />
          </Card>
        </Layout.Section>
      </Layout>

      <Dialog 
        open={refundDialogOpen} 
        onOpenChange={setRefundDialogOpen}
        title="Confirm Refund"
      >
        <div className="p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Reason for Refund
            </label>
            <textarea
              className="w-full p-2 border rounded"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-4">
            <Button onClick={() => setRefundDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              destructive
              onClick={handleRefundConfirm}
            >
              Confirm Refund
            </Button>
          </div>
        </div>
      </Dialog>
    </Page>
  );
}

export default withAuthentication(PaymentPage, { requireAdmin: true });