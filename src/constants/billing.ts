import {
  CreditCardIcon,
  PackageIcon
} from '@shopify/polaris-icons';
import { SubscriptionPlan } from '@prisma/client';
import { type PaymentType, CurrencyCode, CreditPaymentInfo } from '@/types/billing';

export enum Package {
  SMALL = 'SMALL',
  MEDIUM = 'MEDIUM',
  LARGE = 'LARGE',
  ENTERPRISE = 'ENTERPRISE',
  CUSTOM = 'CUSTOM',
}

export const CREDIT_PURCHASE_FORM: PRODUCT = [
  {
    id: '1',
    inputType: 'input',
    placeholder: 'Package Name',
    name: 'package',
    label: 'Package',
    maxLength: 60,
    defaultValue: Package.CUSTOM,
    type: 'text',
    icon: PackageIcon,
    editable: false,
  },
  {
    id: '2',
    inputType: 'input',
    placeholder: 'Number of Credits',
    name: 'credits',
    label: 'Credits',
    maxLength: 60,
    defaultValue: 100,
    type: 'number',
    icon: CreditCardIcon,
    prefix: '#',
  },
  {
    id: '3',
    inputType: 'input',
    placeholder: 'Currency Code',
    name: 'currency',
    label: 'Currency Code',
    maxLength: 60,
    defaultValue: 'USD',
    type: 'text',
    icon: CreditCardIcon,
    prefix: '$',
  },
];

export const defaultCreditPaymentInfo: CreditPaymentInfo = { 
  name: Package.CUSTOM,
  credits: 0,
  price: {
    amount: 0,
    currencyCode: CurrencyCode.USD,
  },
};

export const pricePerUnit = 0.1;
  
