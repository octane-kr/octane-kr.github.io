import {
  formatCategory,
  getPostUpdatedDate,
  getSortedPosts,
  siteDescription,
  siteTitle,
} from '../lib/posts';

const escapeXml = (value: string) =>
  value
    .replace(/&/gu, '&amp;')
    .replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;')
    .replace(/"/gu, '&quot;')
    .replace(/'/gu, '&apos;');

const toAbsoluteUrl = (site: URL, path: string) => new URL(path, site).toString();

export function GET({ site }: { site?: URL }) {
  const baseUrl = site ?? new URL('https://octane-kr.github.io');
  const posts = getSortedPosts();
  const latestDate =
    posts
      .map(getPostUpdatedDate)
      .filter((date): date is Date => date !== null)
      .sort((a, b) => b.valueOf() - a.valueOf())[0] ?? new Date();

  const items = posts
    .map((post) => {
      const postUrl = toAbsoluteUrl(baseUrl, post.url);
      const categories = [formatCategory(post.category, post.subcategory), ...post.tags]
        .filter(Boolean)
        .map((category) => `<category>${escapeXml(category)}</category>`)
        .join('');

      return [
        '<item>',
        `<title>${escapeXml(post.title)}</title>`,
        `<link>${escapeXml(postUrl)}</link>`,
        `<guid isPermaLink="true">${escapeXml(postUrl)}</guid>`,
        post.publishedDate ? `<pubDate>${post.publishedDate.toUTCString()}</pubDate>` : '',
        categories,
        post.excerpt ? `<description>${escapeXml(post.excerpt)}</description>` : '',
        '</item>',
      ].join('');
    })
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(siteTitle)}</title>
    <link>${escapeXml(toAbsoluteUrl(baseUrl, '/'))}</link>
    <description>${escapeXml(siteDescription)}</description>
    <language>ko</language>
    <lastBuildDate>${latestDate.toUTCString()}</lastBuildDate>
    <atom:link href="${escapeXml(toAbsoluteUrl(baseUrl, '/feed.xml'))}" rel="self" type="application/rss+xml" />
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  });
}
