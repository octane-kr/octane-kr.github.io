import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { loadProfile, pathFromRoot, sha256, sourceDigest, tex } from './profileData.mjs';

const profile = loadProfile();
const output = pathFromRoot('output/pdf');
const publicDir = pathFromRoot('public/cv');
mkdirSync(output, { recursive: true });
mkdirSync(publicDir, { recursive: true });
const manifest = { updated: profile.updated, sourceSha256: sourceDigest(), files: {} };

function sectionTex(section, variant) {
  let text = `\\section{${tex(section.title)}}\n`;
  if (section.text) text += variant === 'academic' ? `\\cvitem{}{${tex(section.text)}}\n` : `${tex(section.text)}\\par\n`;
  for (const id of section.ids ?? []) {
    const record = profile.records[id];
    const title = tex(record.pdfTitle ?? record.title);
    const date = tex(record.pdfDate ?? record.date);
    const result = record.result ? `${record.result}${record.team ? `; ${record.team}` : ''}` : '';
    const description = [result, ...(record.details ?? [])].filter(Boolean).map(tex).join('\\newline ');
    text += variant === 'academic'
      ? `\\cvitem{${date}}{\\textbf{${title}}${description ? `\\newline ${description}` : ''}}\n`
      : `\\${section.compact ? 'resumeCompact' : 'resumeEntry'}{${title}}{${date}}{${description}}\n`;
  }
  for (const id of section.profiles ?? []) {
    const entry = profile.profiles.find((p) => p.id === id);
    text += `{\\small\\href{${tex(entry.url)}}{\\textbf{${tex(entry.label)}}}: ${tex(entry.description)}\\par}\n`;
  }
  return text;
}

for (const [variant, document] of Object.entries(profile.documents)) {
  const templatePath = `docs/cv/templates/${variant}.tex`;
  const template = readFileSync(pathFromRoot(templatePath), 'utf8');
  const content = document.pages.map((page) => page.map((section) => sectionTex(section, variant)).join('\n')).join('\n\\clearpage\n');
  const values = {
    NAME: tex(profile.name), EMAIL: tex(profile.email),
    WEBSITE: tex(profile.website.replace(/^https?:\/\//, '').replace(/\/$/, '')),
    SITEURL: tex(profile.website), UPDATED: tex(profile.updated), CONTENT: content,
  };
  const source = template.replace(/@@([A-Z]+)@@/g, (_, key) => {
    if (!(key in values)) throw new Error(`Unknown template token: ${key}`);
    return values[key];
  });
  const stem = document.filename.replace(/\.pdf$/, '');
  const sourcePath = pathFromRoot(`output/pdf/${stem}.tex`);
  writeFileSync(sourcePath, source);
  for (let pass = 0; pass < 2; pass++) {
    const run = spawnSync(process.env.PDFLATEX ?? 'pdflatex', [
      '-interaction=nonstopmode', '-halt-on-error', '-no-shell-escape', `-output-directory=${output}`, sourcePath,
    ], { cwd: output, encoding: 'utf8', timeout: 180000, windowsHide: true });
    if (run.status !== 0) throw new Error(`${variant} LaTeX build failed:\n${run.error ?? ''}\n${run.stdout?.slice(-6000)}\n${run.stderr}`);
  }
  const log = readFileSync(pathFromRoot(`output/pdf/${stem}.log`), 'utf8');
  const count = Number(log.match(/Output written on [\s\S]*?\((\d+) pages?[,)]/)?.[1]);
  if (count !== document.pages.length) throw new Error(`${variant}: expected ${document.pages.length} pages, got ${count}; inspect output/pdf/${stem}.log`);
  if (/Overfull \\[hv]box|Missing character:/.test(log)) throw new Error(`${variant}: LaTeX reports overflow or missing glyphs; inspect the log`);
  const pdfPath = pathFromRoot(`output/pdf/${document.filename}`);
  const bytes = readFileSync(pdfPath);
  copyFileSync(pdfPath, pathFromRoot(`public/cv/${document.filename}`));
  manifest.files[variant] = { filename: document.filename, sha256: sha256(bytes), pages: count, template: templatePath };
  console.log(`${document.label}: ${document.filename} (${count} pages)`);
}
writeFileSync(pathFromRoot('public/cv/manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
