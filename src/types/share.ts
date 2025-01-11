export interface FormData {
  description: string; 
  urls: string[];
  subtitles: SubtitleData | null; 
  tone: string; 
  length: string; 
  template: string | null; 
  formType: FormType; 
}

export interface SubtitleData {
  quality: string; 
  prompts: string[]; 
}

export enum ActionType {
  BLOG = 'blog',
  PRODUCT = 'product',
  ARTICLE = 'article'
}

export type COMMAND = "BLOG" | "PRODUCT" | "ARTICLE";
