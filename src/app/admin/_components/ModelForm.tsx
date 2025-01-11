import React, { useEffect } from 'react';
import { Form, FormLayout, TextField, Button, Select } from '@shopify/polaris';
import { useCallback, useState } from 'react';
import { modelOptions } from '@/constants/ai';
import { AIModel } from '@prisma/client';

interface ModelFormProps {
  initialModel?: AIModel;
  onSubmit: (modelData: Partial<AIModel>) => Promise<void>;
}

export function ModelForm({ initialModel, onSubmit }: ModelFormProps) {
  const [model, setModel] = useState<Partial<AIModel>>(initialModel || {
    name: 'gpt_3_5_turbo',
    version: '',
    description: '',
    inputTokens: 0,
    outputTokens: 0,
    maxTokens: 0,
    RPM: 0,
    RPD: 0,
    TPM: 0,
    TPD: 0,
  });

  useEffect(() => {
    if (initialModel) {
      setModel({
        name: initialModel.name || 'gpt_3_5_turbo',
        description: initialModel.description || '',
        inputTokens: initialModel.inputTokens || 0,
        outputTokens: initialModel.outputTokens || 0,
        RPM: initialModel.RPM || 0,
        RPD: initialModel.RPD || 0,
        TPM: initialModel.TPM || 0,
        TPD: initialModel.TDP || 0,
      });
    }
  }, [initialModel]);

  const handleSubmit = useCallback(async () => {
    await onSubmit(model);
  }, [model, onSubmit]);

  const handleChange = useCallback((value: string, id: string) => {
    setModel(prev => ({ ...prev, [id]: value }));
  }, []);

  const options = modelOptions.map(name => ({
    label: name,
    value: name,
  }));

  return (
    <Form onSubmit={handleSubmit}>
      <FormLayout>
        <Select
          label="Model Name"
          options={options}
          value={model.name}
          onChange={value => handleChange(value, 'name')}
        />
        <TextField
          label="Version"
          value={model.version}
          onChange={value => handleChange(value, 'version')}
          autoComplete="off"
        />
        <TextField
          label="Description"
          value={model.description || ''}
          onChange={value => handleChange(value, 'description')}
          multiline={4}
        />
        <TextField
          label="Input Tokens"
          type="number"
          value={String(model.inputTokens)}
          onChange={value => handleChange(value, 'inputTokens')}
        />
        <TextField
          label="Output Tokens"
          type="number"
          value={String(model.outputTokens)}
          onChange={value => handleChange(value, 'outputTokens')}
        />
        <TextField
          label="Max Tokens"
          type="number"
          value={String(model.maxTokens)}
          onChange={value => handleChange(value, 'maxTokens')}
        />
        <TextField
          label="RPM"
          type="number"
          value={String(model.RPM)}
          onChange={value => handleChange(value, 'RPM')}
        />
        <TextField
          label="RPD"
          type="number"
          value={String(model.RPD)}
          onChange={value => handleChange(value, 'RPD')}
        />
        <TextField
          label="TPM"
          type="number"
          value={String(model.TPM)}
          onChange={value => handleChange(value, 'TPM')}
        />
        <TextField
          label="TPD"
          type="number"
          value={String(model.TPD)}
          onChange={value => handleChange(value, 'TPD')}
        />
        <Button submit>Submit</Button>
      </FormLayout>
    </Form>
  );
}