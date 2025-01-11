import { z } from 'zod';
import { ContentCategory } from '@/types/content';

 export const VALUE_CONSTRAINTS = {
  price: {
    strategy: `
    If the price is not provided, or if the provided value is 0, empty, null, undefined, or invalid, generate a realistic price based on the product category, aligned with industry standards. 
    If a price value is explicitly defined, return it as is, ensuring it adheres to any specified constraints or ranges for that product.`,
    rules: {
      decimal: 2,
      minPrice: 0.99,
      maxPrice: 999999.99,
      rounding: "Round up to nearest .99",
    }
  },
  profit: {
    strategy: `
    If the profit is not provided, or if the provided value is 0, empty, null, undefined, or invalid, generate a realistic profit based on the product category, aligned with industry standards. 
    If a profit value is explicitly defined, return it as is, ensuring it adheres to any specified constraints or ranges for that product.`,
    rules: {
      decimal: 2,
      minPrice: 0.99,
      maxPrice: 999999.99,
      rounding: "Round up to nearest .99",
    }
  },
  costPerItem: {
    strategy: `
    If the cost per item is not provided, or if the provided value is 0, empty, null, undefined, or invalid, generate a realistic cost per item based on the product category, aligned with industry standards. 
    If a cost per item value is explicitly defined, return it as is, ensuring it adheres to any specified constraints or ranges for that product.`,
    rules: {
      decimal: 2,
      minPrice: 0.99,
      maxPrice: 999999.99,
      rounding: "Round up to nearest .99",
    }
  },
  weight: {
    strategy: `
    If the weight is not provided, or if the provided value is 0, empty, null, undefined, or invalid, generate a realistic weight based on the product category, aligned with industry standards. 
    If a weight is explicitly defined, return it as is, ensuring it adheres to any specified constraints or ranges for that product.`,
    rules: {
      decimal: 2,
      minPrice: 0.01,
      maxPrice: 999999.99,
      rounding: "Round up to nearest .99",
    }
  }
};

export const generateLengthConstraints = (mainContentLimit = 1000) => {
  return {
    title: {
      min: 30,
      max: 100,
      description: "Title MUST be between 30-100 characters, INCLUDING spaces and punctuation. **UNDER NO CIRCUMSTANCES** should the character count **FALL BELOW the minimum** or **EXCEED the maximum limit**."
    },
    product_type: {
      min: 10,
      max: 80,
      description: "Product type MUST be between 10-80 characters, INCLUDING spaces and punctuation. UNDER NO CIRCUMSTANCES should the character count **FALL BELOW the minimum** or **EXCEED the maximum limit**."
    },
    description: {
      min: 150,
      max: 250,
      description: "Description MUST be between 150-250 characters, INCLUDING spaces and punctuation. UNDER NO CIRCUMSTANCES should the character count **FALL BELOW the minimum** or **EXCEED the maximum limit**."
    },
    meta_description: {
      min: 150,
      max: 250,
      description: "Meta description MUST be between 150-250 characters, INCLUDING spaces and punctuation. UNDER NO CIRCUMSTANCES should the character count **FALL BELOW the minimum** or **EXCEED the maximum limit**."
    },
    shortDescription: {
      min: 150,
      max: 250,
      description: "Short description MUST be between 150-250 characters, INCLUDING spaces and punctuation. UNDER NO CIRCUMSTANCES should the character count **FALL BELOW the minimum** or **EXCEED the maximum limit**."
    },
    body_html: {
      min: 500,
      max: mainContentLimit,
      description: `Body content MUST be between 500-${mainContentLimit} characters, INCLUDING spaces and punctuation. UNDER NO CIRCUMSTANCES should the character count **FALL BELOW the minimum** or **EXCEED the maximum limit**.`
    },
    handle: {
      min: 10, 
      max: 50,
      description: "URL handle MUST be between 10-50 characters, INCLUDING spaces and punctuation. UNDER NO CIRCUMSTANCES should the character count **FALL BELOW the minimum** or **EXCEED the maximum limit**."
    },
    tags: {
      min: 8,
      max: 10,
      description: "Tags MUST have between 8-10 unique tags."
    },
    page_title: {
      min: 30,
      max: 100,
      description: "The page title MUST be between 30 and 100 characters, INCLUDING spaces and punctuation. UNDER NO CIRCUMSTANCES should the character count **FALL BELOW the minimum** or **EXCEED the maximum limit**."
    }
  };
};

/*export const LENGTH_CONSTRAINTS = {
  [ContentCategory.BLOG]: {
    minWords: 800,
    maxWords: 1200,
    optimalReadTime: '4-6 minutes'
  },
  [ContentCategory.ARTICLE]: {
    minWords: 1200,
    maxWords: 1800,
    optimalReadTime: '6-9 minutes'
  },
  [ContentCategory.PRODUCT]: {
    minWords: 600,
    maxWords: 1000,
    optimalReadTime: '3-5 minutes'
  },
  [ContentCategory.TUTORIAL]: {
    minWords: 1000,
    maxWords: 1500,
    optimalReadTime: '5-7 minutes'
  },
  [ContentCategory.CASE_STUDY]: {
    minWords: 1500,
    maxWords: 2500,
    optimalReadTime: '8-12 minutes'
  }
};*/

/**
 * HTML Template Generator for TipTap and Shopify Compatible Content
 */

export const GENERAL_VALIDATION_RULES = {
  structure: [
    { 'Verify proper HTML nesting': true },
    { 'Ensure all tags are properly closed': true },
    { 'Validate heading hierarchy': true },
    { 'Check for required Shopify attributes': true }
  ],
  seo: [
    { 'Verify keyword placement in headings': true },
    { 'Check meta description length': true },
    { 'Validate image alt texts': true },
    { 'Ensure proper URL structure': true }
  ],
  accessibility: [
    { 'Verify ARIA labels where needed': true },
    { 'Check color contrast ratios': true },
    { 'Ensure keyboard navigation support': true },
    { 'Validate form labels and inputs': true }
  ]
};

