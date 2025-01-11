import { ZodType, z } from 'zod';

export interface ProductProps {
  title: string;
  product_type: string;
  short_description?: string;
  page_title?: string;
  meta_description?: string;
  handle?: string;
  tags?: string;
  images?: string[];
}

export interface BlogProps {
  title: string;
  body_html: string;
  images?: string[];
  handle?: string;
  tags?: string;
}

export type ContentProps = ProductProps | BlogProps;

export const ProductSchema: ZodType<ProductProps> = z.object({
  title: z
    .string()
    .min(30, { message: 'Title must be at least 30 characters' })
    .max(100, { message: 'Title must not exceed 100 characters' })
    .nonempty({ message: 'Title is required' }),

  body_html: z
    .string()
    .min(50, { message: 'Body content must be at least 500 characters' })
    .max(2000, { message: 'Body content must not exceed 2000 characters' }),

  meta_description: z
    .string()
    .min(50, { message: 'Meta description must be at least 150 characters' })
    .max(300, { message: 'Meta description must not exceed 300 characters' })
    .optional(),

  product_type: z
    .string()
    .min(10, { message: 'Category must be at least 10 characters' })
    .max(80, { message: 'Category must not exceed 80 characters' })
    .nonempty({ message: 'Category is required' }),

  page_title: z
    .string()
    .min(30, { message: 'Page title must be at least 30 characters' })
    .max(100, { message: 'Page title must not exceed 100 characters' })
    .optional(),

  handle: z
    .string()
    .url({ message: 'Must be a valid URL' })
    .regex(/^https:\/\/.*\.myshopify\.com\/products\/[a-zA-Z0-9-]+$/, {
      message: 'Must be a valid Shopify product URL',
    })
    .optional(),

  template_suffix: z.string()
  .min(5, { message: 'Template suffix must be at least 10 characters' })
  .max(50, { message: 'Template suffix must not exceed 50 characters' })
  .optional(),

  vendor: z.string()
  .min(5, { message: 'Vendor name must be at least 10 characters' })
  .max(100, { message: 'Vendor name must not exceed 100 characters' })
  .optional(),
  
  status: 
    z.enum(['active', 'archived', 'draft'])
    .default('active')
    .optional(),

  tags: z.string().optional(),

  variants: z.array(z.object({
    title: z.string().min(1, { message: 'Variant title is required' }),
    price: z.number().min(0, { message: 'Price must be a positive number' }),
    sku: z.string(),
    weight: z.number().min(0, { message: 'Weight must be a positive number' }),
    weight_unit: z.enum(['kg', 'g', 'oz', 'lb'])
  })).optional(),

  options: z.array(z.object({
    name: z.string().min(1, { message: 'Option name is required' }),
    values: z.array(z.string())
  })).optional(),

  image: z.string().optional(),

  images: z
    .array(z.string().url({ message: 'Must be valid URLs' }))
    .optional(),

  input_data: z.object({
    category: z.string(),
    description: z.string().min(1, { message: 'Description must be at least 100 characters' }),
    urls: z.array(z.string()).default([]),
    sections: z.array(z.string()).nullable(),
    tone: z.string().optional(),
    length: z.string().optional(),
    includedFields: z.array(z.any()).default([])
  }).optional()

});

export const BlogSchema: ZodType = z.object({
  blog_title: z
    .string()
    .min(30, { message: 'Title must be at least 30 characters long' })
    .max(100, { message: 'Title must not exceed 100 characters' })
    .nonempty({ message: 'Title is required' }),

  blog_commentable: z.enum(['moderate', 'no', 'yes']).optional(),

  blog_feedburner: z
    .string()
    .optional(),

  blog_feedburner_location: z.string().optional(),

  blog_handle: z
    .string()
    .url({ message: 'Must be a valid URL' })
    .regex(/^https:\/\/.*\.myshopify\.com\/blogs\/[a-zA-Z0-9-]+$/, {
      message: 'Must be a valid Shopify product URL',
    })
    .optional(),

  blog_tags: z.string().optional(),

  blog_template_suffix: z.string().optional(),

  blog_metafield: z.array(z.object({
    key: z.string(), 
    namespace: z.string(), 
    value: z.union([z.string(), z.number()]),
    value_type: z.enum(['string', 'integer']), 
    description: z.string().nullable(), 
  })).optional(),

  article_title: z
    .string()
    .min(30, { message: 'Article title must be at least 30 characters long' })
    .max(100, { message: 'Article title must not exceed 100 characters' })
    .optional(),

  article_author: z
    .string()
    .max(50, { message: 'Author name must not exceed 50 characters' })
    .optional(),

  article_body_html: z
    .string()
    .min(100, { message: 'Article body must be at least 500 characters long' })
    .optional(),

  article_handle: z
    .string()
    .url({ message: 'Must be a valid URL' })
    .regex(/^https:\/\/.*\.myshopify\.com\/blogs\/[a-zA-Z0-9-]+$/, {
      message: 'Must be a valid Shopify product URL',
    })
    .optional(),

  article_image: z
    .string()
    .optional(),

  article_metafield: z.array(z.object({
    key: z.string(), 
    namespace: z.string(), 
    value: z.union([z.string(), z.number()]),
    value_type: z.enum(['string', 'integer']), 
    description: z.string().nullable(), 
  })).optional(),

  article_published: z.boolean().optional(),

  article_published_at: z
    .string()
    .datetime({ message: 'Must be a valid date-time string' })
    .optional(),

  article_summary_html: z
    .string()
    .min(100, { message: 'Summary must not exceed 500 characters' })
    .optional(),

  article_tags: z.string().optional(),

  article_template_suffix: z.string().optional(),

  input_data: z.object({
    category: z.string(),
    description: z.string().min(1, { message: 'Description must be at least 100 characters' }),
    urls: z.array(z.string()).default([]),
    sections: z.array(z.string()).nullable(),
    tone: z.string().optional(),
    length: z.string().optional(),
    includedFields: z.array(z.any()).default([])
  }).optional(),

  user_id: z
    .string()
    .regex(/^[a-zA-Z0-9_-]+$/, { message: 'User ID must only contain letters, numbers, underscores, or hyphens' })
    .optional()
});

