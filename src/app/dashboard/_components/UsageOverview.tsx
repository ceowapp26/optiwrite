import React, { memo, useState } from 'react';
import {
  Card,
  Text,
  ProgressBar,
  DataTable,
  BlockStack,
  Box,
  Banner,
  Button,
  Tabs,
  Collapsible,
  Icon,
  Modal,
  Grid,
  InlineStack,
  Divider,
  Badge
} from '@shopify/polaris';
import { Service } from '@prisma/client';
import { ChevronDownIcon, ChevronUpIcon, AlertBubbleIcon } from '@shopify/polaris-icons';

interface AIDetails {
  modelName: ModelName;
  inputTokens: number;
  outputTokens: number;
  requestsPerMinuteLimit: number;
  requestsPerDayLimit: number;
  remainingRequestsPerMinute: number;
  remainingRequestsPerDay: number;
  resetTimeForMinuteRequests: number;
  resetTimeForDayRequests: number;
}

interface UsageBaseParams {
  tx: Prisma.TransactionClient;
  usage: Usage;
  service: Service;
  totalRequests?: number;
}

interface AIUsageParams extends UsageBaseParams {
  totalTokens?: number;
  aiDetails: AIDetails;
}

interface UserIds {
  googleUserId?: string;
  associatedUserId?: string;
}

interface ServiceUsageState {
  totalRequests: number;
  remainingRequests: number;
  percentageUsed: number;
  rateLimit?: {
    rpm?: number;
    rpd?: number;
    tpm?: number;
    tpd?: number;
    maxTokens?: number;
  };
}

interface UsageState {
  subscription: {
    id: string | null;
    serviceUsage: {
      [Service.AI_API]?: ServiceUsageState;
      [Service.CRAWL_API]?: ServiceUsageState;
    };
    isApproachingLimit: boolean;
  };
  creditPackages: {
    active: Array<{
      id: string;
      name: string;
      creditsUsed: number;
      creditLimit: number;
      percentageUsed: number;
      remainingCredits: number;
      serviceUsage: {
        [Service.AI_API]?: ServiceUsageState;
        [Service.CRAWL_API]?: ServiceUsageState;
      };
      isExpiringSoon: boolean;
      expiresAt?: Date;
    }>;
    expired: Array<{
      id: string;
      name: string;
      expiredAt: Date;
    }>;
  };
  totalUsage: {
    creditsUsed: number;
    creditLimit: number;
    remainingCredits: number;
    percentageUsed: number;
    isOverLimit: boolean;
    isApproachingLimit: boolean;
  };
  serviceDetails: {
    [Service.AI_API]?: {
      totalRequests: number;
      totalTokens: number;
      inputTokens: number;
      outputTokens: number;
      model: ModelName;
      rateLimits: {
        requestsPerMinuteLimit: number;
        requestsPerDayLimit: number;
        remainingRequestsPerMinute: number;
        remainingRequestsPerDay: number;
        resetTimeForMinuteRequests: Date;
        resetTimeForDayRequests: Date;
        tokensPerMinute: number;
        tokensPerDay: number;
      };
    };
    [Service.CRAWL_API]?: {
      totalRequests: number;
    };
  };
}

interface MetricBoxProps {
  label: string;
  value: string | number;
}

const MetricBox: React.FC<MetricBoxProps> = ({ label, value }) => {
  return (
    <Box
      background="bg-surface-secondary" 
      padding="400"
      borderRadius="200"
      shadow="200"
    >
      <BlockStack gap="300" align="center">
        <Text variant="bodyMd" color="subdued">{label}</Text>
        <Text variant="headingLg" alignment="center">{value}</Text>
      </BlockStack>
    </Box>
  );
};