export const subscriptionPlans = [
  {
    id: 'free',
    name: SubscriptionPlan.FREE,
    displayName: 'Free Starter',
    description: 'Perfect for individuals exploring the platform with basic requirements.',
    shortDescription: 'Start your journey with essential features',
    features: {
     coreFeatures: [
        {
          title: 'Effortless Google Docs Integration',
          description: 'Effortlessly transfer content from your Google Docs files and transform it into high-quality Shopify product descriptions with ease.'
        },
        {
          title: 'Extract Content from Any URL',
          description: 'Extract and rewrite content from Google Docs links or any website URL into compelling Shopify product listings in moments.'
        },
        {
          title: 'AI-Driven Product Content Creation',
          description: 'Leverage cutting-edge AI to craft captivating, SEO-optimized product descriptions in seconds.'
        },
        {
          title: 'Streamlined Shopify Product Management',
          description: 'Publish, edit, and manage your Shopify products effortlessly through a user-friendly interface.'
        },
        {
          title: 'SEO-Enhanced Content Optimization',
          description: 'Generate traffic-boosting content optimized for search engines to maximize your store’s visibility and reach.'
        }
      ],
      supportOptions: [
        '24/7 Email Assistance',
        'Interactive App Walkthrough',
        'Comprehensive Video Tutorials'
      ],
      apiAccess: {
        enabled: false,
        rateLimit: null
      },
      integrations: ['Basic Gmail', 'Calendar'],
    },
    planLimits: {},
    discounts: [],
    promotions: [],
    metadata: {
      isPopular: false,
      recommendedFor: ['Individuals', 'Freelancers', 'Students'],
      avgUserRating: 4.2,
      totalUsers: 10000,
      categoryTags: ['Basic', 'Starter', 'Individual'],
      marketingTags: ['Free Forever', 'No Credit Card Required']
    },
    price: {
      monthly: 0,
      yearly: 0,
      currency: 'USD',
      billingOptions: ['Free'],
      taxHandling: 'exclusive'
    },
    security: {
      encryption: 'Standard',
      dataCenter: 'Regional',
      backups: 'Weekly',
      sso: false,
    },
    support: {
      responseTime: '48 hours',
      channels: ['Community Forum'],
      languages: ['English'],
      availability: 'Business hours'
    },
    onboarding: {
      type: 'self-service',
      resources: ['Documentation', 'Video guides'],
      trainingIncluded: false
    }
  },
  {
    id: 'standard',
    name: SubscriptionPlan.STANDARD,
    displayName: 'Standard Business',
    description: 'Designed for small teams looking to collaborate and grow efficiently.',
    shortDescription: 'Perfect for growing teams',
    features: {
      coreFeatures: [
       {
          title: 'Everything in Free Plan',
          description: 'Access all the essential tools from the Free Plan, including seamless Google Docs integration and Shopify-ready product descriptions.'
        },
        {
          title: 'Extended Usage Limits',
          description: 'Enjoy increased capacity for content extraction and transformation from Google Docs links or any website, enabling faster Shopify product creation.'
        },
        {
          title: 'Priority Feature Updates',
          description: 'Be the first to access new and improved features, staying ahead with cutting-edge AI-powered tools for your Shopify store.'
        },
        {
          title: '24/7 Premium Support',
          description: 'Get round-the-clock assistance from our dedicated support team to ensure seamless product management and content creation.'
        }
      ],
      supportOptions: [
        'Email support during business hours',
        'Priority community support',
        'Screen sharing assistance',
        'Monthly webinars'
      ],
      apiAccess: {
        enabled: true,
        rateLimit: '10000/day',
        endpoints: ['REST', 'GraphQL']
      },
      integrations: [
        'Full Google Workspace',
        'Slack',
        'Microsoft 365',
        'Zoom',
        'Basic CRM integrations'
      ],
      analytics: ['Basic usage metrics', 'Team performance reports']
    },
    planLimits: {},
    discounts: [],
    promotions: [],
    metadata: {
      isPopular: true,
      recommendedFor: ['Small teams', 'Startups', 'Growing agencies'],
      avgUserRating: 4.5,
      totalUsers: 5000,
      categoryTags: ['Team', 'Collaboration', 'Professional'],
      marketingTags: ['Best Value', 'Most Popular'],
      industryFit: ['Technology', 'Marketing', 'Professional Services']
    },
    price: {
      monthly: 29.99,
      yearly: 299.99,
      currency: 'USD',
      billingOptions: ['Monthly', 'Quarterly', 'Yearly'],
      taxHandling: 'exclusive',
      gracePeriod: 7,
      cancelationTerms: '30 days notice',
      paymentMethods: ['Credit Card', 'PayPal', 'Bank Transfer'],
      pricePerAdditionalUser: 9.99
    },
    security: {
      encryption: 'Advanced',
      dataCenter: 'Multi-region',
      backups: 'Daily',
      sso: true,
      auditLogs: '30 days',
      complianceCertifications: ['SOC2', 'GDPR']
    },
    support: {
      responseTime: '8 hours',
      channels: ['Email', 'Chat', 'Phone'],
      languages: ['English', 'Spanish', 'French'],
      availability: '12/5',
      dedicatedAgent: false
    },
    onboarding: {
      type: 'guided',
      resources: ['Personal walkthrough', 'Custom training sessions'],
      trainingIncluded: true,
      trainingHours: 2
    }
  },
  {
    id: 'pro',
    name: SubscriptionPlan.PRO,
    displayName: 'Pro Growth',
    description: 'Advanced tools and resources for expanding businesses and scaling operations.',
    shortDescription: 'Ideal for businesses looking to scale',
    features: {
      coreFeatures: [
        {
          title: 'Everything in Standard Plan',
          description: 'Unlock all the core features from the Standard Plan, including seamless Google Docs integration and optimized Shopify product descriptions.'
        },
        {
          title: 'Extended Usage Limits',
          description: 'Enjoy expanded capacity for content extraction and transformation from Google Docs or any website, accelerating your Shopify product creation process.'
        },
        {
          title: 'Priority Advanced Feature Updates',
          description: 'Get early access to cutting-edge features and enhancements, keeping you ahead of the competition with AI-powered tools for your Shopify store.'
        },
        {
          title: 'Advanced Editor Accessibility',
          description: 'Gain access to an advanced editor with enhanced, AI-driven editing tools for a more powerful and streamlined content creation experience.'
        }
      ],
      supportOptions: [
        'Priority email support',
        'Dedicated support channel',
        'Quarterly performance reviews'
      ],
      apiAccess: {
        enabled: true,
        rateLimit: '50000/day',
        endpoints: ['REST', 'GraphQL', 'Webhooks']
      },
      integrations: [
        'All Standard integrations',
        'Advanced CRM tools',
        'Accounting software integrations',
        'Social media management tools'
      ],
      analytics: ['Team performance metrics', 'Customer insights', 'Custom reports']
    },
    planLimits: {},
    discounts: [],
    promotions: [],
    metadata: {
      isPopular: false,
      recommendedFor: ['Growing businesses', 'Mid-sized teams', 'Agencies'],
      avgUserRating: 4.7,
      totalUsers: 3000,
      categoryTags: ['Growth', 'Scaling', 'Business'],
      marketingTags: ['Advanced Features', 'For Professionals'],
      industryFit: ['Technology', 'Finance', 'Healthcare']
    },
    price: {
      monthly: 99.99,
      yearly: 999.99,
      currency: 'USD',
      billingOptions: ['Monthly', 'Yearly'],
      taxHandling: 'exclusive',
      gracePeriod: 14,
      cancelationTerms: '30 days notice',
      paymentMethods: ['Credit Card', 'PayPal', 'Wire Transfer'],
      pricePerAdditionalUser: 14.99
    },
    security: {
      encryption: 'Advanced',
      dataCenter: 'Global',
      backups: 'Hourly',
      sso: true,
      auditLogs: '1 year',
      complianceCertifications: ['SOC2', 'GDPR', 'ISO 27001']
    },
    support: {
      responseTime: '4 hours',
      channels: ['Email', 'Chat', 'Phone'],
      languages: ['English', 'Spanish', 'German', 'French'],
      availability: '24/7',
      dedicatedAgent: true
    },
    onboarding: {
      type: 'personalized',
      resources: ['Custom onboarding sessions', 'Training videos', 'Webinars'],
      trainingIncluded: true,
      trainingHours: 5
    }
  },
  {
    id: 'ultimate',
    name: SubscriptionPlan.ULTIMATE,
    displayName: 'Ultimate Enterprise',
    description: 'All-inclusive enterprise solutions for large-scale organizations.',
    shortDescription: 'The ultimate choice for enterprises',
    features: {
    coreFeatures: [
      {
        title: 'Everything in Pro Plan',
        description: 'Enjoy all premium features from the Pro Plan, including seamless Google Docs integration and expertly optimized Shopify product descriptions to boost your store’s performance.'
      },
      {
        title: 'Extended Usage Limits',
        description: 'Enhance productivity with expanded capacity for content extraction and transformation from Google Docs or any website, streamlining Shopify product creation like never before.'
      },
      {
        title: 'Exclusive Access to Advanced Feature Updates',
        description: 'Be the first to explore and utilize innovative features and updates, staying ahead with cutting-edge AI tools designed to elevate your Shopify store.'
      },
      {
        title: 'Comprehensive Access to Advanced Features',
        description: 'Unlock full access to all advanced features, including AI-driven tools, enhanced editing capabilities, and other powerful functionalities that take your content creation and store management to the next level.'
      }

      ],
      advancedFeatures: [
        'Custom branding',
        'Access to beta features and early updates',
        'Dedicated IP for API usage',
        'Enterprise-grade SLA'
      ],
      supportOptions: [
        'Dedicated account manager',
        '24/7 enterprise-grade support',
        'Annual strategic reviews',
        'Custom escalation paths'
      ],
      apiAccess: {
        enabled: true,
        rateLimit: 'Unlimited',
        endpoints: ['REST', 'GraphQL', 'Webhooks', 'Custom APIs']
      },
      integrations: [
        'All Pro integrations',
        'Custom ERP solutions',
        'Enterprise CRM tools',
        'Advanced analytics platforms'
      ],
      analytics: [
        'Enterprise performance metrics',
        'Custom business intelligence dashboards',
        'Predictive analytics'
      ]
    },
    planLimits: {},
    discounts: [],
    promotions: [],
    metadata: {
      isPopular: false,
      recommendedFor: ['Enterprises', 'Global organizations'],
      avgUserRating: 4.9,
      totalUsers: 1000,
      categoryTags: ['Enterprise', 'Unlimited', 'Global'],
      marketingTags: ['All Features', 'Enterprise-grade'],
      industryFit: ['Finance', 'Healthcare', 'Technology', 'Retail']
    },
    price: {
      monthly: 499.99,
      yearly: 4999.99,
      currency: 'USD',
      billingOptions: ['Monthly', 'Yearly'],
      taxHandling: 'inclusive',
      gracePeriod: 30,
      cancelationTerms: '90 days notice',
      paymentMethods: ['Credit Card', 'PayPal', 'Wire Transfer', 'Invoice'],
      pricePerAdditionalUser: 19.99
    },
    security: {
      encryption: 'Enterprise-grade',
      dataCenter: 'Customizable',
      backups: 'Real-time',
      sso: true,
      auditLogs: '5 years',
      complianceCertifications: ['SOC2', 'GDPR', 'HIPAA', 'ISO 27001']
    },
    support: {
      responseTime: '1 hour',
      channels: ['Email', 'Chat', 'Phone', 'On-site'],
      languages: ['English', 'Spanish', 'German', 'French', 'Japanese'],
      availability: '24/7',
      dedicatedAgent: true
    },
    onboarding: {
      type: 'full-service',
      resources: ['Dedicated onboarding team', 'Custom training plans'],
      trainingIncluded: true,
      trainingHours: 20
    }
  }
];

