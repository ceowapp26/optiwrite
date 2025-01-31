import { 
  PRODUCT_LISTING, 
  PRODUCT_RETRIEVE, 
  PRODUCT_CREATE, 
  PRODUCT_UPDATE, 
  PRODUCT_OPTION_CREATE, 
  PRODUCT_VARIANT_CREATE, 
  PRODUCT_MEDIA_CREATE, 
  PRODUCT_MEDIA_DELETE, 
  PRODUCT_DELETE,
  BLOG_LISTING,
  BLOG_CREATE,
  BLOG_RETRIEVE,
  BLOG_UPDATE,
  BLOG_DELETE,
  ARTICLE_LISTING,
  ARTICLE_RETRIEVE,
  ARTICLE_CREATE,
  ARTICLE_UPDATE,
  ARTICLE_DELETE 
} from './schema';
import { ContentHelpers } from './contentHelpers';
import { type PRODUCT } from '@/types/product';

interface ProductVariant {
  price: {
    amount: string;
    currencyCode: string;
  };
}

interface ProductImage {
  src: string;
  altText?: string;
}

interface ShopifyClient {
  query: (params: { data: any }) => Promise<any>;
}

const handleShopifyResponse = (response: any, operation: string): any => {
  if (!response?.data) {
    throw new Error(`Invalid response from Shopify for ${operation}`);
  }
  const operationData = response.data[operation];
  const errors = operationData?.userErrors;
  if (errors?.length > 0) {
    throw new Error(errors[0].message || `Unknown error occurred during ${operation}`);
  }
  return operationData;
};

export class ContentOperations {
  private client: ShopifyClient;

  constructor(client: ShopifyClient) {
    this.client = client;
  }

  async listProducts(
    limit: number, 
    cursor: string | null = null,
    query?: string, 
    sortKey: ProductSortKeys = 'ID',
    reverse: boolean = false
  ) {
    try {
      const response = await this.client.request(PRODUCT_LISTING, {
        variables: {
          first: Math.min(limit, 25),
          after: cursor,
          query,
          sortKey,
          reverse
        }
      });
      const { edges, pageInfo } = response?.data?.products || {};
      if (!edges || !Array.isArray(edges)) {
        return {
          products: [],
          pageInfo: { hasNextPage: false, endCursor: null }
        };
      }
      return {
        products: edges.map(edge => edge.node),
        pageInfo: {
          hasNextPage: pageInfo?.hasNextPage || false,
          endCursor: pageInfo?.endCursor || null
        }
      };
    } catch (error) {
      console.error('Product listing error:', error);
      throw error;
    }
  }

  async listBlogs(
    limit: number, 
    cursor: string | null = null,
    query?: string, 
    sortKey: ProductSortKeys = 'ID',
    reverse: boolean = false
  ) {
    try {
      const response = await this.client.request(BLOG_LISTING, {
        variables: {
          first: Math.min(limit, 25),
          after: cursor,
          query,
          sortKey,
          reverse
        }
      });
      const { edges, pageInfo } = response?.data?.blogs || {};
      if (!edges || !Array.isArray(edges)) {
        return {
          blogs: [],
          pageInfo: { hasNextPage: false, endCursor: null }
        };
      }
      return {
        blogs: edges.map(edge => edge.node),
        pageInfo: {
          hasNextPage: pageInfo?.hasNextPage || false,
          endCursor: pageInfo?.endCursor || null
        }
      };
    } catch (error) {
      console.error('Blog listing error:', error);
      throw error;
    }
  }

  async listArticles(
    limit: number, 
    cursor: string | null = null,
    query?: string, 
    sortKey: ProductSortKeys = 'ID',
    reverse: boolean = false
  ) {
    try {
      const response = await this.client.request(ARTICLE_LISTING, {
        variables: {
          first: Math.min(limit, 25),
          after: cursor,
          query,
          sortKey,
          reverse
        }
      });
      const { edges, pageInfo } = response?.data?.articles || {};
      if (!edges || !Array.isArray(edges)) {
        return {
          articles: [],
          pageInfo: { hasNextPage: false, endCursor: null }
        };
      }
      return {
        articles: edges.map(edge => edge.node),
        pageInfo: {
          hasNextPage: pageInfo?.hasNextPage || false,
          endCursor: pageInfo?.endCursor || null
        }
      };
    } catch (error) {
      console.error('Article listing error:', error);
      throw error;
    }
  }