export const generateContentCategoryRequirements = (category, includedFields = [], mainContentLimit, sections, includedMedias = [], isNewBlog = null) => {
  const lengthConstraints = generateLengthConstraints(mainContentLimit);
  const articleFields = includedFields.find(field => typeof field === 'object' && field.hasOwnProperty('article'))?.article || [];

  switch (category) {
    case ContentCategory.BLOG:
      return {
        title: includedFields.includes('title') ? {
          structure: {
            format: '[Engaging Headline] + [Primary Keyword] + [Brand Value]',
            length: lengthConstraints.title,
            requirements: [
              'Craft click-worthy headline that sparks curiosity',
              'Incorporate primary blog topic keyword naturally',
              'Highlight unique perspective or key insight',
              'Maintain emotional resonance and reader engagement',
              'Optimize for social media shareability',
              'Ensure clarity and direct communication of article\'s core message',
              'Keep title between 55-70 characters for optimal display',
              'Use power words that evoke emotion or urgency',
              'Avoid clickbait - maintain authenticity'
            ]
          }
        } : null,

        commentable: includedFields.includes('commentable') ? {
          format: 'moderate' | 'no' | 'yes',
          requirements: [
            'Define whether comments are allowed and under what moderation rules.',
            'Ensure clarity in comment section rules and guidelines.'
          ]
        } : null,

        feedburner: includedFields.includes('feedburner') ? {
          requirements: [
            'Provide the RSS feed URL for the blog.',
            'Ensure the feed is properly configured for use with feed services.'
          ]
        } : null,

        feedburner_location: includedFields.includes('feedburner_location') ? {
          requirements: [
            'Specify the location of the feedburner URL for feed management.'
          ]
        } : null,

        metafield: includedFields.includes('metafield') ? {
          requirements: [
            'Provide additional context or metadata.',
            'Use for internal categorization.',
            'Include SEO-relevant information.',
            'Ensure consistency with blog content.',
            'Use clear, descriptive keys and values.'
          ]
        } : null,

        tags: includedFields.includes('tags') ? {
          requirements: [
            'Use 3-5 relevant tags.',
            'Include primary and secondary keywords.',
            'Align with blog topic and category.',
            'Use lowercase, hyphen-separated tags.',
            'Consider searchability and user discovery.'
          ]
        } : null,

        template_suffix: includedFields.includes('template_suffix') ? {
          requirements: [
            'Specify the template suffix to apply to the blog post.',
            'Ensure the suffix is consistent with the blog template structure.'
          ]
        } : null,

        article: articleFields.length ? {
          author: articleFields.includes('author') ? {
            requirements: [
              'Establish author credibility.',
              'Include professional background or expertise.',
              'Align author\'s expertise with blog topic.',
              'Provide brief, compelling author bio.',
              'Link to author\'s professional profiles if possible.'
            ]
          } : null,

          body_html: articleFields.includes('body_html') ? {
            structure: {
              format: 'Structured, SEO-optimized HTML content',
              length: lengthConstraints.body_html,
              requirements: {
                contentQuality: [
                  'Provide actionable, valuable insights.',
                  'Use storytelling techniques to maintain reader engagement.',
                  'Include expert quotes or industry references.',
                  'Break complex ideas into digestible sections.',
                  'Incorporate data, statistics, or research findings.',
                  'Maintain conversational yet professional tone.'
                ],
                seoOptimization: {
                  keywordStrategy: {
                    primaryKeyword: {
                      density: {
                        body: '1-2%',
                        headers: '2-3%'
                      },
                      placement: [
                        'First 100 words',
                        'H1 and H2 headers',
                        'Image alt text',
                        'Meta description'
                      ]
                    },
                    secondaryKeywords: {
                      count: '3-5 contextually relevant keywords',
                      integration: 'Natural, seamless incorporation'
                    }
                  }
                },
                structuralElements: [
                  'Clear introduction with value proposition.',
                  'Logical content flow with smooth transitions.',
                  'Use subheaders for easy scanning.',
                  'Include bullet points or numbered lists for clarity.',
                  'Add pull quotes to highlight key insights.',
                  'Incorporate internal and external links.'
                ],
                mediaEngagement: [
                  `Include relevant, high-quality images, ensuring images align with the content's context and provide unique value to improve comprehension.`,
                  'Include infographics or visual data representations, strategically placed to simplify complex information and improve reader understanding.',
                  'Ensure image alt text is descriptive and keyword-rich, maintaining naturalness and avoiding redundancy.',
                  'Optimize image file sizes for fast loading, with modern formats and responsive scaling for all devices.',
                  `Incorporate provided high-quality media (images, audio, video) from the given URLs: ${includedMedias} strategically throughout the content with <img>, <audio>, <video> tags, aligning them to the text they support, while ensuring they break up content visually and remain responsive for different layouts.`,
                  'Ensure all media is responsive, optimized for fast loading with modern formats, and scales seamlessly across devices.'
                ]
              }
            }
          } : null,

          summary_html: articleFields.includes('summary_html') ? {
            requirements: [
              'Concise overview of blog post content.',
              'Capture main points in 2-3 sentences.',
              'Entice reader to continue reading.',
              'Include primary keyword.',
              'Maintain professional and engaging tone.'
            ]
          } : null,

          tags: articleFields.includes('tags') ? {
            requirements: [
              'Use 3-5 relevant tags.',
              'Include primary and secondary keywords.',
              'Align with blog topic and category.',
              'Use lowercase, hyphen-separated tags.',
              'Consider searchability and user discovery.'
            ]
          } : null,

          metafield: articleFields.includes('metafield') ? {
            requirements: [
              'Provide additional context or metadata.',
              'Use for internal categorization.',
              'Include SEO-relevant information.',
              'Ensure consistency with blog content.',
              'Use clear, descriptive keys and values.'
            ]
          } : null
        } : null
      };

    case ContentCategory.ARTICLE:
      return isNewBlog ? {
        title: includedFields.includes('title') ? {
          structure: {
            format: '[Engaging Headline] + [Primary Keyword] + [Brand Value]',
            length: lengthConstraints.title,
            requirements: [
              'Craft click-worthy headline that sparks curiosity',
              'Incorporate primary blog topic keyword naturally',
              'Highlight unique perspective or key insight',
              'Maintain emotional resonance and reader engagement',
              'Optimize for social media shareability',
              `Ensure clarity and direct communication of article's core message`,
              'Keep title between 55-70 characters for optimal display',
              'Use power words that evoke emotion or urgency',
              'Avoid clickbait - maintain authenticity'
            ]
          }
        } : null,

        author: includedFields.includes('author') ? {
          requirements: [
            'Establish author credibility',
            'Include professional background or expertise',
            `Align author's expertise with blog topic`,
            'Provide brief, compelling author bio',
            `Link to author's professional profiles if possible`
          ]
        } : null,

        body_html: includedFields.includes('body_html') ? {
          structure: {
            format: 'Structured, SEO-optimized HTML content',
            length: lengthConstraints.body_html,
            requirements: {
              contentQuality: [
                'Provide actionable, valuable insights',
                'Use storytelling techniques to maintain reader engagement',
                'Include expert quotes or industry references',
                'Break complex ideas into digestible sections',
                'Incorporate data, statistics, or research findings',
                'Maintain conversational yet professional tone'
              ],
              seoOptimization: {
                keywordStrategy: {
                  primaryKeyword: {
                    density: {
                      body: '1-2%',
                      headers: '2-3%'
                    },
                    placement: [
                      'First 100 words',
                      'H1 and H2 headers',
                      'Image alt text',
                      'Meta description'
                    ]
                  },
                  secondaryKeywords: {
                    count: '3-5 contextually relevant keywords',
                    integration: 'Natural, seamless incorporation'
                  }
                }
              },
              structuralElements: [
                'Clear introduction with value proposition',
                'Logical content flow with smooth transitions',
                'Use subheaders for easy scanning',
                'Include bullet points or numbered lists for clarity',
                'Add pull quotes to highlight key insights',
                'Incorporate internal and external links'
              ],
              mediaEngagement: [
                'Include relevant, high-quality images',
                'Add infographics or visual data representations',
                'Ensure image alt text is descriptive and keyword-rich',
                'Optimize image file sizes for fast loading'
              ]
            }
          }
        } : null,

        summary_html: includedFields.includes('summary_html') ? {
          requirements: [
            'Concise overview of blog post content',
            'Capture main points in 2-3 sentences',
            'Entice reader to continue reading',
            'Include primary keyword',
            'Maintain professional and engaging tone'
          ]
        } : null,

        tags: includedFields.includes('tags') ? {
          requirements: [
            'Use 3-5 relevant tags',
            'Include primary and secondary keywords',
            'Align with blog topic and category',
            'Use lowercase, hyphen-separated tags',
            'Consider searchability and user discovery'
          ]
        } : null,

        metafield: includedFields.includes('metafield') ? {
          requirements: [
            'Provide additional context or metadata',
            'Use for internal categorization',
            'Include SEO-relevant information',
            'Ensure consistency with blog content',
            'Use clear, descriptive keys and values'
          ]
        } : null
      } : {
        title: includedFields.includes('title') ? {
          structure: {
            format: '[Engaging Headline] + [Primary Keyword] + [Brand Value]',
            length: lengthConstraints.title,
            requirements: [
              'Craft click-worthy headline that sparks curiosity',
              'Incorporate primary blog topic keyword naturally',
              'Highlight unique perspective or key insight',
              'Maintain emotional resonance and reader engagement',
              'Optimize for social media shareability',
              `Ensure clarity and direct communication of article's core message`,
              'Keep title between 55-70 characters for optimal display',
              'Use power words that evoke emotion or urgency',
              'Avoid clickbait - maintain authenticity'
            ]
          }
        } : null,

        author: includedFields.includes('author') ? {
          requirements: [
            'Establish author credibility',
            'Include professional background or expertise',
            `Align author's expertise with blog topic`,
            'Provide brief, compelling author bio',
            `Link to author's professional profiles if possible`
          ]
        } : null,

        body_html: includedFields.includes('body_html') ? {
          structure: {
            format: 'Structured, SEO-optimized HTML content',
            length: lengthConstraints.body_html,
            requirements: {
              contentQuality: [
                'Provide actionable, valuable insights',
                'Use storytelling techniques to maintain reader engagement',
                'Include expert quotes or industry references',
                'Break complex ideas into digestible sections',
                'Incorporate data, statistics, or research findings',
                'Maintain conversational yet professional tone'
              ],
              seoOptimization: {
                keywordStrategy: {
                  primaryKeyword: {
                    density: {
                      body: '1-2%',
                      headers: '2-3%'
                    },
                    placement: [
                      'First 100 words',
                      'H1 and H2 headers',
                      'Image alt text',
                      'Meta description'
                    ]
                  },
                  secondaryKeywords: {
                    count: '3-5 contextually relevant keywords',
                    integration: 'Natural, seamless incorporation'
                  }
                }
              },
              structuralElements: [
                'Clear introduction with value proposition',
                'Logical content flow with smooth transitions',
                'Use subheaders for easy scanning',
                'Include bullet points or numbered lists for clarity',
                'Add pull quotes to highlight key insights',
                'Incorporate internal and external links'
              ],
              mediaEngagement: [
                'Include relevant, high-quality images',
                'Add infographics or visual data representations',
                'Ensure image alt text is descriptive and keyword-rich',
                'Optimize image file sizes for fast loading'
              ]
            }
          }
        } : null,

        summary_html: includedFields.includes('summary_html') ? {
          requirements: [
            'Concise overview of blog post content',
            'Capture main points in 2-3 sentences',
            'Entice reader to continue reading',
            'Include primary keyword',
            'Maintain professional and engaging tone'
          ]
        } : null,

        tags: includedFields.includes('tags') ? {
          requirements: [
            'Use 3-5 relevant tags',
            'Include primary and secondary keywords',
            'Align with blog topic and category',
            'Use lowercase, hyphen-separated tags',
            'Consider searchability and user discovery'
          ]
        } : null,

        metafield: includedFields.includes('metafield') ? {
          requirements: [
            'Provide additional context or metadata',
            'Use for internal categorization',
            'Include SEO-relevant information',
            'Ensure consistency with blog content',
            'Use clear, descriptive keys and values'
          ]
        } : null
      };

    case ContentCategory.PRODUCT:
      return {
        ...VALUE_CONSTRAINTS,
        title: includedFields.includes('title') ? {
          structure: {
            format: '[Product Name] + [Key Variant/Size] + [Unique Differentiator]',
            requirements: [
              'Include precise product name',
              'Highlight most important variant or size',
              'Capture unique selling proposition',
              'Optimize for search and user clarity',
              'Keep within 50-70 characters',
              'Ensure readability and immediate understanding'
            ]
          }
        } : null,

        body_html: includedFields.includes('body_html') ? {
          structure: {
            format: 'Comprehensive, semantically structured HTML',
            requirements: {
              contentStructure: [
                'Detailed product description with clear sections',
                'Highlight key features and benefits',
                'Include technical specifications',
                'Provide usage instructions',
                'Address potential customer questions',
                'Incorporate social proof and testimonials'
              ],
              technicalDetails: [
                'Comprehensive breakdown of product specifications',
                'Clear explanation of variants and options',
                'Detailed performance metrics',
                'Compatibility and use case information'
              ]
            }
          }
        } : null,

        meta_description: includedFields.includes('meta_description') ? {
          structure: {
            format: '[Unique Value Proposition] + [Key Features] + [User Benefit]',
            requirements: [
              'Concise summary of product essence',
              'Include primary product keywords',
              'Highlight most compelling features',
              'Create sense of urgency or desire',
              'Optimize for click-through rate',
              'Keep within 150-160 characters'
            ]
          }
        } : null,

        product_type: includedFields.includes('product_type') ? {
          requirements: [
            'Use precise, standardized Shopify category',
            'Include most specific product category',
            'Align with marketplace categorization',
            'Ensure easy product discoverability',
            'Use hierarchical, clear naming convention'
          ]
        } : null,

        handle: includedFields.includes('handle') ? {
          requirements: [
            'Create URL-friendly slug',
            'Include primary product keyword',
            'Use lowercase with hyphens',
            'Keep concise and descriptive',
            'Ensure readability and SEO optimization'
          ]
        } : null,

        tags: includedFields.includes('tags') ? {
          structure: {
            format: 'Comma-separated strategic keywords',
            requirements: [
              'Include product categories',
              'Add variant-specific tags',
              'Use long-tail keywords',
              'Add brand-related tags',
              'Include potential search variations',
              'Maintain 5-10 relevant tags'
            ]
          }
        } : null,

        page_title: includedFields.includes('page_title') ? {
          structure: {
            format: '[Product Name] - [Key Benefit] | [Brand Name]',
            requirements: [
              'Optimize for search engines',
              'Include primary product keyword',
              'Highlight unique value proposition',
              'Maintain brand consistency',
              'Keep within 50-60 characters'
            ]
          }
        } : null,

        vendor: includedFields.includes('vendor') ? {
          requirements: [
            'Provide full, official vendor/manufacturer name',
            'Ensure consistency with brand registration',
            'Include any relevant certifications or partnerships'
          ]
        } : null,

        options: includedFields.includes('options') ? {
          requirements: [
            'Define clear product variation parameters',
            'Use consistent naming conventions',
            'Provide comprehensive list of variants',
            'Ensure logical ordering of options',
            'Include all possible customization choices'
          ]
        } : null,

        variants: includedFields.includes('variants') ? {
          requirements: {
            pricing: [
              'Accurate pricing for each variant',
              'Include compare-at pricing if applicable',
              'Ensure currency accuracy',
              'Reflect any volume or variant discounts'
            ],
            inventory: [
              'Precise inventory quantity tracking',
              'Set clear inventory management policy',
              'Configure fulfillment service details',
              'Manage shipping and taxation settings'
            ],
            identification: [
              'Unique SKU for each variant',
              'Include barcode information',
              'Specify weight and shipping requirements',
              'Add any relevant tax codes'
            ]
          }
        } : null,

        template_suffix: includedFields.includes('template_suffix') ? {
          requirements: [
            'Select appropriate custom template if needed',
            'Ensure template matches product type',
            'Optimize for specific product presentation'
          ]
        } : null
      };

    default:
      return {};
  }
};