export const creditPackages = [
  {
    id: 'small',
    name: Package.SMALL,
    displayName: Package.SMALL,
    description: 'Perfect for individuals exploring the platform with basic requirements.',
    shortDescription: 'Start your journey with essential features',
    planLimits: {},
    discounts: [],
    promotions: [],
    metadata: {
      isPopular: false,
      recommendedFor: ['Individuals', 'Freelancers', 'Students'],
      avgUserRating: 4.2,
      totalUsers: 10000,
      categoryTags: ['Basic', 'Starter', 'Individual'],
      marketingTags: ['Free Forever', 'No Credit Card Required']
    },
    price: {
      totalPrice: 99.99,
      pricePerCredit: 999.99,
      currency: 'USD',
      billingOptions: ['Free'],
      taxHandling: 'exclusive'
    },
    security: {
      encryption: 'Standard',
      dataCenter: 'Regional',
      backups: 'Weekly',
      sso: false,
    },
    support: {
      responseTime: '48 hours',
      channels: ['Community Forum'],
      languages: ['English'],
      availability: 'Business hours'
    },
  },
  {
    id: 'medium',
    name: Package.MEDIUM,
    displayName: Package.MEDIUM,
    description: 'Designed for small teams looking to collaborate and grow efficiently.',
    shortDescription: 'Perfect for growing teams',
    planLimits: {},
    discounts: [],
    promotions: [],
    metadata: {
      isPopular: true,
      recommendedFor: ['Small teams', 'Startups', 'Growing agencies'],
      avgUserRating: 4.5,
      totalUsers: 5000,
      categoryTags: ['Team', 'Collaboration', 'Professional'],
      marketingTags: ['Best Value', 'Most Popular'],
      industryFit: ['Technology', 'Marketing', 'Professional Services']
    },
    price: {
      totalPrice: 99.99,
      pricePerCredit: 999.99,
      currency: 'USD',
      billingOptions: ['Monthly', 'Quarterly', 'Yearly'],
      taxHandling: 'exclusive',
      gracePeriod: 7,
      cancelationTerms: '30 days notice',
      paymentMethods: ['Credit Card', 'PayPal', 'Bank Transfer'],
      pricePerAdditionalUser: 9.99
    },
    security: {
      encryption: 'Advanced',
      dataCenter: 'Multi-region',
      backups: 'Daily',
      sso: true,
      auditLogs: '30 days',
      complianceCertifications: ['SOC2', 'GDPR']
    },
    support: {
      responseTime: '8 hours',
      channels: ['Email', 'Chat', 'Phone'],
      languages: ['English', 'Spanish', 'French'],
      availability: '12/5',
      dedicatedAgent: false
    },
  },
  {
    id: 'large',
    name: Package.LARGE,
    displayName:Package.LARGE,
    description: 'Advanced tools and resources for expanding businesses and scaling operations.',
    shortDescription: 'Ideal for businesses looking to scale',
    planLimits: {},
    discounts: [],
    promotions: [],
    metadata: {
      isPopular: false,
      recommendedFor: ['Growing businesses', 'Mid-sized teams', 'Agencies'],
      avgUserRating: 4.7,
      totalUsers: 3000,
      categoryTags: ['Growth', 'Scaling', 'Business'],
      marketingTags: ['Advanced Features', 'For Professionals'],
      industryFit: ['Technology', 'Finance', 'Healthcare']
    },
    price: {
      totalPrice: 99.99,
      pricePerCredit: 999.99,
      currency: 'USD',
      taxHandling: 'exclusive',
      gracePeriod: 14,
      cancelationTerms: '30 days notice',
      paymentMethods: ['Credit Card', 'PayPal', 'Wire Transfer'],
      pricePerAdditionalUser: 14.99
    },
    security: {
      encryption: 'Advanced',
      dataCenter: 'Global',
      backups: 'Hourly',
      sso: true,
      auditLogs: '1 year',
      complianceCertifications: ['SOC2', 'GDPR', 'ISO 27001']
    },
    support: {
      responseTime: '4 hours',
      channels: ['Email', 'Chat', 'Phone'],
      languages: ['English', 'Spanish', 'German', 'French'],
      availability: '24/7',
      dedicatedAgent: true
    },
  },
  {
    id: 'enterprise',
    name: Package.ENTERPRISE,
    displayName: Package.ENTERPRISE,
    description: 'All-inclusive enterprise solutions for large-scale organizations.',
    shortDescription: 'The ultimate choice for enterprises',  
    planLimits: {},
    discounts: [],
    promotions: [],
    metadata: {
      isPopular: false,
      recommendedFor: ['Enterprises', 'Global organizations'],
      avgUserRating: 4.9,
      totalUsers: 1000,
      categoryTags: ['Enterprise', 'Unlimited', 'Global'],
      marketingTags: ['All Features', 'Enterprise-grade'],
      industryFit: ['Finance', 'Healthcare', 'Technology', 'Retail']
    },
    price: {
      totalPrice: 99.99,
      pricePerCredit: 999.99,
      currency: 'USD',
      billingOptions: ['Monthly', 'Yearly'],
      taxHandling: 'inclusive',
      gracePeriod: 30,
      cancelationTerms: '90 days notice',
      paymentMethods: ['Credit Card', 'PayPal', 'Wire Transfer', 'Invoice'],
      pricePerAdditionalUser: 19.99
    },
    security: {
      encryption: 'Enterprise-grade',
      dataCenter: 'Customizable',
      backups: 'Real-time',
      sso: true,
      auditLogs: '5 years',
      complianceCertifications: ['SOC2', 'GDPR', 'HIPAA', 'ISO 27001']
    },
    support: {
      responseTime: '1 hour',
      channels: ['Email', 'Chat', 'Phone', 'On-site'],
      languages: ['English', 'Spanish', 'German', 'French', 'Japanese'],
      availability: '24/7',
      dedicatedAgent: true
    },
  }
];

export const cancelReasons = [
  { label: 'Too expensive', value: 'TOO_EXPENSIVE' },
  { label: 'Missing features', value: 'MISSING_FEATURES' },
  { label: 'Poor user experience', value: 'POOR_UX' },
  { label: 'Found alternative solution', value: 'FOUND_ALTERNATIVE' },
  { label: 'No longer needed', value: 'NO_LONGER_NEEDED' },
  { label: 'Other', value: 'OTHER' }
];

export const cancellationOptions = [
  {
    label: 'Cancel immediately and get a prorated refund',
    value: 'immediate'
  },
  {
    label: 'Cancel at the end of billing cycle',
    value: 'end-of-cycle'
  }
];

