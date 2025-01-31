import { useMemo, useCallback } from 'react';
import { extractArticleHandleFromUrl, extractBlogHandleFromUrl, extractProductHandleFromUrl } from '@/utils/data';

const useFlattenContent = () => {
  
  const extractId = (gid) => {
    return Number(gid.split('/').pop());
  };

  const flattenBlogArticle = useCallback((item) => {
    return {
      contentId: item?.contentId,
      blog_title: item?.blog?.title || '',
      blog_commentable: item?.blog?.commentable,
      blog_handle:  extractBlogHandleFromUrl(item?.blog?.handle)?.handle || '',
      blog_template_suffix: item?.blog?.template_suffix || '',
      blog_page_title: item?.blog?.page_title || null,
      blog_meta_description: item?.blog?.meta_description || null,
      article_title: item?.title || '',
      article_author: item?.author || '',
      article_body_html: item?.body_html || '',
      article_handle: extractArticleHandleFromUrl(item?.handle)?.handle || '',
      article_image: item?.image || '',
      article_published: item?.published || false,
      article_summary_html: item?.summary_html || '',
      article_tags: item?.tags || '',
      article_template_suffix: item?.template_suffix || '',
      article_page_title: item?.page_title,
      article_meta_description: item?.meta_description || ''
    };
  }, []);

  const flattenBlog = useCallback((item) => {
    return {
      contentId: item?.contentId,
      blog_id: extractId(item?.id),
      blog_title: item?.title || '',
      blog_commentable: item?.commentable,
      blog_handle: extractBlogHandleFromUrl(item?.handle)?.handle || '',
      blog_template_suffix: item?.template_suffix || '',
      blog_page_title: item?.page_title,
      blog_meta_description: item?.meta_description
    };
  }, []);

  const flattenArticle = useCallback((item) => {
    return {
      contentId: item?.contentId,
      blog_id: extractId(item?.blog?.id),
      blog_name: item?.blog?.title,
      article_id: extractId(item?.id),
      article_title: item?.title || '',
      article_author: item?.author || '',
      article_body_html: item?.body_html || '',
      article_handle: extractArticleHandleFromUrl(item?.handle)?.handle || '',
      article_image: item?.image || '',
      article_published: item?.published || true,
      article_published_at: item?.published_at || '',
      article_summary_html: item?.summary_html || '',
      article_tags: item?.tags || '',
      article_template_suffix: item?.template_suffix || '',
      article_page_title: item?.page_title,
      article_meta_description: item?.meta_description
    };
  }, []);

  const flattenProduct = useCallback((item) => {
    return {
      contentId: item?.contentId,
      product_id: extractId(item.id),
      handle: extractProductHandleFromUrl(item?.handle)?.handle || '',
      title: item?.title || '',
      product_type: item?.product_type || '',
      ventor: item?.ventor || '',
      status: item?.status,
      body_html: item?.body_html || '',
      handle: extractProductHandleFromUrl(item?.handle)?.handle || '',
      template_suffix: item?.template_suffix || '',
      images: item?.images || [],
      tags: item?.tags || '',
      price: item?.price || '0.00',
      page_title: item?.page_title || '',
      meta_description: item?.meta_description || ''
    };
  }, []);

  const unflattenArticle = useCallback((flattenedItem: FlattenedArticle): Article => {
    return {
      contentId: flattenedItem.contentId,
      title: flattenedItem.article_title,
      author: flattenedItem.article_author,
      body_html: flattenedItem.article_body_html,
      handle: flattenedItem.article_handle,
      image: flattenedItem.article_image,
      metafield: flattenedItem.article_metafield,
      published: flattenedItem.article_published,
      summary_html: flattenedItem.article_summary_html,
      tags: flattenedItem.article_tags,
      template_suffix: flattenedItem.article_template_suffix,
      blog: {
        title: flattenedItem.blog_title,
        commentable: flattenedItem.blog_commentable === 'yes',
        feedburner: flattenedItem.blog_feedburner,
        feedburner_location: flattenedItem.blog_feedburner_location,
        handle: flattenedItem.blog_handle,
        tags: flattenedItem.blog_tags,
        template_suffix: flattenedItem.blog_template_suffix,
        metafield: flattenedItem.blog_metafield,
      },
    };
  }, []);

  const flattenArticles = useCallback(
    (articlesToFlatten) => {
      return articlesToFlatten?.map((item) => flattenArticle(item)) || [];
    },
    [flattenArticle]
  );

  const flattenBlogs = useCallback(
    (blogsToFlatten) => {
      return blogsToFlatten?.map((item) => flattenBlog(item)) || [];
    },
    [flattenBlog]
  );

  const flattenProducts = useCallback(
    (productsToFlatten) => {
      return productsToFlatten?.map((item) => flattenProduct(item)) || [];
    },
    [flattenProduct]
  );

  return { flattenArticle, flattenBlog, flattenProduct, flattenBlogs, flattenArticles, flattenProducts, unflattenArticle };
};

export { useFlattenContent };
