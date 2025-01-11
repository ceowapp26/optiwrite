import { SubscriptionPlan } from '@prisma/client';

interface BillingTemplateContent {
  subject: string;
  html: string;
}

interface BillingEmailData {
  shopName: string;
  planName?: string;
  amount?: number;
  currency?: string;
  nextBillingDate?: string;
  credits?: number;
  usageLimit?: number;
  currentUsage?: number;
}

export class BillingEmailTemplates {
  private static getBaseTemplate(content: BillingTemplateContent, theme: EmailTheme): EmailTemplate {
    return {
      subject: content.subject,
      html: `
        <body style="background: ${theme.backgroundColor}; margin: 0; padding: 0; font-family: Arial, sans-serif;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0">
            <tr>
              <td align="center" style="padding: 40px 0;">
                <table style="background: #ffffff; max-width: 600px; width: 100%; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
                  <tr>
                    <td style="padding: 40px;">
                      <img src="https://ozuowglcgqoxtxnncluc.supabase.co/storage/v1/object/public/app_images/Doc2Product-logo.png" style="width: 200px; margin-bottom: 20px;"/>
                      ${content.html}
                      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: ${theme.textColor}; font-size: 14px;">
                        <p>Need help? Contact our support team at support@doc2product.com</p>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      `
    };
  }

  static getSubscriptionActivatedTemplate(data: BillingEmailData, theme: EmailTheme): EmailTemplate {
    const content = {
      subject: `Subscription Activated - ${data.shopName}`,
      html: `
        <h1 style="color: ${theme.headerColor}; margin-bottom: 24px;">Subscription Activated</h1>
        <p style="color: ${theme.textColor}; margin-bottom: 16px;">
          Your subscription to the ${data.planName} plan has been successfully activated for ${data.shopName}.
        </p>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 4px; margin: 20px 0;">
          <h3 style="color: ${theme.headerColor}; margin-top: 0;">Subscription Details:</h3>
          <p style="color: ${theme.textColor}; margin: 8px 0;">Plan: ${data.planName}</p>
          <p style="color: ${theme.textColor}; margin: 8px 0;">Amount: ${data.amount} ${data.currency}/month</p>
          <p style="color: ${theme.textColor}; margin: 8px 0;">Next billing date: ${data.nextBillingDate}</p>
        </div>
      `
    };
    return this.getBaseTemplate(content, theme);
  }

  static getSubscriptionCancelledTemplate(data: BillingEmailData, theme: EmailTheme): EmailTemplate {
    const content = {
      subject: `Subscription Cancelled - ${data.shopName}`,
      html: `
        <h1 style="color: ${theme.headerColor}; margin-bottom: 24px;">Subscription Cancelled</h1>
        <p style="color: ${theme.textColor}; margin-bottom: 16px;">
          Your subscription to the ${data.planName} plan has been cancelled for ${data.shopName}.
        </p>
        <p style="color: ${theme.textColor}; margin-bottom: 16px;">
          You'll continue to have access to your current plan features until the end of your billing period.
        </p>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 4px; margin: 20px 0;">
          <h3 style="color: ${theme.headerColor}; margin-top: 0;">Access Until:</h3>
          <p style="color: ${theme.textColor}; margin: 8px 0;">${data.nextBillingDate}</p>
        </div>
      `
    };
    return this.getBaseTemplate(content, theme);
  }

  static getSubscriptionExpiredTemplate(data: BillingEmailData, theme: EmailTheme): EmailTemplate {
    const content = {
      subject: `Subscription Expired - ${data.shopName}`,
      html: `
        <h1 style="color: ${theme.headerColor}; margin-bottom: 24px;">Subscription Expired</h1>
        <p style="color: ${theme.textColor}; margin-bottom: 16px;">
          Your subscription to the ${data.planName} plan has expired for ${data.shopName}.
        </p>
        <p style="color: ${theme.textColor}; margin-bottom: 16px;">
          To continue using doc2product's features, please renew your subscription.
        </p>
        <a href="https://admin.shopify.com/store/${data.shopName}/apps/doc2product-latest/billing" 
           style="background-color: ${theme.brandColor}; color: ${theme.buttonText}; padding: 12px 24px; 
           border-radius: 4px; text-decoration: none; display: inline-block; margin: 20px 0;">
          Renew Subscription
        </a>
      `
    };
    return this.getBaseTemplate(content, theme);
  }

