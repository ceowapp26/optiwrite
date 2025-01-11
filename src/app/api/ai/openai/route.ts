import { initializeOpenAI } from '@/lib/openai';
import { checkRateLimit } from '@/utils/ai';
import { OpenAIErrorHandler } from '@/utils/api';
import { validateOutput } from '@/utils/data';
import { OpenAIStream, StreamingTextResponse } from "ai";
import { match } from "ts-pattern";
import { ContentCategory } from '@/types/content';
import { EditorCommand } from '@/types/ai';
import { 
  BASE_RESPONSE_REQUIREMENTS,
  LENGTH_CONSTRAINTS,
  generatePrompt,
  generateOutputFormat,
} from '@/constants/prompt';

export const runtime = "edge";

interface ChatCompletionMessageParam {
  role: string;
  content: string;
}

export async function POST(req: Request): Promise<Response> {
 try {
    const openai = initializeOpenAI();
    const { prompt, shopName, category, model, config } = await req.json();
    const { description, tone, sections, length, includedFields, context, template = null, isNewBlog = null, articleIncluded = false, imageIncluded = 'no', ...rest } = prompt;
    const rateLimitResult = await checkRateLimit(req, config);
    if (rateLimitResult instanceof Response) {
      return rateLimitResult; 
    }
    const inputData: any = {
      description,
      ...(context?.text && { context: { description: context.text } }),
      ...(template && { template: { content: template } }),
    };
    const requirementConfig = {
      handle: {
        structure: {
          length: {
            min: 10, 
            max: 50,
            description: "URL handle MUST be between 10-50 characters, INCLUDING spaces and punctuation. UNDER NO CIRCUMSTANCES should the character count **FALL BELOW the minimum** or **EXCEED the maximum limit**."
          },
          format:
          category === ContentCategory.PRODUCT
            ? `https://${shopName}.myshopify.com/products/[product-url-handle]`
            : category === ContentCategory.BLOG
            ? `https://${shopName}.myshopify.com/blogs/[blog-url-handle]`
            : category === ContentCategory.ARTICLE
            ? `https://${shopName}.myshopify.com/articles/[article-url-handle]`
            : '',
          requirements: [
            'ALWAYS return a FULL and VALID SHOPIFY URL that strictly adheres to the SPECIFIED FORMAT, ensuring no deviations.',
            'Include main keyword.',
            'Use hyphens for spaces.',
            'Use lowercase letters only.',
            'Avoid special characters.'
          ]
        }
      },
      ...generatePrompt({
        category: extractCategory(category),
        tone,
        sections,
        mainContentLimit: length,
        includedFields,
        ...(context?.medias && { includedMedias: context.medias || []}),
        ...(category === ContentCategory.ARTICLE && { isNewBlog })
      })
    };

    const matchObject = { category, imageIncluded: imageIncluded === 'unsplash' };

    const messages = match(matchObject)
      .with({ category: ContentCategory.BLOG, imageIncluded: false }, () => [
       {
         role: "system",
         content: `You are an advanced content creation assistant skilled in writing professional and high-quality material for blog posts, articles, and product listings.
         OUTPUT REQUIREMENTS:
         ${JSON.stringify(requirementConfig, null, 2)}
         OUTPUT FORMAT:
         Return valid JSON following the provided format:
         ${JSON.stringify(generateOutputFormat(category, articleIncluded), null, 2)}
         CRITICAL: ${BASE_RESPONSE_REQUIREMENTS}`
       },
       {
         role: "user",
         content: `
         Based on the provided requirements, generate content strictly in the form of a **VALID JSON OBJECT**. 
         EACH RESPONSE **MUST** ensure that the **ORIGINAL MESSAGE** and **INTENT** are maintained, while adapting to the **OVERALL CONTEXT**, and considering the **BROADER THEME**.
         Ensure the response adheres to the structure and context outlined in the requirements. 
         Even if certain inputs appear out of place, you should integrate them in a way that maintains coherence with the **OVERALL THEME** and **NARRATIVE**, delivering the best results every time.
         When a template is provided, your response MUST PRIORITIZE adhering strictly to the given layout, structure, and style without deviation. 
         EACH RESPONSE **MUST** deliver **UNIQUELY** crafted content. UNDER NO CIRCUMSTANCES should the output MATCH the input EXACTLY.
         Do not include any additional text or explanations outside the JSON object. 
         Requirements: ${inputData}`
       },
     ])
     .with({ category: ContentCategory.ARTICLE, imageIncluded: false }, () => [
       {
         role: "system",
         content: `You are an advanced content creation assistant skilled in writing professional and high-quality material for blog posts, articles, and product listings.
         OUTPUT REQUIREMENTS:
         ${JSON.stringify(requirementConfig, null, 2)}
         OUTPUT FORMAT:
         Return valid JSON following the provided format:
         ${JSON.stringify(generateOutputFormat(category), null, 2)}
         CRITICAL: ${BASE_RESPONSE_REQUIREMENTS}`
       },
       {
         role: "user",
         content: `
         Based on the provided requirements, generate content strictly in the form of a **VALID JSON OBJECT**. 
         EACH RESPONSE **MUST** ensure that the **ORIGINAL MESSAGE** and **INTENT** are maintained, while adapting to the **OVERALL CONTEXT**, and considering the **BROADER THEME**.
         Ensure the response adheres to the structure and context outlined in the requirements. 
         Even if certain inputs appear out of place, you should integrate them in a way that maintains coherence with the **OVERALL THEME** and **NARRATIVE**, delivering the best results every time.
         When a template is provided, your response MUST PRIORITIZE adhering strictly to the given layout, structure, and style without deviation. 
         EACH RESPONSE **MUST** deliver **UNIQUELY** crafted content. UNDER NO CIRCUMSTANCES should the output MATCH the input EXACTLY.
         Do not include any additional text or explanations outside the JSON object. 
         Requirements: ${inputData}`
       },
     ])
     .with({ category: ContentCategory.PRODUCT, imageIncluded: false }, () => [
       {
         role: "system",
         content: `You are an advanced content creation assistant skilled in writing professional and high-quality material for blog posts, articles, and product listings. 
         OUTPUT REQUIREMENTS:
         ${JSON.stringify(requirementConfig, null, 2)}
         OUTPUT FORMAT:
         Return valid JSON following the provided format:
         ${JSON.stringify(generateOutputFormat(category), null, 2)}
         CRITICAL: ${BASE_RESPONSE_REQUIREMENTS}`
       },
       {
         role: "user",
         content: `
         Based on the provided requirements, generate content strictly in the form of a **VALID JSON OBJECT**. 
         EACH RESPONSE **MUST** ensure that the **ORIGINAL MESSAGE** and **INTENT** are maintained, while adapting to the **OVERALL CONTEXT**, and considering the **BROADER THEME**.
         Ensure the response adheres to the structure and context outlined in the requirements. 
         Even if certain inputs appear out of place, you should integrate them in a way that maintains coherence with the **OVERALL THEME** and **NARRATIVE**, delivering the best results every time.
         When a template is provided, your response MUST PRIORITIZE adhering strictly to the given layout, structure, and style without deviation. 
         EACH RESPONSE **MUST** deliver **UNIQUELY** crafted content. UNDER NO CIRCUMSTANCES should the output MATCH the input EXACTLY.
         Do not include any additional text or explanations outside the JSON object. 
         Requirements: ${inputData}`
       },
     ])
     .otherwise(() => {
        if (category.startsWith("SINGLE_") && imageIncluded !== 'unsplash') {
          const adjustedCategory = extractCategory(category);
          return [
            {
              role: "system",
              content: `You are an advanced content creation assistant skilled in writing professional and high-quality material for blog posts, articles, and product listings. 
              OUTPUT REQUIREMENTS:
              ${JSON.stringify(requirementConfig[includedFields[0]], null, 2)}
              OUTPUT FORMAT:
              Return valid JSON following the provided format:
              ${JSON.stringify(generateOutputFormat(adjustedCategory)[includedFields[0]], null, 2)}
              For single field optimization, only include the requested field.
              CRITICAL: 
              ${BASE_RESPONSE_REQUIREMENTS}`
            },
            {
              role: "user",
              content: `
              Refine the following content to optimize it for the specified field in a Shopify product format. 
              Focus on delivering a "CONCISE", "ENGAGING", and "SEO-FRIENDLY" response that highlights clarity, relevance, and product appeal. 
              EACH RESPONSE **MUST** deliver **UNIQUELY** crafted content while **PRESERVING** the original message and intent. **UNDER NO CIRCUMSTANCES** should the output MATCH the input EXACTLY.
              If content is ALREADY optimized, RESTRUCTURE sentence structures, incorporate synonyms, and apply dynamic formatting to **GUARANTEE** **UNIQUENESS** and **TOP-TIER QUALITY**.
              The OUTPUT **MUST ALWAYS** be a **VALID JSON OBJECT** with a **SINGLE KEY-VALUE PAIR**, and EVERY RESPONSE **MUST** be DIFFERENT from the provided input. 
              Here is the input content: ${JSON.stringify({ [includedFields[0]]: description })}`
            },
          ];
        } else if (imageIncluded === 'unsplash') {
          return [
            {
              role: "system",
              content: `You are an advanced content creation assistant skilled in generating optimized search queries for Unsplash. Your task is to analyze the provided content description and produce a concise, SEO-optimized query that can be used to find relevant images on Unsplash.
              OUTPUT FORMAT:
              Return valid JSON in the following format:
              ${JSON.stringify({ query: 'string' }, null, 2)}
              GUIDELINES:
              - Focus on generating a query that is highly relevant to the input description.
              - Use descriptive, concise, and SEO-friendly keywords to ensure the query yields accurate results.
              - Avoid unnecessary words or phrases; prioritize clarity and specificity.
              CRITICAL:
              ${BASE_RESPONSE_REQUIREMENTS}`
            },
            {
              role: "user",
              content: `
              Generate an optimized search query for Unsplash based on the following content description. The query should align with the content, highlight key themes, and be ideal for search engine optimization.
              Input content description: ${description}`
            },
          ];
        } else if (category.startsWith("CONTENT_") && imageIncluded !== 'unsplash') {
            const extractedCommand = extractCommand(category)?.toUpperCase();
            switch (extractedCommand) {
              case EditorCommand.CONTINUE_WRITING:
                return [
                  {
                    role: "system",
                    content: `You are an advanced content creation assistant skilled in writing professional and high-quality material for blog posts, articles, and product listings. 
                      OUTPUT FORMAT:
                      Return valid JSON following the provided format:
                      ${JSON.stringify({ content: 'string' }, null, 2)}
                      CRITICAL: ${BASE_RESPONSE_REQUIREMENTS}`
                  },
                  {
                    role: "user",
                    content: `
                    You are an AI writing assistant that continues existing text based on context from prior text. Focus on maintaining the tone and direction of the original content, ensuring that the flow is smooth and coherent. Give more weight/priority to the later characters than the beginning.
                    Here is the input content: ${description}`
                  },
                ];

              case EditorCommand.COMPLETE_WRITING:
                return [
                  {
                    role: "system",
                    content: `You are an AI writing assistant that helps complete partially written content with professionalism and coherence. 
                    Your goal is to deliver a polished, fully developed piece based on the provided context.
                    OUTPUT FORMAT:
                    Return valid JSON following the provided format:
                    ${JSON.stringify({ content: 'string' }, null, 2)}
                    CRITICAL: ${BASE_RESPONSE_REQUIREMENTS}`
                  },
                  {
                    role: "user",
                    content: `
                    You are an AI assistant that will complete the unfinished text, ensuring the content has a strong conclusion and transitions smoothly. Prioritize keeping the tone and structure of the original content.
                    Here is the unfinished text: ${description}`
                  },
                ];

              case EditorCommand.IMPROVE_WRITING:
                return [
                  {
                    role: "system",
                    content: `You are an AI assistant designed to enhance the quality and clarity of written content. 
                    Improve grammar, punctuation, sentence structure, and vocabulary while maintaining the original meaning and intent.
                    OUTPUT FORMAT:
                    Return valid JSON following the provided format:
                    ${JSON.stringify({ content: 'string' }, null, 2)}
                    CRITICAL: ${BASE_RESPONSE_REQUIREMENTS}`
                  },
                  {
                    role: "user",
                    content: `
                    You are an AI assistant that will improve the text to make it more engaging, clear, and polished. Focus on improving the flow and readability while keeping the original meaning intact.

                    Here is the text to improve: ${description}`
                  },
                ];

              case EditorCommand.MAKE_SHORTER:
                return [
                  {
                    role: "system",
                    content: `You are an AI writing assistant that specializes in condensing long-form content into concise summaries. 
                    Keep only the most critical information while maintaining the message's clarity and intent.
                    OUTPUT FORMAT:
                    Return valid JSON following the provided format:
                    ${JSON.stringify({ content: 'string' }, null, 2)}
                    CRITICAL: ${BASE_RESPONSE_REQUIREMENTS}`
                  },
                  {
                    role: "user",
                    content: `
                    You are an AI assistant that will shorten the provided text, removing unnecessary details and keeping the core points. Ensure the summary retains the essential information.
                    Here is the content to shorten: ${description}`
                  },
                ];

              case EditorCommand.MAKE_LONGER:
                return [
                  {
                    role: "system",
                    content: `You are an AI assistant designed to expand on written content. 
                    Add more relevant details, examples, or elaborations to enhance the value and clarity of the content.
                    OUTPUT FORMAT:
                    Return valid JSON following the provided format:
                    ${JSON.stringify({ content: 'string' }, null, 2)}
                    CRITICAL: ${BASE_RESPONSE_REQUIREMENTS}`
                  },
                  {
                    role: "user",
                    content: `
                    You are an AI assistant that will add more depth to the provided text, expanding on the ideas and providing additional supporting information.
                    Here is the text to expand: ${description}`
                  },
                ];

              case EditorCommand.FIX_GRAMMAR:
                return [
                  {
                    role: "system",
                    content: `You are an AI assistant focused on correcting grammar, spelling, and punctuation mistakes. 
                    Ensure that the text is grammatically correct while preserving its meaning and context.
                    OUTPUT FORMAT:
                    Return valid JSON following the provided format:
                    ${JSON.stringify({ content: 'string' }, null, 2)}
                    CRITICAL: ${BASE_RESPONSE_REQUIREMENTS}`             
                  },
                  {
                    role: "user",
                    content: `
                    You are an AI assistant that will fix any grammar, spelling, and punctuation issues in the provided text. Ensure the writing is correct and easy to read.
                    Here is the text to fix: ${description}`
                  },
                ];

              case EditorCommand.ADJUST_TONE:
                return [
                  {
                    role: "system",
                    content: `You are an AI assistant capable of adjusting the tone of written content. 
                    Adjust the content's tone to match the desired style, whether it’s formal, casual, professional, or friendly.
                    OUTPUT FORMAT:
                    Return valid JSON following the provided format:
                    ${JSON.stringify({ content: 'string' }, null, 2)}
                    CRITICAL: ${BASE_RESPONSE_REQUIREMENTS}`
                  },
                  {
                    role: "user",
                    content: `
                    You are an AI assistant that will adjust the tone of the content to match the required style. Make sure the tone is consistent with the intended audience.
                    Here is the text with tone adjustments needed: ${description}`
                  },
                ];

              case EditorCommand.FEEDBACK:
                return [
                  {
                    role: "system",
                    content: `You are an AI assistant that provides constructive feedback on written content. 
                    Offer suggestions for improving the quality of writing, including structure, clarity, and overall coherence.
                    OUTPUT FORMAT:
                    Return valid JSON following the provided format:
                    ${JSON.stringify({ content: 'string' }, null, 2)}
                    CRITICAL: ${BASE_RESPONSE_REQUIREMENTS}`
                  },
                  {
                    role: "user",
                    content: `
                    You are an AI assistant that will provide feedback on the writing. Focus on offering specific suggestions for improvement in areas like structure, clarity, and readability.
                    Here is the content for feedback: ${description}`
                  },
                ];

              case EditorCommand.REPHRASE:
                return [
                  {
                    role: "system",
                    content: `You are an AI assistant skilled in rephrasing content to make it sound more polished and professional. 
                    Retain the original meaning while altering sentence structure and vocabulary for better flow.
                    OUTPUT FORMAT:
                    Return valid JSON following the provided format:
                    ${JSON.stringify({ content: 'string' }, null, 2)}
                    CRITICAL: ${BASE_RESPONSE_REQUIREMENTS}`
                  },
                  {
                    role: "user",
                    content: `
                    You are an AI assistant that will rephrase the provided content to improve its readability and impact. Focus on maintaining the original meaning while improving expression.
                    Here is the content to rephrase: ${description}`
                  },
                ];

              case EditorCommand.SUMMARY_WRITING:
                return [
                  {
                    role: "system",
                    content: `You are an AI assistant that generates concise and clear summaries of longer content. 
                    Retain the key points while shortening the text for easy understanding.
                    OUTPUT FORMAT:
                    Return valid JSON following the provided format:
                    ${JSON.stringify({ content: 'string' }, null, 2)}
                    CRITICAL: ${BASE_RESPONSE_REQUIREMENTS}`
                  },
                  {
                    role: "user",
                    content: `
                    You are an AI assistant that will summarize the provided content into a brief, concise version. Focus on retaining the main ideas and eliminating unnecessary details.
                    Here is the content to summarize: ${description}`
                  },
                ];

              default:
                return []; 
            }
          }
        return [];
      });
    const completion = await openai.chat.completions.create({
      model,
      stream: true,
      messages: messages,
      temperature: 0.7,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      n: 1,
      max_tokens: config.max_tokens || 4096,
   });
    const headers = new Headers({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Rate-Limit-Limit-Minute': rateLimitResult.limitPerMinute.toString(),
      'X-Rate-Limit-Limit-Day': rateLimitResult.limitPerDay.toString(),
      'X-Rate-Limit-Remaining-Minute': rateLimitResult.remainingPerMinute.toString(),
      'X-Rate-Limit-Remaining-Day': rateLimitResult.remainingPerDay.toString(),
      'X-Rate-Limit-Reset-Minute': rateLimitResult.resetPerMinute.toString(),
      'X-Rate-Limit-Reset-Day': rateLimitResult.resetPerDay.toString(),
    });
    const stream = new ReadableStream({
      async start(controller) {
        for await (const part of completion) {
          const chunk = part.choices[0]?.delta?.content || '';
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content: chunk })}\n\n`));
        }
        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
        controller.close();
      },
    });
    return new Response(stream, { headers });
 } catch (error: any) {
   return OpenAIErrorHandler.handleOpenAIError(error);
 }
}

/**
 * Utility function to clean and parse AI completion response
 * Handles potential markdown code blocks and ensures valid JSON
 * @param completion OpenAI completion response
 * @returns Processed response with data and token usage
 */
const processCompletion = (completion: any) => {
  let completionText = completion.choices[0]?.message?.content || '';
  const tokenUsage = {
    input_tokens: completion.usage?.prompt_tokens || 0,
    output_tokens: completion.usage?.completion_tokens || 0
  };
  if (completionText.includes('```')) {
    completionText = completionText
      .replace(/```json\n?/g, '') 
      .replace(/```\n?/g, '')     
      .trim();                   
  }
  const parsedCompletion = JSON.parse(completionText);
  return {
    data: parsedCompletion,
    tokens: tokenUsage,
    headers: {
      'Content-Type': 'application/json',
      'X-Tokens-Used': JSON.stringify(tokenUsage)
    }
  };
};

/**
 * Utility function to clean and parse AI completion response
 * Handles potential markdown code blocks and ensures valid JSON
 * @param completion OpenAI completion response
 * @returns Processed response with data and token usage
 */
/*function filterSchemaMarkupFormat(contentType: 'BLOG' | 'ARTICLE' | 'PRODUCT', baseSchema: Record<string, any>) {
  let contentFields;
  switch (contentType) {
    case 'BLOG':
      contentFields = blogPostFields;
      break;
    case 'ARTICLE':
      contentFields = articleFields;
      break;
    case 'PRODUCT':
      contentFields = productFields;
      break;
    default:
      throw new Error('Invalid content type');
  }
  const result: Record<string, any> = {};
  contentFields.forEach(field => {
    if (field.name in baseSchema) {
      result[field.name] = baseSchema[field.name];
    }
  });
  return result;
}*/

/**
 * Utility function to clean and parse AI completion response
 * Handles potential markdown code blocks and ensures valid JSON
 * @param completion OpenAI completion response
 * @returns Processed response with data and token usage
 */
function filterSEOOutputFormat(includedFields = []) {
  const baseFields = [
    'title',
    'shortDescription', 
    'bodyContent',
    'metaDescription',
    'category',
    'pageTitle',
    'urlHandle',
    'tags',
    'schemaMarkup'
  ];
  const optionalNumericFields = [
    'price',
    'costPerItem',
    'profit',
    'weight'
  ];
  const result = {};
  baseFields.forEach(field => {
    result[field] = BASE_SEO_OUTPUT_FORMAT[field];
  });
  optionalNumericFields.forEach(field => {
    if (includedFields.includes(field)) {
      result[field] = BASE_SEO_OUTPUT_FORMAT[field];
    }
  });
  return result;
}

function extractCategory(category) {
  if (category.startsWith("SINGLE_")) {
    return category.substring(7); 
  }
  return category;
}

function extractCommand(command) {
  if (command.startsWith("CONTENT_")) {
    return command.substring(8); 
  }
  return command;
}
