export const PRODUCT_LISTING = `
  query listProducts(
    $first: Int = 10, 
    $after: String, 
    $query: String,
    $reverse: Boolean = false,
    $sortKey: ProductSortKeys = ID,
  ) {
    products(
      first: $first, 
      after: $after, 
      query: $query,
      reverse: $reverse,
      sortKey: $sortKey
    ) {
      edges {
        node {
          id
          title
          description
          descriptionHtml
          handle
          productType
          vendor
          tags
          status
          createdAt
          publishedAt
          updatedAt
          onlineStoreUrl
          templateSuffix
          totalInventory
          variantsCount {
            count
            precision
          }
          featuredMedia {
            alt
            id
            mediaContentType
            preview {
              image {
                id
                url
                altText
              }
            }
            status
          }
          tracksInventory
          mediaCount {
            count
            precision
          }
          onlineStorePreviewUrl
          category {
            id
            name
          }
          variants(first: 20) {
            edges {
              node {
                id
                title
                displayName
                sku
                barcode
                availableForSale
                taxable
                taxCode
                position
                price
                compareAtPrice
                sellableOnlineQuantity
                selectedOptions {
                  name
                  value
                }
              }
            }
          }
    
          media(first: 20) {
            edges {
              node {
                id
                mediaContentType
                alt
                status
                preview {
                  image {
                    id
                    url
                    altText
                  }
                }
                ... on Video {
                  sources {
                    format
                    url
                    mimeType
                  }
                }
                ... on Model3d {
                  sources {
                    format
                    url
                    mimeType
                  }
                }
                ... on ExternalVideo {
                  embeddedUrl
                }
              }
            }
          }
          
          metafields(first: 20) {
            edges {
              node {
                id
                namespace
                key
                value
                type
                description
              }
            }
          }
          
          seo {
            title
            description
          }
          
          priceRangeV2 {
            minVariantPrice {
              amount
              currencyCode
            }
            maxVariantPrice {
              amount
              currencyCode
            }
          }
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const PRODUCT_RETRIEVE = `
  query retrieveProduct($id: ID!) {
    product(id: $id) {
      id
      title
      description
      descriptionHtml
      handle
      productType
      vendor
      tags
      status
      createdAt
      publishedAt
      updatedAt
      onlineStoreUrl
      templateSuffix
      totalInventory
      variantsCount {
        count
        precision
      }
      featuredMedia {
        alt
        id
        preview {
          image {
            id
            url
            altText
          }
        }
        mediaContentType
        status
      }
      tracksInventory
      mediaCount {
        count
        precision
      }
      onlineStorePreviewUrl
      category {
        id
        name
      }
      variants(first: 20) {
        edges {
          node {
            id
            title
            displayName
            sku
            barcode
            availableForSale
            taxable
            taxCode
            position
            
            # Pricing
            price
            compareAtPrice
          
            # Inventory
            sellableOnlineQuantity
            
            # Selected Options
            selectedOptions {
              name
              value
            }
          }
        }
      }
      
      images(first: 20) {
        edges {
          node {
            id
            originalSrc
            altText
            width
            height
            transformedSrc
          }
        }
      }
      
      media(first: 20) {
        edges {
          node {
            id
            mediaContentType
            alt
            status
            preview {
              image {
                id
                url
                altText
              }
            }
            ... on Video {
              sources {
                format
                url
                mimeType
              }
            }
            ... on Model3d {
              sources {
                format
                url
                mimeType
              }
            }
            ... on ExternalVideo {
              embeddedUrl
            }
          }
        }
      }
      
      metafields(first: 20) {
        edges {
          node {
            id
            namespace
            key
            value
            type
            description
          }
        }
      }
      
      seo {
        title
        description
      }
      
      priceRangeV2 {
        minVariantPrice {
          amount
          currencyCode
        }
        maxVariantPrice {
          amount
          currencyCode
        }
      }
    }
  }
