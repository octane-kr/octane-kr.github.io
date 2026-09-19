import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  calculateContentHash,
  formatKstTimestamp,
  isValidKstTimestamp,
  isValidPostSection,
  splitPostMarkdown,
  writeTextFileAtomic,
} from './postMetadata.mjs';

const metadata = {
  title: 'Example',
  description: '',
  category: 'PS',
  subcategory: 'Problems',
};

test('splitPostMarkdown leaves author prose separate from fixed frontmatter', () => {
  const source = '---\r\nlayout: ../../layouts/PostLayout.astro\r\n---\r\n\r\nBody\r\n';
  const result = splitPostMarkdown(source);

  assert.equal(result.frontmatter, 'layout: ../../layouts/PostLayout.astro');
  assert.equal(result.body, '\r\nBody\r\n');
});

test('content hash ignores line-ending style', () => {
  const left = '---\nlayout: ../../layouts/PostLayout.astro\n---\n\nBody\n';
  const right = '---\r\nlayout: ../../layouts/PostLayout.astro\r\n---\r\n\r\nBody\r\n';

  assert.equal(calculateContentHash(metadata, left), calculateContentHash(metadata, right));
});

test('content hash changes with reader-visible metadata or body', () => {
  const source = 'Body';
  assert.notEqual(
    calculateContentHash(metadata, source),
    calculateContentHash({ ...metadata, title: 'Changed' }, source),
  );
  assert.notEqual(calculateContentHash(metadata, source), calculateContentHash(metadata, 'Changed'));
  assert.notEqual(
    calculateContentHash(metadata, '```html\n<!-- first -->\n```'),
    calculateContentHash(metadata, '```html\n<!-- second -->\n```'),
  );
  assert.notEqual(
    calculateContentHash(metadata, '    indented code\n'),
    calculateContentHash(metadata, 'indented code\n'),
  );
  assert.notEqual(
    calculateContentHash(metadata, 'hard break  \nnext\n'),
    calculateContentHash(metadata, 'hard break\nnext\n'),
  );
});

test('moving between Posts and Scraps requires revision acknowledgement without invalidating existing Posts', () => {
  const originalHash = calculateContentHash(metadata, 'Body');
  assert.equal(calculateContentHash({ ...metadata, section: 'posts' }, 'Body'), originalHash);
  assert.notEqual(calculateContentHash({ ...metadata, section: 'scraps' }, 'Body'), originalHash);
});

test('post sections reject misspellings and malformed values', () => {
  for (const value of [undefined, 'posts', 'scraps']) {
    assert.equal(isValidPostSection(value), true);
  }
  for (const value of ['scrap', 'Scraps', '', null, true, 1, ['scraps']]) {
    assert.equal(isValidPostSection(value), false);
  }
});

