import { readFile } from 'node:fs/promises';

import {
  assertSafeSlug,
  calculateContentHash,
  formatKstTimestamp,
  isValidKstTimestamp,
  metadataPathForSlug,
  publicationPendingState,
  publishedPostPathForSlug,
  readJsonFile,
  writeJsonFile,
} from './postMetadata.mjs';

const usage =
  'Usage: npm.cmd run post:mark-updated -- <slug> --lens-reviewed [--at YYYY-MM-DDTHH:mm:ss+09:00]';
const args = process.argv.slice(2);
const slug = args.shift();

if (!slug) throw new Error(usage);
assertSafeSlug(slug);

let requestedTimestamp = null;
let lensReviewed = false;
while (args.length > 0) {
  const key = args.shift();
  if (key === '--lens-reviewed' && !lensReviewed) {
    lensReviewed = true;
    continue;
  }
  if (key === '--at' && requestedTimestamp === null) {
    const value = args.shift();
    if (!value) throw new Error(usage);
    requestedTimestamp = value;
    continue;
  }
  throw new Error(usage);
}

if (!lensReviewed) {
  throw new Error(`Read the complete post and reconcile Reference Lens before acknowledging it. ${usage}`);
}

if (requestedTimestamp !== null && !isValidKstTimestamp(requestedTimestamp)) {
  throw new Error(`--at must be a real YYYY-MM-DDTHH:mm:ss+09:00 timestamp. ${usage}`);
}

const postPath = publishedPostPathForSlug(slug);
const metadataPath = metadataPathForSlug(slug);
const [markdown, metadata] = await Promise.all([
  readFile(postPath, 'utf8'),
  readJsonFile(metadataPath),
]);
if (metadata.workflowState === publicationPendingState) {
  throw new Error(
    `Post "${slug}" is still pending initial Lens review; use post:finish-publication instead.`,
  );
}
const currentHash = calculateContentHash(metadata, markdown);

if (currentHash === metadata.contentHash) {
  console.log(`Lens review acknowledged; no reader-visible revision detected for "${slug}".`);
  console.log('updatedAt and contentHash were not changed.');
  process.exit(0);
}

const timestamp = requestedTimestamp ?? formatKstTimestamp();
if (isValidKstTimestamp(metadata.updatedAt) && new Date(timestamp) <= new Date(metadata.updatedAt)) {
  throw new Error(
    `New updatedAt (${timestamp}) must be later than the current value (${metadata.updatedAt}).`,
  );
}
if (isValidKstTimestamp(metadata.publishedAt) && new Date(timestamp) < new Date(metadata.publishedAt)) {
  throw new Error(`New updatedAt (${timestamp}) must not be earlier than publishedAt.`);
}

await writeJsonFile(metadataPath, {
  ...metadata,
  updatedAt: timestamp,
  contentHash: currentHash,
});

console.log(`Acknowledged Lens review and reader-visible revision for "${slug}" at ${timestamp}.`);
