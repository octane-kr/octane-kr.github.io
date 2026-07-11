import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publishedPostsDir = path.join(rootDir, 'src', 'pages', 'posts');

const frontmatterPattern = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---/u;
const draftTruePattern = /^\s*draft\s*:\s*true\s*(?:#.*)?$/imu;

const toSourcePath = (filePath) =>
  path.relative(rootDir, filePath).split(path.sep).join('/');

const entries = await readdir(publishedPostsDir, { withFileTypes: true });
const markdownFiles = entries
  .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
  .map((entry) => path.join(publishedPostsDir, entry.name))
  .sort((a, b) => a.localeCompare(b));

const draftFiles = [];

for (const filePath of markdownFiles) {
  const markdown = await readFile(filePath, 'utf8');
  const frontmatter = markdown.match(frontmatterPattern)?.[1] ?? '';

  if (draftTruePattern.test(frontmatter)) {
    draftFiles.push(toSourcePath(filePath));
  }
}

if (draftFiles.length > 0) {
  console.error('Published post files must not be marked as drafts.');
  console.error('Move drafts to src/drafts/posts/, or remove draft: true before publishing.');
  draftFiles.forEach((filePath) => console.error(`- ${filePath}`));
  process.exitCode = 1;
}
