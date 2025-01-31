import { z } from 'zod';

export const textFieldValidationSchema = z.object({
  prompt: z.string()
    .min(1, 'Content description is required')
    .max(250, 'Content description cannot exceed 250 characters'),
  
  urls: z.array(
    z.string()
      .url('Please enter a valid URL')
      .min(1, 'URL is required')
      .max(250, 'URL cannot exceed 250 characters')
  ).min(1, 'At least one URL is required').optional().default([]),
  
  subtitlePrompts: z.array(
    z.string()
      .min(1, 'Subtitle text is required')
      .max(250, 'Subtitle text cannot exceed 250 characters')
  ).optional(),
});

export type FormValidationType = z.infer<typeof textFieldValidationSchema>;

export const validateField = (
  fieldName: keyof FormValidationType,
  value: string | string[],
  index?: number
): string | undefined => {
  try {
    if (Array.isArray(value)) {
      const schema = textFieldValidationSchema.shape[fieldName];
      schema.parse(value);
      return undefined;
    }
    if (fieldName === 'urls' && typeof index === 'number') {
      return z.string()
        .url('Please enter a valid URL')
        .min(1, 'URL is required')
        .max(250, 'URL cannot exceed 250 characters')
        .safeParse(value).success ? undefined : 'Invalid URL';
    }
    if (fieldName === 'subtitlePrompts' && typeof index === 'number') {
      return z.string()
        .min(1, 'Subtitle text is required')
        .max(250, 'Subtitle text cannot exceed 250 characters')
        .safeParse(value).success ? undefined : 'Invalid subtitle';
    }
    const schema = textFieldValidationSchema.shape[fieldName];
    schema.parse(value);
    return undefined;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return error.errors[0].message;
    }
    return 'Invalid input';
  }
};
