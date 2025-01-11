import axios, { AxiosError } from 'axios';
import { BillingEvent } from '@/types/billing';

interface ISubscriptionState {
  loading: boolean;
  error: string | null;
  data: any | null;
}

interface SubscriptionStatus {
  plan: string;
  status: 'ACTIVE' | 'EXPIRED';
  startDate: string;
  endDate: string;
}

export class SubscriptionService {
  private static baseURL: string = '/api/billing';
  private static state: ISubscriptionState = {
    loading: false,
    error: null,
    data: null
  };

  private static setState(newState: Partial<ISubscriptionState>) {
    this.state = { ...this.state, ...newState };
  }

  private static async getAuthHeaders(sessionToken: string) {
    return {
      Authorization: `Bearer ${sessionToken}`,
      'Content-Type': 'application/json'
    };
  }

  public static async checkSubscriptionStatus(
    planName: string,
    shop: string,
    sessionToken: string,
    canceled: boolean = false,
  ): Promise<BillingEvent> {
    try {
      this.setState({ loading: true, error: null });
      const headers = await this.getAuthHeaders(sessionToken);
      const response = await axios.get(
        `${this.baseURL}/status`,
        { 
          params: { 
            shop,
            planName,
            canceled,
          },
          headers
        }
      );
      this.setState({ data: response.data });
      return response.data.status;
    } catch (error) {
      const errorMessage = error instanceof AxiosError 
        ? error.response?.data?.error || 'Status check failed'
        : 'Status check failed';
      this.setState({ error: errorMessage });
      throw new Error(errorMessage);
    } finally {
      this.setState({ loading: false });
    }
  }

  public static async handleBillingEvent(
    planName: string,
    shop: string,
    host: string,
    sessionToken: string,
    event: BillingEvent,
    canceled: boolean = false,
    cancelReason?: string,
    email?: string
  ) {
    try {
      this.setState({ loading: true, error: null });
      const headers = await this.getAuthHeaders(sessionToken);
      const response = await axios.post(
        this.baseURL,
        { 
          planName, 
          shop, 
          host,
          event,
          canceled,
          cancelReason, 
          email,
        },
        { headers }
      );
      this.setState({ data: response.data });
      return response.data;
    } catch (error) {
      const errorMessage = error instanceof AxiosError 
        ? error.response?.data?.error || 'Operation failed'
        : 'Billing operation failed';
      
      this.setState({ error: errorMessage });
      throw new Error(errorMessage);
    } finally {
      this.setState({ loading: false });
    }
  }

  public static async getCurrentPlan(shop: string): Promise<SubscriptionStatus> {
    try {
      this.setState({ loading: true, error: null });
      const response = await axios.get<SubscriptionStatus>(
        `${this.baseURL}/current`,
        { params: { shop } }
      );
      this.setState({ data: response.data });
      return response.data;
    } catch (error) {
      const errorMessage = error instanceof AxiosError 
        ? error.response?.data?.error || 'Failed to get current plan'
        : 'Failed to get current plan';
      this.setState({ error: errorMessage });
      throw new Error(errorMessage);
    } finally {
      this.setState({ loading: false });
    }
  }

  public static getState(): ISubscriptionState {
    return this.state;
  }
}

