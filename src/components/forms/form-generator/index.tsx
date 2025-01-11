import React, { useState, useEffect, useMemo } from 'react';
import { LightbulbIcon } from '@shopify/polaris-icons';
import { CONTENT } from '@/types/content';
import { LengthConstraintSchema } from '@/schemas/content.schema';
import { type LucideIcon } from 'lucide-react';
import { AIError } from '@/types/ai';
import { processJsonData } from '@/utils/data';
import { useAppSelector } from '@/hooks/useLocalStore';
import { useContextStore } from "@/hooks/useLocalStore";
import { type ProductUpdate } from '@/context/GeneralContextProvider';
import { toast } from 'sonner'
import { Box, Text, InlineStack, TextField, Tag, Tooltip, Select, Button, Checkbox, DatePicker, BlockStack } from '@shopify/polaris';
import { FieldErrors, FieldValues, UseFormRegister, UseFormTrigger, Control, Controller, UseFormSetValue, UseFormWatch } from 'react-hook-form';

const KeyboardEventWrapper: React.FC<{ children: React.ReactNode; onKeyDown: (event: React.KeyboardEvent) => void; isEdit: boolean; isSEOEdit: boolean; }> = ({ children, onKeyDown, isEdit, isSEOEdit }) => {
  const handleKeyDown = (event: React.KeyboardEvent) => {
    onKeyDown(event);
  };
  return (
    <div className={(!isEdit || !isSEOEdit) ? "min-w-80" : "w-full"} onKeyDown={handleKeyDown}>
      {children}
    </div>
  );
};

type Props = {
  type: 'text' | 'email' | 'phone' | 'password' | 'otp' | 'number' | 'date';
  prefix?: '$' | 'USD';
  suffix?: 'kg' | 'USD';
  inputType: 'select' | 'input' | 'textarea' | 'phone-input';
  options?: { value: string; label: string; id: string }[];
  label?: string;
  multiline?: string;
  maxLength?: number;
  showCharacterCount?: boolean;
  autoSize?: boolean;
  editable?: boolean;
  placeholder: string;
  register: UseFormRegister<FieldValues>;
  name: string;
  shopName?: string;
  userId?: string;
  content?: CONTENT;
  aiErrors?: AIError[];
  setAiErrors?: React.Dispatch<React.SetStateAction<AIError[]>>;
  errors: FieldErrors<FieldValues>;
  control: Control<FieldValues, any>;
  trigger?: UseFormTrigger<FieldValues>;
  setValue?: UseFormSetValue<FieldValues>;
  watch?: UseFormWatch<FieldValues>;
  lines?: number;
  defaultValue?: string;
  icon?: LucideIcon;
  isSEO?: boolean;
  isSEOEdit?: boolean;
  isEdit?: boolean;
  aiEnabled?: boolean;
  isAiLoading?: boolean;
  setIsAiLoading?: React.Dispatch<React.SetStateAction<boolean>>;
  activeProduct?: string;
  products?: PRODUCT[];
  setContents?: (value: PRODUCT[]) => void;
  setContent?: (value: ProductUpdate) => void;
  setEditProduct?: (value: ProductUpdate) => void;
  onUpdateProduct?: (value: ProductUpdate) => void;
  handleShopifyAI?: (action: string, content: string) => Promise<any>;
};

