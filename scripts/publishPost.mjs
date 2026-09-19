import { readFile, unlink } from 'node:fs/promises';

import {
  assertSafeSlug,
  calculateContentHash,
  draftMetadataPathForSlug,
  draftPostPathForSlug,
  formatKstTimestamp,
  isValidKstTimestamp,
  isValidPostSection,
  metadataPathForSlug,
  postLayoutFrontmatter,
  publicationPendingState,
  publishedPostPathForSlug,
  readCategoryCatalog,
  splitPostMarkdown,
  writeTextFileAtomic,
  writeJsonFile,
} from './postMetadata.mjs';

const usage = 'Usage: npm.cmd run post:publish -- <slug> [--at YYYY-MM-DDTHH:mm:ss+09:00]';
const args = process.argv.slice(2);
const slug = args.shift();

if (!slug) throw new Error(usage);
assertSafeSlug(slug);

let requestedTimestamp = null;
while (args.length > 0) {
  const key = args.shift();
  if (key !== '--at' || requestedTimestamp !== null) throw new Error(usage);
  const value = args.shift();
  if (!value) throw new Error(usage);
  requestedTimestamp = value;
}
if (requestedTimestamp !== null && !isValidKstTimestamp(requestedTimestamp)) {
  throw new Error(`--at must be a real YYYY-MM-DDTHH:mm:ss+09:00 timestamp. ${usage}`);
}

const draftPath = draftPostPathForSlug(slug);
const draftMetadataPath = draftMetadataPathForSlug(slug);
const publishedPath = publishedPostPathForSlug(slug);
const publishedMetadataPath = metadataPathForSlug(slug);
const allowedDraftFields = new Set(['title', 'category', 'subcategory', 'description', 'section']);

