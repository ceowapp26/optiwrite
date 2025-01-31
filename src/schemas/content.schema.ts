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
    .min(10, { message: 'Title must be at least 10 characters' })
    .max(100, { message: 'Title must not exceed 100 characters' })
    .nonempty({ message: 'Title is required' }),

  body_html: z
    .string()
    .min(50, { message: 'Body content must be at least 50 characters' })
    .max(8000, { message: 'Body content must not exceed 8000 characters' }),

  meta_description: z
    .string()
    .min(10, { message: 'Meta description must be at least 10 characters' })
    .max(300, { message: 'Meta description must not exceed 300 characters' })
    .optional(),

  product_type: z
    .string()
    .min(3, { message: 'Category must be at least 3 characters' })
    .max(80, { message: 'Category must not exceed 80 characters' })
    .nonempty({ message: 'Category is required' }),

  page_title: z
    .string()
    .min(10, { message: 'Page title must be at least 10 characters' })
    .max(200, { message: 'Page title must not exceed 200 characters' })
    .optional(),

  handle: z
    .string()
    .min(10, { message: 'URL handle must be at least 10 characters' })
    .max(300, { message: 'URL handle must not exceed 300 characters' })
    .optional(),

  template_suffix: z.string()
  .nullable()
  .optional(),

  vendor: z.string()
  .optional(),
  
  status: 
    z.enum(['ACTIVE', 'ARCHIVED', 'DRAFT'])
    .default('ACTIVE')
    .optional(),

  tags: z.string().optional(),

  variants: z.array(z.object({
    title: z.string().min(1, { message: 'Variant title is required' }),
    price: z.number().min(0, { message: 'Price must be a positive number' }),
    sku: z.string(),
    weight: z.number().min(0, { message: 'Weight must be a positive number' }),
    weight_unit: z.enum(['GRAMS', 'KILOGRAMS', 'OUNCES', 'POUNDS'])
  })).optional(),

  options: z.array(z.object({
    name: z.string().min(1, { message: 'Option name is required' }),
    values: z.array(z.string())
  })).optional(),

  image: z.string().optional(),

  images: z
    .array(z.string().url({ message: 'Must be valid URLs' }))
    .optional()
    .default([]),

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
    .min(10, { message: 'Title must be at least 10 characters long' })
    .max(200, { message: 'Title must not exceed 200 characters' })
    .nonempty({ message: 'Title is required' }),

  blog_commentable: z.enum(['MODERATED', 'CLOSED', 'AUTO_PUBLISHED']).optional(),

  blog_feedburner: z
    .string()
    .optional(),

  blog_feedburner_location: z.string().optional(),

  blog_handle: z
    .string()
    .min(10, { message: 'URL handle must be at least 10 characters' })
    .max(300, { message: 'URL handle must not exceed 300 characters' })
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

  blog_meta_description: z
    .string()
    .min(10, { message: 'Meta description must be at least 10 characters' })
    .max(300, { message: 'Meta description must not exceed 300 characters' })
    .optional(),

  blog_page_title: z
    .string()
    .min(10, { message: 'Page title must be at least 10 characters' })
    .max(200, { message: 'Page title must not exceed 200 characters' })
    .optional(),

  article_title: z
    .string()
    .min(10, { message: 'Article title must be at least 10 characters long' })
    .max(200, { message: 'Article title must not exceed 200 characters' })
    .optional(),

  article_author: z
    .string()
    .max(200, { message: 'Author name must not exceed 200 characters' })
    .optional(),

  article_body_html: z
    .string()
    .min(50, { message: 'Body content must be at least 50 characters' })
    .max(8000, { message: 'Body content must not exceed 8000 characters' }),

  article_handle: z
    .string()
    .min(10, { message: 'URL handle must be at least 10 characters' })
    .max(300, { message: 'URL handle must not exceed 300 characters' })
    .optional(),

  article_image: z
    .string()
    .optional(),

  article_published: z.boolean().optional(),

  article_published_at: z
    .string()
    .optional(),

  article_summary_html: z
    .string()
    .min(100, { message: 'Summary must not exceed 500 characters' })
    .optional(),

  article_tags: z.string().optional(),

  article_meta_description: z
    .string()
    .min(10, { message: 'Meta description must be at least 10 characters' })
    .max(300, { message: 'Meta description must not exceed 300 characters' })
    .optional(),

  article_page_title: z
    .string()
    .min(10, { message: 'Page title must be at least 10 characters' })
    .max(200, { message: 'Page title must not exceed 200 characters' })
    .optional(),

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
    .min(10, { message: 'Title must be at least 10 characters long' })
    .max(200, { message: 'Title must not exceed 200 characters' })
    .optional(),

  blog_feedburner: z
    .string()
    .optional(),

  blog_feedburner_location: z.string().optional(),

  blog_handle: z
    .string()
    .min(10, { message: 'URL handle must be at least 10 characters' })
    .max(300, { message: 'URL handle must not exceed 300 characters' })
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

  blog_meta_description: z
    .string()
    .min(10, { message: 'Meta description must be at least 10 characters' })
    .max(300, { message: 'Meta description must not exceed 300 characters' })
    .optional(),

  blog_page_title: z
    .string()
    .min(10, { message: 'Page title must be at least 10 characters' })
    .max(200, { message: 'Page title must not exceed 200 characters' })
    .optional(),

  article_title: z
    .string()
    .min(10, { message: 'Article title must be at least 10 characters long' })
    .max(100, { message: 'Article title must not exceed 100 characters' })
    .optional(),

  article_author: z
    .string()
    .max(200, { message: 'Author name must not exceed 200 characters' })
    .optional(),

  article_body_html: z
    .string()
    .min(50, { message: 'Body content must be at least 50 characters' })
    .max(8000, { message: 'Body content must not exceed 8000 characters' }),

  article_handle: z
    .string()
    .min(10, { message: 'URL handle must be at least 10 characters' })
    .max(300, { message: 'URL handle must not exceed 300 characters' })
    .optional(),

  article_image: z
    .string()
    .optional(),

  article_published: z.boolean().optional(),

  article_published_at: z
    .string()
    .optional(),

  article_summary_html: z
    .string()
    .min(100, { message: 'Summary must not exceed 500 characters' })
    .optional(),

  article_tags: z.string().optional(),

  article_meta_description: z
    .string()
    .min(10, { message: 'Meta description must be at least 10 characters' })
    .max(300, { message: 'Meta description must not exceed 300 characters' })
    .optional(),

  article_page_title: z
    .string()
    .min(10, { message: 'Page title must be at least 10 characters' })
    .max(200, { message: 'Page title must not exceed 200 characters' })
    .optional(),

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
    .min(10, { message: 'Title must be at least 10 characters' })
    .optional(),

  tags: z.string()
    .min(10, { message: 'Tags must be at least 10 characters' })
    .optional(),

  body_html: z.string()
    .min(500, { message: 'Body content must be at least 500 characters' })
    .optional(),

  template_suffix: z.string()
    .min(10, { message: 'Template Prefix must be at least 10 characters' })
    .optional(),

 });

