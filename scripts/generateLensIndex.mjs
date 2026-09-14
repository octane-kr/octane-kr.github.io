import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';

import { postLensScopes } from '../src/data/lensScopeMap.js';
import { parseLensDocument } from './lensDocumentParser.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lensDir = path.join(rootDir, 'src', 'lens');
const postsDir = path.join(rootDir, 'src', 'pages', 'posts');
const postMetadataDir = path.join(rootDir, 'src', 'post-metadata');
const outputPath = path.join(rootDir, 'src', 'data', 'lens.generated.json');
const markdownProcessor = await createMarkdownProcessor({
  syntaxHighlight: false,
  remarkPlugins: [remarkMath],
  rehypePlugins: [rehypeKatex],
});

const toSourcePath = (filePath) =>
  path.relative(rootDir, filePath).split(path.sep).join('/');

const listMarkdownFiles = async (dir) => {
  const dirStat = await stat(dir);
  if (!dirStat.isDirectory()) {
    throw new Error(`Required Markdown directory is not a directory: ${toSourcePath(dir)}`);
  }

  const entries = await readdir(dir, { withFileTypes: true });
  const nestedFiles = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return listMarkdownFiles(entryPath);
    if (entry.isFile() && entry.name.endsWith('.md')) return [entryPath];
    return [];
  }));

  return nestedFiles.flat().sort((a, b) => a.localeCompare(b));
};

const assertMetadataKeys = (metadata, allowedKeys, sourcePath) => {
  for (const key of Object.keys(metadata)) {
    if (!allowedKeys.has(key)) {
      throw new Error(`${sourcePath}:2 unsupported lens frontmatter key "${key}"`);
    }
  }
};

const requireMetadata = (metadata, key, sourcePath) => {
  const value = metadata[key]?.trim();
  if (!value) throw new Error(`${sourcePath}:2 lens frontmatter requires "${key}"`);
  return value;
};

const assertSafeName = (value, label, sourcePath) => {
  if (!/^[a-z0-9][a-z0-9-]*$/u.test(value)) {
    throw new Error(`${sourcePath}:2 invalid ${label} "${value}"`);
  }
};

const normalizeExcerpt = (value) => value.replace(/\r\n?/gu, '\n');

const assertVerbatimPostExcerpt = (entry, postMarkdown, lensPath, postPath) => {
  const normalizedPost = normalizeExcerpt(postMarkdown);
  const normalizedBody = normalizeExcerpt(entry.body);
  if (normalizedPost.includes(normalizedBody)) return;

  throw new Error(
    `${lensPath}:${entry.line} lens body must be a verbatim contiguous excerpt of ${postPath}`,
  );
};

const assertPostsHaveNoInlineLensMarkup = async (postFiles) => {
  const inlineLensPattern = /<!--\s*(?:lens:|\/lens\s*-->)/u;

  for (const postFile of postFiles) {
    const sourcePath = toSourcePath(postFile);
    const lines = (await readFile(postFile, 'utf8')).split(/\r?\n/u);
    const markerIndex = lines.findIndex((line) => inlineLensPattern.test(line));
    if (markerIndex !== -1) {
      throw new Error(
        `${sourcePath}:${markerIndex + 1} inline Lens markup is not allowed; maintain Lens entries under src/lens/`,
      );
    }
  }
};

const assertLensPath = (lensPath, expectedPath) => {
  if (lensPath === expectedPath) return;
  throw new Error(`${lensPath}:1 lens document must be stored at ${expectedPath}`);
};

const readPublishedPost = async (postSlug, lensPath) => {
  assertSafeName(postSlug, 'post slug', lensPath);
  const postFile = path.join(postsDir, `${postSlug}.md`);
  const metadataFile = path.join(postMetadataDir, `${postSlug}.json`);
  try {
    const [postMarkdown, metadataSource] = await Promise.all([
      readFile(postFile, 'utf8'),
      readFile(metadataFile, 'utf8'),
    ]);
    const metadata = JSON.parse(metadataSource);
    if (typeof metadata.title !== 'string' || metadata.title.trim() === '') {
      throw new Error(`missing title in ${toSourcePath(metadataFile)}`);
    }
    return {
      postFile,
      postMarkdown,
      postTitle: metadata.title.trim(),
    };
  } catch (error) {
    throw new Error(
      `${lensPath}:2 cannot load referenced post and metadata: ${toSourcePath(postFile)}, ${toSourcePath(metadataFile)} (${error.message})`,
    );
  }
};

