export interface PRODUCT {
  id?: string;
  title?: string;
  category?: string;
  description?: string;
  price?: number;
  costPerItem?: number;
  profit?: number;
  weight?: string;
  pageTitle?: string;
  metaDescription?: string;
  body_html?: string;
  vendor?: string;
  product_type?: string;
  created_at?: string;
  updated_at?: string;
  published_at?: string;
  template_suffix?: string;
  status?: 'active' | 'archived' | 'draft';
  published_scope?: 'web' | 'global';
  tags: string;
  admin_graphql_api_id?: string;
  variants: {
    id?: number;
    product_id?: number;
    title: string;
    price: string;
    sku: string;
    position?: number;
    inventory_policy?: string;
    compare_at_price?: string;
    fulfillment_service?: string;
    inventory_management?: string;
    option1?: string;
    option2?: string;
    option3?: string;
    created_at?: string;
    updated_at?: string;
    taxable?: boolean;
    barcode?: string;
    grams?: number;
    image_id?: number;
    weight?: number;
    weight_unit?: 'kg' | 'g' | 'oz' | 'lb';
    inventory_item_id?: number;
    inventory_quantity?: number;
    old_inventory_quantity?: number;
    requires_shipping?: boolean;
    admin_graphql_api_id?: string;
  }[];
  options: {
    id?: number;
    product_id?: number;
    name: string;
    position?: number;
    values: string[];
  }[];
  images: {
    id?: number;
    product_id?: number;
    position?: number;
    created_at?: string;
    updated_at?: string;
    alt?: string;
    width?: number;
    height?: number;
    src: string;
    variant_ids?: number[];
    admin_graphql_api_id?: string;
  }[];
  image?: {
    id?: number;
    product_id?: number;
    position?: number;
    created_at?: string;
    updated_at?: string;
    alt?: string;
    width?: number;
    height?: number;
    src: string;
    variant_ids?: number[];
    admin_graphql_api_id?: string;
  };
}

export type ACTION = 'SIMPLE' | 'SEO';

