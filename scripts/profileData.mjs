import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const pathFromRoot = (path) => resolve(root, path);
export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
export const sourceFiles = [
  'src/data/profile.json', 'scripts/profileData.mjs', 'scripts/generateCvs.mjs',
  'docs/cv/templates/academic.tex', 'docs/cv/templates/general.tex',
];
export function sourceDigest() {
  return sha256(sourceFiles.map((path) => `${path}\0${readFileSync(pathFromRoot(path), 'utf8').replace(/\r\n/g, '\n')}`).join('\0'));
}
export function loadProfile() {
  const profile = JSON.parse(readFileSync(pathFromRoot('src/data/profile.json'), 'utf8'));
  const requireRecord = (id) => {
    if (!profile.records[id]) throw new Error(`Unknown profile record: ${id}`);
  };
  for (const section of profile.about) for (const group of section.groups) group.ids.forEach(requireRecord);
  for (const document of Object.values(profile.documents)) {
    if (!/^[a-z0-9-]+\.pdf$/.test(document.filename)) throw new Error('Invalid CV filename');
    for (const page of document.pages) for (const section of page) {
      section.ids?.forEach(requireRecord);
      for (const id of section.profiles ?? []) {
        if (!profile.profiles.some((entry) => entry.id === id)) throw new Error(`Unknown profile link: ${id}`);
      }
    }
  }
  return profile;
}
export function tex(value) {
  const ascii = String(value).replace(/[–—]/g, ' - ').replace(/×/g, 'x').replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
  if (/[^\x20-\x7e\n]/.test(ascii)) throw new Error(`English PDF needs an explicit translation: ${value}`);
  const escape = {'\\':'\\textbackslash{}', '&':'\\&', '%':'\\%', '$':'\\$', '#':'\\#', '_':'\\_', '{':'\\{', '}':'\\}', '~':'\\textasciitilde{}', '^':'\\textasciicircum{}'};
  return ascii.replace(/[\\&%$#_{}~^]/g, (char) => escape[char]);
}
