import nodemailer, { Transporter } from 'nodemailer';
import { BillingEmailTemplates } from './emailTemplates';
import { SubscriptionStatus, NotificationType } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

export interface EmailTheme {
  brandColor: string;
  buttonText: string;
  backgroundColor: string;
  textColor: string;
  headerColor: string;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

export interface BillingEmailData {
  shopName: string;
  planName?: string;
  amount?: number;
  currency?: string;
  nextBillingDate?: string;
  credits?: number;
  usageLimit?: number;
  currentUsage?: number;
  serviceType?: string;
  billingCycle?: string;
  trialEndDate?: string;
  paymentStatus?: string;
}

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export interface EmailResponse {
  success: boolean;
  messageId: string;
  timestamp: string;
}

export class EmailServiceError extends Error {
  constructor(message: string, public code: string, public details?: any) {
    super(message);
    this.name = 'EmailServiceError';
  }
}

export class EmailService {
  private static instance: EmailService | null = null;
  private transporter: Transporter;
  private defaultFrom: string;
  private theme: EmailTheme;
  private templateCache: Map<string, EmailTemplate> = new Map();
  private initialized: boolean = false;

  private constructor(config: EmailConfig, defaultFrom: string, theme?: Partial<EmailTheme>) {
    if (!defaultFrom) {
      throw new EmailServiceError(
        'Default FROM email address is required',
        'CONFIG_ERROR'
      );
    }

    if (!config.auth.user || !config.auth.pass) {
      throw new EmailServiceError(
        'Email authentication credentials are required',
        'CONFIG_ERROR'
      );
    }

    this.transporter = nodemailer.createTransport(config);
    this.defaultFrom = defaultFrom;
    this.theme = {
      brandColor: '#346df1',
      buttonText: '#ffffff',
      backgroundColor: '#f9f9f9',
      textColor: '#444444',
      headerColor: '#000000',
      ...theme
    };
  }

