import { Review, FAQ, Offer } from '@/types/seo';
import { processJsonData } from '@/utils/data';

function formatNestedObject(obj: any, prefix: string = '', isTechnicalDetails: boolean = false): string {
  if (typeof obj !== 'object' || obj === null) {
    return String(obj).charAt(0).toUpperCase() + String(obj).slice(1);
  }
  if (Array.isArray(obj)) {
    return obj.map(item => formatNestedObject(item, '', isTechnicalDetails)).join(', ');
  }
  const entries = Object.entries(obj)
    .filter(([key]) => !key.startsWith('@'))
    .filter(([key]) => !(isTechnicalDetails && key.toLowerCase() === 'additionalproperty'));
  if (entries.length === 0) {
    return '';
  }
  if (isTechnicalDetails) {
    if (prefix) {
      return entries.map(([key, value]) => `
        <tr class="nested-row">
          <th scope="row">${capitalizeFirstLetter(key)}</th>
          <td>${formatNestedObject(value, '', isTechnicalDetails)}</td>
        </tr>
      `).join('');
    }
    return entries.map(([key, value]) => {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        return formatNestedObject(value, '', isTechnicalDetails);
      }
      return `
        <tr>
          <th scope="row">${capitalizeFirstLetter(key)}</th>
          <td>${formatNestedObject(value, '', isTechnicalDetails)}</td>
        </tr>
      `;
    }).join('');
  } else {
    const listItems = entries.map(([key, value]) => {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        return `
          <li>
            <strong>${capitalizeFirstLetter(key)}:</strong>
            <ul class="nested-list">
              ${formatNestedObject(value, '', isTechnicalDetails)}
            </ul>
          </li>
        `;
      }
      return `
        <li><strong>${capitalizeFirstLetter(key)}:</strong> ${formatNestedObject(value, '', isTechnicalDetails)}</li>
      `;
    }).join('');

    if (prefix) {
      return `
        <li>
          <strong>${capitalizeFirstLetter(prefix)}:</strong>
          <ul class="nested-list">
            ${listItems}
          </ul>
        </li>
      `;
    }
    return listItems;
  }
}

function capitalizeFirstLetter(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function generateProductSchema(product: any) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.shortDescription,
    sku: product.sku,
    brand: {
      "@type": "Brand",
      name: product.brand
    },
    image: product.images?.[0]?.src || [],
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: "USD",
      availability: product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: product.url,
      priceValidUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      itemCondition: "https://schema.org/NewCondition"
    },
    aggregateRating: product.reviews?.length ? {
      "@type": "AggregateRating",
      ratingValue: product.averageRating,
      reviewCount: product.reviews.length,
      bestRating: 5,
      worstRating: 1
    } : undefined,
    reviews: product.reviews?.map((review: any) => ({
      "@type": "Review",
      author: {
        "@type": "Person",
        name: review.author
      },
      reviewRating: {
        "@type": "Rating",
        ratingValue: review.rating,
        bestRating: 5
      },
      reviewBody: review.content,
      datePublished: review.date
    })),
    additionalProperty: Object.entries(product.technicalDetails || {}).map(([name, value]) => ({
      "@type": "PropertyValue",
      name,
      value: String(value)
    }))
  };
}