`;

export const PRODUCT_CREATE = `
mutation createProduct($input: ProductInput!, $media: [CreateMediaInput!]) {
  productCreate(input: $input, media: $media) {
    product {
      id
      title
      handle
      descriptionHtml
      productType
      vendor
      status
      tags
      seo {
        title
        description
      }
      media(first: 10) { 
        edges {
          node {
            id
            mediaContentType
            alt
            preview {
              status
            }
            ... on MediaImage {
              image {
                originalSrc
              }
            }
          }
        }
      }
      metafields(first: 10) {
        edges {
          node {
            id
            key
            value
            namespace
            type
          }
        }
      }
      options {
        id
        name
        position
        values
      }
    }
    userErrors {
      field
      message
    }
  }
}
`;

export const PRODUCT_UPDATE = `
mutation updateProduct($input: ProductInput!, $media: [CreateMediaInput!]) {
  productUpdate(input: $input, media: $media) {
    product {
      id
      title
      description
      descriptionHtml
      handle
      productType
      vendor
      tags
      status
      createdAt
      publishedAt
      updatedAt
      onlineStoreUrl
      category {
        id
        name
      }
      variants(first: 20) {
        edges {
          node {
            id
            title
            displayName
            sku
            barcode
            availableForSale
            taxable
            taxCode
            position
            price
            compareAtPrice
            sellableOnlineQuantity
            selectedOptions {
              name
              value
            }
          }
        }
      }
      media(first: 10) { 
        edges {
          node {
            id
            mediaContentType
            alt
            preview {
              status
            }
          }
        }
      }
      metafields(first: 20) {
        edges {
          node {
            id
            namespace
            key
            value
            type
            description
          }
        }
      }
      seo {
        title
        description
      }
      priceRangeV2 {
        minVariantPrice {
          amount
          currencyCode
        }
        maxVariantPrice {
          amount
          currencyCode
        }
      }
    }
    userErrors {
      field
      message
    }
  }
}
`;

export const PRODUCT_MEDIA_CREATE = `
mutation createProductMedias($media: [CreateMediaInput!]!, $productId: ID!) {
  productCreateMedia(media: $media, productId: $productId) {
    media {
      alt
      mediaContentType
      status
    }
    mediaUserErrors {
      field
      message
    }
    product {
      id
      title
    }
  }
}`;

export const PRODUCT_VARIANT_CREATE = `
mutation createProductVariants($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
  productVariantsBulkCreate(productId: $productId, variants: $variants) {
    productVariants {
      id
      title
      price
      compareAtPrice
      inventoryQuantity
      inventoryItem {
        measurement {
          weight {
            unit
            value
          }
        }
      }
      selectedOptions {
        name
        value
      }
    }
    userErrors {
      field
      message
    }
  }
}`;

export const PRODUCT_OPTION_CREATE = `
mutation createOptions($productId: ID!, $options: [OptionCreateInput!]!) {
  productOptionsCreate(productId: $productId, options: $options) {
    userErrors {
      field
      message
      code
    }
    product {
      options {
        name
        linkedMetafield {
          namespace
          key
        }
        optionValues {
          name
          linkedMetafieldValue
        }
      }
    }
  }
}`;

export const PRODUCT_DELETE = `
  mutation deleteProduct($input: ProductDeleteInput!) {
    productDelete(input: $input) {
      deletedProductId
      userErrors {
        field
        message
      }
    }
  }