export const BlogConstraintSchema: ZodType<BLOG> = BaseConstraintSchema.extend({
  commentable: z.enum(['MODERATED', 'CLOSED', 'AUTO_PUBLISHED'])
    .optional(),

  feedburner: z.string().nullable().optional(),

  feedburner_location: z.string().nullable().optional(),

  handle: z
    .string()
    .min(3, { message: 'Handle must be at least 3 characters' })
    .optional(),

  tags: z.string()
    .min(3, { message: 'Tags must be at least 3 characters' })
    .optional(),

  template_suffix: z.string()
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

  meta_escription: z.string()
    .min(10, { message: 'Meta description must be at least 10 characters' })
    .optional(),
  
  page_title: z.string()
    .min(10, { message: 'Page title must be at least 10 characters' })
    .optional(),

  product_type: z.string()
    .min(10, { message: 'Category must be at least 10 characters' })
    .optional(),
  
  template_suffix: z.string()
    .min(5, { message: 'Template suffix must be at least 5 characters' })
    .nullable()
    .optional(),
  
  blog_template_suffix: z.string()
    .min(5, { message: 'Template suffix must be at least 5 characters' })
    .nullable()
    .optional(),
  
  article_template_suffix: z.string()
    .nullable()
    .optional(),
  
  handle: z
    .string()
    .min(10, { message: 'URL handle must be at least 10 characters' })
    .max(300, { message: 'URL handle must not exceed 300 characters' })
    .optional(),

  blog_handle: z
    .string()
    .min(10, { message: 'URL handle must be at least 10 characters' })
    .max(300, { message: 'URL handle must not exceed 300 characters' })
    .optional(),

  article_handle: z
    .string()
    .min(10, { message: 'URL handle must be at least 10 characters' })
    .max(300, { message: 'URL handle must not exceed 300 characters' })
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

  options: z.string()
    .min(100, { message: 'Product options must be at least 100 characters' })
    .optional(),

  variants: z.string()
    .min(100, { message: 'Product variants must be at least 100 characters' })
    .optional(),

  blog_meta_escription: z.string()
    .min(10, { message: 'Meta description must be at least 10 characters' })
    .optional(),
  
  blog_page_title: z.string()
    .min(10, { message: 'Page title must be at least 10 characters' })
    .optional(),

  article_meta_escription: z.string()
    .min(10, { message: 'Meta description must be at least 10 characters' })
    .optional(),
  
  article_page_title: z.string()
    .min(10, { message: 'Page title must be at least 10 characters' })
    .optional(),

});

