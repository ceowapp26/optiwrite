export const SUBSCRIPTION_CREATE = `
  mutation AppSubscriptionCreate(
    $name: String!, 
    $lineItems: [AppSubscriptionLineItemInput!]!, 
    $returnUrl: URL!, 
    $test: Boolean, 
    $replacementBehavior: AppSubscriptionReplacementBehavior!, 
    $trialDays: Int
  ) {
    appSubscriptionCreate(
      name: $name, 
      returnUrl: $returnUrl, 
      lineItems: $lineItems, 
      test: $test, 
      replacementBehavior: $replacementBehavior, 
      trialDays: $trialDays
    ) {
      userErrors {
        field
        message
      }
      appSubscription {
        id
      }
      confirmationUrl
    }
  }
`;

export const ONE_TIME_CREATE = `
  mutation AppPurchaseOneTimeCreate($name: String!, $returnUrl: URL!, $price: MoneyInput!, $test: Boolean) {
    appPurchaseOneTimeCreate(name: $name, returnUrl: $returnUrl, price: $price, test: $test) {
      userErrors {
        field
        message
      }
      appPurchaseOneTime {
        createdAt
        id
      }
      confirmationUrl
    }
  }
`;

export const SUBSCRIPTION_CANCEL = `
  mutation AppSubscriptionCancel($id: ID!, $prorate: Boolean) {
    appSubscriptionCancel(id: $id, prorate: $prorate) {
      userErrors {
        field
        message
      }
      appSubscription {
        id
        name
        status
        createdAt
        currentPeriodEnd
        returnUrl
        test
        lineItems {
          id
          plan {
            pricingDetails {
              ... on AppRecurringPricing {
                interval
                price {
                  amount
                  currencyCode
                }
              }
            }
          }
        }
      }
    }
  }
`;

export const SUBSCRIPTION_UPDATE = `
  mutation AppSubscriptionLineItemUpdate($lineItemId: ID!, $plan: AppSubscriptionLineItemUpdateInput!) {
    appSubscriptionLineItemUpdate(lineItemId: $lineItemId, plan: $plan) {
      userErrors {
        field
        message
      }
      appSubscription {
        id
        status
      }
      confirmationUrl
    }
  }
`;

export const SUBSCRIPTION_TRIAL_EXTEND = `
  mutation AppSubscriptionTrialExtend($id: ID!, $days: Int!) {
    appSubscriptionTrialExtend(id: $id, days: $days) {
      userErrors {
        field
        message
        code
      }
      appSubscription {
        id
        status
      }
    }
  }
`;

export const SUBSCRIPTION_LINE_ITEM_UPDATE = `
  mutation appSubscriptionLineItemUpdate($cappedAmount: MoneyInput!, $id: ID!) {
  appSubscriptionLineItemUpdate(cappedAmount: $cappedAmount, id: $id) {
    userErrors {
      field
      message
    }
    confirmationUrl
    appSubscription {
      id
    }
  }
}
`;

