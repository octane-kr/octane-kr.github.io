export function normalizeSearchText(value) {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2212-]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

export function compactSearchText(value) {
  return normalizeSearchText(value).replace(/[\s_-]+/g, '');
}

export function keywordMatches(query, keyword) {
  const q = normalizeSearchText(query);
  const k = normalizeSearchText(keyword);
  const qc = compactSearchText(query);
  const kc = compactSearchText(keyword);

  if (!q || !qc) return false;
  return k.includes(q) || kc.includes(qc);
}

const keywordCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});

function getKeywordPrefixRank(query, keyword) {
  const q = normalizeSearchText(query);
  const k = normalizeSearchText(keyword);
  const qc = compactSearchText(query);
  const kc = compactSearchText(keyword);

  if (q && k.startsWith(q)) return 0;
  if (qc && kc.startsWith(qc)) return 1;
  return 2;
}

export function compareLensKeywordResults(query, left, right) {
  const leftPrefixRank = getKeywordPrefixRank(query, left.keyword);
  const rightPrefixRank = getKeywordPrefixRank(query, right.keyword);

  if (leftPrefixRank !== rightPrefixRank) {
    return leftPrefixRank - rightPrefixRank;
  }

  const naturalOrder = keywordCollator.compare(left.keyword, right.keyword);
  if (naturalOrder !== 0) return naturalOrder;

  const leftLength = normalizeSearchText(left.keyword).length;
  const rightLength = normalizeSearchText(right.keyword).length;
  if (leftLength !== rightLength) return leftLength - rightLength;

  return left.keyword.localeCompare(right.keyword);
}

export function getLensKeywordResults(entries, query) {
  if (!compactSearchText(query)) return [];

  const groups = new Map();

  entries.forEach((entry) => {
    entry.keywords.forEach((keyword) => {
      if (!keywordMatches(query, keyword)) return;

      const matchKey = compactSearchText(keyword) || normalizeSearchText(keyword);

      if (!groups.has(matchKey)) {
        groups.set(matchKey, {
          matchKey,
          keyword,
          snippets: [],
          snippetKeys: new Set(),
        });
      }

      const group = groups.get(matchKey);
      const snippetKey = `${entry.scope}\u0000${entry.body}`;

      if (group.snippetKeys.has(snippetKey)) return;

      group.snippetKeys.add(snippetKey);
      group.snippets.push({
        id: entry.id,
        source: entry.source,
        scope: entry.scope,
        sourceKind: entry.sourceKind,
        sourceSlug: entry.sourceSlug,
        sourceTitle: entry.sourceTitle,
        sourceHref: entry.sourceHref,
        sourcePath: entry.sourcePath,
        body: entry.body,
        bodyHtml: entry.bodyHtml,
      });
    });
  });

  return Array.from(groups.values())
    .map(({ snippetKeys, ...group }) => group)
    .sort((left, right) => compareLensKeywordResults(query, left, right));
}
