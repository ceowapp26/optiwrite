import { AIError } from '@/types/ai';
import { CATEGORY, ContentCategory } from '@/types/content';
import { GENERIC_FORM, DEFAULT_VALUES } from '@/constants/content';
import { processJsonData } from './utilities';
import { store } from '@/stores/store';

interface ProductOption {
  id: number;
  name: string;
  position: number;
  product_id: number;
  values: string[];
}

interface ProductVariant {
  barcode?: string;
  compare_at_price: string | null;
  created_at: string;
  fulfillment_service: string;
  grams: number;
  id: number;
  image_id: number | null;
  inventory_item_id: number;
  inventory_management: string;
  inventory_policy: string;
  inventory_quantity: number;
  old_inventory_quantity: number;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  position: number;
  price: string;
  product_id: number;
  requires_shipping: boolean;
  sku: string;
  taxable: boolean;
  tax_code: string | null;
  title: string;
  updated_at: string;
  weight: number;
  weight_unit: string;
}

interface ObjectMetafield {
  key: string;
  namespace: string;
  value: string | number;
  value_type: 'string' | 'integer';
  description: string | null;
}

export interface LengthValidationError {
  field: string;
  currentLength: number;
  constraint: FieldLengthConstraints;
  content: string;
}
interface ProductStatus {
  value: 'active' | 'archived' | 'draft';
  label: 'Active' | 'Archived' | 'Draft';
}

const STATUS_OPTIONS = [
  { label: 'Active', value: 'active' },
  { label: 'Archived', value: 'archived' },
  { label: 'Draft', value: 'draft' }
] as const;

const FIELD_LENGTH_CONSTRAINTS: Record<string, FieldLengthConstraints> = {
  title: { min: 10, max: 200, type: 'characters' },
  product_type: { min: 10, max: 200, type: 'characters' },
  vendor: { min: 10, max: 200, type: 'characters' },
  template_suffix: { min: 10, max: 200, type: 'characters' },
  body_html: { min: 200, max: 4000, type: 'category' },
  blog_title: { min: 10, max: 200, type: 'category' },
  blog_feedburner: { min: 10, max: 200, type: 'category' },
  blog_feedburner_location: { min: 10, max: 200, type: 'category' },
  blog_template_suffix: { min: 10, max: 200, type: 'characters' },
  article_title: { min: 10, max: 200, type: 'category' },
  article_author: { min: 10, max: 200, type: 'category' },
  article_body_html: { min: 200, max: 4000, type: 'category' },
  article_template_suffix: { min: 10, max: 200, type: 'category' },
  metaDescription: { min: 100, max: 500, type: 'characters' },
  pageTitle: { min: 10, max: 200, type: 'characters' }
};

export interface LengthValidationError {
  field: string;
  currentLength: number;
  constraint: FieldLengthConstraints;
  content: string;
}

export function validateFieldLength(
  fieldName: string, 
  value: string
): { isValid: boolean; error?: LengthValidationError } {
  const constraints = FIELD_LENGTH_CONSTRAINTS[fieldName];
  if (!constraints || !value) return { isValid: true };
  
  const length = constraints.type === 'words' 
    ? value.trim().split(/\s+/).length 
    : value.length;

  if ((constraints.min && length < constraints.min) || 
      (constraints.max && length > constraints.max)) {
    return {
      isValid: false,
      error: {
        field: fieldName,
        currentLength: length,
        constraint: constraints,
        content: value
      }
    };
  }
  return { isValid: true };
}

export function chopHtmlContent(content: string, maxLength: number): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'text/html');
  let currentLength = 0;
  const walker = document.createTreeWalker(
    doc.body,
    NodeFilter.SHOW_TEXT,
    null
  );
  const nodesToRemove: Node[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const textLength = node.textContent?.length || 0;
    if (currentLength + textLength > maxLength) {
      nodesToRemove.push(node);
    }
    currentLength += textLength;
  }
  nodesToRemove.forEach(node => {
    let current = node;
    while (current.parentNode && current.parentNode.childNodes.length === 1) {
      current = current.parentNode;
    }
    current.parentNode?.removeChild(current);
  });
  return doc.body.innerHTML;
}

