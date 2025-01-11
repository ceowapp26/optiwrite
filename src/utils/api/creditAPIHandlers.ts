import axios, { AxiosError } from 'axios';

interface ICreditState {
  loading: boolean;
  error: string | null;
  data: any | null;
}

interface CreditBalance {
  credits: number;
  service: string;
}

interface CreditPurchaseResponse {
  payment: {
    id: string;
    amount: number;
    status: string;
  };
  usage: {
    credits: number;
    service: string;
  };
}

export class CreditService {
  private static baseURL: string = '/api/billing/credit';
  private static state: ICreditState = {
    loading: false,
    error: null,
    data: null
  };

  private static setState(newState: Partial<ICreditState>) {
    this.state = { ...this.state, ...newState };
  }

  private static async getAuthHeaders(sessionToken: string) {
    return {
      Authorization: `Bearer ${sessionToken}`,
      'Content-Type': 'application/json'
    };
  }

  public static async purchaseCredits(
    shop: string,
    host: string,
    sessionToken: string,
    packageId?: number,
    isCustom?: boolean,
    paymentData?: CreditPaymentInfo,
    email?: string
  ): Promise<CreditPurchaseResponse> {
    try {
      this.setState({ loading: true, error: null });
      const headers = await this.getAuthHeaders(sessionToken);
      if (!isCustom && !packageId) {
        throw new Error('Package ID is required for standard packages');
      }
      if (isCustom && !paymentData) {
        throw new Error('Payment data is required for custom packages');
      }
      const response = await axios.post(
        `${this.baseURL}`,
        {
          shop,
          host,
          packageId,
          isCustom,
          paymentData,
          email
        },
        { headers }
      );
      
      this.setState({ data: response.data });
      return response.data;
    } catch (error) {
      const errorMessage = error instanceof AxiosError 
        ? error.response?.data?.error || 'Credit purchase failed'
        : 'Credit purchase failed';
      this.setState({ error: errorMessage });
      throw new Error(errorMessage);
    } finally {
      this.setState({ loading: false });
    }
  }

  public static async getCreditBalance(
    shop: string,
    service: string,
    sessionToken: string
  ): Promise<CreditBalance> {
    try {
      this.setState({ loading: true, error: null });
      const headers = await this.getAuthHeaders(sessionToken);
      const response = await axios.get<CreditBalance>(
        `${this.baseURL}/balance`,
        {
          params: { shop, service },
          headers
        }
      );
      
      this.setState({ data: response.data });
      return response.data;
    } catch (error) {
      const errorMessage = error instanceof AxiosError 
        ? error.response?.data?.error || 'Failed to get credit balance'
        : 'Failed to get credit balance';
      this.setState({ error: errorMessage });
      throw new Error(errorMessage);
    } finally {
      this.setState({ loading: false });
    }
  }

  public static async getCreditHistory(
    shop: string,
    service: string,
    sessionToken: string
  ) {
    try {
      this.setState({ loading: true, error: null });
      const headers = await this.getAuthHeaders(sessionToken);
      const response = await axios.get(
        `${this.baseURL}/history`,
        {
          params: { shop, service },
          headers
        }
      );
      this.setState({ data: response.data });
      return response.data;
    } catch (error) {
      const errorMessage = error instanceof AxiosError 
        ? error.response?.data?.error || 'Failed to get credit history'
        : 'Failed to get credit history';
      this.setState({ error: errorMessage });
      throw new Error(errorMessage);
    } finally {
      this.setState({ loading: false });
    }
  }

  public static async updatePaymentStatus(
    paymentId: string,
    status: string,
    transactionId?: string,
    sessionToken: string
  ) {
    try {
      this.setState({ loading: true, error: null });
      const headers = await this.getAuthHeaders(sessionToken);
      const response = await axios.post(
        `${this.baseURL}/payment/status`,
        {
          paymentId,
          status,
          transactionId
        },
        { headers }
      );
      
      this.setState({ data: response.data });
      return response.data;
    } catch (error) {
      const errorMessage = error instanceof AxiosError 
        ? error.response?.data?.error || 'Failed to update payment status'
        : 'Failed to update payment status';
      this.setState({ error: errorMessage });
      throw new Error(errorMessage);
    } finally {
      this.setState({ loading: false });
    }
  }

  public static getState(): ICreditState {
    return this.state;
  }
}