export const ArticleSchema: ZodType = z.object({
  blog_title: z
    .string()
    .min(30, { message: 'Title must be at least 30 characters long' })
    .max(100, { message: 'Title must not exceed 100 characters' })
    .optional(),

  blog_commentable: z.enum(['moderate', 'no', 'yes']).optional(),

  blog_feedburner: z
    .string()
    .optional(),

  blog_feedburner_location: z.string().optional(),

  blog_handle: z
    .string()
    .url({ message: 'Must be a valid URL' })
    .regex(/^https:\/\/.*\.myshopify\.com\/blogs\/[a-zA-Z0-9-]+$/, {
      message: 'Must be a valid Shopify product URL',
    })
    .optional(),

  blog_tags: z.string().optional(),

  blog_template_suffix: z.string().optional(),

  blog_metafield: z.array(z.object({
    key: z.string(), 
    namespace: z.string(), 
    value: z.union([z.string(), z.number()]),
    value_type: z.enum(['string', 'integer']), 
    description: z.string().nullable(), 
  })).optional(),

  article_title: z
    .string()
    .min(30, { message: 'Article title must be at least 30 characters long' })
    .max(100, { message: 'Article title must not exceed 100 characters' })
    .nonempty({ message: 'Article title is required' }),

  article_author: z
    .string()
    .max(50, { message: 'Author name must not exceed 50 characters' })
    .nonempty({ message: 'Author name is required' }),

  article_body_html: z
    .string()
    .min(100, { message: 'Article body must be at least 500 characters long' })
    .nonempty({ message: 'Article body is required' }),

  article_handle: z
    .string()
    .url({ message: 'Must be a valid URL' })
    .regex(/^https:\/\/.*\.myshopify\.com\/blogs\/[a-zA-Z0-9-]+$/, {
      message: 'Must be a valid Shopify product URL',
    })
    .optional(),

  article_image: z
    .string()
    .optional(),

  article_metafield: z.array(z.object({
    key: z.string(), 
    namespace: z.string(), 
    value: z.union([z.string(), z.number()]),
    value_type: z.enum(['string', 'integer']), 
    description: z.string().nullable(), 
  })).optional(),

  article_published: z.boolean().optional(),

  article_published_at: z
    .string()
    .datetime({ message: 'Must be a valid date-time string' })
    .optional(),

  article_summary_html: z
    .string()
    .min(100, { message: 'Summary must not exceed 500 characters' })
    .optional(),

  article_tags: z.string().optional(),

  article_template_suffix: z.string().optional(),

  input_data: z.object({
    category: z.string(),
    description: z.string().min(1, { message: 'Description must be at least 100 characters' }),
    urls: z.array(z.string()).default([]),
    sections: z.array(z.string()).nullable(),
    tone: z.string().optional(),
    length: z.string().optional(),
    includedFields: z.array(z.any()).default([])
  }).optional(),

  user_id: z
    .string()
    .regex(/^[a-zA-Z0-9_-]+$/, { message: 'User ID must only contain letters, numbers, underscores, or hyphens' })
    .optional()
});

export const BaseConstraintSchema: ZodType<SEOProps> = z.object({

  title: z.string()
    .min(30, { message: 'Title must be at least 30 characters' })
    .optional(),

  tags: z.string()
    .min(10, { message: 'Tags must be at least 10 characters' })
    .optional(),

  body_html: z.string()
    .min(500, { message: 'Body content must be at least 500 characters' })
    .optional(),

  template_suffix: z.string()
    .min(30, { message: 'Template Prefix must be at least 30 characters' })
    .optional(),

 });

