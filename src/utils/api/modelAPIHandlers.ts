import axios from 'axios';
import { AIModel, ModelName } from '@prisma/client';

export interface IModelState {
  loading: boolean;
  error: string | null;
  data: AIModel[] | null;
}

export class ModelService {
  private static baseURL: string = '/api/admin/models';
  private static state: IModelState = {
    loading: false,
    error: null,
    data: null
  };

  private static setState(newState: Partial<IModelState>) {
    ModelService.state = { ...ModelService.state, ...newState };
  }
  
  public static async getModels(): Promise<AIModel[]> {
    try {
      this.setState({ loading: true, error: null });
      const response = await axios.get(this.baseURL);
      const models = response.data || []; 
      this.setState({ data: models });
      return models;
    } catch (error) {
      this.handleError('Failed to fetch models');
      throw error;
    }
  }

  public static async getModel(id: string): Promise<AIModel> {
    try {
      this.setState({ loading: true, error: null });
      const response = await axios.get(`${this.baseURL}/${id}`);
      return response.data;
    } catch (error) {
      this.handleError('Failed to fetch model');
      throw error;
    }
  }

  public static async createModel(modelData: Omit<AIModel, 'id'>): Promise<AIModel> {
    try {
      this.setState({ loading: true, error: null });
      const response = await axios.post(this.baseURL, modelData);
      this.setState({ 
        data: [...(this.state.data || []), response.data] 
      });
      return response.data;
    } catch (error) {
      this.handleError('Failed to create model');
      throw error;
    }
  }

  public static async updateModel(id: string, modelData: Partial<AIModel>): Promise<AIModel> {
    try {
      this.setState({ loading: true, error: null });
      const response = await axios.put(`${this.baseURL}/${id}`, modelData);
      this.setState({
        data: this.state.data?.map(model => 
          model.id === id ? response.data : model
        ) || null
      });
      return response.data;
    } catch (error) {
      this.handleError('Failed to update model');
      throw error;
    }
  }

  public static async deleteModel(id: string): Promise<void> {
    try {
      this.setState({ loading: true, error: null });
      await axios.delete(`${this.baseURL}/${id}`);
      this.setState({
        data: this.state.data?.filter(model => model.id !== id) || null
      });
    } catch (error) {
      this.handleError('Failed to delete model');
      throw error;
    }
  }

  private static handleError(message: string) {
    this.setState({ error: message, loading: false });
    throw new Error(message);
  }

  public static getState(): IModelState {
    return this.state;
  }
}