const readTextIfExists = async (filePath) => {
  try {
    return await readFile(filePath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
};

const readJsonIfExists = async (filePath) => {
  const source = await readTextIfExists(filePath);
  return source === null ? null : JSON.parse(source);
};

const validateDraftMetadata = async (metadata) => {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    throw new Error('Draft metadata must be a JSON object.');
  }
  for (const key of Object.keys(metadata)) {
    if (!allowedDraftFields.has(key)) throw new Error(`Unsupported draft metadata field "${key}".`);
  }
  if (typeof metadata.title !== 'string' || metadata.title.trim() === '') {
    throw new Error('Draft metadata requires a non-empty title.');
  }
  if (typeof metadata.category !== 'string' || metadata.category.trim() === '') {
    throw new Error('Draft metadata requires a non-empty category.');
  }
  for (const key of ['subcategory', 'description']) {
    if (key in metadata && (typeof metadata[key] !== 'string' || metadata[key].trim() === '')) {
      throw new Error(`Optional draft metadata field "${key}" must be a non-empty string.`);
    }
  }
  if (!isValidPostSection(metadata.section)) {
    throw new Error('Section must be "posts" or "scraps".');
  }

  const categoryCatalog = await readCategoryCatalog();
  const subcategories = categoryCatalog.get(metadata.category);
  if (!subcategories) {
    throw new Error(`Category "${metadata.category}" is not registered in src/data/categories.txt.`);
  }
  if (metadata.subcategory && !subcategories.has(metadata.subcategory)) {
    throw new Error(
      `Subcategory "${metadata.subcategory}" is not registered under "${metadata.category}".`,
    );
  }
};

const assertDraftMetadataMatchesPublished = (draftMetadata, publishedMetadata) => {
  for (const key of ['title', 'category', 'subcategory', 'description']) {
    if ((draftMetadata[key] ?? '') !== (publishedMetadata[key] ?? '')) {
      throw new Error(`Cannot resume publication: draft and public metadata disagree on "${key}".`);
    }
  }
  if ((draftMetadata.section ?? 'posts') !== (publishedMetadata.section ?? 'posts')) {
    throw new Error('Cannot resume publication: draft and public metadata disagree on "section".');
  }
};

const toPublishedMarkdown = (draftMarkdown) => {
  if (splitPostMarkdown(draftMarkdown).frontmatter !== null) {
    throw new Error('Draft Markdown must contain prose only; move its metadata to the JSON sidecar.');
  }
  if (draftMarkdown.trim() === '') {
    throw new Error('Refusing to publish a header-only draft. Add the completed author body first.');
  }
  return `${postLayoutFrontmatter}\n\n${draftMarkdown.replace(/^\uFEFF/u, '')}`;
};

let [draftMarkdown, draftMetadata, publishedMarkdown, publishedMetadata] = await Promise.all([
  readTextIfExists(draftPath),
  readJsonIfExists(draftMetadataPath),
  readTextIfExists(publishedPath),
  readJsonIfExists(publishedMetadataPath),
]);

if (publishedMetadata?.workflowState === publicationPendingState) {
  if (requestedTimestamp !== null && requestedTimestamp !== publishedMetadata.publishedAt) {
    throw new Error(
      `Pending publication already uses ${publishedMetadata.publishedAt}; omit --at or pass that exact timestamp.`,
    );
  }
  if (publishedMarkdown === null) {
    if (draftMarkdown === null) {
      throw new Error('Cannot resume publication: both public and draft Markdown are missing.');
    }
    publishedMarkdown = toPublishedMarkdown(draftMarkdown);
    if (calculateContentHash(publishedMetadata, publishedMarkdown) !== publishedMetadata.contentHash) {
      throw new Error('Cannot resume publication: pending metadata does not match the draft body.');
    }
    await writeTextFileAtomic(publishedPath, publishedMarkdown, { flag: 'wx' });
  }
  if (calculateContentHash(publishedMetadata, publishedMarkdown) !== publishedMetadata.contentHash) {
    throw new Error('Cannot resume publication: pending public Markdown and metadata disagree.');
  }
  if (draftMarkdown !== null && toPublishedMarkdown(draftMarkdown) !== publishedMarkdown) {
    throw new Error('Cannot resume publication: draft and public Markdown differ.');
  }
  if (draftMetadata !== null) {
    await validateDraftMetadata(draftMetadata);
    assertDraftMetadataMatchesPublished(draftMetadata, publishedMetadata);
  }

  if (draftMarkdown !== null) await unlink(draftPath);
  if (draftMetadata !== null) await unlink(draftMetadataPath);

  console.log(`Resumed pending public post "${slug}" without overwriting author prose.`);
  console.log('Next: review the complete public post and reconcile Reference Lens.');
  console.log(`Then run: npm.cmd run post:finish-publication -- ${slug} --lens-reviewed`);
  process.exit(0);
}

if (publishedMetadata !== null) {
  throw new Error(`Refusing to overwrite existing published metadata: ${publishedMetadataPath}`);
}
if (draftMetadata === null) {
  throw new Error(`Cannot publish without draft metadata: ${draftMetadataPath}`);
}
await validateDraftMetadata(draftMetadata);

if (draftMarkdown === null) {
  throw new Error(
    'Cannot resume publication without either pending public metadata or the original draft Markdown.',
  );
}
const expectedPublishedMarkdown = toPublishedMarkdown(draftMarkdown);
if (publishedMarkdown !== null && expectedPublishedMarkdown !== publishedMarkdown) {
  throw new Error('Cannot resume publication: existing public Markdown differs from the draft.');
}

const timestamp = requestedTimestamp ?? formatKstTimestamp();
publishedMetadata = {
  title: draftMetadata.title,
  publishedAt: timestamp,
  updatedAt: timestamp,
  category: draftMetadata.category,
  ...(draftMetadata.subcategory ? { subcategory: draftMetadata.subcategory } : {}),
  ...(draftMetadata.description ? { description: draftMetadata.description } : {}),
  ...(draftMetadata.section ? { section: draftMetadata.section } : {}),
  workflowState: publicationPendingState,
};
publishedMetadata.contentHash = calculateContentHash(publishedMetadata, expectedPublishedMarkdown);
await writeJsonFile(publishedMetadataPath, publishedMetadata, { flag: 'wx' });
if (publishedMarkdown === null) {
  await writeTextFileAtomic(publishedPath, expectedPublishedMarkdown, { flag: 'wx' });
  publishedMarkdown = expectedPublishedMarkdown;
}

await unlink(draftPath);
await unlink(draftMetadataPath);

console.log(`Prepared pending public post "${slug}" at ${timestamp}.`);
console.log('Next: review the complete public post and reconcile Reference Lens.');
console.log(`Then run: npm.cmd run post:finish-publication -- ${slug} --lens-reviewed`);