export const BlogConstraintSchema: ZodType<BLOG> = BaseConstraintSchema.extend({
  commentable: z.enum(['moderate', 'no', 'yes'])
    .optional(),

  feedburner: z.string().nullable().optional(),

  feedburner_location: z.string().nullable().optional(),

  handle: z.string()
    .min(3, { message: 'Handle must be at least 3 characters' })
    .optional(),

  metafield: z.array(
    z.object({
      key: z.string(),
      namespace: z.string(),
      value: z.union([z.string(), z.number()]),
      value_type: z.enum(['string', 'integer']),
      description: z.string().nullable().optional(),
    })
  ).optional(),

  tags: z.string()
    .min(3, { message: 'Tags must be at least 3 characters' })
    .optional(),

  template_suffix: z.string()
    .min(3, { message: 'Template suffix must be at least 3 characters' })
    .nullable()
    .optional(),

  title: z.string()
    .min(3, { message: 'Title must be at least 3 characters' })
    .optional(),

  article: z.object({
    author: z.string().min(3, { message: 'Author name must be at least 3 characters' }),
    body_html: z.string().min(10, { message: 'Article body must be at least 10 characters' }),
    handle: z.string().min(3, { message: 'Article handle must be at least 3 characters' }),
    image: z.string().url().optional(),
    metafield: z.array(
      z.object({
        key: z.string(),
        namespace: z.string(),
        value: z.union([z.string(), z.number()]),
        value_type: z.enum(['string', 'integer']),
        description: z.string().nullable().optional(),
      })
    ).optional(),
    summary_html: z.string().nullable().optional(),
    tags: z.string().min(3, { message: 'Article tags must be at least 3 characters' }).optional(),
    template_suffix: z.string().nullable().optional(),
    title: z.string().min(3, { message: 'Article title must be at least 3 characters' }),
  }).optional(),
});


export const LengthConstraintSchema: ZodType<SEOProps> = z.object({

  title: z.string()
    .min(10, { message: 'Title must be at least 10 characters' })
    .optional(),

  blog_title: z.string()
    .min(10, { message: 'Title must be at least 10 characters' })
    .optional(),

  article_title: z.string()
    .min(10, { message: 'Title must be at least 10 characters' })
    .optional(),

  article_author: z.string()
    .min(10, { message: 'Page title must be at least 10 characters' })
    .optional(),
  
  body_html: z.string()
    .min(200, { message: 'Body content must be at least 200 characters' })
    .nonempty('Body content is required'),

  article_body_html: z.string()
    .min(200, { message: 'Body content must be at least 200 characters' })
    .nonempty('Body content is required'),

  article_summary_html: z.string()
    .min(100, { message: 'Summary content must be at least 100 characters' })
    .nonempty('Summary content is required'),

  metaDescription: z.string()
    .min(100, { message: 'Meta description must be at least 100 characters' })
    .optional(),
  
  product_type: z.string()
    .min(10, { message: 'Category must be at least 10 characters' })
    .optional(),
  
  template_suffix: z.string()
    .min(10, { message: 'Template suffix must be at least 10 characters' })
    .optional(),
  
  blog_template_suffix: z.string()
    .min(10, { message: 'Template suffix must be at least 10 characters' })
    .optional(),
  
  article_template_suffix: z.string()
    .min(10, { message: 'Template suffix must be at least 10 characters' })
    .optional(),

  pageTitle: z.string()
    .min(10, { message: 'Page title must be at least 10 characters' })
    .optional(),
  
  handle: z.string()
   .url({ message: 'Must be a valid URL' })
   .regex(/^https:\/\/.*\.myshopify\.com\/products\/[a-zA-Z0-9-]+$/, {
     message: 'Must be a valid Shopify product URL'
   })
   .optional(),

  blog_handle: z.string()
   .url({ message: 'Must be a valid URL' })
   .regex(/^https:\/\/.*\.myshopify\.com\/blogs\/[a-zA-Z0-9-]+$/, {
     message: 'Must be a valid Shopify blog URL'
   })
   .optional(),

  article_handle: z.string()
   .url({ message: 'Must be a valid URL' })
   .regex(/^https:\/\/.*\.myshopify\.com\/blogs\/[a-zA-Z0-9-]+$/, {
     message: 'Must be a valid Shopify article URL'
   })
   .optional(),
  
  tags: z.string()
    .min(10, { message: 'Tags must be at least 10 characters' })
    .optional(),

  blog_tags: z.string()
    .min(10, { message: 'Tags must be at least 10 characters' })
    .optional(),

  article_tags: z.string()
    .min(10, { message: 'Tags must be at least 10 characters' })
    .optional(),

  blog_metafield: z.string()
    .min(100, { message: 'Metafield must be at least 100 characters' })
    .optional(),

  article_metafield: z.string()
    .min(100, { message: 'Metafield must be at least 100 characters' })
    .optional(),

  options: z.string()
    .min(100, { message: 'Product options must be at least 100 characters' })
    .optional(),

  variants: z.string()
    .min(100, { message: 'Product variants must be at least 100 characters' })
    .optional(),

});

export function getSchema(category: string, excludeFields: string[] = []) {
  const schema = {
    BLOG: BlogSchema,
    PRODUCT: ProductSchema,
    ARTICLE: ArticleSchema
  }[category];
  if (!schema || excludeFields.length === 0) return schema;
  const schemaObject = schema.shape;
  const filteredShape = Object.keys(schemaObject)
    .filter((key) => !excludeFields.includes(key))
    .reduce((acc, key) => ({ ...acc, [key]: schemaObject[key] }), {});
  return z.object(filteredShape);
}
