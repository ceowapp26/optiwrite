import { User } from 'lucide-react';
import { PLAN, PLANDATA, App } from "@/types/app";

type Role = 'user' | 'admin' | 'superadmin';

type Plan = 'FREE'| 'STANDARD' | 'PRO' | 'ULTIMATE'; 

export interface AppProps {
  id: string;
  inputType: 'input' | 'textarea' | 'select'; 
  placeholder: string;
  name: keyof App; 
  type?: string; 
  icon?: React.ElementType;
}

export const FEATURE_FORM: AppProps[] = [
  {
    id: '1',
    inputType: 'input',
    placeholder: 'Name',
    name: 'name',
    type: 'text',
    icon: User,
  },
  {
    id: '2',
    inputType: 'input',
    placeholder: 'App Id',
    name: 'appId',
    type: 'text',
    icon: User,
  },
  {
    id: '3',
    inputType: 'input',
    placeholder: 'Version',
    name: 'version',
    type: 'text',
    icon: User, 
  },
  {
    id: '4',
    inputType: 'date',
    placeholder: 'Deployed Date',
    name: 'deployedDate',
    type: 'date',
    icon: User, 
  },
  {
    id: '5',
    inputType: 'date',
    placeholder: 'Released Date',
    name: 'releasedDate',
    type: 'date',
    icon: User, 
  },
  {
    id: '6',
    inputType: 'textarea',
    placeholder: 'Description',
    name: 'description',
    icon: User, 
  },
  {
    id: '7',
    inputType: 'input',
    placeholder: 'Developer',
    name: 'developer',
    type: 'text',
    icon: User, 
  },
  {
    id: '8',
    inputType: 'select',
    placeholder: 'Select Plan',
    name: 'plan',
    type: 'text',
    label: 'Plan',
    options: [
      { value: 'FREE', label: 'FREE', id: 'free' },
      { value: 'STANDARD', label: 'STANDARD', id: 'standard' },
      { value: 'PRO', label: 'PRO', id: 'pro' },
      { value: 'ULTIMATE', label: 'ULTIMATE', id: 'ultimate' },
    ],
  },
];

export const APP_FORM: AppProps[] = [
  {
    id: '1',
    inputType: 'input',
    placeholder: 'Name',
    name: 'name',
    type: 'text',
    icon: User,
  },
  {
    id: '2',
    inputType: 'input',
    placeholder: 'Version',
    name: 'version',
    type: 'text',
    icon: User, 
  },
  {
    id: '3',
    inputType: 'select',
    placeholder: 'Category',
    label: 'Category',
    name: 'category',
    type: 'text',
    options: [
      { value: 'business', label: 'Business', id: 'business' },
      { value: 'personal', label: 'Personal', id: 'personal' },
    ],
  },
  {
    id: '4',
    inputType: 'date',
    placeholder: 'Deployed Date',
    name: 'deployedDate',
    type: 'date',
    icon: User, 
  },
  {
    id: '5',
    inputType: 'date',
    placeholder: 'Released Date',
    name: 'releasedDate',
    type: 'date',
    icon: User, 
  },
  {
    id: '6',
    inputType: 'textarea',
    placeholder: 'Description',
    name: 'description',
    icon: User, 
  },
  {
    id: '7',
    inputType: 'input',
    placeholder: 'Platform',
    name: 'platform',
    type: 'text',
    icon: User, 
  },
  {
    id: '8',
    inputType: 'input',
    placeholder: 'Domain',
    name: 'domain',
    type: 'text',
    icon: User, 
  },
  {
    id: '9',
    inputType: 'input',
    placeholder: 'Developer',
    name: 'developer',
    type: 'text',
    icon: User, 
  },
  {
    id: '10',
    inputType: 'input',
    placeholder: 'License',
    name: 'license',
    type: 'text',
    icon: User, 
  },
  {
    id: '11',
    inputType: 'input',
    placeholder: 'Watermark',
    name: 'watermark',
    type: 'text',
    icon: User, 
  },
  {
    id: '12',
    inputType: 'input',
    placeholder: 'Logo',
    name: 'logo',
    type: 'text',
    icon: User, 
  },
  {
    id: '13',
    inputType: 'select',
    placeholder: 'Select Plan',
    name: 'plan',
    type: 'text',
    label: 'Plan',
    options: [
      { value: 'FREE', label: 'FREE', id: 'free' },
      { value: 'STANDARD', label: 'STANDARD', id: 'standard' },
      { value: 'PRO', label: 'PRO', id: 'pro' },
      { value: 'ULTIMATE', label: 'ULTIMATE', id: 'ultimate' },
    ],
  },
];

export const DocumentTourSteps = [
  {
    target: '.wapp-sidebar', 
    content: 'This is wapp-sidebar',
  },
  {
    target: '.wapp-editor', 
    content: 'This is wapp-editor',
  },
];

export const APP_STATUS: { [key: string]: STATUS_PROPS } = {
  beta: { text: "BETA", color: "rgb(79 70 229)" }, 
  developing: { text: "DEVELOPING", color: "cyan-20" },
  experiment: { text: "EXPERIMENT", color: "rgb(13 148 136)" },
  testing: { text: "TESTING", color: "cyan-20" },
  pro: { text: "PRO", color: "rgb(34 211 238)" },
  premium: { text: "PREMIUM", color: "cyan-20" },
  deprecated: { text: "DEPRECATED", color: "cyan-20" }, 
};

export const PLANS: PLANDATA[] = [
  {
    id: 'FREE',
    title: "FREE",
    description: "Free features suitable for most users",
    monthlyPrice: 0,
    yearlyPrice: 0,
    apps: [],
    features: [],
    models: [],
    actionLabel: "Get Started",
  },
  {
    id: 'STANDARD',
    title: "STANDARD",
    description: "Standard features suitable for most users",
    monthlyPrice: 5.99,
    yearlyPrice: 59.9,
    apps: [],
    features: [],
    models: [],
    actionLabel: "Get Started",
  },
  {
    id: 'PRO',
    title: "PRO",
    description: "Advanced features for professional users",
    monthlyPrice: 10.99,
    yearlyPrice: 109.9,
    apps: [],
    features: [],
    models: [],
    actionLabel: "Get Started",
  },
  {
    id: 'ULTIMATE',
    title: "ULTIMATE",
    description: "Ultimate features with high-performance models",
    monthlyPrice: 15.99,
    yearlyPrice: 159.9,
    apps: [],
    features: [],
    models: [],
    actionLabel: "Get Started",
  }
];

export const ScrollingItems = [
  { id: "app", title: "App", description: "Find the app that suits you best.", imageUrl: "/global/images/intro/ai.jpg" },
  { id: "support", title: "Support", description: "Need support from us.", imageUrl: "/global/images/intro/ai.jpg" },
  { id: "community", title: "Community", description: "Seek community.", imageUrl: "/global/images/intro/ai.jpg" },
  { id: "market", title: "Product", description: "Find your product.", imageUrl: "/global/images/intro/ai.jpg" }
];