const UsageOverview: React.FC<{ usageState: UsageState }> = ({ usageState }) => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedPackages, setExpandedPackages] = useState(true);

  const getProgressBarColor = (percentage) => {
    if (percentage >= 90) return 'critical';
    if (percentage >= 70) return 'warning';
    return 'success';
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat().format(num);
  };

  const renderTotalUsageCard = () => (
    <Card>
      <Box padding="400">
        <BlockStack gap="600">
          <InlineStack align="space-between">
            <Text variant="headingLg">Total Usage Overview</Text>
            <Text variant="bodyMd" color="subdued">All services combined</Text>
          </InlineStack>

          <Grid>
            <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 4, lg: 4, xl: 4 }}>
              <MetricBox
                label="Total Credits Used"
                value={formatNumber(usageState?.totalUsage?.creditsUsed)}
              />
            </Grid.Cell>
            <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 4, lg: 4, xl: 4 }}>
              <MetricBox
                label="Remaining Credits"
                value={formatNumber(usageState?.totalUsage?.remainingCredits)}
              />
            </Grid.Cell>
            <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 4, lg: 4, xl: 4 }}>
              <MetricBox
                label="Total Credit Limit"
                value={formatNumber(usageState?.totalUsage?.creditLimit)}
              />
            </Grid.Cell>
          </Grid>

          <BlockStack gap="200">
            <ProgressBar
              progress={usageState?.totalUsage?.percentageUsed}
              color={getProgressBarColor(usageState?.totalUsage?.percentageUsed)}
              size="large"
            />
            <Text variant="bodySm" alignment="end">
              {Math.round(usageState?.totalUsage?.percentageUsed)}% Utilized
            </Text>
          </BlockStack>
        </BlockStack>
      </Box>
    </Card>
  );

  const renderSubscriptionCard = () => {
    if (!usageState?.subscription?.serviceUsage) return null;
    const activePlan = `${usageState?.subscription?.planName} Plan` || 'FREE Plan';
    return (
      <Card>
        <Box padding="400">
          <BlockStack gap="600">
            <InlineStack align="space-between">
              <Text variant="headingLg">Subscription Usage</Text>
              <BlockStack inlineAlign="end" gap="200">
                <Badge size="medium" tone="success">
                  <span className="font-bold text-[16px]">{activePlan}</span>
                </Badge>
                <Text variant="bodySm" color="subdued">Current billing period</Text>
              </BlockStack>
            </InlineStack>
            <Grid>
              <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
                <MetricBox
                  label="Total Credits"
                  value={formatNumber(usageState?.subscription?.creditLimit)}
                />
              </Grid.Cell>
              <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
                <MetricBox
                  label="Remaining Credits"
                  value={formatNumber(usageState?.subscription?.remainingCredits)}
                />
              </Grid.Cell>
            </Grid>
            {usageState?.subscription?.serviceUsage[Service.AI_API] && (
              <>
                <Divider />
                <BlockStack gap="400">
                  <Text variant="headingMd">AI API Usage</Text>
                  <Grid>
                    <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
                      <MetricBox
                        label="Total Credits"
                        value={formatNumber(usageState?.subscription?.serviceUsage[Service.AI_API]?.totalCredits)}
                      />
                    </Grid.Cell>
                    <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
                      <MetricBox
                        label="Remaining Credits"
                        value={formatNumber(usageState?.subscription?.serviceUsage[Service.AI_API]?.remainingCredits)}
                      />
                    </Grid.Cell>
                    <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
                      <MetricBox
                        label="Total Requests"
                        value={formatNumber(usageState?.subscription?.serviceUsage[Service.AI_API]?.totalRequests)}
                      />
                    </Grid.Cell>
                    <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
                      <MetricBox
                        label="Remaining Requests"
                        value={formatNumber(usageState?.subscription?.serviceUsage[Service.AI_API]?.remainingRequests)}
                      />
                    </Grid.Cell>
                  </Grid>
                  <BlockStack gap="200">
                    <ProgressBar
                      progress={usageState?.subscription?.serviceUsage[Service.AI_API]?.percentageUsed}
                      color={getProgressBarColor(usageState?.subscription?.serviceUsage[Service.AI_API]?.percentageUsed)}
                      size="large"
                    />
                    <Text variant="bodySm" alignment="end">
                      {Math.round(usageState?.subscription?.serviceUsage[Service.AI_API]?.percentageUsed)}% Utilized
                    </Text>
                  </BlockStack>
                </BlockStack>
              </>
            )}

            {usageState?.subscription?.serviceUsage[Service.CRAWL_API] && (
              <>
                <Divider />
                <BlockStack gap="400">
                  <Text variant="headingMd">Crawl API Usage</Text>
                  <Grid>
                    <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
                      <MetricBox
                        label="Total Credits"
                        value={formatNumber(usageState?.subscription?.serviceUsage[Service.CRAWL_API]?.totalCredits)}
                      />
                    </Grid.Cell>
                    <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
                      <MetricBox
                        label="Remaining Credits"
                        value={formatNumber(usageState?.subscription?.serviceUsage[Service.CRAWL_API]?.remainingCredits)}
                      />
                    </Grid.Cell>
                    <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
                      <MetricBox
                        label="Total Requests"
                        value={formatNumber(usageState?.subscription?.serviceUsage[Service.CRAWL_API]?.totalRequests)}
                      />
                    </Grid.Cell>
                    <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
                      <MetricBox
                        label="Remaining Requests"
                        value={formatNumber(usageState?.subscription?.serviceUsage[Service.CRAWL_API]?.remainingRequests)}
                      />
                    </Grid.Cell>
                  </Grid>
                  <BlockStack gap="200">
                    <ProgressBar
                      progress={usageState?.subscription?.serviceUsage[Service.CRAWL_API]?.percentageUsed}
                      color={getProgressBarColor(usageState?.subscription?.serviceUsage[Service.CRAWL_API]?.percentageUsed)}
                      size="large"
                    />
                    <Text variant="bodySm" alignment="end">
                      {Math.round(usageState?.subscription?.serviceUsage[Service.CRAWL_API]?.percentageUsed)}% Utilized
                    </Text>
                  </BlockStack>
                </BlockStack>
              </>
            )}
          </BlockStack>
        </Box>
      </Card>
    );
  };

  const renderActivePackages = () => {
    const groupedPackages = usageState?.creditPackages?.active.reduce((acc, pkg) => {
      const groupName = pkg.name.startsWith('CUSTOM_') ? 'CUSTOM' : pkg.name;
      if (!acc[groupName]) {
        acc[groupName] = {
          packages: [],
          totalCreditsUsed: 0,
          totalRemainingCredits: 0,
          totalCreditLimit: 0,
          activeCount: 0,
          serviceUsage: {
            [Service.AI_API]: {
              totalRequests: 0,
              remainingRequests: 0,
              percentageUsed: 0
            },
            [Service.CRAWL_API]: {
              totalRequests: 0,
              remainingRequests: 0,
              percentageUsed: 0
            }
          }
        };
      }
      acc[groupName].packages.push(pkg);
      acc[groupName].totalCreditsUsed += pkg.creditsUsed;
      acc[groupName].totalRemainingCredits += pkg.remainingCredits;
      acc[groupName].totalCreditLimit += pkg.creditLimit;
      acc[groupName].activeCount += 1;
      if (pkg.serviceUsage?.[Service.AI_API]) {
        acc[groupName].serviceUsage[Service.AI_API].totalRequests += pkg.serviceUsage[Service.AI_API].totalRequests;
        acc[groupName].serviceUsage[Service.AI_API].remainingRequests += pkg.serviceUsage[Service.AI_API].remainingRequests;
        acc[groupName].serviceUsage[Service.AI_API].totalCredits += pkg.serviceUsage[Service.AI_API].totalCredits;
        acc[groupName].serviceUsage[Service.AI_API].remainingCredits += pkg.serviceUsage[Service.AI_API].remainingCredits;
        acc[groupName].serviceUsage[Service.AI_API].percentageUsed = 
          (acc[groupName].serviceUsage[Service.AI_API].totalRequests / 
          (acc[groupName].serviceUsage[Service.AI_API].totalRequests + acc[groupName].serviceUsage[Service.AI_API].remainingRequests)) * 100;
      }

      if (pkg.serviceUsage?.[Service.CRAWL_API]) {
        acc[groupName].serviceUsage[Service.CRAWL_API].totalRequests += pkg.serviceUsage[Service.CRAWL_API].totalRequests;
        acc[groupName].serviceUsage[Service.CRAWL_API].remainingRequests += pkg.serviceUsage[Service.CRAWL_API].remainingRequests;
        acc[groupName].serviceUsage[Service.CRAWL_API].totalCredits += pkg.serviceUsage[Service.CRAWL_API].totalCredits;
        acc[groupName].serviceUsage[Service.CRAWL_API].remainingCredits += pkg.serviceUsage[Service.CRAWL_API].remainingCredits;
        acc[groupName].serviceUsage[Service.CRAWL_API].percentageUsed = 
          (acc[groupName].serviceUsage[Service.CRAWL_API].totalRequests / 
          (acc[groupName].serviceUsage[Service.CRAWL_API].totalRequests + acc[groupName].serviceUsage[Service.CRAWL_API].remainingRequests)) * 100;
      }

      return acc;
    }, {});
    const packageOrder = ['SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE', 'CUSTOM'];

    return (
      <Card>
        <Box padding="400">
          <BlockStack gap="400">
            <InlineStack align="space-between">
              <Text variant="headingLg">Package Usage</Text>
              <Button
                plain
                onClick={() => setExpandedPackages(!expandedPackages)}
                icon={expandedPackages ? ChevronUpIcon : ChevronDownIcon}
              />
            </InlineStack>
            <Collapsible open={expandedPackages} id="active-packages-collapsible">
              <Grid>
                {packageOrder.map((packageName) => {
                  const groupData = groupedPackages[packageName];
                  if (!groupData) return null;

                  const percentageUsed = (groupData.totalCreditsUsed / groupData.totalCreditLimit) * 100;
                  
                  return (
                    <Grid.Cell key={packageName} columnSpan={{ xs: 12, sm: 12, md: 6, lg: 6, xl: 6 }}>
                      <Box
                        background="bg-surface-secondary"
                        padding="400"
                        borderRadius="200"
                        shadow="200"
                      >
                        <BlockStack gap="400">
                          <InlineStack align="space-between">
                            <Badge size="large" tone="success">
                              <span className="font-bold text-[16px]">
                                {packageName === 'CUSTOM' ? 'Custom Packages' : packageName}
                              </span>
                            </Badge>
                            <Text variant="bodyLg" tone="success" fontWeight="semibold">
                              {groupData.activeCount} active {groupData.activeCount === 1 ? 'package' : 'packages'}
                            </Text>
                          </InlineStack>
                          <Grid>
                            <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
                              <MetricBox
                                label="Total Credits"
                                value={formatNumber(groupData.totalCreditLimit)}
                              />
                            </Grid.Cell>
                            <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
                              <MetricBox
                                label="Remaining Credits"
                                value={formatNumber(groupData.totalRemainingCredits)}
                              />
                            </Grid.Cell>
                          </Grid>
                          <BlockStack gap="200">
                            <ProgressBar
                              progress={percentageUsed}
                              color={getProgressBarColor(percentageUsed)}
                              size="large"
                            />
                            <Text variant="bodySm" alignment="end">
                              {Math.round(percentageUsed)}% Credits Utilized
                            </Text>
                          </BlockStack>
                          {groupData.serviceUsage[Service.AI_API]?.totalRequests > 0 && (
                            <BlockStack gap="400">
                              <Divider />
                              <Text variant="headingMd">AI API Usage</Text>
                              <Grid>
                                <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
                                  <MetricBox
                                    label="Total Credits"
                                    value={formatNumber(groupData.serviceUsage[Service.AI_API].totalCredits)}
                                  />
                                </Grid.Cell>
                                <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
                                  <MetricBox
                                    label="Remaining Credits"
                                    value={formatNumber(groupData.serviceUsage[Service.AI_API].remainingCredits)}
                                  />
                                </Grid.Cell>
                                <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
                                  <MetricBox
                                    label="Total Requests"
                                    value={formatNumber(groupData.serviceUsage[Service.AI_API].totalRequests)}
                                  />
                                </Grid.Cell>
                                <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
                                  <MetricBox
                                    label="Remaining Requests"
                                    value={formatNumber(groupData.serviceUsage[Service.AI_API].remainingRequests)}
                                  />
                                </Grid.Cell>
                              </Grid>
                              <ProgressBar
                                progress={groupData.serviceUsage[Service.AI_API].percentageUsed}
                                color={getProgressBarColor(groupData.serviceUsage[Service.AI_API].percentageUsed)}
                                size="large"
                              />
                            </BlockStack>
                          )}
                          {groupData.serviceUsage[Service.CRAWL_API]?.totalRequests > 0 && (
                            <BlockStack gap="400">
                              <Divider />
                              <Text variant="headingMd">Crawl API Usage</Text>
                              <Grid>
                                <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
                                  <MetricBox
                                    label="Total Credits"
                                    value={formatNumber(groupData.serviceUsage[Service.CRAWL_API].totalCredits)}
                                  />
                                </Grid.Cell>
                                <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
                                  <MetricBox
                                    label="Remaining Credits"
                                    value={formatNumber(groupData.serviceUsage[Service.CRAWL_API].remainingCredits)}
                                  />
                                </Grid.Cell>

                                <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
                                  <MetricBox
                                    label="Total Requests"
                                    value={formatNumber(groupData.serviceUsage[Service.CRAWL_API].totalRequests)}
                                  />
                                </Grid.Cell>
                                <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
                                  <MetricBox
                                    label="Remaining Requests"
                                    value={formatNumber(groupData.serviceUsage[Service.CRAWL_API].remainingRequests)}
                                  />
                                </Grid.Cell>
                              </Grid>
                              <ProgressBar
                                progress={groupData.serviceUsage[Service.CRAWL_API].percentageUsed}
                                color={getProgressBarColor(groupData.serviceUsage[Service.CRAWL_API].percentageUsed)}
                                size="large"
                              />
                            </BlockStack>
                          )}
                          {groupData.packages.some(pkg => pkg.isExpiringSoon) && (
                            <Banner tone="warning" icon={AlertBubbleIcon}>
                              Some packages in this group are expiring soon
                            </Banner>
                          )}
                        </BlockStack>
                      </Box>
                    </Grid.Cell>
                  );
                })}
              </Grid>
            </Collapsible>
          </BlockStack>
        </Box>
      </Card>
    );
  };

  const renderServiceMetrics = (service: Service) => (
    <Card>
      <Box padding="400">
        <BlockStack gap="600">
          <InlineStack align="space-between">
            <Text variant="headingLg">
              {service === Service.AI_API ? 'AI API Usage' : 'Crawl API Usage'}
            </Text>
            <Text variant="bodyMd" color="subdued">Including both active subscription and packages</Text>
          </InlineStack>

          <Divider />
          
          <Grid>
            <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 4, lg: 4, xl: 4 }}>
              <MetricBox
                label="Total Requests"
                value={formatNumber(usageState.serviceDetails[service].totalRequests)}
              />
            </Grid.Cell>
            <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 4, lg: 4, xl: 4 }}>
              <MetricBox
                label="Used Requests"
                value={formatNumber(usageState.serviceDetails[service].totalRequestsUsed)}
              />
            </Grid.Cell>
            <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 4, lg: 4, xl: 4 }}>
              <MetricBox
                label="Remaining"
                value={formatNumber(usageState.serviceDetails[service].totalRemainingRequests)}
              />
            </Grid.Cell>
          </Grid>

          {service === Service.AI_API && (
            <>
              <Divider />
              <BlockStack gap="400">
                <Text variant="headingMd">Token Consumption Analysis</Text>
                <Grid>
                  <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 4, lg: 4, xl: 4 }}>
                    <MetricBox
                      label="Input Tokens"
                      value={formatNumber(usageState.serviceDetails[service].inputTokens)}
                    />
                  </Grid.Cell>
                  <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 4, lg: 4, xl: 4 }}>
                    <MetricBox
                      label="Output Tokens"
                      value={formatNumber(usageState.serviceDetails[service].outputTokens)}
                    />
                  </Grid.Cell>
                  <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 4, lg: 4, xl: 4 }}>
                    <MetricBox
                      label="Total Tokens"
                      value={formatNumber(usageState.serviceDetails[service].totalTokens)}
                    />
                  </Grid.Cell>
                </Grid>
              </BlockStack>
            </>
          )}

          <BlockStack gap="200">
            <Text variant="bodyMd">Usage Progress</Text>
            <ProgressBar
              progress={usageState.serviceDetails[service].percentageUsed}
              color={getProgressBarColor(usageState.serviceDetails[service].percentageUsed)}
              size="large"
            />
            <Text variant="bodySm" alignment="end">
              {Math.round(usageState.serviceDetails[service].percentageUsed)}% Utilized
            </Text>
          </BlockStack>
        </BlockStack>
      </Box>
    </Card>
  );

  return (
    <BlockStack gap="400">
      {usageState?.totalUsage?.isApproachingLimit && (
        <Banner
          title="Usage Alert"
          tone="warning"
        >
          <p>You are approaching your usage limits. Consider purchasing additional credits to ensure uninterrupted service.</p>
        </Banner>
      )}
      {renderTotalUsageCard()}
      <Tabs
        tabs={[
          { content: 'Service Usage', id: 'service' },
          { content: 'Subsription Usage', id: 'subscription' },
          { content: 'Package Usage', id: 'package' },
          { content: 'Rate Limits', id: 'limits' }
        ]}
        selected={selectedTab}
        onSelect={setSelectedTab}
      />
      <Box>
        {selectedTab === 0 && (
          <BlockStack gap="400">
            {renderServiceMetrics(Service.AI_API)}
            {renderServiceMetrics(Service.CRAWL_API)}
          </BlockStack>
        )}
        {selectedTab === 1 && (
          <BlockStack gap="400">
            {renderSubscriptionCard()}
          </BlockStack>
        )}
        {selectedTab === 2 && (
          <BlockStack gap="400">
            {renderActivePackages()}
          </BlockStack>
        )}
        {selectedTab === 3 && (
          <Card>
            <BlockStack gap="400">
              <Box paddingInline="300">
                <BlockStack gap="300">
                  <Text variant="headingLg" as="h2">AI API Rate Limits</Text>
                  <Box paddingBlock="100">
                    <Badge size="large" tone="info">
                      <strong className="text-[16px]">Model: {usageState.serviceDetails[Service.AI_API].model}</strong>
                    </Badge>
                  </Box>
                </BlockStack>
              </Box>
              <DataTable
                columnContentTypes={['text', 'numeric', 'numeric']}
                headings={['Metric', 'Limit', 'Remaining']}
                rows={[
                  ['Requests/Minute', 
                   usageState.serviceDetails[Service.AI_API].rateLimits.requestsPerMinuteLimit,
                   usageState.serviceDetails[Service.AI_API].rateLimits.remainingRequestsPerMinute],
                  ['Requests/Day',
                   usageState.serviceDetails[Service.AI_API].rateLimits.requestsPerDayLimit,
                   usageState.serviceDetails[Service.AI_API].rateLimits.remainingRequestsPerDay],
                  ['Tokens/Minute',
                   usageState.serviceDetails[Service.AI_API].rateLimits.tokensPerMinute,
                   '-'],
                  ['Tokens/Day',
                   usageState.serviceDetails[Service.AI_API].rateLimits.tokensPerDay,
                   '-']
                ]}
              />
            </BlockStack>
          </Card>
        )}
      </Box>
    </BlockStack>
  );
};

export default memo(UsageOverview);