  async createProduct(productData: PRODUCT) {
    try {
      if (!productData || Object.keys(productData).length === 0) {
        throw new Error('Product data is required');
      }
      const { media, images, ...productInput } = productData;
      let createResponse;
      try {
        createResponse = await Promise.race([
          this.client.request(PRODUCT_CREATE, {
            variables: { 
              input: productInput,
              ...(media.length > 0 && { media }), 
            },
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), 30000)
          )
        ]);
      } catch (clientError) {
        throw new Error(`Shopify product creation failed: ${clientError.message}`);
      }
      const createdProduct = handleShopifyResponse(createResponse, 'productCreate');
      if (!createdProduct?.product?.id) {
        throw new Error('Product creation failed: No product ID returned');
      }
      return createdProduct.product;
     } catch (error) {
      console.error('Product creation error:', error);
      throw error;
    }
  }

  async createBlog(blogData: BLOG) {
    try {
      if (!blogData || Object.keys(blogData).length === 0) {
        throw new Error('Blog data is required');
      }
      let createResponse;
      try {
        createResponse = await Promise.race([
          this.client.request(BLOG_CREATE, {
            variables: { 
              blog: blogData,
            },
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), 30000)
          )
        ]);
      } catch (clientError) {
        throw new Error(`Shopify blog creation failed: ${clientError.message}`);
      }
      const createdBlog = handleShopifyResponse(createResponse, 'blogCreate');
      if (!createdBlog?.blog?.id) {
        throw new Error('Blog creation failed: No blog ID returned');
      }
      return createdBlog.blog;
    } catch (error) {
      console.error('Blog creation error:', error);
      throw error;
    }
  }

  async createArticle(articleData: ARTICLE) {
    try {
      if (!articleData || Object.keys(articleData).length === 0) {
        throw new Error('Article data is required');
      }
      let createResponse;
      try {
        createResponse = await Promise.race([
          this.client.request(ARTICLE_CREATE, {
            variables: { 
              article: articleData,
            },
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), 30000)
          )
        ]);
      } catch (clientError) {
        throw new Error(`Shopify article creation failed: ${clientError.message}`);
      }
      const createdArticle = handleShopifyResponse(createResponse, 'articleCreate');
      if (!createdArticle?.article?.id) {
        throw new Error('Article creation failed: No article ID returned');
      }
      return createdArticle.article;
    } catch (error) {
      console.error('Article creation error:', error);
      throw error;
    }
  }

  async updateProduct(productId: string, productData: PRODUCT) {
    try {
      if (!productId) {
        throw new Error('Product ID is required');
      }
      if (!productData) {
        throw new Error('Product data is required');
      }
      if (typeof productData !== 'object') {
        throw new Error('Product data must be an object');
      }
      if (Object.keys(productData).length === 0) {
        throw new Error('Product data cannot be empty');
      }
      const shopifyGid = productId.includes('gid://shopify/Product/') 
        ? productId 
        : `gid://shopify/Product/${productId}`;
      let existingProduct;
      try {
        existingProduct = await this.retrieveProduct(shopifyGid);
        if (!existingProduct) {
          throw new Error('Product not found');
        }
      } catch (retrieveError) {
        throw new Error(`Failed to retrieve product: ${retrieveError.message}`);
      }
      const { images, media, ...updateData } = productData;
      const existingMediaUrls = existingProduct?.media?.edges?.map(edge => edge?.node?.preview?.image?.url) || [];
      const filteredImages = images?.filter(image => !existingMediaUrls.includes(image));
      const remainingImages = existingMediaUrls.filter(url => !images.some(image => image === url));
      const processedMedia = await ContentHelpers.processMediaInputs(filteredImages);
      if (remainingImages.length > 0) {
        await this.deleteProductMedia(shopifyGid, remainingImages.map(url => {
          const index = existingProduct?.media?.edges?.findIndex(edge => edge?.node?.preview?.image?.url === url);
          return existingProduct.media.edges[index]?.node.id;
        }).filter(Boolean));
      }
      if (Object.keys(updateData).length === 0) {
        throw new Error('No valid product fields to update');
      }
      let updateResponse;
      try {
        updateResponse = await Promise.race([
          this.client.request(PRODUCT_UPDATE, {
            variables: {
              input: {
                id: shopifyGid,
                ...updateData
              },
              ...(processedMedia.length > 0 && { media: processedMedia }),
            }
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), 30000)
          )
        ]);
      } catch (clientError) {
        if (clientError.message === 'Request timeout') {
          throw new Error('Shopify update request timed out');
        }
        throw new Error(`Shopify product update failed: ${clientError.message}`);
      }
      if (!updateResponse) {
        throw new Error('No response received from Shopify');
      }
      const updatedProduct = handleShopifyResponse(updateResponse, 'productUpdate');
      if (!updatedProduct) {
        throw new Error('Failed to process Shopify response');
      }
      if (!updatedProduct.product) {
        throw new Error('No product data in update response');
      }
      if (!updatedProduct.product.id) {
        throw new Error('Updated product is missing ID');
      }
      return updatedProduct.product;
    } catch (error) {
      console.error('Product update error:', error);
      throw new Error(`Product update failed for ID ${productId}: ${error.message}`);
    }
  }

  async updateBlog(blogId: string, blogData: BLOG) {
    try {
      if (!blogId) {
        throw new Error('Blog ID is required');
      }
      if (!blogData) {
        throw new Error('Blog data is required');
      }
      if (typeof blogData !== 'object') {
        throw new Error('Blog data must be an object');
      }
      if (Object.keys(blogData).length === 0) {
        throw new Error('Blog data cannot be empty');
      }
      const shopifyGid = blogId.includes('gid://shopify/Blog/') 
        ? blogId 
        : `gid://shopify/Blog/${blogId}`;
      let existingBlog;
      try {
        existingBlog = await this.retrieveBlog(shopifyGid);
        if (!existingBlog) {
          throw new Error('Blog not found');
        }
      } catch (retrieveError) {
        throw new Error(`Failed to retrieve blog: ${retrieveError.message}`);
      }
      let updateResponse;
      try {
        updateResponse = await Promise.race([
          this.client.request(BLOG_UPDATE, {
            variables: {
              id: shopifyGid,
              blog: {
                ...blogData
              },
            }
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), 30000)
          )
        ]);
      } catch (clientError) {
        if (clientError.message === 'Request timeout') {
          throw new Error('Shopify update request timed out');
        }
        throw new Error(`Shopify blog update failed: ${clientError.message}`);
      }
      if (!updateResponse) {
        throw new Error('No response received from Shopify');
      }
      const updatedBlog = handleShopifyResponse(updateResponse, 'blogUpdate');
      if (!updatedBlog) {
        throw new Error('Failed to process Shopify response');
      }
      if (!updatedBlog.blog) {
        throw new Error('No blog data in update response');
      }
      if (!updatedBlog.blog.id) {
        throw new Error('Updated blog is missing ID');
      }
      return updatedBlog.blog;
    } catch (error) {
      console.error('Blog update error:', error);
      throw new Error(`Blog update failed for ID ${blogId}: ${error.message}`);
    }
  }

  async updateArticle(articleId: string, articleData: ARTICLE) {
    try {
      if (!articleId) {
        throw new Error('Article ID is required');
      }
      if (!articleData) {
        throw new Error('Article data is required');
      }
      if (typeof articleData !== 'object') {
        throw new Error('Article data must be an object');
      }
      if (Object.keys(articleData).length === 0) {
        throw new Error('Article data cannot be empty');
      }
      const shopifyGid = articleId.includes('gid://shopify/Article/') 
        ? articleId 
        : `gid://shopify/Article/${articleId}`;
      let existingArticle;
      try {
        existingArticle = await this.retrieveArticle(shopifyGid);
        if (!existingArticle) {
          throw new Error('Article not found');
        }
      } catch (retrieveError) {
        throw new Error(`Failed to retrieve article: ${retrieveError.message}`);
      }
      let updateResponse;
      try {
        updateResponse = await Promise.race([
          this.client.request(ARTICLE_UPDATE, {
            variables: {
              id: shopifyGid,
              article: {
                ...articleData
              },
            }
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), 30000)
          )
        ]);
                console.log("this is updateResponse", updateResponse)

      } catch (clientError) {
        if (clientError.message === 'Request timeout') {
          throw new Error('Shopify update request timed out');
        }
        throw new Error(`Shopify article update failed: ${clientError.message}`);
      }
      if (!updateResponse) {
        throw new Error('No response received from Shopify');
      }
      const updatedArticle = handleShopifyResponse(updateResponse, 'articleUpdate');
      if (!updatedArticle) {
        throw new Error('Failed to process Shopify response');
      }
      if (!updatedArticle.article) {
        throw new Error('No article data in update response');
      }
      if (!updatedArticle.article.id) {
        throw new Error('Updated article is missing ID');
      }
      return updatedArticle.article;
    } catch (error) {
      console.error('Article update error:', error);
      throw new Error(`Article update failed for ID ${articleId}: ${error.message}`);
    }
  }

  async createProductOptions(productId: string, options: any[]) {
    try {
      if (!productId || !options || options.length === 0) {
        throw new Error('Product ID and options are required');
      }
      const response = await this.client.request(PRODUCT_OPTION_CREATE, {
        strategy: 'REMOVE_STANDALONE_VARIANT',
        variables: {
          productId,
          options
        }
      });
      return handleShopifyResponse(response, 'productOptionsCreate');
    } catch (error) {
      console.error('Product variants creation error:', error);
      throw error;
    }
  }

  async createProductVariants(productId: string, variants: any[]) {
    try {
      if (!productId || !variants || variants.length === 0) {
        throw new Error('Product ID and variants are required');
      }
      const response = await this.client.request(PRODUCT_VARIANT_CREATE, {
        variables: {
          productId,
          variants
        }
      });
      return handleShopifyResponse(response, 'productVariantsBulkCreate');
    } catch (error) {
      console.error('Product variants creation error:', error);
      throw error;
    }
  }

  async updateProductVariants(productId: string, variants: any[]) {
    try {
      if (!productId || !variants || variants.length === 0) {
        throw new Error('Product ID and variants are required');
      }
      const response = await this.client.request(PRODUCT_VARIANT_CREATE, {
        variables: {
          productId,
          variants
        }
      });
      return handleShopifyResponse(response, 'productVariantsBulkCreate');
    } catch (error) {
      console.error('Product variants creation error:', error);
      throw error;
    }
  }

  async createProductMedia(productId: string, media: any[]) {
    try {
      if (!productId || !media || media.length === 0) {
        throw new Error('Product ID and media are required');
      }
      const response = await this.client.request(PRODUCT_MEDIA_CREATE, {
        variables: {
          productId,
          media
        }
      });
      return handleShopifyResponse(response, 'productCreateMedia');
    } catch (error) {
      console.error('Product media creation error:', error);
      throw error;
    }
  }

  async deleteProductMedia(productId: string, mediaIds: any[]) {
    try {
      if (!productId || !mediaIds || mediaIds.length === 0) {
        throw new Error('Product ID and media ids are required');
      }
      const response = await this.client.request(PRODUCT_MEDIA_DELETE, {
        variables: {
          productId,
          mediaIds
        }
      });
      return handleShopifyResponse(response, 'productDeleteMedia');
    } catch (error) {
      console.error('Product media deletion error:', error);
      throw error;
    }
  }

  async updateProductMedia(productId: string, media: any[]) {
    try {
      if (!productId || !media || media.length === 0) {
        throw new Error('Product ID and media are required');
      }
      const response = await this.client.request(PRODUCT_MEDIA_UPDATE, {
        variables: {
          productId,
          media
        }
      });
      return handleShopifyResponse(response, 'productCreateMedia');
    } catch (error) {
      console.error('Product media creation error:', error);
      throw error;
    }
  }

  async retrieveProduct(productId: string) {
    try {
      if (!productId) {
        throw new Error('Product ID is required');
      }
      if (typeof productId !== 'string') {
        throw new Error('Product ID must be a string');
      }
      if (!productId.trim()) {
        throw new Error('Product ID cannot be empty');
      }
      const shopifyGid = productId.includes('gid://shopify/Product/') 
        ? productId 
        : `gid://shopify/Product/${productId}`;
      const response = await this.client.request(PRODUCT_RETRIEVE, {
        variables: { id: shopifyGid }
      });
      return handleShopifyResponse(response, 'product');
    } catch (error) {
      console.error('Product retrieval error:', error);
      throw error;
    }
  }

  async retrieveBlog(blogId: string) {
    try {
      if (!blogId) {
        throw new Error('Blog ID is required');
      }
      if (typeof blogId !== 'string') {
        throw new Error('Blog ID must be a string');
      }
      if (!blogId.trim()) {
        throw new Error('Blog ID cannot be empty');
      }
      const shopifyGid = blogId.includes('gid://shopify/Blog/') 
        ? blogId 
        : `gid://shopify/Blog/${blogId}`;
      const response = await this.client.request(BLOG_RETRIEVE, {
        variables: { id: shopifyGid }
      });
      return handleShopifyResponse(response, 'blog');
    } catch (error) {
      console.error('Blog retrieval error:', error);
      throw error;
    }
  }

  async retrieveArticle(articleId: string) {
    try {
      if (!articleId) {
        throw new Error('Article ID is required');
      }
      if (typeof articleId !== 'string') {
        throw new Error('Article ID must be a string');
      }
      if (!articleId.trim()) {
        throw new Error('Article ID cannot be empty');
      }
      const shopifyGid = articleId.includes('gid://shopify/Article/') 
        ? articleId 
        : `gid://shopify/Article/${articleId}`;
      const response = await this.client.request(ARTICLE_RETRIEVE, {
        variables: { id: shopifyGid }
      });
      return handleShopifyResponse(response, 'article');
    } catch (error) {
      console.error('Article retrieval error:', error);
      throw error;
    }
  }

  async deleteProduct(productId: string) {
    try {
      if (!productId) {
        throw new Error('Product ID is required');
      }
      const shopifyGid = productId.includes('gid://shopify/Product/') 
        ? productId 
        : `gid://shopify/Product/${productId}`;
      const response = await this.client.request(PRODUCT_DELETE, {
        variables: {
          input: { id: shopifyGid }
        }
      });
      return handleShopifyResponse(response, 'productDelete');
    } catch (error) {
      console.error('Product deletion error:', error);
      throw error;
    }
  }
  async deleteBlog(blogId: string) {
    try {
      if (!blogId) {
        throw new Error('Blog ID is required');
      }
      const shopifyGid = blogId.includes('gid://shopify/Blog/') 
        ? blogId 
        : `gid://shopify/Blog/${blogId}`;
      const response = await this.client.request(BLOG_DELETE, {
        variables: {
          id: shopifyGid
        }
      });
      return handleShopifyResponse(response, 'blogDelete');
    } catch (error) {
      console.error('Blog deletion error:', error);
      throw error;
    }
  }

  async deleteArticle(articleId: string) {
    try {
      if (!articleId) {
        throw new Error('Article ID is required');
      }
      const shopifyGid = articleId.includes('gid://shopify/Article/') 
        ? articleId 
        : `gid://shopify/Article/${articleId}`;
      const response = await this.client.request(ARTICLE_DELETE, {
        variables: {
          id: shopifyGid
        }
      });
      return handleShopifyResponse(response, 'articleDelete');
    } catch (error) {
      console.error('Article deletion error:', error);
      throw error;
    }
  }
}