test('draft creation and publication preserve Scraps and reject conflicting resume metadata', async () => {
  const fixture = await mkdtemp(path.join(os.tmpdir(), 'post-section-workflow-'));
  const run = (script, args) => execFileSync(process.execPath, [path.join(fixture, 'scripts', script), ...args], {
    cwd: fixture,
    encoding: 'utf8',
    stdio: 'pipe',
  });
  try {
    for (const directory of ['scripts', 'src/data', 'src/pages/posts', 'src/post-metadata']) {
      await mkdir(path.join(fixture, directory), { recursive: true });
    }
    for (const script of ['postMetadata.mjs', 'createPostDraft.mjs', 'publishPost.mjs']) {
      await copyFile(new URL(script, import.meta.url), path.join(fixture, 'scripts', script));
    }
    await writeFile(path.join(fixture, 'src/data/categories.txt'), 'Culture\n- Films\n');
    run('createPostDraft.mjs', ['example', '--title', 'Example', '--category', 'Culture', '--subcategory', 'Films', '--section', 'scraps']);
    const draftPath = path.join(fixture, 'src/drafts/posts/example.md');
    const draftMetadataPath = path.join(fixture, 'src/drafts/posts/example.json');
    const draftMetadata = JSON.parse(await readFile(draftMetadataPath, 'utf8'));
    assert.equal(draftMetadata.section, 'scraps');
    await writeFile(draftPath, 'Author prose.\n');
    run('publishPost.mjs', ['example']);
    const published = JSON.parse(await readFile(path.join(fixture, 'src/post-metadata/example.json'), 'utf8'));
    assert.equal(published.section, 'scraps');

    await writeFile(draftPath, 'Author prose.\n');
    await writeFile(draftMetadataPath, JSON.stringify({ ...draftMetadata, section: 'posts' }));
    assert.throws(() => run('publishPost.mjs', ['example']), /disagree on "section"/);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test('KST timestamps are strict and second-precision', () => {
  assert.equal(formatKstTimestamp(new Date('2026-09-02T00:00:00Z')), '2026-09-02T09:00:00+09:00');
  assert.equal(isValidKstTimestamp('2026-09-02T09:00:00+09:00'), true);
  assert.equal(isValidKstTimestamp('2026-09-02T09:00:00Z'), false);
  assert.equal(isValidKstTimestamp('2026-02-30T09:00:00+09:00'), false);
});

test('Scraps publish without a category, retain revision checks, and require classification when promoted', async () => {
  const fixture = await mkdtemp(path.join(os.tmpdir(), 'unclassified-scrap-workflow-'));
  const run = (script, args = []) => execFileSync(process.execPath, [path.join(fixture, 'scripts', script), ...args], {
    cwd: fixture,
    encoding: 'utf8',
    stdio: 'pipe',
  });
  try {
    for (const directory of ['scripts', 'src/data', 'src/pages/posts', 'src/post-metadata']) {
      await mkdir(path.join(fixture, directory), { recursive: true });
    }
    for (const script of [
      'postMetadata.mjs', 'createPostDraft.mjs', 'publishPost.mjs',
      'finishPostPublication.mjs', 'checkPublishedPosts.mjs', 'markPostUpdated.mjs',
    ]) {
      await copyFile(new URL(script, import.meta.url), path.join(fixture, 'scripts', script));
    }
    await writeFile(path.join(fixture, 'src/data/categories.txt'), 'Culture\n- Films\n');

    assert.throws(() => run('createPostDraft.mjs', ['regular', '--title', 'Regular']), /category is required for Posts/);
    assert.throws(() => run('createPostDraft.mjs', ['regular', '--title', 'Regular', '--section', 'posts']), /category is required for Posts/);
    assert.throws(() => run('createPostDraft.mjs', ['orphan', '--title', 'Orphan', '--section', 'scraps', '--subcategory', 'Films']), /Subcategory requires a category/);

    run('createPostDraft.mjs', ['example', '--title', 'Example', '--section', 'scraps']);
    const draftPath = path.join(fixture, 'src/drafts/posts/example.md');
    const draftMetadataPath = path.join(fixture, 'src/drafts/posts/example.json');
    const publicPath = path.join(fixture, 'src/pages/posts/example.md');
    const publicMetadataPath = path.join(fixture, 'src/post-metadata/example.json');
    const draftMetadata = JSON.parse(await readFile(draftMetadataPath, 'utf8'));
    assert.deepEqual(draftMetadata, { title: 'Example', section: 'scraps' });
    assert.equal(await readFile(draftPath, 'utf8'), '');
    run('checkPublishedPosts.mjs');
    await writeFile(draftPath, 'Author prose.\n');

    for (const category of [null, '', 42]) {
      await writeFile(draftMetadataPath, JSON.stringify({ ...draftMetadata, category }));
      assert.throws(() => run('checkPublishedPosts.mjs'), /optional metadata field "category"/);
      assert.throws(() => run('publishPost.mjs', ['example']), /non-empty category/);
    }
    await writeFile(draftMetadataPath, JSON.stringify({ ...draftMetadata, subcategory: 'Films' }));
    assert.throws(() => run('checkPublishedPosts.mjs'), /subcategory requires a category/);
    assert.throws(() => run('publishPost.mjs', ['example']), /Subcategory requires a category/);
    await writeFile(draftMetadataPath, JSON.stringify({ ...draftMetadata, section: 'posts' }));
    assert.throws(() => run('checkPublishedPosts.mjs'), /non-empty string "category"/);
    assert.throws(() => run('publishPost.mjs', ['example']), /non-empty category/);
    await writeFile(draftMetadataPath, JSON.stringify({ ...draftMetadata, category: 'Unknown' }));
    assert.throws(() => run('publishPost.mjs', ['example']), /not registered/);

    await writeFile(draftMetadataPath, JSON.stringify(draftMetadata));
    run('publishPost.mjs', ['example', '--at', '2026-09-01T09:00:00+09:00']);
    let published = JSON.parse(await readFile(publicMetadataPath, 'utf8'));
    assert.equal('category' in published, false);
    assert.equal('subcategory' in published, false);
    assert.throws(() => run('checkPublishedPosts.mjs'), /waiting for whole-post Lens review/);

    await writeFile(draftPath, 'Author prose.\n');
    await writeFile(draftMetadataPath, JSON.stringify(draftMetadata));
    run('publishPost.mjs', ['example']);
    run('finishPostPublication.mjs', ['example', '--lens-reviewed']);
    run('checkPublishedPosts.mjs');

    await writeFile(publicPath, (await readFile(publicPath, 'utf8')) + '\nAn additional paragraph.\n');
    assert.throws(() => run('checkPublishedPosts.mjs'), /reader-visible post content changed/);
    run('markPostUpdated.mjs', ['example', '--lens-reviewed', '--at', '2026-09-02T09:00:00+09:00']);
    run('checkPublishedPosts.mjs');

    published = JSON.parse(await readFile(publicMetadataPath, 'utf8'));
    await writeFile(publicMetadataPath, JSON.stringify({ ...published, category: null }));
    assert.throws(() => run('checkPublishedPosts.mjs'), /optional metadata field "category"/);
    await writeFile(publicMetadataPath, JSON.stringify({ ...published, subcategory: 'Films' }));
    assert.throws(() => run('checkPublishedPosts.mjs'), /subcategory requires a category/);
    await writeFile(publicMetadataPath, JSON.stringify({ ...published, section: 'posts' }));
    assert.throws(() => run('checkPublishedPosts.mjs'), /non-empty string "category"/);
    await writeFile(publicMetadataPath, JSON.stringify({ ...published, section: 'posts', category: 'Unknown' }));
    assert.throws(() => run('checkPublishedPosts.mjs'), /not registered/);

    await writeFile(publicMetadataPath, JSON.stringify({ ...published, section: 'posts', category: 'Culture', subcategory: 'Films' }));
    assert.throws(() => run('checkPublishedPosts.mjs'), /reader-visible post content changed/);
    run('markPostUpdated.mjs', ['example', '--lens-reviewed', '--at', '2026-09-03T09:00:00+09:00']);
    run('checkPublishedPosts.mjs');
    const promoted = JSON.parse(await readFile(publicMetadataPath, 'utf8'));
    assert.equal(promoted.publishedAt, '2026-09-01T09:00:00+09:00');
    assert.equal(promoted.updatedAt, '2026-09-03T09:00:00+09:00');
    assert.equal(promoted.section, 'posts');
    assert.equal(promoted.category, 'Culture');
  } finally {
    assert.equal(path.dirname(fixture), path.resolve(os.tmpdir()));
    await rm(fixture, { recursive: true, force: true });
  }
});

test('atomic writes expose complete files and serialize competing target writes', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'post-metadata-atomic-'));
  const targetPath = path.join(tempDir, 'example.json');

  try {
    await writeTextFileAtomic(targetPath, 'first\n', { flag: 'wx' });
    assert.equal(await readFile(targetPath, 'utf8'), 'first\n');
    await assert.rejects(
      writeTextFileAtomic(targetPath, 'must not replace\n', { flag: 'wx' }),
      { code: 'EEXIST' },
    );
    assert.equal(await readFile(targetPath, 'utf8'), 'first\n');

    const candidates = Array.from({ length: 20 }, (_, index) => `value-${index}\n`);
    const results = await Promise.allSettled(
      candidates.map((value) => writeTextFileAtomic(targetPath, value)),
    );
    assert.equal(results.some((result) => result.status === 'fulfilled'), true);
    for (const result of results) {
      if (result.status === 'rejected') assert.equal(result.reason.code, 'ELOCKED');
    }
    assert.equal(candidates.includes(await readFile(targetPath, 'utf8')), true);
    assert.equal(
      (await readdir(tempDir)).some(
        (name) => name.endsWith('.codex-write.tmp') || name.endsWith('.codex-write.lock'),
      ),
      false,
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
