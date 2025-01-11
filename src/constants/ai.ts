export const modelOptions: ModelOption[] = [
  'gpt_4',
  'gpt_4o',
  'gpt_4o_2024_05_13',
  'gpt_4o_mini',
  'gpt_4o_mini_2024_07_18',
  'gpt_4_32k',
  'gpt_4_1106_preview',
  'gpt_4_0125_preview',
  'gpt_4_turbo',
  'gpt_4_turbo_2024_04_09',
  'gpt_3_5_turbo',
  'gpt_3_5_turbo_16k',
  'gpt_3_5_turbo_1106',
  'gpt_3_5_turbo_0125',
  'gemini_1_0_pro',
  'gemini_1_5_pro',
  'gemini_1_5_flash',
  'claude_3_5_sonnet_20240620',
  'claude_3_opus_20240229',
  'claude_3_sonnet_20240229',
  'claude_3_haiku_20240307',
  'dall_e_3',
 ];

export const modelContextWindow = {
  'gpt-3.5-turbo': 4096,
  'gpt-3.5-turbo-0301': 4096,
  'gpt-3.5-turbo-0613': 4096,
  'gpt-3.5-turbo-16k': 16384,
  'gpt-3.5-turbo-16k-0613': 16384,
  'gpt-3.5-turbo-1106': 16384,
  'gpt-3.5-turbo-0125': 16384,
  'gpt-4o': 128000,
  'gpt-4o-2024-05-13': 128000,
  'gpt-4o-mini': 128000,
  'gpt-4o-mini-2024-07-18': 128000,
  'gpt-4': 8192,
  'gpt-4-32k': 32768,
  'gpt-4-1106-preview': 128000,
  'gpt-4-0125-preview': 128000,
  'gpt-4-turbo': 128000,
  'gpt-4-turbo-2024-04-09': 128000,
  'gemini-1.0-pro': 128000,
  'gemini-1.5-pro': 128000,
  'gemini-1.5-flash': 128000,
  'claude-3.5-sonnet-20240620': 200000,
  'claude-3-opus-20240229': 200000,
  'claude-3-sonnet-20240229': 200000,
  'claude-3-haiku-20240307': 200000,
};

export const modelMaxToken = {
  'gpt-3.5-turbo': 4096,
  'gpt-3.5-turbo-0301': 4096,
  'gpt-3.5-turbo-0613': 4096,
  'gpt-3.5-turbo-16k': 16384,
  'gpt-3.5-turbo-16k-0613': 16384,
  'gpt-3.5-turbo-1106': 16384,
  'gpt-3.5-turbo-0125': 16384,
  'gpt-4o': 128000,
  'gpt-4o-2024-05-13': 128000,
  'gpt-4o-mini': 128000,
  'gpt-4o-mini-2024-07-18': 128000,
  'gpt-4': 8192,
  'gpt-4-32k': 32768,
  'gpt-4-1106-preview': 128000,
  'gpt-4-0125-preview': 128000,
  'gpt-4-turbo': 128000,
  'gpt-4-turbo-2024-04-09': 128000,
  'gemini-1.0-pro': 128000,
  'gemini-1.5-pro': 128000,
  'gemini-1.5-flash': 128000,
  'claude-3.5-sonnet-20240620': 8192,
  'claude-3-opus-20240229': 4096,
  'claude-3-sonnet-20240229': 4096,
  'claude-3-haiku-20240307': 4096,
};

