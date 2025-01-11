import { Card, Button, Text, BlockStack } from '@shopify/polaris';

interface PlanCardProps {
  name: string;
  price: number;
  interval: string;
  features: {
    aiAPILimit: number;
    crawlAPILimit: number;
  };
  isSelected?: boolean;
  onSubscribe: () => void;
}

export function PlanCard({
  name,
  price,
  interval,
  features,
  isSelected,
  onSubscribe
}: PlanCardProps) {
  return (
    <Card sectioned>
      <BlockStack vertical spacing="tight">
        <Text variation="strong">{name}</Text>
        <div className="text-3xl font-bold">
          ${price}/{interval.toLowerCase()}
        </div>
        <BlockStack vertical spacing="tight">
          <Text>{features.crawlAPILimit} URL crawls/month</Text>
          <Text>{features.aiAPILimit} AI tokens/month</Text>
        </BlockStack>
        <Button
          primary={isSelected}
          onClick={onSubscribe}
          fullWidth
        >
          Subscribe
        </Button>
      </BlockStack>
    </Card>
  );
}