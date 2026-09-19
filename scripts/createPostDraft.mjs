import { mkdir, readFile } from 'node:fs/promises';

import {
  assertSafeSlug,
  draftMetadataPathForSlug,
  draftPostPathForSlug,
  draftPostsDir,
  isValidPostSection,
  metadataPathForSlug,
  publishedPostPathForSlug,
  readCategoryCatalog,
  writeTextFileAtomic,
  writeJsonFile,
} from './postMetadata.mjs';

const usage =
  'Usage: npm.cmd run post:new -- <slug> --title "..." [--category "..."] [--subcategory "..."] [--description "..."] [--section posts|scraps] (category is required for Posts)';
const args = process.argv.slice(2);
const slug = args.shift();

if (!slug) throw new Error(usage);
assertSafeSlug(slug);

const options = {};
while (args.length > 0) {
  const key = args.shift();
  if (!['--title', '--category', '--subcategory', '--description', '--section'].includes(key)) {
    throw new Error(`Unknown option "${key}". ${usage}`);
  }
  const value = args.shift();
  if (!value || value.startsWith('--')) throw new Error(`Option ${key} requires a value. ${usage}`);
  options[key.slice(2)] = value;
}

if (!options.title || (options.section !== 'scraps' && !options.category)) throw new Error(usage);
if (!isValidPostSection(options.section)) throw new Error('Section must be "posts" or "scraps".');
if (options.subcategory && !options.category) throw new Error('Subcategory requires a category.');

const draftPath = draftPostPathForSlug(slug);
const draftMetadataPath = draftMetadataPathForSlug(slug);
const readTextIfExists = async (filePath) => {
  try {
    return await readFile(filePath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
};

for (const filePath of [publishedPostPathForSlug(slug), metadataPathForSlug(slug)]) {
  if ((await readTextIfExists(filePath)) !== null) {
    throw new Error(`Refusing to create a draft for published slug "${slug}": ${filePath}`);
  }
}

const metadata = {
  title: options.title,
  ...(options.category ? { category: options.category } : {}),
  ...(options.subcategory ? { subcategory: options.subcategory } : {}),
  ...(options.description ? { description: options.description } : {}),
  ...(options.section ? { section: options.section } : {}),
};

const [existingDraft, existingMetadataSource] = await Promise.all([
  readTextIfExists(draftPath),
  readTextIfExists(draftMetadataPath),
]);
if (existingMetadataSource !== null) {
  const existingMetadata = JSON.parse(existingMetadataSource);
  const canonicalize = (value) => JSON.stringify(
    Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right))),
  );
  if (canonicalize(existingMetadata) !== canonicalize(metadata)) {
    throw new Error(`Existing draft metadata disagrees with the requested values: ${draftMetadataPath}`);
  }
}

await mkdir(draftPostsDir, { recursive: true });
if (existingMetadataSource === null) {
  await writeJsonFile(draftMetadataPath, metadata, { flag: 'wx' });
}
if (existingDraft === null) {
  await writeTextFileAtomic(draftPath, '', { flag: 'wx' });
}

const action = existingDraft === null || existingMetadataSource === null ? 'Created/resumed' : 'Found';
console.log(`${action} local draft: src/drafts/posts/${slug}.md`);
console.log(`${action} Codex-owned metadata: src/drafts/posts/${slug}.json`);
const categoryCatalog = await readCategoryCatalog();
const registeredSubcategories = categoryCatalog.get(metadata.category);
if (metadata.category && !registeredSubcategories) {
  console.warn(
    `Draft category "${metadata.category}" is provisional; register it in src/data/categories.txt before publishing.`,
  );
} else if (metadata.subcategory && !registeredSubcategories.has(metadata.subcategory)) {
  console.warn(
    `Draft subcategory "${metadata.subcategory}" is provisional under "${metadata.category}"; register it before publishing.`,
  );
}
