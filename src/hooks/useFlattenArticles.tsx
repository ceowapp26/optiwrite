import { useMemo, useCallback } from 'react';

const useFlattenArticles = () => {
  const flattenArticle = useCallback((item) => {
    return {
      contentId: item?.contentId,
      blog_title: item?.blog?.title || '',
      blog_commentable: item?.blog?.commentable ? 'yes' : 'no',
      blog_feedburner: item?.blog?.feedburner || '',
      blog_feedburner_location: item?.blog?.feedburner_location || '',
      blog_handle: item?.blog?.handle || '',
      blog_tags: item?.blog?.tags || [],
      blog_template_suffix: item?.blog?.template_suffix || '',
      blog_metafield: item?.blog?.metafield || null,
      article_title: item?.title || '',
      article_author: item?.author || '',
      article_body_html: item?.body_html || '',
      article_handle: item?.handle || '',
      article_image: item?.image || '',
      article_metafield: item?.metafield || null,
      article_published: item?.published || false,
      article_summary_html: item?.summary_html || '',
      article_tags: item?.tags || [],
      article_template_suffix: item?.template_suffix || '',
    };
  }, []);

  const flattenArticles = useCallback(
    (articlesToFlatten) => {
      return articlesToFlatten?.map((item) => flattenArticle(item)) || [];
    },
    [flattenArticle]
  );

  return { flattenArticle, flattenArticles };
};

export { useFlattenArticles };
