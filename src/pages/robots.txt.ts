export function GET({ site }: { site?: URL }) {
  const baseUrl = site ?? new URL('https://octane-kr.github.io');
  const sitemapUrl = new URL('/sitemap.xml', baseUrl).toString();

  return new Response(`User-agent: *\nAllow: /\nSitemap: ${sitemapUrl}\n`, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
