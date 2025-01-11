import { load } from 'cheerio';
import { GenericAPIErrorHandler } from '@/utils/api';

interface MediaResult {
  images: string[];
  videos: string[];
  audios: string[];
}

function extractUrlsFromSrcset(srcset: string): string[] {
  return srcset
    .split(',')
    .map(src => src.trim().split(/\s+/)[0])
    .filter(url => url && url.trim() !== '');
}

function getMediaSource(element: cheerio.Element, $: cheerio.CheerioAPI): string[] {
  const possibleAttributes = [
    'src',
    'data-src',
    'srcset',
    'data-srcset',
    'data-original',
    'data-fallback',
    'data-actualimage',
    'data-lazy-src',
    'data-lazy-srcset',
  ];

  const sources: string[] = [];

  for (const attr of possibleAttributes) {
    const value = $(element).attr(attr);
    if (value && value.trim() !== '') {
      if (attr.includes('srcset')) {
        sources.push(...extractUrlsFromSrcset(value));
      } else {
        sources.push(value.trim());
      }
    }
  }

  return sources;
}

export const maxDuration = 60;
export async function POST(req: Request): Promise<Response> {
  try {
    const { urls } = await req.json();
    if (!Array.isArray(urls)) {
      throw new Error("URLs must be provided as an array");
    }

    const results = await Promise.all(urls.map(async (url) => {
      try {
        const response = await fetch(url);
        const html = await response.text();
        const $ = load(html);
        
        $('script, style, noscript, iframe, svg, canvas, [aria-hidden="true"], .hidden, meta, link, br, hr').remove();
        
        const extractText = (element: cheerio.Cheerio) => {
          return element.contents().map(function() {
            if (this.type === 'text') {
              return $(this).text().trim();
            } else if (this.type === 'tag' && ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'td', 'th', 'div', 'span', 'a'].includes(this.name.toLowerCase())) {
              return extractText($(this));
            }
            return '';
          }).get().join(' ');
        };

        const mainContent = $('main, #main, .main, article, .article, .content, #content, .container, #container, section, #section, .section');
        const textContent = mainContent.length ? extractText(mainContent) : extractText($('body'));

        const medias: MediaResult = {
          images: [],
          videos: [],
          audios: []
        };
        $('picture, img[src], img[data-src], img[srcset], img[data-srcset], source').each((_, element) => {
          if ($(element).is('picture')) {
            $(element).find('source').each((_, source) => {
              medias.images.push(...getMediaSource(source, $));
            });
            const imgElement = $(element).find('img');
            if (imgElement.length) {
              medias.images.push(...getMediaSource(imgElement[0], $));
            }
          } else if ($(element).is('img') || $(element).is('source')) {
            medias.images.push(...getMediaSource(element, $));
          }
        });
        $('video, source[type^="video"]').each((_, element) => {
          medias.videos.push(...getMediaSource(element, $));
        });
        $('audio, source[type^="audio"]').each((_, element) => {
          medias.audios.push(...getMediaSource(element, $));
        });
        const cleanUrls = (urls: string[]): string[] => {
          return [...new Set(
            urls
              .filter(url => url && url.trim() !== '')
              .map(url => {
                try {
                  return new URL(url, response.url).href;
                } catch {
                  return url;
                }
              })
          )];
        };
        medias.images = cleanUrls(medias.images);
        medias.videos = cleanUrls(medias.videos);
        medias.audios = cleanUrls(medias.audios);
        return {
          url,
          text: textContent
            .replace(/\s+/g, ' ')
            .replace(/\n+/g, '\n')
            .replace(/[^\S\n]+/g, ' ')
            .trim(),
          medias
        };
      } catch (error) {
        console.error(`Error processing URL ${url}:`, error);
        return {
          url,
          text: '',
          medias: { images: [], videos: [], audios: [] },
          error: 'Failed to process URL'
        };
      }
    }));

    const successfulResults = results.filter(result => !result.error);
    const combinedResult = {
      text: successfulResults
        .map(result => result.text)
        .filter(text => text.length >= 50)
        .join('\n\n'),
      medias: {
        images: [...new Set(successfulResults.flatMap(result => result.medias.images))],
        videos: [...new Set(successfulResults.flatMap(result => result.medias.videos))],
        audios: [...new Set(successfulResults.flatMap(result => result.medias.audios))]
      },
      processedUrls: results.map(result => ({
        url: result.url,
        success: !result.error,
        error: result.error
      }))
    };

    if (combinedResult.text.length < 50) {
      throw new Error("Insufficient content extracted from all URLs");
    }

    return new Response(JSON.stringify(combinedResult), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error: any) {
    return GenericAPIErrorHandler.handleAPIError(error);
  }
}