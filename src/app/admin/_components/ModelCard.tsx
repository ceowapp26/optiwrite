import { Card, TextContainer, Text, ButtonGroup, Button, Box } from '@shopify/polaris';
import { AIModel } from '@prisma/client';

interface ModelCardProps {
  model: AIModel;
  onEdit: (model: AIModel) => void;
  onDelete: (id: string) => void;
}

export function ModelCard({ model, onEdit, onDelete }: ModelCardProps) {
  return (
    <Card>
      <Box>
        <Text variant="headingMd" as="h2">{model.name}</Text>
        <Text>Version: {model.version}</Text>
        <Text>Input Tokens: {model.inputTokens}</Text>
        <Text>Output Tokens: {model.outputTokens}</Text>
        <Text>Max Tokens: {model.maxTokens}</Text>
        <Text>RPM: {model.RPM}</Text>
        <Text>RPD: {model.RPD}</Text>
        {model.TPM && <Text>TPM: {model.TPM}</Text>}
        {model.TPD && <Text>TPD: {model.TPD}</Text>}
      </Box>
      <Box>
        <ButtonGroup>
          <Button onClick={() => onEdit(model)}>Edit</Button>
          <Button destructive onClick={() => onDelete(model.id)}>Delete</Button>
        </ButtonGroup>
      </Box>
    </Card>
  );
}