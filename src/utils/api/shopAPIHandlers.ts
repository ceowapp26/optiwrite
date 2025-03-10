import axios, { AxiosRequestConfig, CancelTokenSource } from 'axios';
import { toast } from 'sonner';
import { CONTENT } from '@/types/content';
import { initializeShopify } from "@/lib/shopify";
import { getSessionToken } from '@shopify/app-bridge-utils';

interface IApiState {
  loading: boolean;
  error: string | null;
  data: any | null;
  progress: number;
  status: 'idle' | 'loading' | 'success' | 'error' | 'cancelled';
}

export class ShopApiService {
  private static baseURL: string = '/api/shop';
  private static cancelTokenSource: CancelTokenSource | null = null;
  
  private static state: IApiState = {
    loading: false,
    error: null,
    data: null,
    progress: 0,
    status: 'idle'
  };

  private constructor() {}

  private static setState(newState: Partial<IApiState>) {
    ShopApiService.state = {
      ...ShopApiService.state,
      ...newState
    };
  }

  public static getState(): IApiState {
    return this.state;
  }

  private static resetState() {
    this.state = {
      loading: false,
      error: null,
      data: null,
      progress: 0,
      status: 'idle'
    };
    this.cancelTokenSource = null;
  }

  private static createCancelToken() {
    this.cancelTokenSource = axios.CancelToken.source();
    return this.cancelTokenSource;
  }

  public static async getList(
    accessToken: string, 
    shopName: string, 
    pagination?: number, 
    limit?: number
  ): Promise<{ products: any[], blogs: any[], articles: any[], state: IApiState }> {
    this.resetState();
    try {
      this.setState({ loading: true, error: null, status: 'loading' });
      const source = this.createCancelToken();
      const response = await axios.get(
        `${this.baseURL}/contents`,
        {
          params: { accessToken, shopName, pagination , limit },
          cancelToken: source.token
        }
      );
      const products = Array.isArray(response?.data?.products) 
        ? response?.data?.products 
        : [];
      const blogs = Array.isArray(response?.data?.blogs) 
        ? response?.data?.blogs 
        : [];
      const articles = Array.isArray(response?.data?.articles) 
        ? response?.data?.articles 
        : [];
      this.setState({ 
        data: {
          products,
          blogs,
          articles
        },
        status: 'success'
      });
      return {
        products,
        blogs,
        articles,
        total: response?.data?.total,
        state: this.getState()
      };

    } catch (error) {
      this.handleError(error, 'Fetching content');
      return {
        products: [],
        blogs: [],
        articles: [],
        total: 0
      };
    } finally {
      this.setState({ loading: false });
    }
  }

  public static async getSingle(accessToken: string, shopName: string, contentId: string): Promise<any> {
    this.resetState();
    try {
      this.setState({ loading: true, error: null, status: 'loading' });
      const source = this.createCancelToken();
      const response = await axios.get(
        `${this.baseURL}/contents/${contentId}`,
        { accessToken, shopName },
        {
          params: { contentId },
          cancelToken: source.token
        }
      );
      this.setState({ 
        data: response.data,
        status: 'success'
      });
      toast.success('Content fetched successfully');
      return {
        data: response.data,
        state: this.getState()
      };
    } catch (error) {
      this.handleError(error, 'Fetching content');
      return {
        data: null,
        state: this.getState()
      };
    } finally {
      this.setState({ loading: false });
    }
  }

  public static async delete(accessToken: string, shopName: string, contentId: string): Promise<any> {
    this.resetState();
    try {
      this.setState({ loading: true, error: null, status: 'loading' });
      const source = this.createCancelToken();
      const response = await axios.delete(
        `${this.baseURL}/contents/${contentId}`, {
          params: { contentId, accessToken, shopName },
          cancelToken: source.token
        }
      );
      this.setState({ 
        data: response.data,
        status: 'success'
      });
      toast.success('Content deleted successfully');
      return {
        data: response.data,
        state: this.getState()
      };
    } catch (error) {
      this.handleError(error, 'Deleting content');
      return {
        data: null,
        state: this.getState()
      };
    } finally {
      this.setState({ loading: false });
    }
  }

  public static async update(accessToken: string, shopName: string, contentId: string, updatedContent: CONTENT): Promise<any> {
    this.resetState();
    try {
      this.setState({ loading: true, error: null, status: 'loading' });
      const source = this.createCancelToken();
      const response = await axios.put(
        `${this.baseURL}/contents/${contentId}`,
        { accessToken, shopName, updatedContent },
        {
          params: { contentId },
          cancelToken: source.token
        }
      );
      this.setState({ 
        data: response.data,
        status: 'success'
      });
      return {
        data: response.data,
        state: this.getState()
      };
    } catch (error) {
      this.handleError(error, 'Updating content');
      return {
        data: null,
        state: this.getState()
      };
    } finally {
      this.setState({ loading: false });
    }
  }

  public static async publish (
    shopName: string,
    accessToken: string,
    content: CONTENT,
    category?: string
  ): Promise<any> {
    this.resetState();
    try {
      this.setState({ 
        loading: true, 
        error: null, 
        status: 'loading',
        progress: 0 
      });
      const source = this.createCancelToken();
      const response = await axios.post(
        `${this.baseURL}/contents/publish`,
        { accessToken, shopName, content, category },
        {
          cancelToken: source.token,
          onUploadProgress: (progressEvent) => {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            this.setState({ progress });
          }
        }
      );
      this.setState({ 
        data: response.data,
        status: 'success',
        progress: 100
      });
      return {
        data: response.data,
        state: this.getState()
      };
    } catch (error) {
      this.handleError(error, 'Publishing content');
    } finally {
      this.setState({ loading: false });
    }
  }

   private static handleError(error: any, action: string) {
    if (axios.isCancel(error)) {
      this.setState({ 
        error: 'Operation cancelled',
        status: 'cancelled'
      });
    } else {
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          `An error occurred while ${action.toLowerCase()}`;
      toast.error(errorMessage);
      this.setState({ 
        error: errorMessage,
        status: 'error'
      });
      throw new Error(errorMessage);
    }
  }

  public static cancelOperation() {
    if (this.cancelTokenSource) {
      this.cancelTokenSource.cancel('Operation cancelled by user');
      this.setState({ 
        status: 'cancelled',
        loading: false 
      });
      this.cancelTokenSource = null;
    }
  }

  public static getState(): IApiState {
    return this.state;
  }
}
