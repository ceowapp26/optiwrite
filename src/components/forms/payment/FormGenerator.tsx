import React from 'react';
import { type LucideIcon } from 'lucide-react';
import {
  TextField,
  Select,
  TextContainer,
  Box,
  InlineStack,
  Text
} from '@shopify/polaris';
import {
  FieldErrors,
  FieldValues,
  UseFormRegister,
  Control,
  Controller,
  UseFormSetValue,
} from 'react-hook-form';

type Props = {
  type: 'text' | 'email' | 'number' | 'date';
  inputType: 'select' | 'input' | 'textarea';
  prefix?: '$' | 'USD';
  suffix?: 'kg' | 'USD';
  multiline?: string;
  options?: { value: string; label: string; id: string }[];
  label?: string;
  placeholder: string;
  register: UseFormRegister<FieldValues>;
  name: string;
  errors: FieldErrors;
  control: Control;
  setValue: UseFormSetValue<FieldValues>;
  lines?: number;
  form?: string;
  defaultValue?: string;
  icon?: LucideIcon;
  editable?: boolean;
  autoSize?: boolean;
  maxLength?: number;
  showCharacterCount?: boolean;
};

const FormGenerator = ({
  errors,
  inputType,
  name,
  prefix,
  suffix,
  multiline,
  placeholder,
  defaultValue,
  showCharacterCount,
  maxLength,
  autoSize = false,
  register,
  setValue,
  type,
  form,
  control,
  label,
  lines,
  options,
  icon: Icon,
  editable,
}: Props) => {
  const renderInput = () => {
    switch (inputType) {
      case 'input':
        return (
          <Box className="px-12">
            <div className="flex relative py-4 items-center">
              <InlineStack blockAlign="center" align="start" gap="200">
                {name !== "currency" && Icon && (
                  <div className="mt-7">
                    <Icon className="w-6 h-6" />
                  </div>
                )}
                <Controller
                  name={name}
                  control={control}
                  defaultValue={(() => {
                    if (type === 'number') {
                      return defaultValue === '' ? '' : Number(defaultValue);
                    }
                    return defaultValue;
                  })()}
                  rules={{
                    required: true,
                    ...(type === 'number' ? {
                      valueAsNumber: true,
                      validate: value => !isNaN(value) || 'Must be a number'
                    } : {})
                  }}
                  render={({ field }) => (
                    name !== "currency" ? (
                      <div className="xl:min-w-[500px]">
                        <TextField
                          label={label}
                          placeholder={placeholder}
                          value={field.value}
                          onChange={(newValue) => {
                            if (type === 'number') {
                              field.onChange(Number(newValue));
                            }
                          }}
                          onBlur={field.onBlur}
                          error={errors[name]?.message as string}
                          type={type}
                          disabled={name === "package" ? true : editable === false}
                          {...(multiline && { multiline: parseInt(multiline) })}
                          {...(showCharacterCount && { showCharacterCount: true })}
                          {...(autoSize && { autoSize: true })}
                          {...(maxLength && { maxLength: parseInt(maxLength) })}
                          prefix={prefix}
                          suffix={suffix}
                        />
                      </div>
                    ) : null
                  )}
                />
              </InlineStack>
              {errors[name] && (
                <Box paddingBlockStart="200">
                  <Text tone="critical">
                    {errors[name]?.message as string}
                  </Text>
                </Box>
              )}
            </div>
          </Box>
        );

      case 'select':
        return (
          <Controller
            name={name}
            control={control}
            defaultValue={defaultValue || ''}
            render={({ field }) => (
              <Select
                label={label}
                options={options?.map(option => ({
                  label: option.label,
                  value: option.value,
                }))}
                value={field.value}
                onChange={field.onChange}
                error={errors[name]?.message as string}
              />
            )}
          />
        );

      case 'textarea':
        return (
          <Controller
            name={name}
            control={control}
            defaultValue={defaultValue || ''}
            render={({ field }) => (
              <TextField
                label={label}
                placeholder={placeholder}
                value={field.value}
                onChange={field.onChange}
                error={errors[name]?.message as string}
                multiline={lines}
              />
            )}
          />
        );

      default:
        return null;
    }
  };

  return renderInput();
};

export default FormGenerator;