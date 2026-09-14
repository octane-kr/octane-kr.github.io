import { createHash, randomUUID } from 'node:crypto';
import { link, open, readFile, rename, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const publishedPostsDir = path.join(rootDir, 'src', 'pages', 'posts');
export const draftPostsDir = path.join(rootDir, 'src', 'drafts', 'posts');
export const postMetadataDir = path.join(rootDir, 'src', 'post-metadata');
export const categoriesPath = path.join(rootDir, 'src', 'data', 'categories.txt');

export const postLayoutValue = '../../layouts/PostLayout.astro';
export const postLayoutFrontmatter = `---\nlayout: ${postLayoutValue}\n---`;
export const kstTimestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+09:00$/u;
export const contentHashPattern = /^sha256-v1:[0-9a-f]{64}$/u;
export const publicationPendingState = 'lens-review-pending';
const reservedPostSlugs = new Set(['images', 'index']);

const frontmatterPattern = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n)?/u;

export const toSourcePath = (filePath) =>
  path.relative(rootDir, filePath).split(path.sep).join('/');

export const isSafeSlug = (slug) => /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/u.test(slug);
export const isReservedPostSlug = (slug) => reservedPostSlugs.has(slug);

export const assertSafeSlug = (slug) => {
  if (!isSafeSlug(slug)) {
    throw new Error(`Invalid post slug "${slug}". Use lowercase letters, numbers, and hyphens.`);
  }
  if (isReservedPostSlug(slug)) {
    throw new Error(`Post slug "${slug}" is reserved by the existing /posts/ route tree.`);
  }
};

export const splitPostMarkdown = (markdown) => {
  const frontmatterMatch = markdown.match(frontmatterPattern);

  if (!frontmatterMatch) {
    return {
      frontmatter: null,
      body: markdown.replace(/^\uFEFF/u, ''),
    };
  }

  return {
    frontmatter: frontmatterMatch[1],
    body: markdown.slice(frontmatterMatch[0].length),
  };
};

const normalizeRevisionBody = (body) => body.replace(/\r\n?/gu, '\n');

export const calculateContentHash = (metadata, markdown) => {
  const { frontmatter, body } = splitPostMarkdown(markdown);
  const authorBody = frontmatter === null ? body : body.replace(/^\r?\n/u, '');
  const revision = {
    title: String(metadata.title ?? ''),
    description: String(metadata.description ?? ''),
    category: String(metadata.category ?? ''),
    subcategory: String(metadata.subcategory ?? ''),
    body: normalizeRevisionBody(authorBody),
  };
  const digest = createHash('sha256').update(JSON.stringify(revision), 'utf8').digest('hex');

  return `sha256-v1:${digest}`;
};

export const formatKstTimestamp = (date = new Date()) => {
  if (!(date instanceof Date) || Number.isNaN(date.valueOf())) {
    throw new Error('Cannot format an invalid date.');
  }

  const shifted = new Date(date.valueOf() + 9 * 60 * 60 * 1000);
  return `${shifted.toISOString().slice(0, 19)}+09:00`;
};

export const isValidKstTimestamp = (value) => {
  if (typeof value !== 'string' || !kstTimestampPattern.test(value)) return false;
  const parsed = new Date(value);

  return !Number.isNaN(parsed.valueOf()) && formatKstTimestamp(parsed) === value;
};

export const readJsonFile = async (filePath) => {
  const source = await readFile(filePath, 'utf8');
  return JSON.parse(source);
};

const removeAtomicTempIfPresent = async (tempPath) => {
  try {
    await unlink(tempPath);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
};

export const writeTextFileAtomic = async (filePath, source, options = undefined) => {
  const flag = options?.flag;
  if (flag !== undefined && flag !== 'wx') {
    throw new Error(`Unsupported atomic write flag "${flag}".`);
  }

  const lockPath = path.join(path.dirname(filePath), `.${path.basename(filePath)}.codex-write.lock`);
  const tempPath = path.join(
    path.dirname(filePath),
    `.${path.basename(filePath)}.${process.pid}.${randomUUID()}.codex-write.tmp`,
  );

  let lockHandle;
  try {
    lockHandle = await open(lockPath, 'wx');
  } catch (error) {
    if (error.code === 'EEXIST') {
      const lockError = new Error(
        `Another atomic post write is active, or a stale lock needs review: ${lockPath}`,
      );
      lockError.code = 'ELOCKED';
      throw lockError;
    }
    throw error;
  }

  try {
    const tempHandle = await open(tempPath, 'wx');
    try {
      await tempHandle.writeFile(source, { encoding: 'utf8' });
      await tempHandle.sync();
    } finally {
      await tempHandle.close();
    }

    if (flag === 'wx') {
      // Linking exposes the complete temporary file without replacing an existing path.
      await link(tempPath, filePath);
    } else {
      // Same-directory rename atomically replaces the old canonical file.
      await rename(tempPath, filePath);
    }
  } finally {
    try {
      await removeAtomicTempIfPresent(tempPath);
    } finally {
      try {
        await lockHandle.close();
      } finally {
        await removeAtomicTempIfPresent(lockPath);
      }
    }
  }
};

export const writeJsonFile = async (filePath, value, options = undefined) => {
  await writeTextFileAtomic(filePath, `${JSON.stringify(value, null, 2)}\n`, options);
};

export const readCategoryCatalog = async () => {
  const source = await readFile(categoriesPath, 'utf8');
  const catalog = new Map();
  let currentCategory = null;

  for (const rawLine of source.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    if (line.startsWith('-')) {
      const subcategory = line.replace(/^-+\s*/u, '').trim();
      if (currentCategory && subcategory) catalog.get(currentCategory).add(subcategory);
      continue;
    }

    currentCategory = line;
    catalog.set(currentCategory, new Set());
  }

  return catalog;
};

export const metadataPathForSlug = (slug) => path.join(postMetadataDir, `${slug}.json`);
export const publishedPostPathForSlug = (slug) => path.join(publishedPostsDir, `${slug}.md`);
export const draftPostPathForSlug = (slug) => path.join(draftPostsDir, `${slug}.md`);
export const draftMetadataPathForSlug = (slug) => path.join(draftPostsDir, `${slug}.json`);