  static getSubscriptionPastDueTemplate(data: BillingEmailData, theme: EmailTheme): EmailTemplate {
    const content = {
      subject: `Payment Past Due - ${data.shopName}`,
      html: `
        <h1 style="color: ${theme.headerColor}; margin-bottom: 24px;">Payment Past Due</h1>
        <p style="color: ${theme.textColor}; margin-bottom: 16px;">
          The payment for your ${data.planName} subscription is past due for ${data.shopName}.
        </p>
        <p style="color: ${theme.textColor}; margin-bottom: 16px;">
          Please update your payment information to avoid service interruption.
        </p>
        <a href="https://admin.shopify.com/store/${data.shopName}/apps/doc2product-latest/billing" 
           style="background-color: ${theme.brandColor}; color: ${theme.buttonText}; padding: 12px 24px; 
           border-radius: 4px; text-decoration: none; display: inline-block; margin: 20px 0;">
          Update Payment Method
        </a>
      `
    };
    return this.getBaseTemplate(content, theme);
  }

  static getUsageLimitApproachingTemplate(data: BillingEmailData, theme: EmailTheme): EmailTemplate {
    const content = {
      subject: `Usage Limit Approaching - ${data.shopName}`,
      html: `
        <h1 style="color: ${theme.headerColor}; margin-bottom: 24px;">Usage Limit Approaching</h1>
        <p style="color: ${theme.textColor}; margin-bottom: 16px;">
          You've used ${data.currentUsage} out of ${data.usageLimit} credits this billing period.
        </p>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 4px; margin: 20px 0;">
          <h3 style="color: ${theme.headerColor}; margin-top: 0;">Usage Details:</h3>
          <p style="color: ${theme.textColor}; margin: 8px 0;">Current Usage: ${data.currentUsage} credits</p>
          <p style="color: ${theme.textColor}; margin: 8px 0;">Limit: ${data.usageLimit} credits</p>
          <p style="color: ${theme.textColor}; margin: 8px 0;">Reset Date: ${data.nextBillingDate}</p>
        </div>
      `
    };
    return this.getBaseTemplate(content, theme);
  }

  static getCreditsPurchasedTemplate(data: BillingEmailData, theme: EmailTheme): EmailTemplate {
    const content = {
      subject: `Credits Purchase Confirmed - ${data.shopName}`,
      html: `
        <h1 style="color: ${theme.headerColor}; margin-bottom: 24px;">Credits Purchase Confirmed</h1>
        <p style="color: ${theme.textColor}; margin-bottom: 16px;">
          Your purchase of additional credits has been confirmed for ${data.shopName}.
        </p>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 4px; margin: 20px 0;">
          <h3 style="color: ${theme.headerColor}; margin-top: 0;">Purchase Details:</h3>
          <p style="color: ${theme.textColor}; margin: 8px 0;">Plan: ${data.packageName}</p>
          <p style="color: ${theme.textColor}; margin: 8px 0;">Credits Added: ${data.credits}</p>
          <p style="color: ${theme.textColor}; margin: 8px 0;">Amount: ${data.amount} ${data.currency}</p>
          <p style="color: ${theme.textColor}; margin: 8px 0;">Billing date: ${data.billingDate}</p>
        </div>
      `
    };
    return this.getBaseTemplate(content, theme);
  }     

  static getTrialEndingTemplate(data: BillingEmailData, theme: EmailTheme): EmailTemplate {
    const content = {
      subject: `Trial Ending Soon - ${data.shopName}`,
      html: `
        <h1 style="color: ${theme.headerColor}; margin-bottom: 24px;">Trial Ending Soon</h1>
        <p style="color: ${theme.textColor}; margin-bottom: 16px;">
          Your trial period for doc2product will end on ${data.nextBillingDate}.
        </p>
        <p style="color: ${theme.textColor}; margin-bottom: 16px;">
          To continue using our services, please select a subscription plan.
        </p>
        <a href="https://admin.shopify.com/store/${data.shopName}/apps/doc2product-latest/billing" 
           style="background-color: ${theme.brandColor}; color: ${theme.buttonText}; padding: 12px 24px; 
           border-radius: 4px; text-decoration: none; display: inline-block; margin: 20px 0;">
          Choose a Plan
        </a>
      `
    };
    return this.getBaseTemplate(content, theme);
  }
}