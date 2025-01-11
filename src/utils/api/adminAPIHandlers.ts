import axios from 'axios';

export interface IAdminUser {
  userId?: string;
  email: string;
  firstName: string;
  lastName: string;
  image?: string;
  emailVerified?: boolean;
}

export interface IAdminState {
  loading: boolean;
  error: string | null;
  data: IAdminUser[] | null;
}

export class AdminService {
  private static baseURL: string = '/api/admin/users';
  private static state: IAdminState = {
    loading: false,
    error: null,
    data: null
  };

  private constructor() {}

  private static setState(newState: Partial<IAdminState>) {
    AdminService.state = {
      ...AdminService.state,
      ...newState
    };
  }

  public static async getAdminUsers(): Promise<IAdminUser[]> {
    try {
      this.setState({ loading: true, error: null });
      const response = await axios.get(this.baseURL);
      const users = response.data || []; 
      this.setState({ data: users });
      return users;
    } catch (error) {
      const errorMessage = 'Failed to fetch admin users';
      this.setState({ error: errorMessage });
      throw new Error(errorMessage);
    } finally {
      this.setState({ loading: false });
    }
  }

  public static async createAdminUser(userData: IAdminUser): Promise<IAdminUser> {
    try {
      this.setState({ loading: true, error: null });
      const response = await axios.post(this.baseURL, userData);
      this.setState({ data: [...(this.state.data || []), response.data] });
      return response.data;
    } catch (error) {
      const errorMessage = 'Failed to create admin user';
      this.setState({ error: errorMessage });
      throw new Error(errorMessage);
    } finally {
      this.setState({ loading: false });
    }
  }

  public static async updateAdminUser(userId: string, userData: IAdminUser): Promise<IAdminUser> {
    try {
      this.setState({ loading: true, error: null });
      const response = await axios.put(`${this.baseURL}/${userId}`, userData);
      this.setState({ 
        data: this.state.data?.map(user => 
          user.userId === userId ? response.data : user
        ) || null 
      });
      return response.data;
    } catch (error) {
      const errorMessage = 'Failed to update admin user';
      this.setState({ error: errorMessage });
      throw new Error(errorMessage);
    } finally {
      this.setState({ loading: false });
    }
  }

  public static async deleteAdminUser(userId: string): Promise<void> {
    try {
      this.setState({ loading: true, error: null });
      await axios.delete(`${this.baseURL}/${userId}`);
      this.setState({ 
        data: this.state.data?.filter(user => user.userId !== userId) || null 
      });
    } catch (error) {
      const errorMessage = 'Failed to delete admin user';
      this.setState({ error: errorMessage });
      throw new Error(errorMessage);
    } finally {
      this.setState({ loading: false });
    }
  }

  public static getState(): IAdminState {
    return this.state;
  }
}