export const UpdateProductSchema: ZodType<ProductProps & ShopifyIdentifiers> = ProductSchema.extend({
  product_id: z
  .number()
  .min(1000000000000, { message: 'Id must be 13 digits' })
  .max(99999999999999, { message: 'Id must be 13 digits' }),
});

export const UpdateBlogSchema: ZodType = BlogSchema.extend({
  blog_id: z
  .number()
  .min(100000000000, { message: 'Id must be 12 digits' })
  .max(999999999999, { message: 'Id must be 12 digits' }),
});

export const UpdateArticleSchema: ZodType = ArticleSchema.extend({
  article_id: z
  .number()
  .min(100000000000, { message: 'Id must be 12 digits' })
  .max(999999999999, { message: 'Id must be 12 digits' }),
  blog_id: z
  .number()
  .min(100000000000, { message: 'Id must be 12 digits' })
  .max(999999999999, { message: 'Id must be 12 digits' }),
});

export type EventType = 'CREATE' | 'UPDATE' | 'PUBLISH';

export function getSchema(
  category: 'BLOG' | 'PRODUCT' | 'ARTICLE',
  eventType: EventType = 'CREATE',
  excludeFields: string[] = []
) {
  let schema;
  switch (category) {
    case 'BLOG':
      schema = eventType === 'UPDATE' ? UpdateBlogSchema : BlogSchema;
      excludeFields.push('article_body_html');
      break;
    case 'PRODUCT':
      schema = eventType === 'UPDATE' ? UpdateProductSchema : ProductSchema;
      break;
    case 'ARTICLE':
      schema = eventType === 'UPDATE' ? UpdateArticleSchema : ArticleSchema;
      break;
    default:
      throw new Error(`Invalid category: ${category}`);
  }
  if (excludeFields.length === 0) return schema;
  const schemaObject = schema.shape;
  const filteredShape = Object.keys(schemaObject)
    .filter((key) => !excludeFields.includes(key))
    .reduce((acc, key) => ({ ...acc, [key]: schemaObject[key] }), {});
  return z.object(filteredShape);
}