export const generatePrompt = (config) => {
  const { category, includedFields = [], mainContentLimit, sections, tone, includedMedias = [], isNewBlog = null, ...rest } = config;
  const categoryFieldRequirements = generateContentCategoryRequirements(category, includedFields, mainContentLimit, sections, includedMedias, isNewBlog);
  return {
    instructions: {
      global: [
        'Generate high-quality, original content tailored to the specified requirements.',
        'Ensure the content is engaging, informative, and relevant to the target audience.',
        'Adhere strictly to structural and semantic guidelines while maintaining coherence and logical flow.',
        'Optimize for both human readability and SEO performance.',
        'Incorporate specified keywords naturally without compromising readability.',
        'Respect the provided formatting, structure, and style guidelines.',
        'Avoid redundancy and ensure all content adds value to the user.',
        'Double-check for factual accuracy and ensure all claims are substantiated.',
        'Use precise language and avoid ambiguity where clarity is paramount.',
        'Tailor the writing to align with the target demographic and intended use case.',
      ],
      tone: [
        `Tone option: ${tone}`,
        'Respect the specified tone option and ensure consistency throughout the content.',
        'Match the tone with the intended audience, such as professional, casual, or conversational.',
        'Ensure the tone aligns with the purpose of the content, such as persuasive, instructional, or empathetic.',
        'Use vocabulary, phrasing, and sentence structure that reflect the chosen tone.',
        'Avoid conflicting tones that may confuse the reader or dilute the message.',
        'Incorporate stylistic elements (e.g., humor, formality, simplicity) that fit the selected tone.',
        'Review the content for tonal adherence after drafting to ensure it fully reflects the specified guidelines.'
      ]
    },

    categoryFieldRequirements: categoryFieldRequirements,

    validationStrategies: {
      contentLengthValidation: {
        purpose: 'Ensure content adheres to length requirements for the specified category.',
        steps: [
          'Validate total content length.',
          'Check section-specific lengths.',
          'Analyze keyword density.',
          'Assess readability metrics.'
        ]
      },
      semanticValidation: {
        purpose: 'Ensure content is contextually relevant and coherent.',
        techniques: [
          'Perform semantic keyword analysis.',
          'Check for contextual coherence.',
          'Evaluate topic relevance.',
          'Assess emotional tone alignment.'
        ]
      }
    },

    qualityAssuranceChecklist: {
      common: [
        'Verify factual accuracy.',
        'Check grammar and syntax.',
        'Ensure consistent tone and style.',
        'Confirm adherence to length constraints.'
      ],
      categorySpecific: {
        [ContentCategory.BLOG]: [
          'Validate actionable advice and insights.',
          'Ensure compelling storytelling elements.',
          'Confirm relevance of personal anecdotes.'
        ],
        [ContentCategory.ARTICLE]: [
          'Validate actionable advice and insights.',
          'Ensure compelling storytelling elements.',
          'Confirm relevance of personal anecdotes.'
        ],
        [ContentCategory.PRODUCT]: [
          'Confirm technical specification accuracy.',
          'Validate performance benchmarks.',
          'Ensure practical user scenarios are included.'
        ]
      }
    },

    advancedInstructions: {
      contentOptimization: [
        'Use a variety of sentence structures.',
        'Include relevant examples or analogies.',
        'Balance technical details with readability.',
        'Provide clear, actionable takeaways.'
      ],
      toneAndStyle: {
        [ContentCategory.BLOG]: {
          tone: ['conversational', 'engaging', 'inspirational'],
          style: ['storytelling', 'personal', 'practical']
        },
        [ContentCategory.ARTICLE]: {
          tone: ['conversational', 'engaging', 'inspirational'],
          style: ['storytelling', 'personal', 'practical']
        },
        [ContentCategory.PRODUCT]: {
          tone: ['informative', 'persuasive', 'solution-oriented'],
          style: ['technical', 'comparative', 'user-centric']
        }
      }
    },

    customizationOptions: {
      additionalContext: true,
      specificRequirements: true,
    },
    ...rest,
  };
};