interface ValidationResult {
  isValid: boolean;
  data: Record<string, any>;
  errors: AIError[];
}

const createAIError = (field: string, value: any, reason: string): AIError => ({
  name: `${field}ValidationError`,
  code: `INVALID_${field.toUpperCase()}`,
  message: `Invalid ${field}: ${reason}. Using default value: ${DEFAULT_VALUES[field]}`
});

export const isValidProductUrl = (url: string): boolean => {
  if (!url.includes('myshopify.com/')) return /^[a-z0-9-]+$/.test(url);
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.pathname.includes('/products/') &&
           /^[a-z0-9-]+$/.test(parsedUrl.pathname.split('/products/')[1]);
  } catch {
    return false;
  }
};

export const isValidBlogUrl = (url: string): boolean => {
  if (!url.includes('myshopify.com/')) return /^[a-z0-9-]+$/.test(url);
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.pathname.includes('/blogs/') &&
           /^[a-z0-9-]+$/.test(parsedUrl.pathname.split('/blogs/')[1]);
  } catch {
    return false;
  }
};

export const isValidArticleUrl = (url: string): boolean => {
  if (!url.includes('myshopify.com/')) return /^[a-z0-9-]+$/.test(url);
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.pathname.includes('/articles/') &&
           /^[a-z0-9-]+$/.test(parsedUrl.pathname.split('/articles/')[1]);
  } catch {
    return false;
  }
};

function isNumericValidator(value: any): { isValid: boolean; error?: string } {
  return (typeof value === 'number' || !isNaN(Number(value)))
    ? { isValid: true }
    : { isValid: false, error: 'must be a valid number' };
}

function stringValidator(value: any): { isValid: boolean; error?: string } {
  return typeof value === 'string' 
    ? { isValid: true } 
    : { isValid: false, error: 'must be a string' };
}

function nonEmptyStringValidator(value: any): { isValid: boolean; error?: string } {
  return (typeof value === 'date' && value.trim().length > 0)
    ? { isValid: true }
    : { isValid: false, error: 'cannot be empty' };
}

function validateDate(date: string): { isValid: boolean; error?: string } {
  const timestamp = Date.parse(date);
  if (isNaN(timestamp)) {
    return { isValid: false, error: 'Invalid date format' };
  }
  const dateObj = new Date(date);
  if (dateObj.toString() === 'Invalid Date') {
    return { isValid: false, error: 'Invalid date' };
  }
  return { isValid: true };
}

function validateProductStatus(value: any): { isValid: boolean; error?: string } {
  if (!value || typeof value !== 'string') {
    return { isValid: false, error: 'Status must be a string' };
  }
  const validStatuses = STATUS_OPTIONS.map(option => option.value);
  if (!validStatuses.includes(value)) {
    return { 
      isValid: false, 
      error: `Status must be one of: ${validStatuses.join(', ')}` 
    };
  }
  return { isValid: true };
}

function validateProductOptions(options: any[]): { isValid: boolean; error?: string } {
  if (!Array.isArray(options)) {
    return { isValid: false, error: 'Options must be an array' };
  }
  for (const option of options) {
    if (!option.name || typeof option.name !== 'string') {
      return { isValid: false, error: 'Each option must have a valid name' };
    }
    if (!Array.isArray(option.values)) {
      return { isValid: false, error: 'Each option must have values array' };
    }
    if (option.position && typeof option.position !== 'number') {
      return { isValid: false, error: 'Option position must be a number' };
    }
  }
  return { isValid: true };
}

