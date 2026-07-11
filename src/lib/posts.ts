type RawPostModule = {
  frontmatter?: Record<string, unknown>;
  url?: string;
};

export type BlogPost = {
  url: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  subcategory: string;
  tags: string[];
  publishedAt: unknown;
  updatedAt: unknown;
  publishedDate: Date | null;
  updatedDate: Date | null;
  hasValidDate: boolean;
  draft: boolean;
  excerpt: string;
};

const modules = import.meta.glob('../pages/posts/*.md', { eager: true });
const rawModules = import.meta.glob<string>('../pages/posts/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
});

export const siteTitle = '코끼리 뿌우';
export const siteDescription = '개인 글과 프로젝트 기록';

const parseDate = (value: unknown, isDateOnly = false) => {
  if (!value) return null;

  if (isDateOnly) {
    const dateText =
      value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
    const date = new Date(`${dateText}T00:00:00+09:00`);
    return Number.isNaN(date.valueOf()) ? null : date;
  }

  const date = value instanceof Date ? value : new Date(value as string | number);
  return Number.isNaN(date.valueOf()) ? null : date;
};

const removeFrontmatter = (markdown: string) =>
  markdown.replace(/^\uFEFF?---\r?\n[\s\S]*?\r?\n---\s*/u, '');

const removeLensMarkerComments = (markdown: string) =>
  markdown
    .split(/\r?\n/)
    .filter(
      (line) =>
        !/^\s*<!--\s*lens:[^\r\n]*-->\s*$/u.test(line) &&
        !/^\s*<!--\s*\/lens\s*-->\s*$/u.test(line),
    )
    .join('\n');

const stripMarkdownForText = (markdown: string) =>
  removeLensMarkerComments(removeFrontmatter(markdown))
    .replace(/^\s*(```|~~~)[\s\S]*?\r?\n\1\s*$/gmu, ' ')
    .replace(/!\[([^\]]*)\]\([^)]+\)/gu, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/gu, '$1')
    .replace(/`([^`]+)`/gu, '$1')
    .replace(/<!--[\s\S]*?-->/gu, ' ')
    .replace(/^\s{0,3}#{1,6}\s+/gmu, '')
    .replace(/^\s{0,3}>\s?/gmu, '')
    .replace(/^\s{0,3}(?:[-*+]|\d+[.)])\s+/gmu, '')
    .replace(/[*_~]/gu, '')
    .replace(/[()[\]{}|\\]/gu, ' ')
    .replace(/<[^>\n]+>/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();

const makeExcerpt = (markdown: string, description: string) => {
  const text = description.trim() || stripMarkdownForText(markdown);
  if (text.length <= 180) return text;

  return `${text.slice(0, 180).trim()}...`;
};

const normalizeTags = (value: unknown) => {
  if (!Array.isArray(value)) return [];

  return value
    .map((tag) => String(tag).trim())
    .filter(Boolean);
};

const normalizeRoutePath = (value: string) => {
  if (value.endsWith('/') || /\.[a-z0-9]+$/iu.test(value)) return value;

  return `${value}/`;
};

export const getSortedPosts = (): BlogPost[] =>
  Object.entries(modules)
    .map(([path, rawModule]) => {
      const module = rawModule as RawPostModule;
      const frontmatter = module.frontmatter ?? {};

      const filename = path.split('/').pop() ?? 'untitled.md';
      const slug = filename.replace(/\.md$/, '');
      const title = String(frontmatter.title ?? slug);
      const description = String(frontmatter.description ?? '');
      const publishedAt = frontmatter.publishedAt ?? frontmatter.date;
      const updatedAt = frontmatter.updatedAt;
      const publishedDate = parseDate(publishedAt, !frontmatter.publishedAt);
      const updatedDate = parseDate(updatedAt);
      const rawMarkdown = rawModules[path] ?? '';

      return {
        url: normalizeRoutePath(module.url ?? `/posts/${slug}/`),
        slug,
        title,
        description,
        category: String(frontmatter.category ?? 'PS'),
        subcategory: String(frontmatter.subcategory ?? ''),
        tags: normalizeTags(frontmatter.tags),
        publishedAt,
        updatedAt,
        publishedDate,
        updatedDate,
        hasValidDate: publishedDate !== null,
        draft: frontmatter.draft === true,
        excerpt: makeExcerpt(rawMarkdown, description),
      };
    })
    .filter((post) => !post.draft)
    .sort((a, b) => {
      const av = a.hasValidDate ? a.publishedDate!.valueOf() : 0;
      const bv = b.hasValidDate ? b.publishedDate!.valueOf() : 0;
      if (bv !== av) return bv - av;

      return a.slug.localeCompare(b.slug) || a.title.localeCompare(b.title);
    });

export const getPostUpdatedDate = (post: BlogPost) =>
  post.updatedDate ?? post.publishedDate;

export const formatCategory = (category: string, subcategory = '') =>
  subcategory ? `${category} / ${subcategory}` : category;

export const dateTimeFormatter = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export const dateOnlyFormatter = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export const formatPostDate = (date: Date | null) =>
  date === null ? '날짜 없음' : dateTimeFormatter.format(date);
