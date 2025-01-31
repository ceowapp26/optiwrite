import { PRODUCT } from "@/types/product";
import { Sparkles } from 'lucide-react';
import { PlusIcon, HomeIcon, OrderIcon, productIcon, NoteIcon, ComposeIcon } from '@shopify/polaris-icons';

export const TEMPLATE_OPTIONS = [
  {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    icon: 'ComposeIcon',
    blog_commentable: 'yes',
    blog_feedburner: null,
    blog_feedburner_location: null,
    blog_handle: 'ultimate-guide-to-blogging',
    blog_metafield: [],
    blog_tags: 'blogging, content creation, SEO',
    blog_template_suffix: null,
    blog_title: 'Ultimate Guide to blogging',
    article_author: 'John Doe',
    article_body_html: `
      <h1>Ultimate Guide to blogging</h1>
      <img src="https://source.unsplash.com/featured/?blogging" alt="blogging" style="width:100%; height:auto;">
      <p>blogging is a powerful tool for sharing knowledge and connecting with audiences. In this guide, we explore the essential elements of a successful blog, including:</p>
      
      <h2>1. Choosing the Right Topic</h2>
      <p>Selecting a topic that resonates with your audience is crucial. Consider current trends, audience interests, and your expertise.</p>
      
      <h2>2. Crafting Engaging Content</h2>
      <p>Your writing style should be engaging and relatable. Use storytelling techniques to draw readers in and keep them interested.</p>
      
      <h2>3. SEO Strategies</h2>
      <p>Incorporate relevant keywords naturally into your content to improve search engine visibility. Use tools like Google Keyword Planner to find the best keywords.</p>
      
      <h2>4. Promoting Your blog</h2>
      <p>Utilize social media platforms, email newsletters, and collaborations with other bloggers to promote your content effectively.</p>
      
      <h2>Conclusion</h2>
      <p>By following these guidelines, you can create compelling blog content that resonates with your readers and drives traffic to your site.</p>
    `,
    article_handle: 'ultimate-guide-to-blogging',
    article_image: 'https://source.unsplash.com/featured/?blogging',
    article_metafield: [],
    article_summary_html: `
      <p>This guide covers everything from choosing a topic to promoting your blog, ensuring you have the tools to succeed in the blogging world.</p>
    `,
    article_tags: 'blogging, content creation, SEO',
    article_template_suffix: null,
    article_title: 'Ultimate Guide to blogging',
    category: 'blogArticle',
    keywords: ['blogging', 'content creation', 'SEO'],
    topic: 'blogging',
    layoutType: 'basic',
    isPremium: false,
  },
  {
    id: 'c9b8a5f7-75a0-4536-b9db-30a8a080d42e',
    icon: 'NoteIcon',
    blog_commentable: 'yes',
    blog_feedburner: null,
    blog_feedburner_location: null,
    blog_handle: 'product-launch-strategy',
    blog_metafield: [],
    blog_tags: 'product launch, marketing strategy',
    blog_template_suffix: null,
    blog_title: 'product Launch Strategy',
    article_author: 'Jane Smith',
    article_body_html: `
      <h1>product Launch Strategy</h1>
      <img src="https://source.unsplash.com/featured/?product-launch" alt="product Launch" style="width:100%; height:auto;">
      <p>Launching a new product requires careful planning and execution. This article outlines the key steps to a successful product launch:</p>
      
      <h2>1. Market Research</h2>
      <p>Understand your target market and competitors. Conduct surveys and focus groups to gather insights.</p>
      
      <h2>2. Define Your Unique Selling Proposition (USP)</h2>
      <p>Clearly articulate what makes your product different and why customers should choose it over competitors.</p>
      
      <h2>3. Create a Buzz</h2>
      <p>Utilize social media teasers, email marketing, and influencer partnerships to generate excitement before the launch.</p>
      
      <h2>4. Launch Day Execution</h2>
      <p>Ensure all systems are go for launch day. Monitor social media and customer feedback closely to address any issues promptly.</p>
      
      <h2>Conclusion</h2>
      <p>By following these steps, you can create a successful product launch that captures attention and drives sales.</p>
    `,
    article_handle: 'product-launch-strategy',
    article_image: 'https://source.unsplash.com/featured/?product-launch',
    article_metafield: [],
    article_summary_html: `
      <p>This article outlines key strategies for a successful product launch, ensuring your new product gets the attention it deserves.</p>
    `,
    article_tags: 'product launch, marketing strategy',
    article_template_suffix: null,
    article_title: 'product Launch Strategy',
    category: 'blogArticle',
    keywords: ['product launch', 'marketing strategy'],
    topic: 'product Launch',
    layoutType: 'advanced',
    isPremium: true,
  },
  {
    id: '5f4d4b9b-b9ea-4e39-9e62-0a60a4e3d428',
    icon: 'NoteIcon',
    blog_commentable: 'yes',
    blog_feedburner: null,
    blog_feedburner_location: null,
    blog_handle: 'seo-best-practices-for-ecommerce',
    blog_metafield: [],
    blog_tags: 'SEO, e-commerce',
    blog_template_suffix: null,
    blog_title: 'SEO Best Practices for E-commerce',
    category: 'blog',
    keywords: ['SEO', 'e-commerce', 'visibility'],
    topic: 'E-commerce SEO',
    layoutType: 'grid',
    isPremium: false,
  },
  {
    id: '25d43ac1-b9d8-450b-b93c-4bdb9a2bb9ff',
    icon: 'NoteIcon',
    article_author: 'Michael Brown',
    article_body_html: `
      <h1>Creating Engaging product Descriptions</h1>
      <img src="https://source.unsplash.com/featured/?product-description" alt="product Description" style="width:100%; height:auto;">
      <p>Effective product descriptions are key to converting visitors into buyers. This article discusses how to write compelling descriptions:</p>
      
      <h2>1. Highlight Benefits Over Features</h2>
      <p>Focus on how the product solves a problem or improves the customer’s life rather than just listing features.</p>
      
      <h2>2. Use Persuasive Language</h2>
      <p>Incorporate action-oriented language that encourages customers to make a purchase. Use words like "discover," "enjoy," and "experience."</p>
      
      <h2>3. Incorporate Storytelling</h2>
      <p>Tell a story about the product. Share its origin, how it was made, or how it can be used in everyday life.</p>
      
      <h2>4. Include Customer Testimonials</h2>
      <p>Social proof can significantly influence purchasing decisions. Include quotes or reviews from satisfied customers.</p>
      
      <h2>Conclusion</h2>
      <p>By following these guidelines, you can create product descriptions that resonate with your audience and drive sales.</p>
    `,
    article_handle: 'creating-engaging-product-descriptions',
    article_image: 'https://source.unsplash.com/featured/?product-description',
    article_metafield: [],
    article_summary_html: `
      <p>This guide helps you craft descriptions that resonate with your audience and drive sales.</p>
    `,
    article_tags: 'product descriptions, copywriting',
    article_template_suffix: null,
    article_title: 'Creating Engaging product Descriptions',
    category: 'article',
    keywords: ['product descriptions', 'copywriting'],
    topic: 'product Descriptions',
    layoutType: 'list',
    isPremium: true,
  },
  {
    id: '1fe2fd0f-3968-4e0b-8ab6-e7a7f79a27a0',
    icon: 'NoteIcon',
    article_author: 'Sarah Wilson',
    article_body_html: `
      <h1>The Art of Storytelling in Marketing</h1>
      <img src="https://source.unsplash.com/featured/?storytelling" alt="Storytelling" style="width:100%; height:auto;">
      <p>Storytelling is a powerful marketing tool that can create emotional connections with your audience. This article explores how to craft compelling narratives:</p>
      
      <h2>1. Know Your Audience</h2>
      <p>Understanding your audience is crucial. Tailor your stories to resonate with their values, interests, and pain points.</p>
      
      <h2>2. Create Relatable Characters</h2>
      <p>Introduce characters that your audience can relate to. This could be a customer, an employee, or even the brand itself.</p>
      
      <h2>3. Build a Narrative Arc</h2>
      <p>Every good story has a beginning, middle, and end. Create a narrative arc that includes a challenge, a journey, and a resolution.</p>
      
      <h2>4. Use Visuals to Enhance the Story</h2>
      <p>Incorporate images, videos, and infographics to complement your storytelling. Visuals can enhance engagement and retention.</p>
      
      <h2>Conclusion</h2>
      <p>By mastering the art of storytelling, you can create marketing campaigns that resonate deeply with your audience and foster brand loyalty.</p>
    `,
    article_handle: 'the-art-of-storytelling-in-marketing',
    article_image: 'https://source.unsplash.com/featured/?storytelling',
    article_metafield: [],
    article_summary_html: `
      <p>This article explores the power of storytelling in marketing and how it can enhance your brand’s connection with customers.</p>
    `,
    article_tags: 'storytelling, marketing',
    article_template_suffix: null,
    article_title: 'The Art of Storytelling in Marketing',
    category: 'article',
    keywords: ['storytelling', 'marketing'],
    topic: 'Storytelling in Marketing',
    layoutType: 'basic',
    isPremium: false,
  },
  {
    id: 'b3b4c847-0d68-47a5-84b0-60be313f1e75',
    icon: 'NoteIcon',
    blog_commentable: 'yes',
    blog_feedburner: null,
    blog_feedburner_location: null,
    blog_handle: 'maximizing-your-online-presence',
    blog_metafield: [],
    blog_tags: 'online presence, digital marketing',
    blog_template_suffix: null,
    blog_title: 'Maximizing Your Online Presence',
    category: 'blog',
    keywords: ['online presence', 'digital marketing'],
    topic: 'Online Presence',
    layoutType: 'grid',
    isPremium: true,
  },
  {
    id: 'f3d4ebff-3a2d-43d2-bfb0-f73576c22e57',
    icon: 'NoteIcon',
    article_author: 'Laura Green',
    article_body_html: `
      <h1>Crafting the Perfect Email Campaign</h1>
      <img src="https://source.unsplash.com/featured/?email-marketing" alt="Email Campaign" style="width:100%; height:auto;">
      <p>Email marketing remains one of the most effective ways to engage customers. This article covers the essentials of creating successful email campaigns:</p>
      
      <h2>1. Segment Your Audience</h2>
      <p>Divide your email list into segments based on demographics, purchase history, or engagement levels to send targeted messages.</p>
      
      <h2>2. Write Compelling Subject Lines</h2>
      <p>Your subject line is the first thing recipients see. Make it catchy and relevant to encourage opens.</p>
      
      <h2>3. Personalize Your Content</h2>
      <p>Use the recipient’s name and tailor content to their interests. Personalization can significantly increase engagement rates.</p>
      
      <h2>4. Include Clear Calls to Action</h2>
      <p>Guide your readers on what to do next. Use clear and compelling calls to action to drive conversions.</p>
      
      <h2>Conclusion</h2>
      <p>By following these tips, you can create email campaigns that resonate with your audience and drive engagement.</p>
    `,
    article_handle: 'crafting-the-perfect-email-campaign',
    article_image: 'https://source.unsplash.com/featured/?email-marketing',
    article_metafield: [],
    article_summary_html: `
      <p>This guide covers the essentials of successful email marketing, helping you craft campaigns that resonate with your audience.</p>
    `,
    article_tags: 'email marketing, campaigns',
    article_template_suffix: null,
    article_title: 'Crafting the Perfect Email Campaign',
    category: 'article',
    keywords: ['email marketing', 'campaigns'],
    topic: 'Email Marketing',
    layoutType: 'basic',
    isPremium: false,
  },
  {
    id: 'a7b8c21f-8e3f-4632-9d8d-785b177e22cc',
    icon: 'NoteIcon',
    blog_commentable: 'yes',
    blog_feedburner: null,
    blog_feedburner_location: null,
    blog_handle: 'building-a-strong-brand-identity',
    blog_metafield: [],
    blog_tags: 'brand identity, branding',
    blog_template_suffix: null,
    blog_title: 'Building a Strong Brand Identity',
    category: 'blog',
    keywords: ['brand identity', 'branding'],
    topic: 'Brand Identity',
    layoutType: 'list',
    isPremium: true,
  },
  {
    id: 'bbf7e8a5-0cc1-4531-b244-2f7f8da22c9b',
    icon: 'NoteIcon',
    article_author: 'Anna White',
    article_body_html: `
      <h1>Effective Social Media Strategies</h1>
      <img src="https://source.unsplash.com/featured/?social-media" alt="Social Media Strategies" style="width:100%; height:auto;">
      <p>Social media is a powerful tool for engaging with your audience. This article outlines effective strategies for using social media:</p>
      
      <h2>1. Choose the Right Platforms</h2>
      <p>Identify where your audience spends their time and focus your efforts on those platforms.</p>
      
      <h2>2. Create Engaging Content</h2>
      <p>Share a mix of content types, including images, videos, and articles. Use storytelling to connect with your audience.</p>
      
      <h2>3. Interact with Your Followers</h2>
      <p>Respond to comments and messages promptly. Engaging with your audience fosters community and loyalty.</p>
      
      <h2>4. Analyze and Adjust</h2>
      <p>Use analytics tools to track your performance. Adjust your strategy based on what works best for your audience.</p>
      
      <h2>Conclusion</h2>
      <p>By implementing these strategies, you can effectively engage your audience and enhance your brand’s presence on social media.</p>
    `,
    article_handle: 'effective-social-media-strategies',
    article_image: 'https://source.unsplash.com/featured/?social-media',
    article_metafield: [],
    article_summary_html: `
      <p>This article provides strategies for effective social media engagement, helping you connect with your audience.</p>
    `,
    article_tags: 'social media, engagement',
    article_template_suffix: null,
    article_title: 'Effective Social Media Strategies',
    category: 'article',
    keywords: ['social media', 'engagement'],
    topic: 'Social Media',
    layoutType: 'basic',
    isPremium: false,
  },
  {
    id: '9f5d41d7-d1e7-4932-98b5-23c0753e8b8a',
    icon: 'NoteIcon',
    blog_commentable: 'yes',
    blog_feedburner: null,
    blog_feedburner_location: null,
    blog_handle: 'creating-a-customer-centric-experience',
    blog_metafield: [],
    blog_tags: 'customer experience, satisfaction',
    blog_template_suffix: null,
    blog_title: 'Creating a Customer-Centric Experience',
    category: 'blog',
    keywords: ['customer experience', 'satisfaction'],
    topic: 'Customer Experience',
    layoutType: 'advanced',
    isPremium: true,
  },
  {
    id: '75fc1b9f-7f42-45a1-98a9-df7e8f4e8fa2',
    icon: 'NoteIcon',
    article_author: 'Rachel Adams',
    article_body_html: `
      <h1>The Future of E-commerce</h1>
      <img src="https://source.unsplash.com/featured/?ecommerce" alt="Future of E-commerce" style="width:100%; height:auto;">
      <p>The e-commerce landscape is constantly evolving. This article explores the trends that are shaping the future of online shopping:</p>
      
      <h2>1. Personalization</h2>
      <p>Consumers expect personalized shopping experiences. Use data analytics to tailor recommendations and marketing messages.</p>
      
      <h2>2. Mobile Commerce</h2>
      <p>With the rise of smartphones, optimizing for mobile is essential. Ensure your website is mobile-friendly and consider developing an app.</p>
      
      <h2>3. Social Commerce</h2>
      <p>Social media platforms are becoming shopping destinations. Leverage social commerce to reach customers where they spend their time.</p>
      
      <h2>4. Sustainability</h2>
      <p>Consumers are increasingly concerned about sustainability. Implement eco-friendly practices and communicate them to your audience.</p>
      
      <h2>Conclusion</h2>
      <p>By staying ahead of these trends, you can position your e-commerce business for success in the future.</p>
    `,
    article_handle: 'the-future-of-ecommerce',
    article_image: 'https://source.unsplash.com/featured/?ecommerce',
    article_metafield: [],
    article_summary_html: `
      <p>This article discusses emerging trends in the e-commerce landscape and how to prepare for the future.</p>
    `,
    article_tags: 'e-commerce, trends',
    article_template_suffix: null,
    article_title: 'The Future of E-commerce',
    category: 'article',
    keywords: ['e-commerce', 'trends'],
    topic: 'E-commerce Trends',
    layoutType: 'grid',
    isPremium: false,
  },
  {
    id: '0c672f16-072b-47b4-b602-c28f7745c29c',
    icon: 'NoteIcon',
    blog_commentable: 'yes',
    blog_feedburner: null,
    blog_feedburner_location: null,
    blog_handle: 'leveraging-user-generated-content',
    blog_metafield: [],
    blog_tags: 'user-generated content, marketing',
    blog_template_suffix: null,
    blog_title: 'Leveraging User-Generated Content',
    category: 'blog',
    keywords: ['user-generated content', 'marketing'],
    topic: 'User-Generated Content',
    layoutType: 'advanced',
    isPremium: true,
  },
  {
    id: '1ed3df64-4a1c-47c4-9d7e-7049072ed3f1',
    icon: 'NoteIcon',
    article_author: 'Liam Scott',
    article_body_html: `
      <h1>Creating Compelling Visual Content</h1>
      <img src="https://source.unsplash.com/featured/?visual-content" alt="Visual Content" style="width:100%; height:auto;">
      <p>Visual content is essential for capturing attention in today’s fast-paced digital world. This article discusses how to create engaging visuals:</p>
      
      <h2>1. Understand Your Audience</h2>
      <p>Know what types of visuals resonate with your audience. Conduct surveys or analyze engagement metrics to gather insights.</p>
      
      <h2>2. Use High-Quality Images</h2>
      <p>Invest in high-quality images that reflect your brand’s identity. Avoid using generic stock photos that lack authenticity.</p>
      
      <h2>3. Incorporate Infographics</h2>
      <p>Infographics are a great way to present complex information in an easily digestible format. Use them to educate your audience.</p>
      
      <h2>4. Leverage Video Content</h2>
      <p>Video content is highly engaging. Consider creating tutorials, behind-the-scenes footage, or customer testimonials.</p>
      
      <h2>Conclusion</h2>
      <p>By creating compelling visual content, you can enhance your marketing efforts and capture your audience’s attention.</p>
    `,
    article_handle: 'creating-compelling-visual-content',
    article_image: 'https://source.unsplash.com/featured/?visuals',
    article_metafield: [],
    article_summary_html: `
      <p>This article discusses how to create engaging visual content that resonates with your audience.</p>
    `,
    article_tags: 'visual content, marketing',
    article_template_suffix: null,
    article_title: 'Creating Compelling Visual Content',
    category: 'article',
    keywords: ['visual content', 'marketing'],
    topic: 'Visual Content',
    layoutType: 'basic',
    isPremium: false,
  },
  {
    id: '98e18a5f-15b4-464d-b4fe-7122765c7c23',
    icon: 'NoteIcon',
    blog_commentable: 'yes',
    blog_feedburner: null,
    blog_feedburner_location: null,
    blog_handle: 'understanding-your-target-audience',
    blog_metafield: [],
    blog_tags: 'target audience, research',
    blog_template_suffix: null,
    blog_title: 'Understanding Your Target Audience',
    category: 'blog',
    keywords: ['target audience', 'research'],
    topic: 'Target Audience',
    layoutType: 'advanced',
    isPremium: true,
  },
  {
    id: '2e6e9b62-5ec0-4e5d-97cc-f0a98f84b1c6',
    icon: 'NoteIcon',
    article_author: 'Emma Davis',
    article_body_html: `
      <h1>The Importance of Customer Feedback</h1>
      <img src="https://source.unsplash.com/featured/?customer-feedback" alt="Customer Feedback" style="width:100%; height:auto;">
      <p>Customer feedback is invaluable for improving your products and services. This article discusses how to effectively gather and analyze feedback:</p>
      
      <h2>1. Create Feedback Channels</h2>
      <p>Establish multiple channels for customers to provide feedback, such as surveys, social media, and direct communication.</p>
      
      <h2>2. Actively Seek Feedback</h2>
      <p>Encourage customers to share their thoughts after purchases. Follow up with emails or messages asking for their opinions.</p>
      
      <h2>3. Analyze Feedback Trends</h2>
      <p>Regularly review feedback to identify common themes and areas for improvement. Use analytics tools to track sentiment and satisfaction levels.</p>
      
      <h2>4. Implement Changes</h2>
      <p>Use the insights gained from feedback to make informed changes to your products or services. Communicate these changes to your customers to show that their opinions matter.</p>
      
      <h2>Conclusion</h2>
      <p>By prioritizing customer feedback, you can enhance your offerings and build stronger relationships with your audience.</p>
    `,
    article_handle: 'the-importance-of-customer-feedback',
    article_image: 'https://source.unsplash.com/featured/?feedback',
    article_metafield: [],
    article_summary_html: `
      <p>This article discusses the value of customer feedback in business and how to leverage it for growth.</p>
    `,
    article_tags: 'customer feedback, improvement',
    article_template_suffix: null,
    article_title: 'The Importance of Customer Feedback',
    category: 'article',
    keywords: ['customer feedback', 'improvement'],
    topic: 'Customer Feedback',
    layoutType: 'basic',
    isPremium: false,
  },
  {
    id: '1f7e746d-d9ff-4c90-b680-65fa0e070a75',
    icon: 'NoteIcon',
    blog_commentable: 'yes',
    blog_feedburner: null,
    blog_feedburner_location: null,
    blog_handle: 'building-an-effective-content-strategy',
    blog_metafield: [],
    blog_tags: 'content strategy, planning',
    blog_template_suffix: null,
    blog_title: 'Building an Effective Content Strategy FOR TESTING',
    category: 'blog',
    keywords: ['content strategy', 'planning'],
    topic: 'Content Strategy',
    layoutType: 'advanced',
    isPremium: true,
  },
  {
    id: '0b729cc2-4c2d-4298-9a52-bac55ec33889',
    icon: 'NoteIcon',
    article_author: 'Sophia Turner',
    article_body_html: `
      <h1>Creating a Seamless Omnichannel Experience</h1>
      <img src="https://source.unsplash.com/featured/?omnichannel" alt="Omnichannel Experience" style="width:100%; height:auto;">
      <p>In today’s marketplace, customers expect a seamless experience across all channels. This article discusses how to integrate your marketing efforts:</p>
      
      <h2>1. Understand Customer Journeys</h2>
      <p>Map out the customer journey across different touchpoints. Identify where customers interact with your brand and ensure a consistent experience.</p>
      
      <h2>2. Use Integrated Technology</h2>
      <p>Implement technology solutions that allow for data sharing across channels. This ensures that customer interactions are cohesive and informed.</p>
      
      <h2>3. Maintain Consistent Messaging</h2>
      <p>Ensure that your brand messaging is consistent across all platforms. This builds trust and recognition among your audience.</p>
      
      <h2>4. Monitor and Optimize</h2>
      <p>Regularly analyze customer feedback and engagement metrics to identify areas for improvement. Adjust your strategy based on insights.</p>
      
      <h2>Conclusion</h2>
      <p>By creating a seamless omnichannel experience, you can enhance customer satisfaction and loyalty.</p>
    `,
    article_handle: 'creating-a-seamless-omnichannel-experience',
    article_image: 'https://source.unsplash.com/featured/?omnichannel',
    article_metafield: [],
    article_summary_html: `
      <p>This article discusses how to create a seamless omnichannel experience that enhances customer satisfaction.</p>
    `,
    article_tags: 'omnichannel, customer experience',
    article_template_suffix: null,
    article_title: 'Creating a Seamless Omnichannel Experience',
    category: 'article',
    keywords: ['omnichannel', 'customer experience'],
    topic: 'Omnichannel Experience',
    layoutType: 'basic',
    isPremium: false,
  },
  {
    id: '12345678-1234-1234-1234-123456789012',
    type: 'product',
    icon: 'productIcon',
    body_html: `
      <h1>Premium Quality Headphones</h1>
      <img src="https://source.unsplash.com/featured/?headphones" alt="Headphones" style="width:100%; height:auto;">
      <p>Experience the best sound quality with our premium headphones. Designed for comfort and durability, these headphones are perfect for music lovers.</p>
    `,
    created_at: '2023-01-01T00:00:00Z',
    handle: 'premium-quality-headphones',
    image: {
      created_at: '2023-01-01T00:00:00Z',
      id: 1,
      position: 1,
      product_id: 12345678,
      variant_ids: [],
      src: 'https://source.unsplash.com/featured/?headphones',
      width: 800,
      height: 600,
      updated_at: '2023-01-01T00:00:00Z',
      alt: 'Premium Quality Headphones',
    },
    images: [],
    options: [],
    product_type: 'Electronics',
    published_at: '2023-01-01T00:00:00Z',
    published_scope: 'global',
    tags: 'headphones, electronics, audio',
    template_suffix: null,
    title: 'Premium Quality Headphones',
    metafields_global_title_tag: 'Buy Premium Quality Headphones',
    metafields_global_description_tag: 'High-quality headphones for music lovers.',
    updated_at: '2023-01-01T00:00:00Z',
    variants: [],
    vendor: 'AudioBrand',
    status: 'active',
    category: 'product',
    keywords: ['headphones', 'audio', 'electronics'],
    topic: 'Audio Equipment',
    layoutType: 'grid',
    isPremium: true,
  },
];

export const DEFAULT_TEMPLATES = {
  blog: {
    title: '[Primary Keyword] + [Value Proposition] | [Brand Name]',
    seoTitle: '[Primary Keyword] + [Secondary Keyword] + [Brand] | [Website Name]',
    metaDescription: '[Pain Point] + [Solution] + [Benefit] + [CTA]',
    url: '/blog/[post-slug]',
    bodyContent: 'Structured HTML with semantic elements',
    schema: 'JSON-LD'
  },
  seoarticle: {
    title: '[Primary Keyword] + [Unique Selling Point] | [Brand Name]',
    seoTitle: '[Primary Keyword] + [Secondary Keyword] + [Brand] | [Website Name]',
    metaDescription: '[Pain Point] + [Solution] + [Benefit] + [CTA]',
    url: '/blog/[article-slug]',
    bodyContent: 'Structured HTML with semantic elements',
    schema: 'JSON-LD'
  }
};