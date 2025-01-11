import axios from 'axios';

export interface IPlanFeatures {
  aiAPILimit: number;
  crawlAPILimit: number;
}

export interface IPlan {
  id?: string;
  shopifyId?: string;
  name: string;
  description: string;
  price: number;
  interval: string;
  trialDays: number;
  features: IPlanFeatures;
  isActive?: boolean;
}

export interface IPlanState {
  loading: boolean;
  error: string | null;
  data: IPlan[] | null;
}

export class PlanService {
  private static baseURL: string = '/api/admin/plans';
  private static state: IPlanState = {
    loading: false,
    error: null,
    data: null
  };

  private constructor() {}

  private static setState(newState: Partial<IPlanState>): void {
    PlanService.state = {
      ...PlanService.state,
      ...newState
    };
  }

  public static async getPlans(): Promise<IPlan[]> {
    try {
      this.setState({ loading: true, error: null });
      const response = await axios.get(this.baseURL);
      const plans = response.data.plans || []; 
      this.setState({ data: plans });
      return plans;
    } catch (error) {
      const errorMessage = 'Failed to fetch plans';
      this.setState({ error: errorMessage });
      throw new Error(errorMessage);
    } finally {
      this.setState({ loading: false });
    }
  }

  public static async createPlan(planData: IPlan): Promise<IPlan> {
    try {
      this.setState({ loading: true, error: null });
      const response = await axios.post(this.baseURL, planData);
      return response.data;
    } catch (error) {
      const errorMessage = 'Failed to create plan';
      this.setState({ error: errorMessage });
      throw error;
    } finally {
      this.setState({ loading: false });
    }
  }

  public static async updatePlan(
    planId: string, 
    shopifyId: string, 
    planData: IPlan
  ): Promise<IPlan> {
    try {
      this.setState({ loading: true, error: null });
      const response = await axios.put(`${this.baseURL}/${planId}`, { 
        planId, 
        shopifyId, 
        planData 
      });
      const updatedPlan = response.data;
      return updatedPlan;
    } catch (error) {
      const errorMessage = 'Failed to update plan';
      this.setState({ error: errorMessage });
      throw error;
    } finally {
      this.setState({ loading: false });
    }
  }

  public static async deletePlan(planId: string, shopifyId: string): Promise<void> {
    try {
      this.setState({ loading: true, error: null });
      await axios.delete(`${this.baseURL}/${planId}`, {
        params: { shopifyId }
      });
      this.setState({ 
        data: this.state.data?.filter(plan => plan.id !== planId) || null 
      });
    } catch (error) {
      const errorMessage = 'Failed to delete plan';
      this.setState({ error: errorMessage });
      throw error;
    } finally {
      this.setState({ loading: false });
    }
  }

  public static getState(): IPlanState {
    return this.state;
  }
}
