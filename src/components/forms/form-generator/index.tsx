import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { LightbulbIcon, PageDownIcon } from '@shopify/polaris-icons';
import { CONTENT, ContentCategory } from '@/types/content';
import { LengthConstraintSchema } from '@/schemas/content.schema';
import { type LucideIcon } from 'lucide-react';
import { AIError } from '@/types/ai';
import { processJsonData, processHandle } from '@/utils/data';
import { useAppSelector } from '@/hooks/useLocalStore';
import { useContextStore } from "@/hooks/useLocalStore";
import { type ProductUpdate } from '@/context/GeneralContextProvider';
import { toast } from 'sonner'
import { Box, Text, InlineStack, TextField, Tag, Tooltip, Select, Button, Checkbox, DatePicker, BlockStack, ProgressBar } from '@shopify/polaris';
import { FieldErrors, FieldValues, UseFormRegister, UseFormTrigger, Control, Controller, UseFormSetValue, UseFormWatch } from 'react-hook-form';

const KeyboardEventWrapper: React.FC<{ children: React.ReactNode; onKeyDown: (event: React.KeyboardEvent) => void; isEdit: boolean; isSEOEdit: boolean; }> = ({ children, onKeyDown, isEdit, isSEOEdit }) => {
  const handleKeyDown = (event: React.KeyboardEvent) => {
    onKeyDown(event);
  };
  return (
    <div className="w-full" onKeyDown={handleKeyDown}>
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
  totalBlogs?: number;
  loadingMoreBlogs?: boolean;
  loadMoreBlogs?: () => void;
  blogOptions?: any[];
  isBlogLoading?: boolean;
  loadingBlogProgress?: number;
  blogLoadingError?: string | null;
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
  blogOptions,
  isBlogLoading,
  loadingBlogProgress,
  blogLoadingError,
  totalBlogs,
  loadMoreBlogs,
  loadingMoreBlogs
}) => {
  const [chipItems, setChipItems] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [loadingFields, setLoadingFields] = useState<Record<string, boolean>>({});
  const [isEditting, setIsEditting] = useState<Record<string, boolean>>({});
  const [{ month, year }, setDate] = useState({ 
    month: new Date().getMonth(), 
    year: new Date().getFullYear() 
  });
  const handleMonthChange = useCallback((month: number, year: number) => {
    setDate({ month, year });
  }, []);
  const aiErrorState = useMemo(() => {
    if (!aiErrors || aiErrors.length === 0) return null;
    return aiErrors.find(error => error.name === name);
  }, [aiErrors, name]);

  useEffect(() => {
    try {
      if (name === 'tags' || name === 'blog_tags' || name === 'article_tags') {
        let processedItems: string[] = [];
        let processedValue = '';
        if (defaultValue) {
          if (typeof defaultValue === 'string') {
            const trimmedValue = defaultValue.trim();
            if (trimmedValue) {
              processedItems = trimmedValue.split(',')
                .map(item => item.trim())
                .filter(item => item !== '');
              processedValue = processedItems.join(',');
            }
          } else if (Array.isArray(defaultValue)) {
            processedItems = defaultValue
              .filter(item => item && typeof item === 'string')
              .map(item => item.trim())
              .filter(item => item !== '');
            processedValue = processedItems.join(',');
          }
        }
        setChipItems(processedItems);
        setValue(name, processedValue);
      } else if (name === 'images' || name === 'article_images') {
        let processedImages: string[] = [];
        if (defaultValue) {
          if (typeof defaultValue === 'string') {
            const trimmedValue = defaultValue.trim();
            if (trimmedValue) {
              processedImages = trimmedValue.split(',')
                .map(item => item.trim())
                .filter(item => item !== '');
            }
          } else if (Array.isArray(defaultValue)) {
            processedImages = defaultValue
              .filter(item => item && typeof item === 'string')
              .map(item => item.trim())
              .filter(item => item !== '');
          }
        }
        setChipItems(processedImages);
        setValue(name, processedImages);
      } else if (['options', 'variants'].includes(name)) {
        const processedValue = processJsonData(defaultValue, 'array');
        setValue?.(name, processedValue);
      } else if (['article_published'].includes(name)) {
          setValue(name, Boolean(defaultValue));
      } else if (['input_data'].includes(name)) {
        const processedValue = processJsonData(defaultValue, 'object');
        setValue?.(name, processedValue);
      } else if (type === 'number') {
        const processedValue = !defaultValue || defaultValue === '' ? '0.01' : Number(defaultValue);
        setValue(name, processedValue);
      } else {
        setValue(name, defaultValue || '');
      }
      if (trigger) {
        Promise.resolve(trigger(name)).catch(error => {
          console.error('Error triggering validation:', error);
        });
      }
    } catch (error) {
      if (name === 'tags' || name === 'blog_tags' || name === 'article_tags') {
        setChipItems([]);
        setValue(name, '');
      } else if (name === 'images' || name === 'article_images') {
        setChipItems([]);
        setValue(name, []);
      } else {
        setValue(name, type === 'number' ? '0.01' : '');
      }
      console.error(`Error processing ${name}:`, error);
    }
  }, [name, setValue, defaultValue, type, trigger]);

  const getHandlePrefix = useCallback(
    (category, shopName) => {
      switch (category) {
        case ContentCategory.PRODUCT:
          return `https://${shopName}.myshopify.com/products/`;
        case ContentCategory.BLOG:
          return `https://${shopName}.myshopify.com/blogs/`;
        case ContentCategory.ARTICLE:
          const selectedBlog = watch('blog_id');
          const blogHandle = blogOptions?.find(option => option.value === selectedBlog)?.label || content?.output?.blog_name;
          return `https://${shopName}.myshopify.com/blogs/${blogHandle?.toLowerCase()}/`;
        default:
          return '';
      }
    },
    [watch, blogOptions] 
  );

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
        setContent({ [name]: newItems.join(', ') });
      } else {
        setValue(name, newItems);
        setContent({ [name]: newItems });
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
      setContent({ [name]: newItems.join(', ') });
    } else {
      setValue(name, newItems);
      setContent({ [name]: newItems });
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
        <div className="relative py-1 flex flex-1">
          {['tags', 'blog_tags', 'article_tags'].includes(name) ? (
            <Box width="100%" paddingBlock="300">
              <div className="w-full">
                <InlineStack blockAlign="start" align="start" gap="300" wrap={false}>
                  <Controller
                    name={name}
                    control={control}
                    defaultValue={['tags', 'blog_tags', 'article_tags'].includes(name) ? chipItems.join(', ') : ['images', 'article_images'].includes(name) ? chipItems : ''}
                    render={({ field }) => (
                      <KeyboardEventWrapper isSEOEdit={isSEOEdit} isEdit={isEdit} onKeyDown={handleKeyDown}>
                        <TextField
                          label={label}
                          value={inputValue || ''}
                          onChange={(newValue) => {
                            const processed = handleTagInput(newValue);
                            setIsEditting(prev => ({ ...prev, [name]: true }));
                            handleTextFieldChange(processed);
                            if (name === 'tags' || name === 'blog_tags' || name === 'article_tags') {
                              field.onChange(chipItems.join(', '));
                            }
                          }}
                          onBlur={(e) => {
                            if (inputValue.trim()) {
                              addTag(inputValue);
                            }
                            field.onBlur();
                          }}
                          error={
                           (name === 'images' || name === 'article_images')&& Array.isArray(errors[name])
                              ? errors[name].map((error) => error.message).join(', ')
                              : errors[name]?.message || null
                          }
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
          ) : isEdit && (['tags', 'blog_tags', 'article_tags'].includes(name)) ? (
            <Box width="100%" paddingBlock="300">
              <div className="w-full">
                <Controller
                  name={name}
                  control={control}
                  defaultValue={['tags', 'blog_tags', 'article_tags'].includes(name) ? chipItems.join(', ') : ['images', 'article_images'].includes(name) ? chipItems : ''}
                  render={({ field }) => (
                    <KeyboardEventWrapper isSEOEdit={isSEOEdit} isEdit={isEdit} onKeyDown={handleKeyDown}>
                      <TextField
                        label={label}
                        onChange={(newValue) => {
                          const processed = handleTagInput(newValue);
                          setIsEditting(prev => ({ ...prev, [name]: true }));
                          handleTextFieldChange(processed);
                          if (name === 'tags' || name === 'blog_tags' || name === 'article_tags') {
                            field.onChange(chipItems.join(', '));
                          }
                        }}
                        onBlur={(e) => {
                          if (inputValue.trim()) {
                            addTag(inputValue);
                          }
                          field.onBlur();
                        }}
                        error={
                         (name === 'images' || name === 'article_images')&& Array.isArray(errors[name])
                            ? errors[name].map((error) => error.message).join(', ')
                            : errors[name]?.message || null
                        }
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
                'handle',
                'product_type',
                'template_suffix',
                'author',
                'article_summary_html',
                'vendor',
                'price',
                'page_title',
                'meta_description',
                'blog_feedburner',
                'blog_feedburner_location',
                'blog_meta_description',
                'blog_page_title',
                'article_meta_description',
                'article_page_title',
                'input_data',
                'blog_handle',
                'blog_title',
                'blog_tags',
                'blog_template_suffix',
                'article_title',
                'article_handle',
                'article_image',
                'article_tags',
                'article_template_suffix',
                'user_id',
                'article_id',
                'blog_id',
                'product_id',
                'body_html',
                'article_body_html',
                'blog_name'
              ].includes(name)) ? (
            <div className="w-full">
              <InlineStack blockAlign="start" align="start" gap="300" wrap={false}>
                {([
                  'article_body_html',
                  'article_image',
                  'article_images',
                  'images',
                  'image',
                  'input_data',
                  'user_id',
                  'article_image',
                  'article_images',
                  'body_html',
                  'article_id',
                  'product_id',
                  'blog_name'
                ].includes(name)) ? null : (
                  <>
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
                        <div className="w-full">
                          <TextField
                            label={label}
                            value={(() => {
                              if (['options', 'variants', 'input_data'].includes(name)) {
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
                              } else if (['options', 'variants'].includes(name)) {
                                try {
                                  processedValue = processJsonData(newValue, 'array');
                                } catch (e) {
                                  processedValue = newValue;
                                }
                              } else if (['input_data'].includes(name)) {
                                try {
                                  processedValue = processJsonData(newValue, 'object');
                                } catch (e) {
                                  processedValue = newValue;
                                }
                              }                        
                              setContent({ [name]: processedValue });
                              setIsEditting(prev => ({ ...prev, [name]: true }));
                              field.onChange(processedValue);
                            }}
                            prefix={
                              ([
                                'handle',
                                'blog_handle',
                                'article_handle'
                              ].includes(name)) ? getHandlePrefix(content?.input?.category, shopName) : prefix
                            }
                            suffix={suffix}
                            onBlur={field.onBlur}
                            type={type}
                            id={name}
                            disabled={['input_data', 'user_id'].includes(name) ? true : false}
                            autoComplete="off"
                            error={errors[name] ? errors[name]?.message : null}
                            placeholder={placeholder}
                            readOnly={
                              ([
                                'input_data',
                                'user_id',
                                'article_id',
                                'blog_id',
                                'product_id',
                              ].includes(name)) ? true : false
                            }
                            {...(multiline && { multiline: parseInt(multiline) })}
                            {...(showCharacterCount && { showCharacterCount: true })}
                            {...(maxLength && { maxLength: parseInt(maxLength) })}
                            {...(autoSize && { autoSize: true })}
                          />
                        </div>
                      )}
                    />
                    {!["images", "input_data", "user_id", "body_html", "article_body_html", "article_image", "price"].includes(name) && (
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
                  </>
                )}
              </InlineStack>
            </div>
          ) : !aiEnabled && isSEOEdit ? (
            <Box width="100%" paddingBlock='300'>
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
                    <div className="w-full">
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
            <Box width="100%" paddingBlock='300'>
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
                    <div className="w-full">
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
        <div className="w-full">
          <InlineStack blockAlign="start" align="space-between" gap="300" wrap={false}>
            <div className="w-4/5"> 
              <Controller
                name={name}
                control={control}
                defaultValue={name === 'status' ? (defaultValue || options?.[0]?.value) : defaultValue}
                rules={{ required: true }}
                render={({ field }) => {
                  const currentValue = name === 'status' && !field.value ? 
                    options?.[0]?.value : field.value || defaultValue;
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
                        } else if (name === 'article_blogs' && !selectedValue) {
                          field.onChange(options?.find(option => option.value === watch('blog_id')).value.toString());
                        } else if (selectedValue) {
                          field.onChange(selectedValue);
                          if (name === 'article_blogs') {
                            setValue('blog_id', selectedValue);
                          }
                        }
                      }}
                      disabled={loadingMoreBlogs || isBlogLoading}
                      onBlur={field.onBlur}
                      ref={field.ref}
                      error={errors[name] ? errors[name]?.message?.toString() : undefined}
                      placeholder={isBlogLoading ? 'Loading...' : 'Choose blog'}
                    />
                  );
                }}
              />
            </div>
            {["article_blogs"].includes(name) && blogOptions.length < totalBlogs && (
              <div className="mt-7 w-1/5 flex justify-end">
                <Tooltip content={`Load More Blog Options`}>
                  <Button
                    disabled={loadingMoreBlogs || isBlogLoading}
                    icon={PageDownIcon}
                    onClick={loadMoreBlogs}
                    loading={loadingMoreBlogs}
                  />
                </Tooltip>
              </div>
            )}
          </InlineStack>
          {(isBlogLoading || loadingMoreBlogs) && (
            <div className="mt-3">
              <ProgressBar
                progress={loadingBlogProgress}
                size="small"
              />
              <Text as="p" variant="bodySm" alignment="start" tone="subdued">
                {isBlogLoading ? 'Loading blogs...' : 'Loading more blogs...'}
              </Text>
            </div>
          )}
          {blogLoadingError && (
            <div className="mt-2">
              <Text as="p" variant="bodySm" tone="critical">
                {blogLoadingError}
              </Text>
            </div>
          )}
        </div>
      );

      case 'checkbox':
        return (
          <div className="relative py-1">
            <Box>
              <Controller
                name={name}
                control={control}
                defaultValue={true}
                render={({ field }) => (
                  <Checkbox
                    label={label}
                    checked={Boolean(field.value)}
                    onChange={(newChecked) => {
                      const boolValue = Boolean(newChecked);
                      field.onChange(boolValue);
                      setValue(name, boolValue);
                       if (!boolValue && setValue) {
                        setValue('article_published_at', '');
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
          <div className="relative w-full">
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
                  <Box minHeight="200px">
                    <BlockStack gap="400" align="start" inlineBlock="center">
                      <Text>Published At</Text>
                      <DatePicker
                        label={label}
                        value={field.value}
                        onMonthChange={handleMonthChange}
                        onChange={(date) => {
                          field.onChange(date.start.toISOString());
                        }}
                        selected={new Date(field.value)}
                        month={month}
                        year={year}
                        onBlur={field.onBlur}
                        error={errors[name]?.message}
                        disableDatesAfter={undefined} 
                        disableDatesBefore={new Date()} 
                      />
                    </BlockStack>
                  </Box>
                );
              }}
            />
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



