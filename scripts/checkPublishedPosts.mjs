import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import {
  calculateContentHash,
  contentHashPattern,
  draftPostsDir,
  isReservedPostSlug,
  isSafeSlug,
  isValidKstTimestamp,
  isValidPostSection,
  postLayoutValue,
  postMetadataDir,
  publicationPendingState,
  publishedPostsDir,
  readCategoryCatalog,
  readJsonFile,
  splitPostMarkdown,
  toSourcePath,
} from './postMetadata.mjs';

const publishedMetadataKeys = new Set([
  'title',
  'publishedAt',
  'updatedAt',
  'category',
  'subcategory',
  'description',
  'contentHash',
  'workflowState',
  'section',
]);
const draftMetadataKeys = new Set([
  'title',
  'category',
  'subcategory',
  'description',
  'section',
]);

const listFilesByExtension = async (dir, extension, allowMissing = false) => {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (allowMissing && error.code === 'ENOENT') return [];
    throw error;
  }
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(extension))
    .map((entry) => path.join(dir, entry.name))
    .sort((a, b) => a.localeCompare(b));
};

const slugFromPath = (filePath, extension) => path.basename(filePath, extension);
const errors = [];
const addError = (sourcePath, message) => errors.push(`${sourcePath}: ${message}`);

const assertAllowedKeys = (metadata, allowedKeys, sourcePath) => {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    addError(sourcePath, 'metadata must be a JSON object');
    return false;
  }

  for (const key of Object.keys(metadata)) {
    if (!allowedKeys.has(key)) addError(sourcePath, `unsupported metadata field "${key}"`);
  }

  return true;
};

const assertRequiredString = (metadata, key, sourcePath) => {
  if (typeof metadata[key] !== 'string' || metadata[key].trim() === '') {
    addError(sourcePath, `metadata requires a non-empty string "${key}"`);
    return false;
  }

  return true;
};

const assertOptionalString = (metadata, key, sourcePath) => {
  if (key in metadata && (typeof metadata[key] !== 'string' || metadata[key].trim() === '')) {
    addError(sourcePath, `optional metadata field "${key}" must be a non-empty string when present`);
    return false;
  }

  return true;
};

const readMetadata = async (filePath) => {
  const sourcePath = toSourcePath(filePath);
  try {
    return await readJsonFile(filePath);
  } catch (error) {
    addError(sourcePath, `invalid JSON (${error.message})`);
    return null;
  }
};

const assertPostSection = (metadata, sourcePath) => {
  if (!isValidPostSection(metadata.section)) {
    addError(sourcePath, 'section must be "posts" or "scraps" when present');
  }
};

const categoryCatalog = await readCategoryCatalog();
const publishedPostFiles = await listFilesByExtension(publishedPostsDir, '.md');
const publishedMetadataFiles = await listFilesByExtension(postMetadataDir, '.json');
const draftPostFiles = await listFilesByExtension(draftPostsDir, '.md', true);
const draftMetadataFiles = await listFilesByExtension(draftPostsDir, '.json', true);
const atomicTempFiles = (
  await Promise.all([
    listFilesByExtension(publishedPostsDir, '.codex-write.tmp'),
    listFilesByExtension(postMetadataDir, '.codex-write.tmp'),
    listFilesByExtension(draftPostsDir, '.codex-write.tmp', true),
  ])
).flat();
const atomicLockFiles = (
  await Promise.all([
    listFilesByExtension(publishedPostsDir, '.codex-write.lock'),
    listFilesByExtension(postMetadataDir, '.codex-write.lock'),
    listFilesByExtension(draftPostsDir, '.codex-write.lock', true),
  ])
).flat();

for (const filePath of [...atomicTempFiles, ...atomicLockFiles]) {
  addError(
    toSourcePath(filePath),
    'an atomic post write is running or was interrupted; if no post command is active, remove only this handoff file and rerun the workflow check',
  );
}

const publishedPostSlugs = new Set(
  publishedPostFiles.map((filePath) => slugFromPath(filePath, '.md')),
);
const publishedMetadataSlugs = new Set(
  publishedMetadataFiles.map((filePath) => slugFromPath(filePath, '.json')),
);
const draftPostSlugs = new Set(draftPostFiles.map((filePath) => slugFromPath(filePath, '.md')));
const draftMetadataSlugs = new Set(
  draftMetadataFiles.map((filePath) => slugFromPath(filePath, '.json')),
);
const publishedMetadataBySlug = new Map();

