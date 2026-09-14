import assert from 'node:assert/strict';
import test from 'node:test';

import { parseLensDocument } from './lensDocumentParser.mjs';

test('parses scalar metadata, aliases, and commas inside a keyword', () => {
  const markdown = `---
scope: colorful-minors-1
title: Colorful Minors 1
---

## (q, k)-segregated grid | realize
A **$(q, k)$-segregated grid** is defined here.

It realizes a model when the required paths exist.`;

  assert.deepEqual(parseLensDocument(markdown, 'lens/colorful-minors-1.md'), {
    metadata: {
      scope: 'colorful-minors-1',
      title: 'Colorful Minors 1',
    },
    entries: [
      {
        keywords: ['(q, k)-segregated grid', 'realize'],
        body:
          'A **$(q, k)$-segregated grid** is defined here.\n\nIt realizes a model when the required paths exist.',
        line: 6,
      },
    ],
  });
});

test('keeps multiline Markdown and display math until the next H2 entry', () => {
  const markdown = `---
scope: graph-theory
---
## colorful subgraph | colorful minor
A subgraph is **colorful** when it satisfies:

$$
|V(H) \\cap V_i| = 1.
$$

- one vertex per color class
- all required adjacencies

### Remark
This remains part of the definition.
## torso | torso graph
For a bag $X$, complete each adhesion set into a clique.`;

  const result = parseLensDocument(markdown);

  assert.equal(result.entries.length, 2);
  assert.deepEqual(result.entries[0].keywords, [
    'colorful subgraph',
    'colorful minor',
  ]);
  assert.equal(result.entries[0].line, 4);
  assert.match(result.entries[0].body, /\$\$\n\|V\(H\) \\cap V_i\| = 1\.\n\$\$/u);
  assert.match(result.entries[0].body, /### Remark\nThis remains part/u);
  assert.deepEqual(result.entries[1], {
    keywords: ['torso', 'torso graph'],
    body: 'For a bag $X$, complete each adhesion set into a clique.',
    line: 16,
  });
});

test('preserves meaningful indentation and Markdown hard-break spaces', () => {
  const markdown = `---
kind: global
---

## code | hard break

    const value = 1;
line with hard break  
next line
`;

  const result = parseLensDocument(markdown);
  assert.equal(
    result.entries[0].body,
    '    const value = 1;\nline with hard break  \nnext line',
  );
});

test('requires frontmatter at the very top', () => {
  assert.throws(
    () => parseLensDocument('## torso\nA definition.', 'missing.md'),
    /missing\.md:1 lens document must start with frontmatter/u,
  );
});

test('rejects malformed or unclosed frontmatter', () => {
  assert.throws(
    () => parseLensDocument('---\nscope graph-theory\n---\n## torso\nA definition.', 'bad.md'),
    /bad\.md:2 malformed frontmatter/u,
  );
  assert.throws(
    () => parseLensDocument('---\nscope: graph-theory', 'unclosed.md'),
    /unclosed\.md:1 .*missing closing delimiter/u,
  );
});

test('rejects missing keywords', () => {
  assert.throws(
    () => parseLensDocument('---\nscope: local\n---\n## \nA definition.', 'empty-keyword.md'),
    /empty-keyword\.md:4 lens entry heading has a missing keyword/u,
  );
  assert.throws(
    () => parseLensDocument('---\nscope: local\n---\n## torso | \nA definition.'),
    /unknown:4 lens entry heading has a missing keyword/u,
  );
});

test('rejects an entry without a body', () => {
  assert.throws(
    () => parseLensDocument('---\nscope: local\n---\n## torso\n\n', 'empty-body.md'),
    /empty-body\.md:4 lens entry is missing a body/u,
  );
});

test('rejects prose before the first entry', () => {
  assert.throws(
    () =>
      parseLensDocument(
        '---\nscope: local\n---\nIntroductory prose.\n## torso\nA definition.',
        'prose.md',
      ),
    /prose\.md:4 unexpected prose before the first lens entry/u,
  );
});

test('rejects duplicate keywords within one entry', () => {
  assert.throws(
    () =>
      parseLensDocument(
        '---\nscope: local\n---\n## Torso | torso\nA definition.',
        'duplicate.md',
      ),
    /duplicate\.md:4 lens entry has duplicate keyword "torso"/u,
  );
});