function validateProductVariants(variants: any[]): { isValid: boolean; error?: string } {
  if (!Array.isArray(variants)) {
    return { isValid: false, error: 'Variants must be an array' };
  }
  for (const variant of variants) {
    if (!variant.price || isNaN(parseFloat(variant.price))) {
      return { isValid: false, error: 'Each variant must have a valid price' };
    }
    if (typeof variant.requires_shipping !== 'boolean') {
      return { isValid: false, error: 'requires_shipping must be a boolean' };
    }
    if (typeof variant.taxable !== 'boolean') {
      return { isValid: false, error: 'taxable must be a boolean' };
    }
    if (!variant.title || typeof variant.title !== 'string') {
      return { isValid: false, error: 'Each variant must have a valid title' };
    }
  }

  return { isValid: true };
}

function validateObjectMetafield(metafield: any): { isValid: boolean; error?: string } {
  if (!metafield || typeof metafield !== 'object') {
    return { isValid: false, error: 'Metafield must be an object' };
  }
  if (!metafield.key || typeof metafield.key !== 'string') {
    return { isValid: false, error: 'Metafield must have a valid key' };
  }
  if (!metafield.namespace || typeof metafield.namespace !== 'string') {
    return { isValid: false, error: 'Metafield must have a valid namespace' };
  }
  if (!metafield.value_type || !['string', 'integer'].includes(metafield.value_type)) {
    return { isValid: false, error: 'Invalid value_type' };
  }
  if (metafield.value_type === 'integer' && isNaN(parseInt(metafield.value))) {
    return { isValid: false, error: 'Value must be a valid integer' };
  }
  return { isValid: true };
}

function isValidDate(date: any): date is Date {
  return date instanceof Date && !isNaN(date.getTime());
}

function isValidNumber(value: any): value is number {
  return typeof value === 'number' && !isNaN(value);
}

function isValidString(value: any): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

const FIELD_VALIDATORS = {
  images: (value: any) => 
    Array.isArray(value) || typeof value === 'string' 
    ? { isValid: true } 
    : { isValid: false, error: 'must be an array or string URL' },
  handle: (value: string) => 
    isValidProductUrl(value) 
    ? { isValid: true } 
    : { isValid: false, error: 'invalid product URL' },
  article_handle: (value: string) => 
    isValidArticleUrl(value) 
    ? { isValid: true } 
    : { isValid: false, error: 'invalid article URL' },
  blog_handle: (value: string) => 
    isValidBlogUrl(value) 
    ? { isValid: true } 
    : { isValid: false, error: 'invalid blog URL' },
  body_html: stringValidator,
  article_body_html: stringValidator,
  article_summary_html: stringValidator,
  title: nonEmptyStringValidator,
  article_title: nonEmptyStringValidator,
  blog_title: nonEmptyStringValidator,
  tags: nonEmptyStringValidator,
  blog_tags: nonEmptyStringValidator,
  article_tags: nonEmptyStringValidator,
  options: validateProductOptions,
  variants: validateProductVariants,
  article_metafield: validateObjectMetafield,
  blog_metafield: validateObjectMetafield,
  article_published_at: validateDate,
  published_at: validateDate,
  created_at: validateDate,
  updated_at: validateDate,
  article_author: nonEmptyStringValidator,
  product_type: nonEmptyStringValidator,
  status: validateProductStatus,
  page_title: nonEmptyStringValidator,
  meta_description: nonEmptyStringValidator,
};