for (const filePath of publishedMetadataFiles) {
  const slug = slugFromPath(filePath, '.json');
  publishedMetadataBySlug.set(slug, await readMetadata(filePath));
}

const pendingPublicationResumeSlugs = new Set(
  [...publishedMetadataSlugs].filter((slug) => {
    const metadata = publishedMetadataBySlug.get(slug);
    return (
      metadata?.workflowState === publicationPendingState &&
      (!publishedPostSlugs.has(slug) || draftPostSlugs.has(slug) || draftMetadataSlugs.has(slug))
    );
  }),
);

for (const [label, slugs] of [
  ['published post', publishedPostSlugs],
  ['published metadata', publishedMetadataSlugs],
  ['draft post', draftPostSlugs],
  ['draft metadata', draftMetadataSlugs],
]) {
  for (const slug of slugs) {
    if (!isSafeSlug(slug)) addError(slug, `${label} filename is not a safe post slug`);
    if (isReservedPostSlug(slug)) addError(slug, `${label} filename collides with the /posts/ route tree`);
  }
}

for (const slug of draftPostSlugs) {
  if (publishedPostSlugs.has(slug) || publishedMetadataSlugs.has(slug)) {
    if (pendingPublicationResumeSlugs.has(slug)) continue;
    addError(
      `src/drafts/posts/${slug}.md`,
      'the same slug exists in both draft and published state; finish or undo the publication move',
    );
  }
}

for (const slug of publishedPostSlugs) {
  if (!publishedMetadataSlugs.has(slug)) {
    addError(`src/pages/posts/${slug}.md`, `missing src/post-metadata/${slug}.json`);
  }
}

for (const slug of publishedMetadataSlugs) {
  if (!publishedPostSlugs.has(slug)) {
    if (pendingPublicationResumeSlugs.has(slug)) continue;
    addError(`src/post-metadata/${slug}.json`, `missing src/pages/posts/${slug}.md`);
  }
}

for (const slug of pendingPublicationResumeSlugs) {
  addError(
    `src/post-metadata/${slug}.json`,
    `publication move was interrupted; first resume "npm.cmd run post:publish -- ${slug}", then follow its Lens-review instruction`,
  );
}