export const modelCost = {
  'gpt-3.5-turbo': {
    inputTokens: { price: 0.0015, unit: 1000 },
    outputTokens: { price: 0.002, unit: 1000 },
  },
  'gpt-3.5-turbo-0301': {
    inputTokens: { price: 0.0015, unit: 1000 },
    outputTokens: { price: 0.002, unit: 1000 },
  },
  'gpt-3.5-turbo-0613': {
    inputTokens: { price: 0.0015, unit: 1000 },
    outputTokens: { price: 0.002, unit: 1000 },
  },
  'gpt-3.5-turbo-16k': {
    inputTokens: { price: 0.003, unit: 1000 },
    outputTokens: { price: 0.004, unit: 1000 },
  },
  'gpt-3.5-turbo-16k-0613': {
    inputTokens: { price: 0.003, unit: 1000 },
    outputTokens: { price: 0.004, unit: 1000 },
  },
  'gpt-3.5-turbo-1106': {
    inputTokens: { price: 0.001, unit: 1000 },
    outputTokens: { price: 0.002, unit: 1000 },
  },
  'gpt-3.5-turbo-0125': {
    inputTokens: { price: 0.0005, unit: 1000 },
    outputTokens: { price: 0.0015, unit: 1000 },
  },
  'gpt-4o': {
    inputTokens: { price: 0.005, unit: 1000 },
    outputTokens: { price: 0.015, unit: 1000 },
  },
  'gpt-4o-2024-05-13': {
    inputTokens: { price: 0.005, unit: 1000 },
    outputTokens: { price: 0.015, unit: 1000 },
  },
  'gpt-4o-mini': {
    inputTokens: { price: 0.00015, unit: 1000 },
    outputTokens: { price: 0.0006, unit: 1000 },
  },
  'gpt-4o-mini-2024-07-18': {
    inputTokens: { price: 0.00015, unit: 1000 },
    outputTokens: { price: 0.0006, unit: 1000 },
  },
  'gpt-4': {
    inputTokens: { price: 0.03, unit: 1000 },
    outputTokens: { price: 0.06, unit: 1000 },
  },
  'gpt-4-32k': {
    inputTokens: { price: 0.06, unit: 1000 },
    outputTokens: { price: 0.12, unit: 1000 },
  },
  'gpt-4-1106-preview': {
    inputTokens: { price: 0.01, unit: 1000 },
    outputTokens: { price: 0.03, unit: 1000 },
  },
  'gpt-4-0125-preview': {
    inputTokens: { price: 0.01, unit: 1000 },
    outputTokens: { price: 0.03, unit: 1000 },
  },
  'gpt-4-turbo': {
    inputTokens: { price: 0.01, unit: 1000 },
    outputTokens: { price: 0.03, unit: 1000 },
  },
  'gpt-4-turbo-2024-04-09': {
    inputTokens: { price: 0.01, unit: 1000 },
    outputTokens: { price: 0.03, unit: 1000 },
  },
  'gemini-1.0-pro': {
    inputTokens: { price: 0.005, unit: 1000 },
    outputTokens: { price: 0.015, unit: 1000 },
  },
  'gemini-1.5-pro': {
    inputTokens: { price: 0.035, unit: 1000 },
    outputTokens: { price: 0.105, unit: 1000 },
  },
  'gemini-1.5-flash': {
    inputTokens: { price: 0.035, unit: 1000 },
    outputTokens: { price: 0.105, unit: 1000 },
  },
  'claude-3.5-sonnet-20240620': {
    inputTokens: { price: 0.003, unit: 1000 },
    outputTokens: { price: 0.015, unit: 1000 },
  },
  'claude-3-opus-20240229': {
    inputTokens: { price: 0.015, unit: 1000 },
    outputTokens: { price: 0.075, unit: 1000 },
  },
  'claude-3-sonnet-20240229': {
    inputTokens: { price: 0.003, unit: 1000 },
    outputTokens: { price: 0.015, unit: 1000 },
  },
  'claude-3-haiku-20240307': {
    inputTokens: { price: 0.00025, unit: 1000 },
    outputTokens: { price: 0.0125, unit: 1000 },
  },
};

export const imageModelCost = {
  'dalle-e-3': {
    standard: { 
      '1024x1024': { price: 0.04, unit: 1 },
      '1024x1792': { price: 0.08, unit: 1 },
    },
    hd: { 
      '1024x1024': { price: 0.08, unit: 1 },
      '1024x1792': { price: 0.12, unit: 1 },
    },
  },
  'dall-e-2': {
    '512x512': { price: 0.02, unit: 1 },
    '256x256': { price: 0.016, unit: 1 },
  },
};

export const _defaultMaxToken = 4096;


