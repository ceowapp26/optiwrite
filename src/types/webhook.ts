export interface AppSubscriptionPayload {
  app_subscription: {
    subscription_id: string;
    name: string;
    status: string;
    billing_period: {
      start: string;
      end: string;
    };
  };
}

export interface AppUninstallationPayload {
  id: number;
  zip: string | null;
  city: string | null;
  name: string;
  email: string;
  phone: string | null;
  domain: string;
  source: string | null;
  country: string;
  address1: string | null;
  address2: string | null;
  currency: string;
  finances: boolean;
  latitude: number | null;
  province: string | null;
  timezone: string;
  longitude: number | null;
  plan_name: string;
  created_at: string;
  shop_owner: string;
  updated_at: string;
  weight_unit: string;
  country_code: string;
  country_name: string;
  county_taxes: boolean;
  money_format: string;
  tax_shipping: boolean | null;
  has_discounts: boolean;
  iana_timezone: string;
  province_code: string | null;
  customer_email: string;
  has_gift_cards: boolean;
  has_storefront: boolean;
  primary_locale: string;
  setup_required: boolean;
  taxes_included: boolean;
  myshopify_domain: string;
  password_enabled: boolean;
  plan_display_name: string;
  google_apps_domain: string | null;
  pre_launch_enabled: boolean;
  primary_location_id: number;
  eligible_for_payments: boolean;
  checkout_api_supported: boolean;
  money_in_emails_format: string;
  multi_location_enabled: boolean;
  google_apps_login_enabled?: boolean | null;
  money_with_currency_format?: string;
  transactional_sms_disabled?: boolean;
  auto_configure_tax_inclusivity?: boolean | null;
  enabled_presentment_currencies?: string[];
  requires_extra_payments_agreement?: boolean;
  money_with_currency_in_emails_format?: string;
  marketing_sms_consent_enabled_at_checkout?: boolean;
}

export interface AppPurchaseOneTimePayload {
  app_purchase_one_time?: {
    id: string; 
    name: string;
    status: string; 
    amount: number; 
    currency_code: string; 
    created_at: string; 
    updated_at: string; 
  };
}

export interface WebhookQueueItem {
  id: string;
  topic: string;
  shop: string;
  payload: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  createdAt: Date;
  processedAt?: Date;
  error?: string;
}

export interface WebhookHandlerConfig {
  topic: string;
  handler: (shop: string, payload: any) => Promise<void>;
}

export interface WebhookRegistrationResult {
  success: boolean;
  result: {
    webhookId: string;
    topic: string;
    address: string;
  };
}