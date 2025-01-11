import type { MessageInterface } from '@/types/ai';
import type { ModelOption } from '@/types/ai';

interface TokenCount {
  inputTokens?: number;
  outputTokens?: number;
}

let tokenCounter: ((text: string) => number) | null = null;

const initializeTokenCounter = async () => {
  if (!tokenCounter) {
    const { Tiktoken } = await import('@dqbd/tiktoken/lite');
    const cl100k_base = await import('@dqbd/tiktoken/encoders/cl100k_base.json');
    
    const encoder = new Tiktoken(
      cl100k_base.bpe_ranks,
      {
        ...cl100k_base.special_tokens,
        '<|im_start|>': 100264,
        '<|im_end|>': 100265,
        '<|im_sep|>': 100266,
      },
      cl100k_base.pat_str
    );

    tokenCounter = (text: string) => {
      const encoded = encoder.encode(text);
      const count = encoded.length;
      return count;
    };
  }
  return tokenCounter;
};

export const countTokens = async (
  options: {
    input?: string | Record<string, any>;
    completion?: string;
    model: ModelOption;
  }
): Promise<TokenCount> => {
  const { input, completion } = options;
  const result: TokenCount = {};

  try {
    const counter = await initializeTokenCounter();
    
    if (input) {
      const inputStr = typeof input === 'object' ? JSON.stringify(input) : String(input);
      result.inputTokens = counter(inputStr);
    }

    if (completion) {
      result.outputTokens = counter(String(completion));
    }

    return result;
  } catch (error) {
    console.error('Error counting tokens:', error);
    return {
      inputTokens: input ? 0 : undefined,
      outputTokens: completion ? 0 : undefined
    };
  }
};