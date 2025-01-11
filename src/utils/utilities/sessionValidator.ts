import { ValidationOptions, UserIds, AppSession } from '@/types/auth';

export const validateSessionDetails = (
  session: AppSession | undefined | null,
  options: ValidationOptions = { requireGoogle: true, requireShopify: true, requireAll: true }
): { isValid: boolean; missingFields: string[] } => {
  if (!session) {
    return { isValid: false, missingFields: ['entire session details'] };
  }
  const missingFields: string[] = [];
  const requiredFields = {
    shopify: [
      { key: 'shopName', label: 'Shop Name' },
      { key: 'shopifyOfflineAccessToken', label: 'Shopify Offline Access Token' },
      { key: 'shopifyOnlineAccessToken', label: 'Shopify Online Access Token' },
      { key: 'shopifyUserId', label: 'Shopify User ID' },
    ],
    google: [
      { key: 'googleAccessToken', label: 'Google Access Token' },
      { key: 'googleUserId', label: 'Google User ID' },
    ]
  };
  if (options.requireShopify) {
    requiredFields.shopify.forEach(field => {
      if (!session[field.key]) {
        missingFields.push(field.label);
      }
    });
  }

  if (options.requireGoogle) {
    requiredFields.google.forEach(field => {
      if (!session[field.key]) {
        missingFields.push(field.label);
      }
    });
  }
  if (!session.userIds) {
    missingFields.push('User IDs object');
  } else {
    if (options.requireGoogle && !session.userIds.googleUserId) {
      missingFields.push('Google User ID in userIds');
    }
    if (options.requireShopify && !session.userIds.shopifyUserId) {
      missingFields.push('Shopify User ID in userIds');
    }
  }
  if (!options.requireAll) {
    const hasCompleteShopify = options.requireShopify && 
      requiredFields.shopify.every(field => session[field.key]);
    const hasCompleteGoogle = options.requireGoogle && 
      requiredFields.google.every(field => session[field.key]);

    return {
      isValid: hasCompleteShopify || hasCompleteGoogle,
      missingFields
    };
  }

  return {
    isValid: missingFields.length === 0,
    missingFields
  };
};

export const isSessionValid = (
  session: AppSession | undefined | null,
  options?: ValidationOptions
): boolean => {
  return validateSessionDetails(session, options).isValid;
};

export const validateAndLogSession = (session: AppSession | null): boolean => {
  const validation = validateSessionDetails(session);
  if (!validation.isValid) {
    console.warn('Invalid session details. Missing fields:', validation.missingFields);
    return false;
  }
  return true;
};