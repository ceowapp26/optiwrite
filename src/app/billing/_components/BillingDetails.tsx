import React from 'react';
import { AlertCircle, CheckCircle2, Clock, Calendar, CreditCard, Package, XCircle, PackageCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SubscriptionDetails } from '@/types/billing';
import { PromotionUnit } from '@prisma/client';
import {
  CatalogIcon
} from '@shopify/polaris-icons';
 
const StatusBadge = ({ status }: { status: string }) => {
  const getStatusColor = (status: string) => {
    const colors = {
      ACTIVE: 'bg-green-100 text-green-800',
      FROZEN: 'bg-blue-100 text-blue-800',
      EXPIRED: 'bg-red-100 text-red-800',
      CANCELLED: 'bg-gray-100 text-gray-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
      SUCCEEDED: 'bg-green-100 text-green-800',
      FAILED: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${getStatusColor(status)}`}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
};

const BillingDetails = ({ 
  details,
  error,
  loading 
}: { 
  details?: SubscriptionDetails;
  error?: string;
  loading?: boolean;
}) => {
  const getPromotionUnitDisplay = (unit: PromotionUnit): string => {
    switch (unit) {
      case PromotionUnit.PERCENTAGE:
        return "%";
      case PromotionUnit.AMOUNT:
        return "USD";
      case PromotionUnit.CREDITS:
        return "credits";
      case PromotionUnit.DAYS:
        return "days";
      case PromotionUnit.REQUESTS:
        return "requests";
      case PromotionUnit.TOKENS:
        return "tokens";
      default:
        throw new Error(`Unknown promotion unit: ${unit}`);
    }
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatDiscountValue = (amount: number, unit: PromotionUnit) => {
    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: unit === PromotionUnit.AMOUNT ? 'currency' : 'decimal',
      maximumFractionDigits: 2,
    }).format(amount);
    const unitDisplay = getPromotionUnitDisplay(unit);
    return `${formattedAmount} ${unitDisplay}`.trim();
  };

  const hasAdjustments = details?.billingAdjustments?.promotions?.length > 0 || details?.billingAdjustments?.discounts?.length > 0;
  if (loading) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Loading Subscription Details...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="w-full max-w-2xl mx-auto">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!details) {
    return (
      <Alert className="w-full max-w-2xl mx-auto">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No Subscription Found</AlertTitle>
        <AlertDescription>
          There is no active subscription for this shop.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Package className="w-6 h-6" />
            Current Subscription
          </CardTitle>
          <StatusBadge status={details?.status} />
        </div>
        <CardDescription>
          Subscription details and current status
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Plan Details
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Plan Name</p>
              <p className="font-medium">{details?.plan?.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Price</p>
              <p className="font-medium">
                ${details?.plan?.price?.toFixed(2)} /month
              </p>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Billing Cycle
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Start Date</p>
              <p className="font-medium">{formatDate(details?.startDate)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">End Date</p>
              <p className="font-medium">{formatDate(details?.endDate)}</p>
            </div>
          </div>
          {details?.daysUntilExpiration > 0 && (
            <Alert className="mt-2">
              <Clock className="h-4 w-4" />
              <AlertTitle>Renewal Coming Up</AlertTitle>
              <AlertDescription>
                Your subscription will {details.status === 'ACTIVE' ? 'renew' : 'expire'} in {Math.ceil(details?.daysUntilExpiration)} days
              </AlertDescription>
            </Alert>
          )}
        </div>
        {details?.latestPayment && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Payment Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h5 className="text-sm font-semibold mb-2">Last Payment</h5>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Amount:</span>
                    <span>{formatCurrency(details?.latestPayment?.amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Date:</span>
                    <span>{formatDate(details?.latestPayment?.createdAt)}</span>
                  </div>
                </div>
              </div>
              {hasAdjustments && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h5 className="text-sm font-semibold mb-2">Promotions & Discounts</h5>
                  <div className="space-y-2">
                    {details?.billingAdjustments?.promotions.map((promo, index) => (
                      <div key={`promo-${index}`} className="text-sm flex justify-between">
                        <span>{promo.description || `Promotion (${promo.code})`}:</span>
                        <span className="text-green-600">
                          {formatDiscountValue(promo.value, promo.unit)}
                        </span>
                      </div>
                    ))}
                    {details?.billingAdjustments?.discounts.map((discount, index) => (
                      <div key={`discount-${index}`} className="text-sm flex justify-between">
                        <span>{discount.description || `Discount (${discount.code})`}:</span>
                        <span className="text-green-600">
                          {formatDiscountValue(discount.value, discount.unit)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {details?.plan?.feature && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <PackageCheck className="w-5 h-5" />
              Plan Features
            </h3>
            <div className="bg-white p-4 rounded-lg border">
              <h4 className="text-lg font-semibold mb-3 text-blue-600">AI API Features</h4>
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">
                    <span className="font-medium">Requests: </span>
                    {details?.plan?.feature?.aiAPI?.requestLimits?.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <h4 className="text-lg font-semibold mb-3 text-purple-600">Crawl API Features</h4>
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">
                    <span className="font-medium">Requests: </span>
                    {details?.plan?.feature?.crawlAPI?.requestLimits?.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default React.memo(BillingDetails);