export const BASE_ARTICLE_OUTPUT_FORMAT = {
  author: 'string',
  body_html: 'string (HTML)',
  title: 'string',
  handle: 'string',
  metafield: [
    {
      key: "string",
      namespace: "string",
      value: "string | number",
      value_type: "string | integer",
      description: "string"
    }
  ],
  summary_html: 'string (HTML)',
  tags: 'string (comma-separated)',
  template_suffix: 'string'
};

export const BASE_BLOG_OUTPUT_FORMAT = {
  title: 'string',
  commentable: `string ('moderate' | 'no' | 'yes')`,
  feedburner: 'string',
  feedburner_location: 'string',
  handle: 'string',
  metafield: [
    {
      key: "string",
      namespace: "string",
      value: "string | number",
      value_type: "string | integer",
      description: "string"
    }
  ],
  tags: 'string (comma-separated)',
  template_suffix: 'string',
};

export const BASE_PRODUCT_OUTPUT_FORMAT = {
  title: 'string',
  body_html: 'string (HTML)',
  product_type: 'string',
  handle: 'string',
  tags: 'string (comma-separated)',
  template_suffix: 'string',
  vendor: 'string',
  status: `string ("active" | "draft" | "archived")`,
  options: [
    {
      id: 'string',
      name: 'string',
      position: 'number',
      values: ['string']
    }
  ],
  variants: [
    {
      barcode: 'string',
      compare_at_price: 'number',
      fulfillment_service: 'string',
      grams: 'number',
      inventory_management: 'string',
      inventory_policy: 'deny | continue',
      inventory_quantity: 'number',
      old_inventory_quantity: 'number',
      option1: 'string',
      option2: 'string',
      option3: 'string',
      presentment_prices: [
        {
          price: {
            amount: 'number',
            currency_code: 'string'
          },
          compare_at_price: {
            amount: 'number',
            currency_code: 'string'
          }
        }
      ],
      position: 'number',
      price: 'number',
      requires_shipping: 'boolean',
      sku: 'string',
      taxable: 'boolean',
      tax_code: 'string',
      title: 'string',
      weight: 'number',
      weight_unit: 'g | kg | oz | lb'
    }
  ],
  seo: {
    page_title: 'string',
    meta_description: 'string'
  }
};