  public static getInstance(config: EmailConfig, defaultFrom: string, theme?: Partial<EmailTheme>): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService(config, defaultFrom, theme);
    }
    return EmailService.instance;
  }

  private validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.transporter.verify();
      this.initialized = true;
    } catch (error) {
      throw new EmailServiceError(
        'Failed to initialize email service',
        'INIT_ERROR',
        error
      );
    }
  }

   private async sendNodemailerEmail(
    to: string, 
    subject: string, 
    html: string,
    text?: string,
    from = this.defaultFrom
  ): Promise<any> {
    if (!this.initialized) {
      await this.initialize();
    }
    if (!this.validateEmail(to)) {
      throw new EmailServiceError(
        'Invalid recipient email address',
        'INVALID_EMAIL',
        { email: to }
      );
    }
    try {
      const result = await this.transporter.sendMail({
        from,
        to,
        subject,
        html,
        text
      });
      console.log('Email sent successfully:', { messageId: result.messageId, to });
      return { success: true, messageId: result.messageId };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new EmailServiceError(
        `Failed to send email: ${errorMessage}`,
        'SEND_ERROR',
        error
      );
    }
  }

  private validateEmailData(data: BillingEmailData, requiredFields: (keyof BillingEmailData)[]): void {
    const missingFields = requiredFields.filter(field => !data[field]);
    if (missingFields.length > 0) {
      throw new EmailServiceError(
        `Missing required data fields: ${missingFields.join(', ')}`,
        'DATA_ERROR',
        { required: requiredFields, missing: missingFields, received: data }
      );
    }
  }

  public async sendSubscriptionActivated(to: string, data: BillingEmailData): Promise<any> {
    this.validateEmailData(data, ['shopName', 'planName']);
    try {
      const template = BillingEmailTemplates.getSubscriptionActivatedTemplate(data, this.theme);
      return await this.sendNodemailerEmail(to, template.subject, template.html);
    } catch (eror) {
      if (error instanceof EmailServiceError) throw error;
      throw new EmailServiceError(
        'Failed to send subscription activated email',
        'TEMPLATE_ERROR',
        error
      );
    }
  }
 public async sendSubscriptionCancelled(to: string, data: BillingEmailData): Promise<any> {
    this.validateEmailData(data, ['shopName', 'planName']);
    
    try {
      const template = BillingEmailTemplates.getSubscriptionCancelledTemplate(data, this.theme);
      return await this.sendNodemailerEmail(to, template.subject, template.html);
    } catch (error) {
      if (error instanceof EmailServiceError) throw error;
      throw new EmailServiceError(
        'Failed to send subscription cancelled email',
        'TEMPLATE_ERROR',
        error
      );
    }
  }

  public async sendSubscriptionExpired(to: string, data: BillingEmailData): Promise<any> {
    this.validateEmailData(data, ['shopName', 'planName', 'nextBillingDate']);
    
    try {
      const template = BillingEmailTemplates.getSubscriptionExpiredTemplate(data, this.theme);
      return await this.sendNodemailerEmail(to, template.subject, template.html);
    } catch (error) {
      if (error instanceof EmailServiceError) throw error;
      throw new EmailServiceError(
        'Failed to send subscription expired email',
        'TEMPLATE_ERROR',
        error
      );
    }
  }

  public async sendSubscriptionPastDue(to: string, data: BillingEmailData): Promise<any> {
    this.validateEmailData(data, ['shopName', 'planName', 'amount', 'currency']);
    
    try {
      const template = BillingEmailTemplates.getSubscriptionPastDueTemplate(data, this.theme);
      return await this.sendNodemailerEmail(to, template.subject, template.html);
    } catch (error) {
      if (error instanceof EmailServiceError) throw error;
      throw new EmailServiceError(
        'Failed to send past due email',
        'TEMPLATE_ERROR',
        error
      );
    }
  }

  public async sendUsageLimitApproaching(to: string, data: BillingEmailData): Promise<any> {
    this.validateEmailData(data, ['shopName', 'serviceType', 'currentUsage', 'usageLimit']);
    
    try {
      const template = BillingEmailTemplates.getUsageLimitApproachingTemplate(data, this.theme);
      return await this.sendNodemailerEmail(to, template.subject, template.html);
    } catch (error) {
      if (error instanceof EmailServiceError) throw error;
      throw new EmailServiceError(
        'Failed to send usage limit approaching email',
        'TEMPLATE_ERROR',
        error
      );
    }
  }

  public async sendCreditsPurchased(to: string, data: BillingEmailData): Promise<any> {
    this.validateEmailData(data, ['shopName', 'credits', 'amount', 'currency']);
    
    try {
      const template = BillingEmailTemplates.getCreditsPurchasedTemplate(data, this.theme);
      return await this.sendNodemailerEmail(to, template.subject, template.html);
    } catch (error) {
      if (error instanceof EmailServiceError) throw error;
      throw new EmailServiceError(
        'Failed to send credits purchased email',
        'TEMPLATE_ERROR',
        error
      );
    }
  }

  public async sendTrialEnding(to: string, data: BillingEmailData): Promise<any> {
    this.validateEmailData(data, ['shopName', 'planName', 'trialEndDate']);
    
    try {
      const template = BillingEmailTemplates.getTrialEndingTemplate(data, this.theme);
      return await this.sendNodemailerEmail(to, template.subject, template.html);
    } catch (error) {
      if (error instanceof EmailServiceError) throw error;
      throw new EmailServiceError(
        'Failed to send trial ending email',
        'TEMPLATE_ERROR',
        error
      );
    }
  }

  public async sendSubscriptionEmail(
    to: string,
    data: BillingEmailData,
    status: SubscriptionStatus
  ): Promise<void> {
    let emailTemplate: EmailTemplate;
    switch (status) {
      case SubscriptionStatus.ACTIVE:
        emailTemplate = BillingEmailTemplates.getSubscriptionActivatedTemplate(data, this.theme);
        break;
      case SubscriptionStatus.TRIAL:
        emailTemplate = BillingEmailTemplates.getSubscriptionTrialActivatedTemplate(data, this.theme);
        break;
      case SubscriptionStatus.PRORATE_CANCELED:
        emailTemplate = BillingEmailTemplates.getSubscriptionProrateCancelledTemplate(data, this.theme);
        break;
      case SubscriptionStatus.RENEWING:
        emailTemplate = BillingEmailTemplates.getSubscriptionRenewingTemplate(data, this.theme);
        break;
      case SubscriptionStatus.DECLINED:
        emailTemplate = BillingEmailTemplates.getSubscriptionDeclinedTemplate(data, this.theme);
        break;
      case SubscriptionStatus.EXPIRED:
        emailTemplate = BillingEmailTemplates.getSubscriptionExpiredTemplate(data, this.theme);
        break;
      case SubscriptionStatus.PENDING:
        emailTemplate = BillingEmailTemplates.getSubscriptionPendingTemplate(data, this.theme);
        break;
      case SubscriptionStatus.ON_HOLD:
        emailTemplate = BillingEmailTemplates.getSubscriptionOnholdTemplate(data, this.theme);
        break;
      case SubscriptionStatus.FROZEN:
        emailTemplate = BillingEmailTemplates.getSubscriptionFrozenTemplate(data, this.theme);
        break;
      case SubscriptionStatus.RENEWING:
        emailTemplate = BillingEmailTemplates.getSubscriptionRenewingTemplate(data, this.theme);
        break;
      case SubscriptionStatus.TRIAL_ENDING:
        emailTemplate = BillingEmailTemplates.getSubscriptionTrialEndingTemplate(data, this.theme);
        break;
      case SubscriptionStatus.TRIAL_ENDED:
        emailTemplate = BillingEmailTemplates.getSubscriptionTrialEndedActivationTemplate(data, this.theme);
        break;
      default:
        console.warn(`Unexpected subscription status in sendSubscriptionEmail: ${status}`);
        return;
    }
    try {
    await this.sendNodemailerEmail(to, emailTemplate.subject, emailTemplate.html);
    } catch (error) {
      if (error instanceof EmailServiceError) throw error;
      throw new EmailServiceError(
        'Failed to send subscription email',
        'TEMPLATE_ERROR',
        error
      );
    }
  }

  public async sendUsageEmail(
    to: string,
    data: BillingEmailData,
    status: NotificationType
  ): Promise<void> {
    let emailTemplate: EmailTemplate;
    switch (status) {
      case NotificationType.USAGE_OVER_LIMIT:
        emailTemplate = BillingEmailTemplates.getUsageLimitOverTemplate(data, this.theme);
        break;
      case NotificationType.USAGE_APPROACHING_LIMIT:
        emailTemplate = BillingEmailTemplates.getUsageLimitApproachingTemplate(data, this.theme);
        break;
      case NotificationType.PACKAGE_EXPIRED:
        emailTemplate = BillingEmailTemplates.getPackageExpiredWithOverageTemplate(data, this.theme);
        break;
      case NotificationType.SUBSCRIPTION_EXPIRED:
        emailTemplate = BillingEmailTemplates.getSubscriptionExpiredWithOverageTemplate(data, this.theme);
        break;
      default:
        console.warn(`Unexpected subscription status in sendSubscriptionEmail: ${status}`);
        return;
    }
    try {
    await this.sendNodemailerEmail(to, emailTemplate.subject, emailTemplate.html);
    } catch (error) {
      if (error instanceof EmailServiceError) throw error;
      throw new EmailServiceError(
        'Failed to send usage email',
        'TEMPLATE_ERROR',
        error
      );
    }
  }

  public async sendCustomEmail(
    to: string,
    subject: string,
    html: string,
    text?: string,
    from = this.defaultFrom
  ): Promise<any> {
    if (!subject?.trim()) {
      throw new EmailServiceError(
        'Subject is required for custom email',
        'DATA_ERROR',
        { field: 'subject' }
      );
    }

    if (!html?.trim()) {
      throw new EmailServiceError(
        'HTML content is required for custom email',
        'DATA_ERROR',
        { field: 'html' }
      );
    }

    try {
      return await this.sendNodemailerEmail(to, subject, html, text, from);
    } catch (error) {
      if (error instanceof EmailServiceError) throw error;
      throw new EmailServiceError(
        'Failed to send custom email',
        'SEND_ERROR',
        error
      );
    }
  }

  private createEmailResponse(result: any): EmailResponse {
    return {
      success: true,
      messageId: result.messageId,
      timestamp: new Date().toISOString()
    };
  }

  public async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('Email service verification failed:', error);
      return false;
    }
  }

  public reset(): void {
    this.templateCache.clear();
    this.initialized = false;
  }

  public clearTemplateCache(): void {
    this.templateCache.clear();
  }
}

function validateEmailConfig(config: EmailConfig): EmailConfig {
  if (!config.host || !config.port) {
    throw new EmailServiceError(
      'Invalid email configuration: missing host or port',
      'CONFIG_ERROR'
    );
  }
  return {
    host: config.host,
    port: parseInt(String(config.port)),
    secure: config.secure ?? true,
    auth: {
      user: config.auth.user,
      pass: config.auth.pass
    }
  };
}

const emailConfig: EmailConfig = validateEmailConfig({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '465'),
  secure: true,
  auth: {
    user: process.env.NODE_MAILER_EMAIL || '',
    pass: process.env.NODE_MAILER_GMAIL_APP_PASSWORD || ''
  }
});

if (!process.env.NODE_MAILER_EMAIL) {
  console.warn('WARNING: NODE_MAILER_EMAIL environment variable is not set');
}

export const EMAIL_FROM = process.env.NODE_MAILER_EMAIL || '';

export const emailService = EmailService.getInstance(
  emailConfig,
  EMAIL_FROM,
);

export default emailService;