const getLensSource = async (filePath, metadata) => {
  const lensPath = toSourcePath(filePath);
  const kind = requireMetadata(metadata, 'kind', lensPath);

  if (kind === 'global') {
    assertMetadataKeys(metadata, new Set(['kind', 'title']), lensPath);
    assertLensPath(lensPath, 'src/lens/global.md');
    return {
      sourceKey: 'global',
      idPrefix: 'lens-global',
      source: 'global',
      scope: 'global',
      scopes: ['global'],
      sourceKind: 'reference',
      sourceSlug: 'global',
      sourceTitle: metadata.title?.trim() || 'Global Notation',
      sourceHref: null,
      sourcePath: lensPath,
      lensPath,
      postMarkdown: null,
    };
  }

  if (kind === 'scope') {
    assertMetadataKeys(metadata, new Set(['kind', 'scope', 'post', 'title']), lensPath);
    const scope = requireMetadata(metadata, 'scope', lensPath);
    const postSlug = requireMetadata(metadata, 'post', lensPath);
    assertSafeName(scope, 'scope', lensPath);
    assertSafeName(postSlug, 'post slug', lensPath);
    assertLensPath(lensPath, `src/lens/scopes/${scope}.md`);
    if (!(postLensScopes[postSlug] ?? []).includes(scope)) {
      throw new Error(
        `${lensPath}:2 scope "${scope}" is not registered for source post "${postSlug}" in src/data/lensScopeMap.js`,
      );
    }
    const { postFile, postMarkdown, postTitle } = await readPublishedPost(postSlug, lensPath);
    return {
      sourceKey: `scope:${scope}`,
      idPrefix: `lens-scope-${scope}`,
      source: 'scope',
      scope,
      scopes: [scope],
      sourceKind: 'post',
      sourceSlug: postSlug,
      sourceTitle: metadata.title?.trim() || postTitle,
      sourceHref: `/posts/${postSlug}/`,
      sourcePath: toSourcePath(postFile),
      lensPath,
      postMarkdown,
    };
  }

  if (kind === 'post') {
    assertMetadataKeys(metadata, new Set(['kind', 'post']), lensPath);
    const postSlug = requireMetadata(metadata, 'post', lensPath);
    assertLensPath(lensPath, `src/lens/posts/${postSlug}.md`);
    const { postFile, postMarkdown, postTitle } = await readPublishedPost(postSlug, lensPath);

    return {
      sourceKey: `post:${postSlug}`,
      idPrefix: `lens-post-${postSlug}`,
      source: 'post',
      scope: postSlug,
      scopes: [postSlug, ...(postLensScopes[postSlug] ?? [])],
      sourceKind: 'post',
      sourceSlug: postSlug,
      sourceTitle: postTitle,
      sourceHref: `/posts/${postSlug}/`,
      sourcePath: toSourcePath(postFile),
      lensPath,
      postMarkdown,
    };
  }

  throw new Error(`${lensPath}:2 unsupported lens document kind "${kind}"`);
};

const renderLensBodyHtml = async (body, sourcePath, line) => {
  const result = await markdownProcessor.render(body, {
    fileURL: `${sourcePath}:${line}`,
  });

  return result.code.trim();
};

const readLensDocument = async (filePath) => {
  const lensPath = toSourcePath(filePath);
  const markdown = await readFile(filePath, 'utf8');
  const { metadata, entries } = parseLensDocument(markdown, lensPath);
  const sourceInfo = await getLensSource(filePath, metadata);

  if (sourceInfo.postMarkdown) {
    entries.forEach((entry) => {
      assertVerbatimPostExcerpt(
        entry,
        sourceInfo.postMarkdown,
        lensPath,
        sourceInfo.sourcePath,
      );
    });
  }

  return {
    sourceKey: sourceInfo.sourceKey,
    entries: await Promise.all(entries.map(async (entry, index) => ({
      id: `${sourceInfo.idPrefix}__${String(index).padStart(4, '0')}`,
      source: sourceInfo.source,
      scope: sourceInfo.scope,
      scopes: sourceInfo.scopes,
      sourceKind: sourceInfo.sourceKind,
      sourceSlug: sourceInfo.sourceSlug,
      sourceTitle: sourceInfo.sourceTitle,
      sourceHref: sourceInfo.sourceHref,
      sourcePath: sourceInfo.sourcePath,
      lensPath: sourceInfo.lensPath,
      keywords: entry.keywords,
      body: entry.body,
      bodyHtml: await renderLensBodyHtml(entry.body, lensPath, entry.line),
    }))),
  };
};

const generateLensIndex = async () => {
  const lensFiles = await listMarkdownFiles(lensDir);
  const postFiles = await listMarkdownFiles(postsDir);
  await assertPostsHaveNoInlineLensMarkup(postFiles);

  if (lensFiles.length === 0) {
    throw new Error('src/lens must contain at least one Lens document');
  }

  const nestedEntries = [];
  const sourceDocuments = new Map();
  for (const lensFile of lensFiles) {
    const document = await readLensDocument(lensFile);
    const lensPath = toSourcePath(lensFile);
    const existingPath = sourceDocuments.get(document.sourceKey);
    if (existingPath) {
      throw new Error(
        `${lensPath}:1 duplicates Lens source "${document.sourceKey}" from ${existingPath}`,
      );
    }
    sourceDocuments.set(document.sourceKey, lensPath);
    nestedEntries.push(document.entries);
  }

  const allEntries = nestedEntries.flat();
  await writeFile(outputPath, `${JSON.stringify(allEntries, null, 2)}\n`);

  console.log(
    `Lens index: scanned ${lensFiles.length} document(s), generated ${allEntries.length} entr${allEntries.length === 1 ? 'y' : 'ies'}.`,
  );
};

await generateLensIndex();
