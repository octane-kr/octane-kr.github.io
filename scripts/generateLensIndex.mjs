import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import { lensScopeLabels, postLensScopes } from '../src/data/lensScopeMap.js';
import { extractLensBlocks } from './lensParser.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const referencesDir = path.join(rootDir, 'src', 'references');
const postsDir = path.join(rootDir, 'src', 'pages', 'posts');
const outputPath = path.join(rootDir, 'src', 'data', 'lens.generated.json');
const markdownProcessor = await createMarkdownProcessor({
  syntaxHighlight: false,
  remarkPlugins: [remarkMath],
  rehypePlugins: [rehypeKatex],
});

const toSourcePath = (filePath) =>
  path.relative(rootDir, filePath).split(path.sep).join('/');

const listMarkdownFiles = async (dir) => {
  try {
    const dirStat = await stat(dir);
    if (!dirStat.isDirectory()) return [];
  } catch {
    return [];
  }

  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => path.join(dir, entry.name))
    .sort((a, b) => a.localeCompare(b));
};

const getFrontmatterTitle = (markdown, fallbackTitle) => {
  const frontmatterMatch = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/u);
  if (!frontmatterMatch) return fallbackTitle;

  const titleMatch = frontmatterMatch[1].match(/^title:\s*(.+?)\s*$/mu);
  if (!titleMatch) return fallbackTitle;

  return titleMatch[1].replace(/^['"]|['"]$/gu, '').trim() || fallbackTitle;
};

const referenceSourceOverrides = {
  'global-notation': {
    source: 'global',
    scope: 'global',
    scopes: ['global'],
    sourceTitle: 'Global Notation',
  },
};

const getReferenceSource = (filePath) => {
  const scope = path.basename(filePath, '.md');
  const scopeLabel = lensScopeLabels[scope] ?? scope;
  const override = referenceSourceOverrides[scope];

  if (override) {
    return {
      idPrefix: `reference-${scope}`,
      sourceKind: 'reference',
      sourceSlug: scope,
      sourceHref: null,
      ...override,
    };
  }

  if (scope === 'global') {
    return {
      idPrefix: 'global',
      source: 'global',
      scope: 'global',
      scopes: ['global'],
      sourceKind: 'reference',
      sourceSlug: 'global',
      sourceTitle: lensScopeLabels.global ?? 'Global references',
      sourceHref: null,
    };
  }

  return {
    idPrefix: `scope-${scope}`,
    source: 'scope',
    scope,
    scopes: [scope],
    sourceKind: 'reference',
    sourceSlug: scope,
    sourceTitle: `${scopeLabel} references`,
    sourceHref: null,
  };
};

const getPostSource = (filePath) => {
  const slug = path.basename(filePath, '.md');

  return {
    idPrefix: `post-${slug}`,
    source: 'post',
    scope: slug,
    scopes: [slug, ...(postLensScopes[slug] ?? [])],
    sourceKind: 'post',
    sourceSlug: slug,
    sourceTitle: slug,
    sourceHref: `/posts/${slug}/`,
  };
};

const renderLensBodyHtml = async (body, sourcePath, line) => {
  if (!body.trim()) return '';

  const result = await markdownProcessor.render(body, {
    fileURL: `${sourcePath}:${line}`,
  });

  return result.code.trim();
};

const readLensEntries = async (filePath, sourceInfo) => {
  const sourcePath = toSourcePath(filePath);
  const markdown = await readFile(filePath, 'utf8');
  const { entries, warnings } = extractLensBlocks(markdown, sourcePath);
  const resolvedSourceInfo =
    sourceInfo.sourceKind === 'post'
      ? {
          ...sourceInfo,
          sourceTitle: getFrontmatterTitle(markdown, sourceInfo.sourceSlug),
        }
      : sourceInfo;

  return {
    entries: await Promise.all(entries.map(async (entry, index) => ({
      id: `${resolvedSourceInfo.idPrefix}__${index}`,
      source: resolvedSourceInfo.source,
      scope: resolvedSourceInfo.scope,
      scopes: resolvedSourceInfo.scopes,
      sourceKind: resolvedSourceInfo.sourceKind,
      sourceSlug: resolvedSourceInfo.sourceSlug,
      sourceTitle: resolvedSourceInfo.sourceTitle,
        sourceHref: resolvedSourceInfo.sourceHref,
        sourcePath,
      keywords: entry.keywords,
      body: entry.body,
      bodyHtml: await renderLensBodyHtml(entry.body, sourcePath, entry.line),
    }))),
    warnings,
  };
};

const generateLensIndex = async () => {
  const referenceFiles = await listMarkdownFiles(referencesDir);
  const postFiles = await listMarkdownFiles(postsDir);
  const files = [
    ...referenceFiles.map((filePath) => ({
      filePath,
      sourceInfo: getReferenceSource(filePath),
    })),
    ...postFiles.map((filePath) => ({
      filePath,
      sourceInfo: getPostSource(filePath),
    })),
  ];

  const allEntries = [];
  const warnings = [];

  for (const file of files) {
    const result = await readLensEntries(file.filePath, file.sourceInfo);
    allEntries.push(...result.entries);
    warnings.push(...result.warnings);
  }

  await writeFile(outputPath, `${JSON.stringify(allEntries, null, 2)}\n`);

  console.log(
    `Lens index: scanned ${files.length} file(s), generated ${allEntries.length} entr${allEntries.length === 1 ? 'y' : 'ies'}.`,
  );

  warnings.forEach((warning) => {
    console.warn(`Lens warning: ${warning}`);
  });
};

await generateLensIndex();