export function generateOutputFormat(category, articleIncluded = false) {
  switch (category) {
    case ContentCategory.BLOG:
      return articleIncluded
        ? {
            ...BASE_BLOG_OUTPUT_FORMAT,
            article: BASE_ARTICLE_OUTPUT_FORMAT,
          }
        : BASE_BLOG_OUTPUT_FORMAT;

    case ContentCategory.ARTICLE:
      return BASE_ARTICLE_OUTPUT_FORMAT;

    case ContentCategory.PRODUCT:
      return BASE_PRODUCT_OUTPUT_FORMAT;

    default:
      throw new Error('Unsupported category: ' + category);
  }
}

/**
 * Base requirements for AI response formatting and validation
 * Used to ensure consistent, valid outputs across different AI response types
 * Includes formatting, content, technical, and validation requirements
 * @constant
 */
export const BASE_RESPONSE_REQUIREMENTS = `
  1. Format & Structure
     - Response must be ONLY valid JSON without code blocks or markdown
     - Response must be valid JSON, parseable by JSON.parse()
     - Response ready for direct API return
     - Compatible with OpenAI response handling
     - All JSON keys must be properly quoted
     - Proper nesting of objects and arrays
     - No cleanup or post-processing needed 
     - No trailing whitespace allowed
     - No \`\`\`json markers or backticks in response
     - No undefined values
     - No partial JSON objects
     - No null values unless explicitly allowed
     - All required fields must be present
     - All fields must be present even if empty unless explicitly specified otherwise
     - No comments or additional text outside JSON structure
     - No additional fields outside format
     - Valid data types for each field

  2. Content Quality
     - All content must be relevant to the given context
     - No placeholder or generic content
     - Maintain consistent style throughout
     - Maintain natural language flow
     - No truncated content
     - Complete sentences and sections
     - No duplicate content across sections
     - Ensure keyword density stays within 1-2%
     - Long-tail keywords must be naturally integrated
     - Primary keyword must appear in title, meta description, and first paragraph
     - Avoid keyword stuffing

  3. Data Validation
     - All numeric-related values must be numeric and valid
     - All numeric values must fall within their defined minimum and maximum bounds 
     - All texts/strings must respect length limits if specified
     - All dates must be in ISO format
     - All URLs must be properly formatted
     - All percentages must be valid numbers
     - All measurements must include units unless explicitly specified otherwise
     - All fields must meet requirements and adhere to constraints if specified
     - Ensure data accuracy, consistency, and compliance.

  4. Token Management and Rate Limiting Compliance
     - Response must fit within max_tokens limit
     - Efficient use of tokens for complete response
     - Follows rate limiting requirements
`;


