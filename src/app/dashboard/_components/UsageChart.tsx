import React, { memo, useEffect, useRef } from 'react';
import {
  Card,
  Select,
  BlockStack,
  Box,
} from '@shopify/polaris';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import { Pie } from 'react-chartjs-2';
import { 
  generatePackageChartConfig, 
  generateServiceChartConfig, 
  generateTotalChartConfig 
} from '@/utils/billing/billingHelpers';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend
);

const defaultOptions: ChartOptions<'pie'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top',
      labels: {
        usePointStyle: true,
        padding: 20
      }
    },
    tooltip: {
      callbacks: {
        label: (context) => {
          const label = context.label || '';
          const value = context.raw;
          return `${label}: ${value}%`;
        }
      }
    }
  }
};

const viewOptions = [
  { label: 'Total Usage', value: 'total' },
  { label: 'By Package', value: 'package' },
  { label: 'By Service', value: 'service' },
];

const serviceOptions = [
  { label: 'All Services', value: 'all' },
  { label: 'AI API', value: 'ai' },
  { label: 'Crawl API', value: 'crawl' },
];

const UsageChart: React.FC<{ usageState: UsageState }> = ({ usageState }) => {
  const [selectedView, setSelectedView] = React.useState('total');
  const [serviceType, setServiceType] = React.useState('all');
  const chartInstance = useRef<ChartJS | null>(null);

  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, []);

  const chartConfig = React.useMemo(() => {
    let config;
    switch(selectedView) {
      case 'package':
        config = generatePackageChartConfig(usageState, serviceType);
        break;
      case 'service':
        config = generateServiceChartConfig(usageState);
        break;
      default:
        config = generateTotalChartConfig(usageState);
    }
    return {
      data: config.data,
      options: {
        ...defaultOptions,
        ...config.options
      }
    };
  }, [selectedView, serviceType, usageState]);

  const handleViewChange = (value: string) => {
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }
    setSelectedView(value);
    if (value !== 'package') {
      setServiceType('all');
    }
  };

  return (
    <Card>
      <Box padding="400">
        <BlockStack gap="400">
          <BlockStack gap="400" align="center">
            <Select
              label="View"
              options={viewOptions}
              onChange={handleViewChange}
              value={selectedView}
            />
            <Select
              label="Service"
              options={serviceOptions}
              onChange={setServiceType}
              value={serviceType}
              disabled={selectedView !== 'package'}
            />
          </BlockStack>
          <div className="h-96 w-full mt-6">
            <Pie
              ref={(reference) => {
                if (reference) {
                  chartInstance.current = reference;
                }
              }}
              data={chartConfig.data}
              options={chartConfig.options}
              key={`${selectedView}-${serviceType}`}
            />
          </div>
        </BlockStack>
      </Box>
    </Card>
  );
};

export default memo(UsageChart);