`;

export const PRODUCT_MEDIA_DELETE = `
  mutation deleteProductMedia($productId: ID!, $mediaIds: [ID!]!) {
    productDeleteMedia(productId: $productId, mediaIds: $mediaIds) {
      deletedMediaIds
      deletedProductImageIds
      product {
        id
      }
      mediaUserErrors {
        field
        message
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const BLOG_LISTING = `
query listBlogs(
  $first: Int = 10,
  $after: String,
  $query: String,
  $reverse: Boolean = false,
  $sortKey: BlogSortKeys = ID
) {
  blogs(
    first: $first,
    after: $after,
    query: $query,
    reverse: $reverse,
    sortKey: $sortKey
  ) {
    edges {
      node {
        id
        title
        handle
        templateSuffix
        tags
        commentPolicy
        createdAt
        updatedAt
        articles(first: 20) {
          edges {
            node {
              id
              author {
                name
              }
              body
              comments(first: 20) {
                edges {
                  node {
                    id
                    body
                    author {
                      name
                    }
                    createdAt
                    updatedAt
                  }
                }
                pageInfo {
                  hasNextPage
                  endCursor
                }
              }
              createdAt
              updatedAt
              publishedAt
              summary
              tags
              templateSuffix
              handle
              isPublished
              image {
                url
                altText
              }
              metafields(first: 10) {
                edges {
                  node {
                    id
                    key
                    value
                    namespace
                  }
                }
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
        metafields(first: 10) {
          edges {
            node {
              id
              key
              value
              namespace
            }
          }
        }
        articlesCount {
          count
          precision
        }
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
`;

export const BLOG_RETRIEVE = `
query retrieveBlog($id: ID!) {
  blog(id: $id) {
    id
    title
    handle
    templateSuffix
    tags
    commentPolicy
    createdAt
    updatedAt
    articles(first: 20) {
      edges {
        node {
          id
          author {
            name
          }
          body
          comments(first: 20) {
            edges {
              node {
                id
                body
                bodyHtml
                author {
                  name
                }
                createdAt
                updatedAt
                isPublished
                publishedAt
                status
              }
            }
          }
          createdAt
          updatedAt
          publishedAt
          summary
          tags
          templateSuffix
          handle
          isPublished
          image {
            url
            altText
          }
          metafields(first: 10) {
            edges {
              node {
                id
                key
                value
                namespace
              }
            }
          }
        }
      }
    }
    metafields(first: 10) {
      edges {
        node {
          id
          key
          value
          namespace
        }
      }
    }
    articlesCount {
      count
      precision
    }
    feed {
      location
      path
    }
  }
}
`;

export const BLOG_CREATE = `
mutation createBlog($blog: BlogCreateInput!) {
  blogCreate(blog: $blog) {
    blog {
      id
      handle
      title
      commentPolicy
      templateSuffix
      metafields(first: 10) {
        edges {
          node {
            id
            key
            value
            namespace
            type
          }
        }
      }
    }
    userErrors {
      field
      message
    }
  }
}
`;

export const BLOG_UPDATE = `
mutation updateBlog($id: ID!, $blog: BlogUpdateInput!) {
  blogUpdate(id: $id, blog: $blog) {
    blog {
      id
      handle
      title
      commentPolicy
      templateSuffix
      metafields(first: 10) {
        edges {
          node {
            id
            key
            value
            namespace
            type
          }
        }
      }
    }
    userErrors {
      field
      message
    }
  }
}
`;

export const BLOG_DELETE = `
mutation deleteBlog($id: ID!) {
  blogDelete(id: $id) {
    deletedBlogId
    userErrors {
      code
      field
      message
    }
  }
}
`;

export const ARTICLE_LISTING = `
query listArticles(
  $first: Int = 10,
  $after: String,
  $query: String,
  $reverse: Boolean = false,
  $sortKey: ArticleSortKeys = PUBLISHED_AT
) {
  articles(
    first: $first,
    after: $after,
    query: $query,
    reverse: $reverse,
    sortKey: $sortKey
  ) {
    edges {
      node {
        id
        author {
          name
        }
        body
        pageInfo {
          hasNextPage
          endCursor
        }
        comments(first: 20) {
          edges {
            node {
              id
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
        body
        createdAt
        updatedAt
        publishedAt
        summary
        tags
        templateSuffix
        handle
        isPublished
        image {
          url
          altText
        }
        metafields(first: 10) {
          edges {
            node {
              id
              key
              value
              namespace
            }
          }
        }
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
`;

export const ARTICLE_RETRIEVE = `
query retrieveArticle($id: ID!) {
  article(id: $id) {
    id
    author {
      name
    }
    body
    createdAt
    updatedAt
    publishedAt
    summary
    tags
    templateSuffix
    handle
    isPublished
    image {
      url
      altText
    }
    commentsCount {
      count
      precision
    }
    blog {
      id
      title
      handle
    }
    comments(first: 20) {
      edges {
        node {
          id
          body
          bodyHtml
          author {
            name
          }
          createdAt
          updatedAt
          isPublished
          publishedAt
          status
        }
      }
    }
    metafields(first: 10) {
      edges {
        node {
          id
          key
          value
          namespace
        }
      }
    }
  }
}
`;

export const ARTICLE_CREATE = `
mutation createArticle($article: ArticleCreateInput!) {
  articleCreate(article: $article) {
    article {
      id
      title
      author {
        name
      }
      handle
      body
      templateSuffix
      summary
      tags
      image {
        altText
        originalSrc
      }
      metafields(first: 10) {
        edges {
          node {
            id
            key
            value
            namespace
          }
        }
      }
    }
    userErrors {
      field
      message
    }
  }
}
`;

export const ARTICLE_UPDATE = `
mutation updateArticle($id: ID!, $article: ArticleUpdateInput!) {
  articleUpdate(id: $id, article: $article) {
      article {
        id
        title        
        author {
          name
        }
        handle
        body
        templateSuffix
        summary
        tags
        image {
          altText
          originalSrc
        }
        metafields(first: 10) {
          edges {
            node {
              id
              key
              value
              namespace
            }
          }
        }
      }
      userErrors {
        code
        field
        message
      }
    }
  }
`;

export const ARTICLE_DELETE = `
mutation deleteArticle($id: ID!) {
  articleDelete(id: $id) {
    deletedArticleId
    userErrors {
      code
      field
      message
    }
  }
}
`;