export function validateData(data: Record<string, any>, shopName?: string, category?: CATEGORY): ValidationResult {
  const errors: AIError[] = [];
  const validatedData: Record<string, any> = {};
  const requiredFields = GENERIC_FORM
    .filter(field => field.required)
    .map(field => field.name)
    .filter(fieldName => fieldName in data);
  requiredFields.forEach(fieldName => {
    if (!data[fieldName] || (typeof data[fieldName] === 'string' && !data[fieldName].trim())) {
      errors.push(createAIError(fieldName, null, 'missing required field'));
      validatedData[fieldName] = DEFAULT_VALUES[fieldName];
    }
  });
  Object.entries(data).forEach(([key, value]) => {
    if (!GENERIC_FORM.some(field => field.name === key)) return;
    const validator = FIELD_VALIDATORS[key];
    const validation = validator ? validator(value) : { isValid: true };
    if (validation.isValid) {
      validatedData[key] = processFieldValue(key, value); 
    } else {
      errors.push(createAIError(key, value, validation.error || 'invalid format'));
      if (key === 'handle' || key === 'blog_handle' || key === 'article_handle' && shopName) {
        let title: string | undefined;
        switch (true) {
          case Boolean(data?.title):
            title = data?.title;
            break;
          case Boolean(data?.blog_title):
            title = data?.blog_title;
            break;
          case Boolean(data?.article_title):
            title = data?.article_title;
            break;
          default:
            title = undefined;
        }
        if (title) {
          validatedData[key] = constructShopifyUrl(title, shopName, category);
        } else {
          validatedData[key] = processInvalidFieldValue(key, DEFAULT_VALUES);
        }
      } else {
        validatedData[key] = processInvalidFieldValue(key, DEFAULT_VALUES);
      }
    }
  });
  requiredFields.forEach(fieldName => {
    if (!(fieldName in validatedData)) {
      validatedData[fieldName] = processInvalidFieldValue(fieldName);
    }
  });
  return {
    isValid: errors.length === 0,
    data: validatedData,
    errors
  };
}

function parseValue(value: any) {
  return processJsonData(value);
}

function processFieldValue(key: string, value: any): any {
  const processors = {
    images: (val: string | string[]): string[] => 
      typeof val === 'string' ? [val] : Array.isArray(val) ? val : [],

    handle: (val: string): string => 
      typeof val === 'string' ? val.toLowerCase() : '',

    inventory_quantity: (val: string | number): number =>
      typeof val === 'number' ? Math.floor(val) : 
      typeof val === 'string' ? parseInt(val, 10) : 0,
      
    weight: (val: string | number): number =>
      typeof val === 'number' ? val : 
      typeof val === 'string' ? parseFloat(val) : 0,
      
    status: (val: string): string => {
      const validStatus = STATUS_OPTIONS.find(s => s.value === val);
      return validStatus ? validStatus.value : 'draft';
    },
    tags: (val: string | string[]): string => 
      Array.isArray(val) ? val.join(', ') : 
      typeof val === 'string' ? val : '',

    variants: (val: any[]): any[] =>
      Array.isArray(val) ? val.map(variant => ({
        ...variant,
        price: processors.price(variant.price),
        weight: processors.weight(variant.weight),
        inventory_quantity: processors.inventory_quantity(variant.inventory_quantity)
      })) : [],

    published_at: (val: string): string => {
      const date = new Date(val);
      return date.toString() === 'Invalid Date' ? 
        new Date().toISOString() : 
        date.toISOString();
    },
    updated_at: (val: string): string => {
      const date = new Date(val);
      return date.toString() === 'Invalid Date' ? 
        new Date().toISOString() : 
        date.toISOString();
    },
    created_at: (val: string): string => {
      const date = new Date(val);
      return date.toString() === 'Invalid Date' ? 
        new Date().toISOString() : 
        date.toISOString();
    }
  };
  const processor = processors[key];
  return processor ? processor(value) : value;
}

function processInvalidFieldValue(key: string): any {
  return DEFAULT_VALUES[key];
}

function constructShopifyUrl(title: string, shopName: string, category: CATEGORY): string {
  const urlFriendlyTitle = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') 
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
  const baseUrl = `https://${shopName}.myshopify.com/`;
  switch (category) {
    case ContentCategory.BLOG:
      return `${baseUrl}blogs/${urlFriendlyTitle}`;
    case ContentCategory.ARTICLE:
      return `${baseUrl}articles/${urlFriendlyTitle}`;
    case ContentCategory.PRODUCT:
      return `${baseUrl}products/${urlFriendlyTitle}`;
    default:
      throw new Error(`Invalid category: ${category}`);
  }
}