/**
 * @const BASE_SEO_OUTPUT_FORMAT
 * @description Specifies the output format required for SEO data.
 * @property {string} title - Title within 50-60 characters.
 * @property {string} shortDescription - Short description between 150-200 characters.
 * @property {string} body_html - HTML-formatted body content.
 * @property {string} meta_description - Meta description within 150-160 characters.
 * @property {string} category - Product category.
 * @property {string} page_title - Page title formatted for SEO.
 * @property {string} handle - URL handle in SEO-friendly format.
 * @property {string} tags - Comma-separated tags.
 * @property {object} technicalDetails - JSON object with product specs.
 * @property {object} schemaMarkup - JSON-LD schema markup object.
 */


/**
 * @const COMMAND_PROMPTS
 * @description Describes commands with specific roles and focuses for various optimization types.
 * @property {object} REWRITE - Command prompt settings for copywriting and conversion optimization.
 * @property {object} SEOMULTIPLE - Command prompt for multiple SEO fields.
 * @property {object} SEOSINGLE - Command prompt for single field optimization.
 */
export const COMMAND_PROMPTS = {
 REWRITE: {
   role: "Copywriter",
   focus: "Conversion optimization",
   additional: "Brand voice, persuasive language"
 },
 SEOMULTIPLE: {
   role: "SEO Specialist",
   focus: "Search visibility",
   additional: "Technical SEO, schema markup"
 },
 SEOSINGLE: {
   role: "Field Specialist",
   focus: "Single field optimization",
   additional: "Field-specific requirements"
 }
};

/**
 * @const BODY_CONTENT_GUIDELINES
 * @description String of guidelines for optimizing body content.
 * @example
 * "Body Content Optimization:\n
 * - Use H2-H4 hierarchy for structure\n
 * - Include feature-benefit matrix\n
 * ..."
 */
export const BODY_CONTENT_GUIDELINES = `
Body Content Optimization:
- Use H2-H4 hierarchy for structure
- Include feature-benefit matrix
- Add technical specifications
- Include social proof
- 800-1500 words optimal
- Mobile-friendly format
- HTML format with schema markup
- Keyword density: 1-2%
- Include table of contents
- Add LSI keywords`;

/**
 * BASE_SCHEMA_MARKUP_REQUIREMENTS
 * 
 * Basic guidelines for schema markup, covering essential fields for product, FAQ, and review schemas.
 * 
 * @property {object} product - Product schema fields like `name`, `description`, `brand`, and optional fields like `sku` and `aggregateRating`.
 * @property {object} faq - FAQ schema fields with a focus on `mainEntity`, providing clear questions and answers.
 * @property {object} review - Review schema fields, including `author`, `reviewRating`, and `reviewBody`.
 * @property {string} schemaInstructions - General instructions for following schema.org standards.
 * 
 * @example
 * // Access product schema requirements:
 * BASE_SCHEMA_MARKUP_REQUIREMENTS.product;
 * 
 * // View general schema instructions:
 * BASE_SCHEMA_MARKUP_REQUIREMENTS.schemaInstructions;
 */
export const BASE_SCHEMA_MARKUP_REQUIREMENTS = `
  SCHEMA MARKUP REQUIREMENTS:
  1. Product Schema:
     - Include complete product details
     - Add technical specifications
     - Include pricing and availability
     - Add brand information
     - Include aggregate ratings if available
     - Add review data if available
     
  2. FAQ Schema:
     - Include relevant product questions
     - Provide detailed answers
     - Focus on common customer queries
     - Address key features and benefits
     
  3. Review Schema:
     - Include verified customer reviews
     - Add rating information
     - Include review dates
     - Add reviewer names
     
  4. Technical Details:
     - List all specifications
     - Include measurements
     - Add compatibility information
     - Include material details
     
  Ensure all schema markup is properly nested and follows schema.org guidelines.
`;

/**
 * BASE_SCHEMA_MARKUP_OUTPUT
 * 
 * Defines the JSON-LD schema markup structure for product, FAQ, and review information, following schema.org standards.
 * 
 * @property {object} product - Schema for product details.
 *   - `@context`: Schema context URL for JSON-LD format.
 *   - `@type`: Defines the schema type as "Product".
 *   - `name`: Product name.
 *   - `description`: Product description.
 *   - `brand`: Contains brand details with `@type` as "Brand" and `name`.
 *   - `offers`: Offer details such as `price`, `priceCurrency`, `availability`, and `url`.
 *   - `sku`: Stock Keeping Unit (SKU).
 *   - `mpn`: Manufacturer Part Number.
 *   - `category`: Product category.
 *   - `additionalProperty`: Array of additional properties with `name` and `value`.
 * 
 * @property {object} faq - Schema for frequently asked questions.
 *   - `@context`: Schema context URL.
 *   - `@type`: Defines the schema type as "FAQPage".
 *   - `mainEntity`: Array of questions, each with:
 *     - `name`: Question text.
 *     - `acceptedAnswer`: Answer with `text`.
 * 
 * @property {object} review - Schema for customer reviews.
 *   - `@context`: Schema context URL.
 *   - `@type`: Defines the schema type as "Review".
 *   - `author`: Review author information with `name`.
 *   - `reviewRating`: Rating details with `ratingValue` and `bestRating`.
 *   - `reviewBody`: Text of the review.
 *   - `datePublished`: Publication date of the review.
 * 
 * @example
 * // Example of accessing product schema structure
 * BASE_SCHEMA_MARKUP_OUTPUT.product;
 * 
 * // Example of accessing FAQ schema structure
 * BASE_SCHEMA_MARKUP_OUTPUT.faq.mainEntity[0];
 */
export const BASE_SCHEMA_MARKUP_OUTPUT = {
  product: {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'string',
    description: 'string',
    brand: {
      '@type': 'Brand',
      name: 'string'
    },
    offers: {
      '@type': 'Offer',
      price: 'number',
      priceCurrency: 'string',
      availability: 'string',
      url: 'string'
    },
    sku: 'string',
    mpn: 'string',
    category: 'string',
    additionalProperty: [{
      '@type': 'PropertyValue',
      name: 'string',
      value: 'string'
    }]
  },
  faq: {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [{
      '@type': 'Question',
      name: 'string',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'string'
      }
    }]
  },
  review: {
    '@context': 'https://schema.org',
    '@type': 'Review',
    author: {
      '@type': 'Person',
      name: 'string'
    },
    reviewRating: {
      '@type': 'Rating',
      ratingValue: 'number',
      bestRating: 'number'
    },
    reviewBody: 'string',
    datePublished: 'string'
  }
};

