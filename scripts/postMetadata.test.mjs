import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  calculateContentHash,
  formatKstTimestamp,
  isValidKstTimestamp,
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

test('KST timestamps are strict and second-precision', () => {
  assert.equal(formatKstTimestamp(new Date('2026-09-02T00:00:00Z')), '2026-09-02T09:00:00+09:00');
  assert.equal(isValidKstTimestamp('2026-09-02T09:00:00+09:00'), true);
  assert.equal(isValidKstTimestamp('2026-09-02T09:00:00Z'), false);
  assert.equal(isValidKstTimestamp('2026-02-30T09:00:00+09:00'), false);
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
