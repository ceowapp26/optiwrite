import axios from 'axios';
import { toast } from 'sonner';
import { Payment, PaymentStatus } from '@prisma/client';

interface IPaymentApiState {
  loading: boolean;
  error: string | null;
  data: any | null;
  status: 'idle' | 'loading' | 'success' | 'error';
}

interface PaymentStatistics {
  totalAmount: number;
  successfulPayments: number;
  failedPayments: number;
  refundedPayments: number;
  refundedAmount: number;
  netAmount: number;
}

export class PaymentApiService {
  private static baseURL: string = '/api/admin/payments';
  private static state: IPaymentApiState = {
    loading: false,
    error: null,
    data: null,
    status: 'idle'
  };

  private static setState(newState: Partial<IPaymentApiState>) {
    PaymentApiService.state = {
      ...PaymentApiService.state,
      ...newState
    };
  }

  public static async getPayments(page: number = 1, pageSize: number = 10): Promise<{
    payments: Payment[];
    total: number;
    totalPages: number;
  }> {
    try {
      this.setState({ loading: true, error: null, status: 'loading' });
      const response = await axios.get(`${this.baseURL}`, {
        params: { page, pageSize }
      });
      
      this.setState({ data: response.data, status: 'success' });
      return response.data;
    } catch (error) {
      this.handleError(error, 'Fetching payments');
      throw error;
    } finally {
      this.setState({ loading: false });
    }
  }

  public static async getStatistics(startDate: Date, endDate: Date): Promise<PaymentStatistics> {
    try {
      this.setState({ loading: true, error: null, status: 'loading' });
      const response = await axios.get(`${this.baseURL}/statistics`, {
        params: { 
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        }
      });
      this.setState({ data: response.data, status: 'success' });
      return response.data;
    } catch (error) {
      this.handleError(error, 'Fetching statistics');
      throw error;
    } finally {
      this.setState({ loading: false });
    }
  }

  public static async refundPayment(paymentId: string, reason?: string): Promise<Payment> {
    try {
      this.setState({ loading: true, error: null, status: 'loading' });
      const response = await axios.post(`${this.baseURL}/refund/${paymentId}`, { reason });
      
      this.setState({ data: response.data, status: 'success' });
      toast.success('Payment refunded successfully');
      return response.data;
    } catch (error) {
      this.handleError(error, 'Refunding payment');
      throw error;
    } finally {
      this.setState({ loading: false });
    }
  }

  private static handleError(error: any, action: string) {
    const errorMessage = error.response?.data?.message || 
                        error.message || 
                        `An error occurred while ${action.toLowerCase()}`;
    toast.error(errorMessage);
    this.setState({ 
      error: errorMessage,
      status: 'error'
    });
  }

  public static getState(): IPaymentApiState {
    return this.state;
  }
}
