export function extractLensBlocks(markdown, sourcePath = 'unknown') {
  const lines = markdown.split(/\r?\n/);
  const entries = [];
  const warnings = [];
  let activeBlock = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const lineNumber = index + 1;
    const startMatch = line.match(/^\s*<!--\s*lens:([^\r\n]*?)-->\s*$/u);
    const closeMatch = line.match(/^\s*<!--\s*\/lens\s*-->\s*$/u);
    const oldHiddenStartMatch =
      !startMatch && line.match(/^\s*<!--\s*lens:/u);

    if (activeBlock) {
      if (closeMatch) {
        if (activeBlock.keywords.length === 0) {
          warnings.push(
            `${sourcePath}:${activeBlock.startLine} lens region has no valid keywords`,
          );
        } else {
          entries.push({
            keywords: activeBlock.keywords,
            body: activeBlock.bodyLines.join('\n').trim(),
            line: activeBlock.startLine,
          });
        }

        activeBlock = null;
        continue;
      }

      if (startMatch || oldHiddenStartMatch) {
        warnings.push(
          `${sourcePath}:${lineNumber} nested lens region opener was ignored`,
        );
        continue;
      }

      activeBlock.bodyLines.push(line);
      continue;
    }

    if (closeMatch) {
      warnings.push(
        `${sourcePath}:${lineNumber} lens closing marker has no matching opener`,
      );
      continue;
    }

    if (oldHiddenStartMatch) {
      warnings.push(
        `${sourcePath}:${lineNumber} old hidden-style lens block is not supported; use "<!-- lens: ... -->" and "<!-- /lens -->"`,
      );
      continue;
    }

    if (!startMatch) continue;

    const keywords = startMatch[1]
      .split(',')
      .map((keyword) => keyword.trim())
      .filter(Boolean);

    activeBlock = {
      keywords,
      bodyLines: [],
      startLine: lineNumber,
    };
  }

  if (activeBlock) {
    warnings.push(
      `${sourcePath}:${activeBlock.startLine} lens region is missing a closing "<!-- /lens -->"`,
    );
  }

  return { entries, warnings };
}
