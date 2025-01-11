export interface BlogPostTemplate {
  title: string;
  seoTitle: string;
  metaDescription: string;
  url: string;
  bodyContent: string;
  schema: Record<string, any>;
};

export interface ArticleTemplate {
  title: string;
  seoTitle: string;
  metaDescription: string;
  url: string;
  bodyContent: string;
  schema: Record<string, any>;
}

export interface ProductTemplate {
  title: string;
  seoTitle: string;
  metaDescription: string;
  url: string;
  bodyContent: string;
  schema: Record<string, any>;
}

export type TEMPLATE = BlogPostTemplate | ArticleTemplate | ProductTemplate;