function formatSchemaMarkup(schema: any): string {
  if (!schema || typeof schema !== 'object') {
    return '';
  }
  let content = '';
  if (schema?.technical && typeof schema?.technical === 'object' && Object.keys(schema?.technical).length > 0) {
    const technicalContent = formatNestedObject(schema.technical, '', true).trim();
    if (technicalContent) {
      content += `
        <div class="product-specs">
          <h2 class="specs-heading">Technical Specifications</h2>
          <div class="specs-table-wrapper">
            <table class="specs-table">
              <thead>
                <tr>
                  <th scope="col">Feature</th>
                  <th scope="col">Specification</th>
                </tr>
              </thead>
              <tbody>
                ${technicalContent}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }
  }

  if (schema?.product && typeof schema?.product === 'object' && Object.keys(schema?.product).length > 0) {
    const hasAdditionalProperties = Array.isArray(schema?.product?.additionalProperty) && 
                                  schema?.product?.additionalProperty.length > 0 &&
                                  schema?.product?.additionalProperty.some(prop => prop.name && prop.value);
    const hasValidOffer = schema?.product?.offers && 
                         schema?.product?.offers?.shippingDetails&& 
                         schema?.product?.offers?.warrantyDuration;
    if (hasAdditionalProperties || hasValidOffer) {
        content += `
          <div class="product-details" itemscope itemtype="https://schema.org/Product">
            ${hasAdditionalProperties ? `
            <div class="product-essentials">
              <h2 class="specs-heading">Product Highlights</h2>
              <ul class="highlights-grid">
              ${schema?.product?.additionalProperty
                .filter((prop: any) => prop.name && prop.value)
                .map((prop: any) => `
                  <li class="highlight-item">
                    <strong>${prop.name}:</strong> ${prop.value}
                  </li>
                `).join('')}
                </ul>
              </div>
            ` : ''}
          </div>

          ${hasValidOffer ? `
            <div class="product-offer" itemprop="offers" itemscope itemtype="https://schema.org/Offer">
              <h2 class="specs-heading">Other Information</h2>
              <div class="offer-details">
                <div class="offer-section">
                  <span class="shipping" itemprop="shipping"><strong>Shipping: </strong>${schema?.product?.offers?.shippingDetails}</span>
                  <span class="warranty" itemprop="warranty"><strong>Warranty: </strong>${schema?.product?.offers?.warrantyDuration}</span>
                </div>
                <div class="availability-section">
                  <span class="availability-status" itemprop="availability">
                    <strong>Availability: </strong>
                    ${schema?.product?.offers?.availability === 'InStock' ? 'In Stock' : 'Out of Stock'}
                  </span>
                </div>
              </div>
            </div>
          ` : ''}
        </div>
      `;
    }
  }
  if (schema?.faq && typeof schema?.faq === 'object' && schema?.faq?.mainEntity && 
      Array.isArray(schema.faq.mainEntity) && 
      schema.faq.mainEntity.some((item: any) => item?.name && item?.acceptedAnswer?.text)) {
    content += `
      <div class="product-faq" itemscope itemtype="https://schema.org/FAQPage">
        <h2 class="specs-heading">Frequently Asked Questions</h2>
        <div class="faq-accordion">
          ${schema?.faq?.mainEntity
            .filter((item: any) => item?.name && item?.acceptedAnswer?.text)
            .map((item: any) => `
              <div class="faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
                <strong class="faq-question" itemprop="name" aria-expanded="false">
                  ${item?.name}
                </strong>
                <div class="faq-answer" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
                  <div itemprop="text">
                    ${item?.acceptedAnswer?.text}
                  </div>
                </div>
              </div>
            `).join('')}
        </div>
      </div>
    `;
  }

  if (schema?.review && 
      typeof schema?.review === 'object' &&
      schema.review?.author?.name && 
      schema.review?.reviewBody && 
      schema.review?.reviewRating?.ratingValue && 
      schema.review?.datePublished) {
    content += `
      <div class="product-reviews">
        <h2 class="specs-heading">Customer Reviews</h2>
        <div class="reviews-grid">
          <div class="review-card" itemprop="review" itemscope itemtype="https://schema.org/Review">
            <div class="review-header">
              <span class="reviewer-name" itemprop="author">${schema?.review?.author?.name}</span>
              <div class="review-rating" itemprop="reviewRating" itemscope itemtype="https://schema.org/Rating">
                ${generateStarRating(Number(schema?.review?.reviewRating?.ratingValue))}
              </div>
            </div>
            <div class="review-content" itemprop="reviewBody">
              ${schema?.review?.reviewBody}
            </div>
            <div class="review-date" itemprop="datePublished">
              ${new Date(schema?.review?.datePublished).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
    `;
  }
  return content;
}

function generateStarRating(rating: number): string {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
  return `
    <div class="star-rating">
      ${Array(fullStars).fill('★').join('')}
      ${hasHalfStar ? '½' : ''}
      ${Array(emptyStars).fill('☆').join('')}
    </div>
  `;
}

export function formatContent(
  bodyContent: string,
): string {
  let formattedDescription = `
    <div class="body-content">
      ${bodyContent}
    </div>
  `;
  return `<div class="body-content-container">${formattedDescription}</div>`.replace(/^\s*$(?:\r\n?|\n)/gm, '');
}


