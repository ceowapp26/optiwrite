import { z, ZodType } from 'zod';

export type CreditPaymentProps = {
  credits: number;
};

export const CreditPaymentSchema: ZodType<CreditPaymentProps> = z.object({
  credits: z.number().int().positive().min(1),
});

