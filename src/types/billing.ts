export interface ISubscriptionState {
  loading: boolean;
  error: string | null;
  data: any | null;
}

export interface SubscriptionStatus {
  currentPlan: string | null;
  status: 'ACTIVE' | 'EXPIRED' | 'NONE';
  subscriptionId: string | null;
  startDate: Date | null;
  endDate: Date | null;
}

export enum BillingEvent {
  SUBSCRIBE = 'SUBSCRIBE',
  CANCEL = 'CANCEL',
  UPDATE = 'UPDATE',
  RENEW = 'RENEW'
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED'
}

export type SubscriptionDetails = {
  status: 'ACTIVE' | 'FROZEN' | 'EXPIRED' | 'CANCELLED';
  plan: {
    name: string;
    price: number;
    features: Array<{ name: string; value: string }>;
  };
  startDate: Date;
  endDate: Date;
  daysUntilExpiration: number;
  latestPayment?: {
    status: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED' | 'FROZEN';
    amount: number;
    currency: string;
  };
};

export interface CycleStatus {
  isExpired: boolean;
  daysUntilExpiration: number;
  isCycleTransition: boolean;
  currentCycleStart: Date;
  currentCycleEnd: Date;
  nextCycleStart: Date | undefined;
  nextCycleEnd: Date | undefined;
}

 export interface AppPurchaseOneTimePayload {
  app_purchase_one_time: {
    id: string;
    name: string;
    status: 'PENDING' | 'ACTIVE' | 'DECLINED' | 'CANCELLED';
    test: boolean;
    created_at: string;
    updated_at: string;
    amount: string;
    currency_code: string;
  };
}

export type PaymentType = 'CREDIT' | 'SUBSCRIPTION';

export enum CurrencyCode {
  USD = 'USD',
  EURO = 'EURO',
}

export interface CreditPaymentInfo {
  name: string;
  credits: number;
  price: {
    amount: number;
    currencyCode: CurrencyCode; 
  };
}

export interface Package {
  id: string;
  name: string;
  creditAmount: number;
  pricePerCredit: number;
  totalPrice: number;
  features: string[];
  popular?: boolean;
}