for (const filePath of publishedPostFiles) {
  const slug = slugFromPath(filePath, '.md');
  const sourcePath = toSourcePath(filePath);
  const markdown = await readFile(filePath, 'utf8');
  const { frontmatter, body } = splitPostMarkdown(markdown);

  if (frontmatter === null) {
    addError(sourcePath, 'published Markdown requires the fixed Astro layout frontmatter');
  } else if (frontmatter.replace(/\r\n?/gu, '\n').trim() !== `layout: ${postLayoutValue}`) {
    addError(
      sourcePath,
      `published Markdown frontmatter must contain only "layout: ${postLayoutValue}"`,
    );
  }

  if (body.trim() === '') {
    addError(sourcePath, 'published post body is empty; keep header-only shells under src/drafts/posts/');
  }

  if (!publishedMetadataSlugs.has(slug)) continue;
  const metadataPath = path.join(postMetadataDir, `${slug}.json`);
  const metadataSourcePath = toSourcePath(metadataPath);
  const metadata = publishedMetadataBySlug.get(slug);
  if (metadata === null) continue;
  if (!assertAllowedKeys(metadata, publishedMetadataKeys, metadataSourcePath)) continue;

  const hasTitle = assertRequiredString(metadata, 'title', metadataSourcePath);
  const hasCategory = assertRequiredString(metadata, 'category', metadataSourcePath);
  const hasPublishedAt = assertRequiredString(metadata, 'publishedAt', metadataSourcePath);
  const hasUpdatedAt = assertRequiredString(metadata, 'updatedAt', metadataSourcePath);
  const hasContentHash = assertRequiredString(metadata, 'contentHash', metadataSourcePath);
  assertOptionalString(metadata, 'subcategory', metadataSourcePath);
  assertOptionalString(metadata, 'description', metadataSourcePath);
  assertPostSection(metadata, metadataSourcePath);

  const isPublicationPending = metadata.workflowState === publicationPendingState;
  if ('workflowState' in metadata) {
    if (isPublicationPending) {
      if (!pendingPublicationResumeSlugs.has(slug)) {
        addError(
          metadataSourcePath,
          `publication is waiting for whole-post Lens review; run "npm.cmd run post:finish-publication -- ${slug} --lens-reviewed" after the review`,
        );
      }
    } else {
      addError(metadataSourcePath, `unsupported workflowState "${metadata.workflowState}"`);
    }
  }

  if (hasCategory) {
    const subcategories = categoryCatalog.get(metadata.category);
    if (!subcategories) {
      addError(metadataSourcePath, `category "${metadata.category}" is not registered in src/data/categories.txt`);
    } else if (metadata.subcategory && !subcategories.has(metadata.subcategory)) {
      addError(
        metadataSourcePath,
        `subcategory "${metadata.subcategory}" is not registered under "${metadata.category}"`,
      );
    }
  }

  if (hasPublishedAt && !isValidKstTimestamp(metadata.publishedAt)) {
    addError(metadataSourcePath, 'publishedAt must be a real YYYY-MM-DDTHH:mm:ss+09:00 timestamp');
  }
  if (hasUpdatedAt && !isValidKstTimestamp(metadata.updatedAt)) {
    addError(metadataSourcePath, 'updatedAt must be a real YYYY-MM-DDTHH:mm:ss+09:00 timestamp');
  }
  if (
    hasPublishedAt &&
    hasUpdatedAt &&
    isValidKstTimestamp(metadata.publishedAt) &&
    isValidKstTimestamp(metadata.updatedAt) &&
    new Date(metadata.updatedAt) < new Date(metadata.publishedAt)
  ) {
    addError(metadataSourcePath, 'updatedAt must not be earlier than publishedAt');
  }

  if (hasContentHash && !contentHashPattern.test(metadata.contentHash)) {
    addError(metadataSourcePath, 'contentHash must use the sha256-v1:<64 lowercase hex> format');
  } else if (hasTitle && hasCategory && hasContentHash && !isPublicationPending) {
    const actualHash = calculateContentHash(metadata, markdown);
    if (metadata.contentHash !== actualHash) {
      addError(
        metadataSourcePath,
        `reader-visible post content changed; reconcile Lens, then run "npm.cmd run post:mark-updated -- ${slug} --lens-reviewed"`,
      );
    }
  }
}

for (const slug of draftPostSlugs) {
  if (!draftMetadataSlugs.has(slug)) {
    if (pendingPublicationResumeSlugs.has(slug)) continue;
    addError(`src/drafts/posts/${slug}.md`, `missing src/drafts/posts/${slug}.json`);
  }
}

for (const slug of draftMetadataSlugs) {
  if (!draftPostSlugs.has(slug)) {
    if (pendingPublicationResumeSlugs.has(slug)) continue;
    addError(`src/drafts/posts/${slug}.json`, `missing src/drafts/posts/${slug}.md`);
  }
}

for (const filePath of draftPostFiles) {
  const slug = slugFromPath(filePath, '.md');
  const sourcePath = toSourcePath(filePath);
  const markdown = await readFile(filePath, 'utf8');
  const { frontmatter } = splitPostMarkdown(markdown);

  if (frontmatter !== null) {
    addError(sourcePath, 'draft Markdown must contain author prose only; keep metadata in its JSON sidecar');
  }

  if (!draftMetadataSlugs.has(slug)) continue;
  const metadataPath = path.join(draftPostsDir, `${slug}.json`);
  const metadataSourcePath = toSourcePath(metadataPath);
  const metadata = await readMetadata(metadataPath);
  if (!assertAllowedKeys(metadata, draftMetadataKeys, metadataSourcePath)) continue;

  assertRequiredString(metadata, 'title', metadataSourcePath);
  assertRequiredString(metadata, 'category', metadataSourcePath);
  assertOptionalString(metadata, 'subcategory', metadataSourcePath);
  assertOptionalString(metadata, 'description', metadataSourcePath);
  assertPostSection(metadata, metadataSourcePath);
}

if (errors.length > 0) {
  console.error(`Post workflow check failed with ${errors.length} error(s):`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(
    `Post workflow check passed: ${publishedPostFiles.length} published post(s), ${draftPostFiles.length} local draft(s).`,
  );
}