const FormGenerator: React.FC<Props> = ({
  errors,
  aiErrors,
  setAiErrors,
  inputType,
  editable,
  name,
  suffix,
  prefix,
  shopName,
  userId,
  placeholder,
  defaultValue,
  register,
  setValue,
  watch,
  multiline,
  maxLength,
  autoSize,
  showCharacterCount,
  type,
  control,
  trigger,
  label,
  lines,
  options,
  icon: Icon,
  aiEnabled = false,
  isSEO = false,
  isSEOEdit = false,
  isEdit = false,
  isAiLoading,
  setIsAiLoading,
  handleShopifyAI,
  setContent,
  activeProduct,
  products,
  setContents,
  setEditProduct,
  onUpdateProduct,
  content,
}) => {
  const [chipItems, setChipItems] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [loadingFields, setLoadingFields] = useState<Record<string, boolean>>({});
  const [isEditting, setIsEditting] = useState<Record<string, boolean>>({});
  const aiErrorState = useMemo(() => {
    if (!aiErrors || aiErrors.length === 0) return null;
    return aiErrors.find(error => error.name === name);
  }, [aiErrors, name]);

  useEffect(() => {
    try {
      if (name === 'tags' || name === 'blog_tags' || name === 'article_tags' || name === 'images') {
        if (typeof defaultValue === 'string' && defaultValue.trim() !== '') {
          const trimmedItems = defaultValue.split(',').map(item => item.trim());
          setChipItems(trimmedItems);
          setValue?.(name, defaultValue.trim());
        } else if (Array.isArray(defaultValue)) {
          setChipItems(defaultValue);
          setValue?.(name, defaultValue);
        }
      } else if (name === 'status' && (!defaultValue || defaultValue.trim() === '')) {
        setValue?.(name, options?.[0]?.value);
      } else if (name === 'user_id' && userId) {
        setValue?.(name, userId.toString());
      } else if (['options', 'variants', 'blog_metafield', 'article_metafield', 'input_data'].includes(name)) {
        const processedValue = processJsonData(defaultValue);
        setValue?.(name, processedValue);
      } else {
        setValue?.(name, defaultValue);
      }
      if (trigger) {
        Promise.resolve(trigger(name)).catch(error => {
          console.error('Error triggering validation:', error);
        });
      }
    } catch (error) {
      console.error('Error in form field initialization:', error);
    }
  }, [name, defaultValue, setValue, trigger, userId, options]);

  const handleTextFieldChange = (value: string) => {
    setInputValue(value);
  };

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !chipItems.includes(trimmedTag)) {
      const newItems = [...chipItems, trimmedTag];
      setChipItems(newItems);
      if (name === 'tags' || name === 'blog_tags' || name === 'article_tags') {
        setValue(name, newItems.join(', '));
      } else {
        setValue(name, newItems);
      }
      setInputValue('');
    }
  };

  const handleTagInput = (value: string) => {
    if (value.endsWith(',')) {
      const newTag = value.slice(0, -1).trim();
      if (newTag) {
        addTag(newTag);
        return '';
      }
    }
    return value;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      addTag(inputValue);
    }
  };

  const handleChipRemove = (itemToRemove: string) => {
    const newItems = chipItems.filter(item => item !== itemToRemove);
    setChipItems(newItems);
    if (name === 'tags' || name === 'blog_tags' || name === 'article_tags') {
      setValue(name, newItems.join(', '));
    } else {
      setValue(name, newItems);
    }
  };

  const handleAIGenerate = async () => {
    const currentValue = watch(name);
    try {
      const validation = LengthConstraintSchema.shape[name].safeParse(currentValue);      
      if (!validation.success) {
        toast.error(validation.error.errors[0].message, {
          duration: 5000,
          position: 'top-center',
          icon: '❌'
        });
        return;
      }
      setLoadingFields(prev => ({ ...prev, [name]: true }));
      const inputData = {
        description: currentValue,
        sections: content?.input?.sections,
        tone: content?.input?.tone,
        length: content?.input?.length,
        includedFields: [name],
      };
      const result = await handleShopifyAI(shopName, userId, `SINGLE_${content?.input?.category}`, inputData);
      if (result && result[name]) {
        setValue(name, result[name], {
          shouldValidate: true,
          shouldDirty: true,
          shouldTouch: true,
        });
        Promise.resolve(trigger(name)).catch(error => {
          console.error('Error triggering validation:', error);
        });
        setContent({ [name]: result[name] || prevProduct[name] });
      }
    } catch (error) {
      toast.error(error.message, {
        duration: 5000,
        position: 'top-center',
        icon: '❌'
      });
    } finally {
      setLoadingFields(prev => ({ ...prev, [name]: false }));
    }
  };

  const tagMarkup = chipItems.map((option) => (
    <Box key={option}>
      <div className="max-w-20 truncate">
        <Tag onRemove={() => handleChipRemove(option)}>{option}</Tag>
      </div>
    </Box>
  ));

  const isLoading = useMemo(() => {
    return loadingFields[name] ? loadingFields[name] : isAiLoading;
  }, [loadingFields, name, isAiLoading]);

  const renderInput = () => {
    switch (inputType) {
     case 'input':
      return (
        <div className="relative py-1 w-full">
          {['tags', 'images', 'blog_tags', 'article_tags', 'article_images'].includes(name) ? (
            <Box>
              <div className="relative">
                <InlineStack blockAlign="center" align="space-between">
                  <Controller
                    name={name}
                    control={control}
                    defaultValue=""
                    render={({ field }) => (
                      <KeyboardEventWrapper isSEOEdit={isSEOEdit} isEdit={isEdit} onKeyDown={handleKeyDown}>
                        <TextField
                          label={label}
                          value={inputValue || ''}
                          onChange={(newValue) => {
                            const processed = handleTagInput(newValue);
                            setIsEditting(prev => ({ ...prev, [name]: true }));
                            handleTextFieldChange(processed);
                            if (name === 'tags') {
                              field.onChange(chipItems.join(', '));
                            }
                          }}
                          onBlur={(e) => {
                            if (inputValue.trim()) {
                              addTag(inputValue);
                            }
                            field.onBlur();
                          }}
                          placeholder={placeholder}
                        />
                      </KeyboardEventWrapper>
                    )}
                  />
                  {aiEnabled && (
                    <div className="mt-7">
                      <Tooltip content={`Generate AI content for ${label}`}>
                        <Button
                          disabled={isLoading}
                          icon={LightbulbIcon}
                          onClick={handleAIGenerate}
                          loading={isLoading}
                        />
                      </Tooltip>
                    </div>
                  )}
                </InlineStack>
              </div>
              <Box paddingBlockEnd="300" />
              <InlineStack gap="200">
                {tagMarkup}
              </InlineStack>
            </Box>
          ) : isEdit && (['tags', 'images', 'blog_tags', 'article_tags', 'article_images'].includes(name)) ? (
            <Box>
              <div className="relative py-1">
                <Controller
                  name={name}
                  control={control}
                  defaultValue=""
                  render={({ field }) => (
                    <KeyboardEventWrapper isSEOEdit={isSEOEdit} isEdit={isEdit} onKeyDown={handleKeyDown}>
                      <TextField
                        label={label}
                        value={inputValue || ''}
                        onChange={(newValue) => {
                          const processed = handleTagInput(newValue);
                          setIsEditting(prev => ({ ...prev, [name]: true }));
                          handleTextFieldChange(processed);
                          if (name === 'tags') {
                            field.onChange(chipItems.join(', '));
                          }
                        }}
                        onBlur={(e) => {
                          if (inputValue.trim()) {
                            addTag(inputValue);
                          }
                          field.onBlur();
                        }}
                        placeholder={placeholder}
                      />
                    </KeyboardEventWrapper>
                  )}
                />
              </div>
              <Box paddingBlockEnd="300" />
              <InlineStack gap="200">
                {tagMarkup}
              </InlineStack>
            </Box>
          ) : aiEnabled && 
              ([
                'title',
                'blog_feedburner',
                'blog_feedburner_location',
                'handle',
                'product_type',
                'template_suffix',
                'metafields',
                'author',
                'article_summary_html',
                'vendor',
                'options',
                'variants',
                'seo',
                'page_title',
                'meta_description',
                'input_data',
                'blog_handle',
                'blog_title',
                'blog_tags',
                'blog_template_suffix',
                'blog_metafield',
                'article_title',
                'article_handle',
                'article_metafield',
                'article_tags',
                'article_template_suffix',
                'user_id',
              ].includes(name)) ? (
            <div className="relative w-full">
              <InlineStack blockAlign="start" align="start" gap="300" wrap={false}>
                <Controller
                  name={name}
                  control={control}
                  defaultValue={(() => {
                    let processedValue = defaultValue;
                    if (type === 'number') {
                      return defaultValue === '' ? '' : Number(defaultValue);
                    } 
                    return processedValue;
                  })()}
                  rules={{
                    required: true,
                    ...(type === 'number' ? {
                      valueAsNumber: true,
                      validate: value => !isNaN(value) || 'Must be a number'
                    } : {})
                  }}
                  render={({ field }) => (
                    !['images', 'image', 'input_data', 'user_id'].includes(name) ? (
                      <div className="w-full max-w-[75%]">
                        <TextField
                          label={label}
                          value={(() => {
                            if (['options', 'variants', 'blog_metafield', 'article_metafield', 'input_data'].includes(name)) {
                              return typeof field.value === 'object' || Array.isArray(field.value) 
                                ? JSON.stringify(field.value, null, 2) 
                                : field.value;
                            }
                            return field.value || '';
                          })()}
                          onChange={(newValue) => {
                            let processedValue = newValue;
                            if (type === 'number') {
                              processedValue = newValue === '' ? '' : Number(newValue);
                            } else if (['options', 'variants', 'blog_metafield', 'article_metafield', 'input_data'].includes(name)) {
                              try {
                                processedValue = processJsonData(newValue);
                              } catch (e) {
                                processedValue = newValue;
                              }
                            }
                            setContent({ [name]: newValue });
                            setIsEditting(prev => ({ ...prev, [name]: true }));
                            field.onChange(processedValue);
                          }}
                          prefix={prefix}
                          suffix={suffix}
                          onBlur={field.onBlur}
                          type={type}
                          id={name}
                          disabled={['input_data', 'user_id'].includes(name) ? true : false}
                          autoComplete="off"
                          error={errors[name] ? errors[name]?.message : null}
                          placeholder={placeholder}
                          {...(multiline && { multiline: parseInt(multiline) })}
                          {...(showCharacterCount && { showCharacterCount: true })}
                          {...(maxLength && { maxLength: parseInt(maxLength) })}
                          {...(autoSize && { autoSize: true })}
                        />
                      </div>
                    ) : null
                  )}
                />
                {!["images", "input_data", "user_id", "article_author"].includes(name) && (
                  <div className="mt-7">
                    <Tooltip content={`Generate AI content for ${label}`}>
                      <Button
                        disabled={isLoading}
                        icon={LightbulbIcon}
                        onClick={handleAIGenerate}
                        loading={isLoading}
                      />
                    </Tooltip>
                  </div>
                )}
              </InlineStack>
            </div>
          ) : !aiEnabled && isSEOEdit ? (
            <Box paddingBlock='500'>
              <Controller
                name={name}
                control={control}
                defaultValue={(() => {
                  if (type === 'number') {
                    return defaultValue === '' ? '' : Number(defaultValue);
                  }
                  if (['technical', 'faq', 'review', 'product'].includes(name)) {
                    return typeof defaultValue === 'object' 
                      ? JSON.stringify(defaultValue, null, 2) 
                      : defaultValue;
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
                  name !== "images" ? (
                    <div className={!isEdit ? "min-w-80" : "w-full"}>
                      <TextField
                        label={label}
                        value={(() => {
                          if (['technical', 'faq', 'review', 'product'].includes(name)) {
                            return typeof field.value === 'object'
                              ? JSON.stringify(field.value, null, 2)
                              : field.value;
                          }
                          return field.value || '';
                        })()}
                        onChange={(newValue) => {
                          let processedValue = newValue;
                          if (type === 'number') {
                            processedValue = newValue === '' ? '' : Number(newValue);
                          } else if (['product', 'technical', 'faq', 'review'].includes(name)) {
                            try {
                              processedValue = processJsonData(newValue);
                            } catch (e) {
                              processedValue = newValue;
                            }
                          }
                          setIsEditting(prev => ({ ...prev, [name]: true }));
                          setEditProduct({ [name]: newValue });
                          field.onChange(processedValue);
                        }}
                        prefix={prefix}
                        suffix={suffix}
                        onBlur={field.onBlur}
                        type={type}
                        autoComplete="off"
                        disabled={name ==="input_data" ? true : false}
                        error={errors[name] ? errors[name]?.message : null}
                        placeholder={placeholder}
                        {...(multiline && { multiline: parseInt(multiline) })}
                        {...(showCharacterCount && { showCharacterCount: true })}
                        {...(maxLength && { maxLength: parseInt(maxLength) })}
                        {...(autoSize && { autoSize: true })}
                      />
                    </div>
                  ) : null
                )}
              />
            </Box>
          ) : (
            <Box paddingBlock='500'>
              <Controller
                name={name}
                control={control}
                defaultValue={
                  type === 'number' ? (defaultValue === '' ? '' : Number(defaultValue)) : defaultValue}
                rules={{
                  required: true,
                  ...(type === 'number' ? {
                    valueAsNumber: true,
                    validate: value => !isNaN(value) || 'Must be a number'
                  } : {})
                }}
                render={({ field }) => (
                  !['images', 'input_data'].includes(name) ? (
                    <div className={!isEdit ? "min-w-80" : "w-full"}>
                      <TextField
                        label={label}
                        value={field.value || ''}
                        onChange={(newValue) => {
                          const processedValue = type === 'number' ? (newValue === '' ? '' : Number(newValue)) : newValue;
                          setIsEditting(prev => ({ ...prev, [name]: true }));
                          setContent({ [name]: newValue });
                          field.onChange(processedValue);
                        }}
                        prefix={prefix}
                        suffix={suffix}
                        onBlur={field.onBlur}
                        type={type}
                        autoComplete="off"
                        error={errors[name] ? errors[name]?.message : null}
                        placeholder={placeholder}
                        disabled={name ==="productId" ? true : false}
                        {...(editable && { disabled: !editable })}
                        {...(multiline && { multiline: parseInt(multiline) })}
                        {...(showCharacterCount && { showCharacterCount: true })}
                        {...(maxLength && { maxLength: parseInt(maxLength) })}
                        {...(autoSize && { autoSize: true })}
                      />
                    </div>
                  ) : null
                )}
              />
            </Box>
          )}
          {/*(errors[name] || aiErrorState) && (
            <Box paddingBlockStart="200">
              <Text color="critical">
                {aiEnabled && !isEditting[name] && aiErrorState 
                  ? aiErrorState.message 
                  : errors[name]?.message}
              </Text>
            </Box>
          )*/}
        </div>
      );

      case 'select':
        return (
          <Box maxWidth="200px" paddingBlock="500">
            <Controller
              name={name}
              control={control}
              defaultValue={name === 'status' ? (defaultValue || options?.[0]?.value) : defaultValue}
              rules={{ required: true }}
              render={({ field }) => {
                const currentValue = name === 'status' && !field.value ? 
                  options?.[0]?.value : field.value;
                return (
                  <Select
                    label={label}
                    options={options || []}
                    value={currentValue}
                    onChange={(newValue) => {
                      const selectedValue = typeof newValue === 'object' ? 
                        newValue?.value : newValue;
                      if (name === 'status' && !selectedValue) {
                        field.onChange(options?.[0]?.value);
                      } else if (selectedValue) {
                        field.onChange(selectedValue);
                      }
                    }}
                    onBlur={field.onBlur}
                    ref={field.ref}
                    error={errors[name] ? errors[name]?.message?.toString() : undefined}
                    placeholder={placeholder}
                  />
                );
              }}
            />
            {errors[name] && (
              <Box paddingBlockStart="200">
                <Text color="critical">{errors[name]?.message}</Text>
              </Box>
            )}
          </Box>
        );

      case 'checkbox':
        return (
          <div className="relative py-1">
            <Box>
              <Controller
                name={name}
                control={control}
                defaultValue={false}
                render={({ field }) => (
                  <Checkbox
                    label={label}
                    checked={field.value}
                    onChange={(newChecked) => {
                      field.onChange(newChecked);
                      if (!newChecked) {
                        setValue('article_published_at', false);
                      }
                    }}
                    onBlur={field.onBlur}
                  />
                )}
              />
            </Box>
          </div>
        );

      case 'date':
        return (
          <div className="relative py-1">
            <Box minHeight="200px">
              <Controller
                name={name}
                control={control}
                rules={{
                  validate: (value) => {
                    const isArticlePublished = watch('article_published');
                    if (isArticlePublished) {
                      if (!value) {
                        return 'Publication date is required';
                      }
                      const selectedDate = new Date(value);
                      const now = new Date();
                      return selectedDate >= now || 'Date must be today or in the future';
                    }
                    return true;
                  }
                }}
                render={({ field }) => {
                  const isArticlePublished = watch('article_published');
                  if (!isArticlePublished) {
                    return null;
                  }
                  return (
                    <BlockStack gap="200" align="start" inlineBlock="center">
                      <Box >
                        <Text>Published At</Text>
                      </Box>
                      <DatePicker
                        label={label}
                        value={field.value}
                        onChange={(date) => {
                          field.onChange(date.start.toISOString());
                        }}
                        month={new Date().getMonth()}
                        year={new Date().getFullYear() + 1}
                        onBlur={field.onBlur}
                        error={errors[name]?.message}
                        disableDatesAfter={undefined} 
                        disableDatesBefore={new Date()} 
                      />
                    </BlockStack>
                  );
                }}
              />
              {errors[name] && (
                <Box paddingBlockStart="200">
                  <Text color="critical">{errors[name]?.message}</Text>
                </Box>
              )}
            </Box>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <React.Fragment>
      {renderInput()}
    </React.Fragment>
  );
};

export default FormGenerator;

