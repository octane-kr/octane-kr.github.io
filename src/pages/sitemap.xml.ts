import { getPostUpdatedDate, getSortedPosts } from '../lib/posts';

const escapeXml = (value: string) =>
  value
    .replace(/&/gu, '&amp;')
    .replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;')
    .replace(/"/gu, '&quot;');

const toAbsoluteUrl = (site: URL, path: string) => new URL(path, site).toString();

export function GET({ site }: { site?: URL }) {
  const baseUrl = site ?? new URL('https://octane-kr.github.io');
  const posts = getSortedPosts();
  const latestPostDate =
    posts
      .map(getPostUpdatedDate)
      .filter((date): date is Date => date !== null)
      .sort((a, b) => b.valueOf() - a.valueOf())[0] ?? null;

  const staticRoutes = [
    '/',
    '/posts/',
    '/archives/',
    '/categories/',
    '/tags/',
    '/projects/',
    '/cv/',
    '/codeforces-lab/',
    '/ucpc-scoreboard/',
  ];

  const routeEntries = staticRoutes.map((path) => ({
    path,
    lastmod: latestPostDate,
  }));

  const postEntries = posts.map((post) => ({
    path: post.url,
    lastmod: getPostUpdatedDate(post),
  }));

  const urls = [...routeEntries, ...postEntries]
    .map(({ path, lastmod }) => {
      const lastmodTag = lastmod
        ? `<lastmod>${lastmod.toISOString().slice(0, 10)}</lastmod>`
        : '';

      return [
        '  <url>',
        `    <loc>${escapeXml(toAbsoluteUrl(baseUrl, path))}</loc>`,
        lastmodTag ? `    ${lastmodTag}` : '',
        '  </url>',
      ].join('\n');
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
}
