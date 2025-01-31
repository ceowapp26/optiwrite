import React from 'react';
import { AlertCircle, CheckCircle2, Clock, CreditCard, Package, PackageCheck, Coins, BarChart3, Network } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { CreditDetailsProps, CreditPackageDetails } from '@/types/billing';
import { PromotionUnit } from '@prisma/client';

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
    return colors[status?.toUpperCase()] || 'bg-gray-100 text-gray-800';
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${getStatusColor(status)}`}>
      {status ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() : 'Unknown'}
    </span>
  );
};

const PackageGroup = ({ title, packages }: { title: string; packages: CreditPackageDetails[] }) => {
  const groupMetrics = packages.reduce((acc, pkg) => ({
    totalCredits: acc.totalCredits + (pkg.package?.creditAmount || 0),
    aiCreditsTotal: acc.aiCreditsTotal + (pkg.features?.ai?.creditLimits || 0),
    aiCreditsUsed: acc.aiCreditsUsed + (pkg.usage?.ai?.creditsUsed || 0),
    aiRequestsTotal: acc.aiRequestsTotal + (pkg.features?.ai?.requestLimits || 0),
    aiRequestsUsed: acc.aiRequestsUsed + (pkg.usage?.ai?.requestsUsed || 0),
    crawlCreditsTotal: acc.crawlCreditsTotal + (pkg.features?.crawl?.creditLimits || 0),
    crawlCreditsUsed: acc.crawlCreditsUsed + (pkg.usage?.crawl?.creditsUsed || 0),
    crawlRequestsTotal: acc.crawlRequestsTotal + (pkg.features?.crawl?.requestLimits || 0),
    crawlRequestsUsed: acc.crawlRequestsUsed + (pkg.usage?.crawl?.requestsUsed || 0),
    activeCount: acc.activeCount + ((pkg.status === 'ACTIVE') ? 1 : 0),
    totalPrice: (pkg.package?.totalPrice || 0),
    totalPayments: acc.totalPayments + (pkg.payment?.amount || 0),
    totalAdjustedAmount: acc.totalAdjustedAmount + (pkg.payment?.adjustedAmount || 0),
    lastPaymentAmount: pkg.payment?.amount || 0,
    lastPaymentDate: (pkg.payment?.createdAt && pkg.payment.createdAt > acc.lastPaymentDate) 
      ? pkg.payment.createdAt 
      : acc.lastPaymentDate,
    promotions: [...acc.promotions, ...(pkg.billingAdjustments?.promotions || [])],
    discounts: [...acc.discounts, ...(pkg.billingAdjustments?.discounts || [])]
  }), {
    totalCredits: 0,
    aiCreditsTotal: 0,
    aiCreditsUsed: 0, 
    aiRequestsTotal: 0,
    aiRequestsUsed: 0,
    crawlCreditsTotal: 0,
    crawlCreditsUsed: 0,
    crawlRequestsTotal: 0,
    crawlRequestsUsed: 0,
    activeCount: 0,
    totalPayments: 0,
    totalAdjustedAmount: 0,
    totalPrice: 0,
    lastPaymentAmount: 0,
    lastPaymentDate: new Date(0),
    promotions: [],
    discounts: []
  });

  const formatDate = (date: Date) => {
    try {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const formatCurrency = (amount: number | undefined, currency: string = 'USD') => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
      }).format(amount || 0);
    } catch (error) {
      return '$0.00';
    }
  };

  const formatDiscountValue = (amount: number | undefined, unit: PromotionUnit) => {
    try {
      const formattedAmount = new Intl.NumberFormat('en-US', {
        style: unit === PromotionUnit.AMOUNT ? 'currency' : 'decimal',
        maximumFractionDigits: 2,
      }).format(amount || 0);
      const unitDisplay = getPromotionUnitDisplay(unit);
      return `${formattedAmount} ${unitDisplay}`.trim();
    } catch (error) {
      return '0';
    }
  };

  const getPromotionUnitDisplay = (unit: PromotionUnit): string => {
    try {
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
          return "";
      }
    } catch (error) {
      return "";
    }
  };

  const hasAdjustments = (groupMetrics.promotions?.length > 0) || (groupMetrics.discounts?.length > 0);

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          {title || 'Unknown'} Packages
        </CardTitle>
        <CardDescription>
          Active Packages: {groupMetrics.activeCount || 0}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2 px-1">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Coins className="w-4 h-4" />
            Total Credits
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Total: {groupMetrics.totalCredits || 0}</span>
            </div>
          </div>
        </div>
        <div className="py-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-semibold flex items-center gap-2 p-1">
            <Network className="w-4 h-4" />
            Package Metrics
          </h4>
          <div className="grid grid-cols-2 gap-4 px-1">
            <div className="p-4 bg-gray-100 rounded-lg">
              <h4 className="text-sm font-semibold mb-2">AI API Metrics</h4>
               <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Total Credits:</span>
                  <span>{groupMetrics.aiCreditsTotal || 0}</span>
                </div>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Total Requests:</span>
                  <span>{groupMetrics.aiRequestsTotal || 0}</span>
                </div>
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-semibold mb-2">Crawl API Metrics</h4>
               <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Total Credits:</span>
                  <span>{groupMetrics.crawlCreditsTotal || 0}</span>
                </div>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Total Requests:</span>
                  <span>{groupMetrics.crawlRequestsTotal || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Payment Details
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Package Price:</span>
                  <span>{formatCurrency(groupMetrics.totalPrice)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Total Purchases:</span>
                  <span>{formatCurrency(groupMetrics.totalPayments)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Last Payment:</span>
                  <span>{formatCurrency(groupMetrics.lastPaymentAmount)}</span>
                  <span>{formatDate(groupMetrics.lastPaymentDate)}</span>
                </div>
              </div>
            </div>
            {hasAdjustments && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <h5 className="text-sm font-semibold mb-2">Promotions & Discounts</h5>
                <div className="space-y-2">
                  {groupMetrics.promotions?.map((promo, index) => (
                    <div key={`promo-${index}`} className="text-sm flex justify-between">
                      <span>{promo?.description || `Promotion (${promo?.code || 'Unknown'})`}:</span>
                      <span className="text-green-600">
                        {formatDiscountValue(promo?.value, promo?.unit)}
                      </span>
                    </div>
                  ))}
                  {groupMetrics.discounts?.map((discount, index) => (
                    <div key={`discount-${index}`} className="text-sm flex justify-between">
                      <span>{discount?.description || `Discount (${discount?.code || 'Unknown'})`}:</span>
                      <span className="text-green-600">
                        {formatDiscountValue(discount?.value, discount?.unit)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const CreditDetails = ({ 
  details,
  error,
  loading 
}: CreditDetailsProps & { error?: string; loading?: boolean }) => {
  const { 
    totalActivePackages = 0, 
    packages = [], 
    totalCreditsAvailable = 0 
  } = details || {};
  const groupedPackages = packages?.reduce((acc, pkg) => {
    const groupName = pkg?.package?.name?.startsWith('CUSTOM_') ? 'CUSTOM' : pkg?.package?.name || 'OTHER';
    if (!acc[groupName]) {
      acc[groupName] = [];
    }
    acc[groupName].push(pkg);
    return acc;
  }, {} as Record<string, CreditPackageDetails[]>) || {};

  const packageOrder = ['SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE', 'CUSTOM', 'OTHER'];

  if (loading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Loading Credit Details...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="w-full max-w-4xl mx-auto">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!packages?.length) {
    return (
      <Alert className="w-full max-w-4xl mx-auto">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No Active Packages</AlertTitle>
        <AlertDescription>
          You currently have no active credit packages.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Purchases Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg text-center">
            <p className="text-lg font-bold">{totalActivePackages || 0}</p>
            <p className="text-sm text-gray-500">Active Packages</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg text-center">
            <p className="text-lg font-bold">{totalCreditsAvailable || 0}</p>
            <p className="text-sm text-gray-500">Available Credits</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg text-center">
            <p className="text-lg font-bold">
              ${(packages?.reduce((sum, pkg) => sum + (pkg?.package?.totalPrice || 0), 0) || 0).toFixed(2)}
            </p>
            <p className="text-sm text-gray-500">Total Value</p>
          </div>
        </CardContent>
      </Card>
      <div className="space-y-6">
        {packageOrder.map((packageName) => {
          const groupPackages = groupedPackages[packageName];
          if (!groupPackages?.length) return null;
          return (
            <PackageGroup 
              key={packageName} 
              title={packageName} 
              packages={groupPackages} 
            />
          );
        })}
      </div>
    </div>
  );
};

export default React.memo(CreditDetails);