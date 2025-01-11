import { ChartOptions } from 'chart.js';
import { PrismaClient, Prisma, Shop, ModelName, Service, ServiceUsage, SubscriptionStatus, PackageStatus, Usage, Payment, PaymentStatus, AIUsageDetails } from '@prisma/client';
import 'chartjs-adapter-date-fns';

interface TimeSeriesPoint {
  x: string;
  y: number;
}

const getColorFromIndex = (index: number): string => {
  const colors = [
    '#2C6ECB',
    '#47B881',
    '#D47B4A',
    '#8B5CF6',
    '#EC4899',
    '#14B8A6',
    '#F59E0B',
    '#6366F1',
  ];
  return colors[index % colors.length] || '#000000';
};

const getBackgroundColorFromIndex = (index: number): string => {
  const color = getColorFromIndex(index);
  return color.replace('rgb', 'rgba').replace(')', ', 0.1)') || 'rgba(0, 0, 0, 0.1)';
};

const generateTimeSeriesData = (
  timeRange: string,
  usage: ServiceUsage | Record<Service, ServiceUsageState> | undefined
): TimeSeriesPoint[] => {
  if (!usage || !timeRange) return [];
  const days = parseInt(timeRange) || 0;
  if (days <= 0) return [];
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - days);
  const dailyUsage = new Map<string, number>();
  if ('serviceUsage' in usage) {
    const usageDetails = usage.serviceUsage?.aiUsageDetails || usage.serviceUsage?.crawlUsageDetails;
    if (usageDetails?.updatedAt) {
      const dateKey = usageDetails.updatedAt.toISOString().split('T')[0];
      dailyUsage.set(dateKey, (dailyUsage.get(dateKey) || 0) + (usageDetails.totalRequestsUsed || 0));
    }
  } else {
    Object.values(usage).forEach(serviceUsage => {
      const usageDetails = serviceUsage?.requests || 0;
      const date = serviceUsage?.updatedAt?.toISOString().split('T')[0];
      if (date) {
        dailyUsage.set(date, (dailyUsage.get(date) || 0) + usageDetails);
      }
    });
  }
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + index);
    const dateKey = date.toISOString().split('T')[0];
    return {
      x: dateKey,
      y: dailyUsage.get(dateKey) || 0
    };
  });
};

const getChartOptions = (title: string): ChartOptions<'pie'> => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top',
      labels: { usePointStyle: true, padding: 20 }
    },
    title: {
      display: true,
      text: title,
      padding: { top: 10, bottom: 30 },
      font: { size: 16, weight: 'bold' }
    },
    tooltip: {
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      titleColor: '#000',
      bodyColor: '#666',
      borderColor: '#ddd',
      borderWidth: 1,
      callbacks: {
        label: (context) => {
          const label = context.label || '';
          const value = context.raw as number;
          return `${label}: ${new Intl.NumberFormat().format(value)} requests`;
        }
      }
    }
  }
});

const generateTotalChartConfig = (usageState: UsageState | undefined) => {
  if (!usageState?.totalUsage?.serviceUsage) {
    return { data: { labels: [], datasets: [] }, options: getChartOptions('') };
  }
  const services = Object.entries(usageState.totalUsage.serviceUsage);
  return {
    data: {
      labels: services.map(([service]) => service),
      datasets: [{
        data: services.map(([, usage]) => usage.requests),
        backgroundColor: services.map((_, i) => getColorFromIndex(i))
      }]
    },
    options: getChartOptions('Total Usage by Service')
  };
};

const generatePackageChartConfig = (
 usageState: UsageState | undefined,
 serviceType: string
) => {
 if (!usageState) {
   return { 
     data: { labels: [], datasets: [] }, 
     options: getChartOptions('') 
   };
 }
 const packages = usageState?.creditPackages?.active || [];
 return {
   data: {
     labels: packages.map(pkg => pkg.name || 'Unknown Package'),
     datasets: [{
       data: packages.map(pkg => {
         const usage = pkg.serviceUsage[serviceType === 'all' ? Service.AI_API : serviceType];
         return usage?.totalRequestsUsed || 0;
       }),
       backgroundColor: packages.map((_, i) => getColorFromIndex(i))
     }]
   },
   options: getChartOptions('Package Usage Distribution')
 };
};

const generateServiceChartConfig = (
 usageState: UsageState | undefined
) => {
 if (!usageState?.serviceDetails) {
   return { 
     data: { labels: [], datasets: [] }, 
     options: getChartOptions('') 
   };
 }
 const services = Object.entries(usageState.serviceDetails);
 return {
   data: {
     labels: ['AI API Usage', 'Crawl API Usage'],
     datasets: [{
       data: services.map(([_, details]) => details.totalRequestsUsed || 0),
       backgroundColor: [
         '#2C6ECB',
         '#47B881'
       ]
     }]
   },
   options: getChartOptions('Service Usage Distribution')
 };
};

export {
  generatePackageChartConfig,
  generateServiceChartConfig,
  generateTotalChartConfig,
  getChartOptions,
  generateTimeSeriesData,
  getColorFromIndex,
  getBackgroundColorFromIndex,
};