/**
 * SEOSINGLE_BASE_REQUIREMENTS
 * 
 * Contains structured prompts for optimizing SEO attributes, ensuring best practices for titles, schema markup, technical details, URLs, tags, and content.
 * 
 * @property {string} title - Guidelines for optimizing page titles.
 *   - Front-load primary keywords.
 *   - Include product type and brand.
 *   - Add a compelling modifier within 50-60 characters.
 *   - Match user search intent.
 * 
 * @property {string} body_html - General content guidelines.
 * 
 * @property {string} schemaMarkup - Instructions for implementing schema markup.
 *   - Lists JSON structure for schema fields, including `Product`, `FAQ`, and `Review` schema.
 *   - Ensures proper nesting and adherence to schema.org standards.
 * 
 * @property {string} technicalDetails - Checklist for technical detail specifications.
 *   - Requirements for including measurements, compatibility, material details, and warranty info.
 * 
 * @property {string} handle - Standards for creating URL handles.
 *   - Include main keyword, hyphenate spaces, keep under 60 characters, lowercase only, avoid special characters.
 * 
 * @property {string} page_title - Instructions for crafting effective page titles.
 *   - Primary keyword should be included, match page content, unique across site, and ideally 50-60 characters.
 * 
 * @property {string} category - Best practices for categorizing content.
 *   - Use standardized naming conventions, specify primary and secondary categories, and align with site structure.
 * 
 * @property {string} shortDescription - Guidelines for writing concise descriptions.
 *   - Length of 150-200 characters, includes primary keyword, clear value proposition, CTA, and emotional triggers.
 * 
 * @property {string} tagsStrategy - Recommendations for tag creation and usage.
 *   - Primary keyword variations, long-tail keywords, relevant product categories, 8-10 relevant tags.
 * 
 * @property {string} meta_description - Guidelines for meta descriptions.
 *   - Include primary keyword, clear value proposition, compelling CTA, length of 150-160 characters, and emotional triggers.
 * 
 * @example
 * // Example of accessing the title prompt
 * console.log(SEOSINGLE_BASE_REQUIREMENTS.title);
 * 
 * // Example of accessing schema markup prompt
 * console.log(SEOSINGLE_BASE_REQUIREMENTS.schemaMarkup);
 */
export const SEOSINGLE_BASE_REQUIREMENTS = {
  title: `
    Title Optimization:
    - Front-load primary keyword
    - Include product type/brand
    - Add compelling modifier
    - 50-60 characters optimal
    - Match search intent
  `,
  body_html: BODY_CONTENT_GUIDELINES,
  schemaMarkup: `
    Schema Markup Requirements:
    ${JSON.stringify(BASE_SCHEMA_MARKUP_REQUIREMENTS, null, 2)}
    Schema Markup Output:
    ${JSON.stringify(BASE_SCHEMA_MARKUP_OUTPUT, null, 2)}
    Ensure proper nesting and required fields based on schema type.
  `,
  technicalDetails: `
    Technical Details Requirements:
    - List all specifications
    - Include measurements
    - Add compatibility information
    - Include material details
    - Add warranty information
  `,
  handle: `
    URL Handle Requirements:
    - Include main keyword
    - Use hyphens for spaces
    - Keep under 60 characters
    - Use lowercase only
    - Avoid special characters
  `,
  page_title: `
    Page Title Requirements:
    - Include primary keyword
    - Match page content
    - Be unique across site
    - Include brand name
    - 50-60 characters optimal
  `,
  category: `
    Category Requirements:
    - Use standardized nomenclature
    - Include primary category
    - Add secondary if applicable
    - Match search intent
    - Align with site hierarchy
  `,
  shortDescription: `
    Short Description Requirements:
    - 150-200 characters
    - Include primary keyword
    - Present clear value proposition
    - End with call-to-action
    - Use emotional triggers
  `,
  tagsStrategy: `
    Tags Strategy:
    - Primary keyword variations
    - Long-tail keywords
    - Product categories
    - 8-10 relevant tags
  `,
  meta_description: `
    Meta Description:
    - Include primary keyword
    - Clear value proposition
    - Compelling CTA
    - 150-160 characters
    - Use emotional triggers
  `
};

