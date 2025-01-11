import axios from 'axios';
import { GoogleSession } from '@/types/auth';

export interface AuthState {
  loading: boolean;
  error: string | null;
  session: GoogleSession | null;
}

export class AuthService {
  private static baseURL: string = '/api/auth';
  private static state: AuthState = {
    loading: false,
    error: null,
    session: null
  };

  private static setState(newState: Partial<AuthState>) {
    AuthService.state = { ...AuthService.state, ...newState };
  }
  
  public static async signIn(shop: string, host: string, token: string): Promise<string> {
    try {
      this.setState({ loading: true, error: null });
      const response = await axios.get(`${this.baseURL}/google`, {
        params: {
          shop,
          host,
          token,
        },
      });
      const { callbackUrl } = response.data;
      this.setState({ loading: false });
      return callbackUrl;
    } catch (error) {
      this.handleError('Failed to sign in');
      throw error;
    }
  }

  public static async signOut(shop: string, host: string, session?: GoogleSession): Promise<string> {
    try {
      this.setState({ loading: true, error: null });
      const response = await axios.post(`${this.baseURL}/google/signout`, {
        shop,
        host,
        session,
      });
      const { success } = response.data;
      this.setState({ loading: false, session: null });
      return success;
    } catch (error) {
      this.handleError('Failed to sign out');
      throw error;
    }
  }

  public static async getSession(shop: string, host: string, userId?: string): Promise<string> {
    try {
      this.setState({ loading: true, error: null });
      const response = await axios.get(`${this.baseURL}/session`, {
        params: {
          shop,
          host,
          uuid: userId,
        },
      });
      const { session } = response.data;
      this.setState({ loading: false });
      return session;
    } catch (error) {
      this.handleError('Failed to get session');
      throw error;
    }
  }

  public static async refreshToken(shop: string, host: string, currentSession: GoogleSession): Promise<GoogleSession> {
    try {
      this.setState({ loading: true, error: null });
      const response = await axios.post(`${process.env.SHOPIFY_HOST}/${this.baseURL}/google/refresh_token`, {
        currentSession
      }, {
        params: {
          shop,
          host
        }
      });
      const { session } = response.data;
      this.setState({ loading: false, session });
      return session;
    } catch (error) {
      this.handleError('Failed to refresh token');
      throw error;
    }
  }

  public static async uninstall(shop: string): Promise<string> {
    try {
      this.setState({ loading: true, error: null });
      const response = await axios.post(`${this.baseURL}/shopify/uninstall`, {
        shop,
      });
      this.setState({ loading: false });
      return response.data;
    } catch (error) {
      this.handleError('Failed to get session');
      throw error;
    }
  }

  private static handleError(message: string) {
    this.setState({ error: message, loading: false });
    throw new Error(message);
  }

  public static getState(): AuthState {
    return this.state;
  }
}