import { readFile } from 'node:fs/promises';

import {
  assertSafeSlug,
  calculateContentHash,
  isValidKstTimestamp,
  metadataPathForSlug,
  publicationPendingState,
  publishedPostPathForSlug,
  readJsonFile,
  writeJsonFile,
} from './postMetadata.mjs';

const usage = 'Usage: npm.cmd run post:finish-publication -- <slug> --lens-reviewed';
const args = process.argv.slice(2);
const slug = args.shift();

if (!slug) throw new Error(usage);
assertSafeSlug(slug);
if (args.length !== 1 || args[0] !== '--lens-reviewed') {
  throw new Error(`Read the complete public post and reconcile Reference Lens first. ${usage}`);
}

const postPath = publishedPostPathForSlug(slug);
const metadataPath = metadataPathForSlug(slug);
const markdown = await readFile(postPath, 'utf8');
const metadata = await readJsonFile(metadataPath);

if (!('workflowState' in metadata)) {
  if (calculateContentHash(metadata, markdown) !== metadata.contentHash) {
    throw new Error(
      `Post "${slug}" is already published but has a new revision; use post:mark-updated instead.`,
    );
  }
  console.log(`Publication for "${slug}" was already finished; no files were changed.`);
  process.exit(0);
}
if (metadata.workflowState !== publicationPendingState) {
  throw new Error(`Post "${slug}" has unsupported workflowState "${metadata.workflowState}".`);
}
if (
  !isValidKstTimestamp(metadata.publishedAt) ||
  !isValidKstTimestamp(metadata.updatedAt) ||
  metadata.publishedAt !== metadata.updatedAt
) {
  throw new Error('Pending publication requires equal, valid publishedAt and updatedAt timestamps.');
}

const {
  workflowState: _completedWorkflowState,
  ...metadataWithoutWorkflowState
} = metadata;
const publishedMetadata = {
  ...metadataWithoutWorkflowState,
  contentHash: calculateContentHash(metadataWithoutWorkflowState, markdown),
};
await writeJsonFile(metadataPath, publishedMetadata);

console.log(`Acknowledged Lens review and finished publication for "${slug}".`);
console.log('Next: run npm.cmd run build.');
