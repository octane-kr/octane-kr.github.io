const entryHeadingPattern = /^##(?:[ \t]+(.*))?$/u;
const metadataPattern = /^([A-Za-z][A-Za-z0-9_-]*):[ \t]*(.*)$/u;

const fail = (sourcePath, line, message) => {
  throw new Error(`${sourcePath}:${line} ${message}`);
};

const normalizeKeyword = (keyword) =>
  keyword.normalize('NFKC').toLocaleLowerCase().replace(/\s+/gu, ' ').trim();

const trimBlankBoundaryLines = (lines) => {
  let start = 0;
  let end = lines.length;

  while (start < end && !lines[start].trim()) start += 1;
  while (end > start && !lines[end - 1].trim()) end -= 1;

  return lines.slice(start, end).join('\n');
};

const parseMetadata = (lines, closingIndex, sourcePath) => {
  const metadata = {};

  for (let index = 1; index < closingIndex; index += 1) {
    const line = lines[index];
    if (!line.trim()) continue;

    const match = line.match(metadataPattern);
    if (!match || !match[2].trim()) {
      fail(
        sourcePath,
        index + 1,
        'malformed frontmatter; expected a non-empty "key: value" scalar pair',
      );
    }

    const [, key, rawValue] = match;
    if (Object.hasOwn(metadata, key)) {
      fail(sourcePath, index + 1, `duplicate frontmatter key "${key}"`);
    }

    metadata[key] = rawValue.trim();
  }

  if (Object.keys(metadata).length === 0) {
    fail(
      sourcePath,
      1,
      'frontmatter must contain at least one non-empty "key: value" scalar pair',
    );
  }

  return metadata;
};

const parseKeywords = (heading, sourcePath, line) => {
  const keywords = (heading ?? '').split(' | ').map((keyword) => keyword.trim());

  if (keywords.some((keyword) => !keyword)) {
    fail(sourcePath, line, 'lens entry heading has a missing keyword');
  }

  const seen = new Set();
  for (const keyword of keywords) {
    const normalized = normalizeKeyword(keyword);
    if (seen.has(normalized)) {
      fail(sourcePath, line, `lens entry has duplicate keyword "${keyword}"`);
    }
    seen.add(normalized);
  }

  return keywords;
};

/**
 * Parse a standalone Reference Lens Markdown document.
 *
 * The document starts with simple scalar frontmatter and contains entries whose
 * H2 headings list search terms separated by the exact delimiter ` | `.
 */
export function parseLensDocument(markdown, sourcePath = 'unknown') {
  const lines = markdown.split(/\r?\n/u);
  const firstLine = lines[0]?.replace(/^\uFEFF/u, '');

  if (firstLine !== '---') {
    fail(sourcePath, 1, 'lens document must start with frontmatter delimiter "---"');
  }

  const closingIndex = lines.findIndex((line, index) => index > 0 && line === '---');
  if (closingIndex === -1) {
    fail(sourcePath, 1, 'lens document frontmatter is missing closing delimiter "---"');
  }

  const metadata = parseMetadata(lines, closingIndex, sourcePath);
  const entries = [];
  let activeEntry = null;

  const finishEntry = () => {
    if (!activeEntry) return;

    const body = trimBlankBoundaryLines(activeEntry.bodyLines);
    if (!body) {
      fail(sourcePath, activeEntry.line, 'lens entry is missing a body');
    }

    entries.push({
      keywords: activeEntry.keywords,
      body,
      line: activeEntry.line,
    });
    activeEntry = null;
  };

  for (let index = closingIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    const lineNumber = index + 1;
    const headingMatch = line.match(entryHeadingPattern);

    if (headingMatch) {
      finishEntry();
      activeEntry = {
        keywords: parseKeywords(headingMatch[1], sourcePath, lineNumber),
        bodyLines: [],
        line: lineNumber,
      };
      continue;
    }

    if (!activeEntry) {
      if (line.trim()) {
        fail(sourcePath, lineNumber, 'unexpected prose before the first lens entry');
      }
      continue;
    }

    activeEntry.bodyLines.push(line);
  }

  finishEntry();

  if (entries.length === 0) {
    fail(sourcePath, closingIndex + 1, 'lens document must contain at least one entry');
  }

  return { metadata, entries };
}