/*
export const BASE_CONTENT_REQUIREMENTS = {
  title: {
    structure: {
      format: 'string',
      length: LENGTH_CONSTRAINTS.title,
      requirements: {
        common: [
          'Include primary keyword naturally',
        ],
        blog: [
          'Encapsulate the main purpose of the content',
        ],
        article: [
          'Summarize the article’s key points',
        ],
        product: [
          'Highlight key features and benefits',
          'Include product name and brand',
        ],
      },
    },
  },
  subTitle: {
    structure: {
      format: 'string',
      length: LENGTH_CONSTRAINTS.subTitle,
      requirements: {
        common: [
          'Include primary keyword naturally',
        ],
        blog: [
          'Encapsulate the main purpose of the content',
        ],
        article: [
          'Provide a brief overview of the content',
        ],
        product: [
          'Include product name and key features',
        ],
      },
    },
  },
  header: {
    structure: {
      format: {
        author: {
          name: 'string',
          organization: 'string?',
          avatar: 'string?',
          social: {
            twitter: 'string?',
            linkedin: 'string?',
            github: 'string?',
          },
          metadata: {
            category: 'string?',
            publishedAt: 'date',
            views: 'number?',
            likes: 'number?',
            shares: 'number?',
          },
          tags: 'string (comma-separated)',
        },
      },
      requirements: {
        common: [
          'Full specifications with metric/imperial measurements',
        ],
        blog: [
          'Component-level compatibility matrix',
          'Material composition, grade, and certifications',
          'Detailed warranty terms, coverage periods, and claim process',
          'Safety certifications and compliance standards',
          'Installation and maintenance requirements',
          'Operating conditions and environment specs',
        ],
        article: [
          'Key arguments and counterarguments',
          'Citations from credible sources',
        ],
        product: [
          'Material composition and certifications',
          'Warranty and return policy details',
        ],
      },
      requiredFields: [
        'author',
        'metadata',
        'tags',
      ],
    },
  },
  description: {
    structure: {
      format: 'string',
      length: LENGTH_CONSTRAINTS.description,
      requirements: {
        common: [
          'Include primary keyword naturally',
        ],
        blog: [
          'Encapsulate the main purpose of the content',
        ],
        article: [
          'Summarize the article’s key points',
        ],
        product: [
          'Highlight key features and benefits',
          'Include product name and brand',
        ],
      },
    },
  },
  body_html: {
    structure: {
      format: {
        blog: {
          id: 'string',
          title: 'string',
          subtitle: 'string',
          level: 'number',
          images: 'string[]',
          content: 'string',
          type: 'text' | 'code' | 'quote' | 'image',
          metadata: 'Record<string, any>?',
          children: 'Array<{ id: string, title: string, subtitle: string, level: number, images: string[], content: string, type: "text" | "code" | "quote" | "image", metadata?: Record<string, any> }>',
        },
        article: {
          id: 'string',
          title: 'string',
          subtitle: 'string',
          level: 'number',
          images: 'string[]',
          content: 'string',
          type: 'text' | 'code' | 'quote' | 'image',
          metadata: 'Record<string, any>?',
          children: 'Array<{ id: string, title: string, subtitle: string, level: number, images: string[], content: string, type: "text" | "code" | "quote" | "image", metadata?: Record<string, any> }>',
        },
        product: {
          title: 'string',
          subtitle: 'string',
          level: 'number',
          images: 'string[]',
          content: 'string',
          type: 'text' | 'code' | 'quote' | 'image',
          metadata: 'Record<string, any>?',
          children: 'Array<{ title: string, subtitle: string, level: number, images: string[], content: string, type: "text" | "code" | "quote" | "image", metadata?: Record<string, any> }>',
        },
      },
      requirements: {
        common: [
          'SKU, UPC, EAN, and other product identifiers',
        ],
        blog: [
          'Pricing tiers, bulk discounts, and currency options',
          'Real-time inventory status and restock dates',
          'Brand hierarchy, manufacturer details, and origin',
          'Global ratings aggregated by source/region',
          'Review velocity and sentiment analysis',
          'Rich media assets (images, videos, 3D models)',
          'Shipping dimensions and weight specs',
        ],
        article: [
          'Citations from credible sources',
          'Key arguments and counterarguments',
        ],
        product: [
          'Detailed product specifications',
          'User reviews and ratings',
        ],
      },
      requiredFields: [],
    },
  },
  footer: {
    structure: {
      format: {
        content: 'string',
        metadata: {
          references: [
            {
              title: 'string',
              slug: 'string',
              url: 'string',
            },
          ],
          citations: [
            {
              title: 'string',
              slug: 'string',
              url: 'string',
            },
          ],
          relatedContents: [
            {
              title: 'string',
              slug: 'string',
              url: 'string',
            },
          ],
          social: [
            {
              title: 'string',
              slug: 'string',
              url: 'string',
            },
          ],
        },
      },
      requirements: [
        'Segmented questions by topic/category',
        'Related questions and follow-ups',
        'Source citations and expert validation',
        'Usage scenarios and best practices',
        'Troubleshooting guides',
        'Comparative analysis vs alternatives',
      ],
      requiredFields: [],
    },
  },
};


export const ContentRequirementsSchema = z.object({
  contentType: z.nativeEnum(ContentCategory),
  title: z.object({
    text: z.string(),
    keywordIntegration: z.boolean().optional(),
    emotionalTrigger: z.enum(['curiosity', 'urgency', 'benefit', 'solution']).optional()
  }),
  subTitle: z.object({
    text: z.string(),
    expandTitlePromise: z.boolean().optional(),
    secondaryKeywordIntegration: z.boolean().optional()
  }),
  header: z.object({
    author: z.object({
      name: z.string(),
      credentials: z.string().optional(),
      socialProfiles: z.object({
        linkedin: z.string().optional(),
        twitter: z.string().optional(),
        website: z.string().optional()
      }).optional(),
      expertise: z.enum(['beginner', 'intermediate', 'expert'])
    }),
    publishedDate: z.date().optional(),
    readTime: z.number().min(1).max(30).optional()
  }),
  body_html: z.object({
    structure: z.object({
      mainSections: z.array(z.object({
        title: z.string(),
        type: z.enum(['text', 'code', 'quote', 'image']),
        level: z.number().min(1).max(3),
        content: z.string(),
        metadata: z.record(z.string(), z.any()).optional()
      })),
      keyPoints: z.array(z.string()).optional(),
      actionableInsights: z.array(z.string()).optional()
    }),
    categorySpecifics: z.discriminatedUnion('contentType', [
      // Blog-Specific Fields
      z.object({
        contentType: z.literal(ContentCategory.BLOG),
        personalNarrative: z.string().optional(),
        challengeSolved: z.string().optional(),
        learningOutcomes: z.array(z.string()).optional()
      }),

      // Article-Specific Fields
      z.object({
        contentType: z.literal(ContentCategory.ARTICLE),
        researchMethodology: z.string().optional(),
        keyFindings: z.array(z.string()),
        academicReferences: z.array(z.object({
          title: z.string(),
          author: z.string(),
          publicationYear: z.number(),
          url: z.string().url().optional()
        })).optional()
      }),

      // Product-Specific Fields
      z.object({
        contentType: z.literal(ContentCategory.PRODUCT),
        technicalSpecifications: z.record(z.string(), z.string()),
        performanceMetrics: z.record(z.string(), z.number()),
        useCases: z.array(z.string()),
        competitorComparison: z.array(z.object({
          productName: z.string(),
          advantages: z.array(z.string()),
          disadvantages: z.array(z.string())
        })).optional()
      })
    ]),
    tone: z.object({
      primary: z.enum(['professional', 'conversational', 'technical', 'inspirational']),
      secondary: z.enum(['analytical', 'storytelling', 'solution-oriented']).optional()
    })
  }),
  footer: z.object({
    references: z.array(z.object({
      title: z.string(),
      url: z.string().url(),
      type: z.enum(['academic', 'industry', 'expert', 'case-study'])
    })).optional(),
    callToAction: z.object({
      text: z.string(),
      type: z.enum(['learn-more', 'explore', 'contact', 'purchase'])
    }).optional()
  }),
  seo: z.object({
    metaTitle: z.string().min(10).max(70),
    meta_description: z.string().min(50).max(160),
    tags: z.array(z.string()).max(10),
    canonicalUrl: z.string().url().optional()
  })
});

*/