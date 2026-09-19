import { readFileSync } from 'node:fs';
import { loadProfile, pathFromRoot, sha256, sourceDigest } from './profileData.mjs';

try {
  const profile = loadProfile();
  const manifest = JSON.parse(readFileSync(pathFromRoot('public/cv/manifest.json'), 'utf8'));
  if (manifest.sourceSha256 !== sourceDigest() || manifest.updated !== profile.updated) throw new Error('CV sources changed after the PDFs were generated');
  for (const [variant, document] of Object.entries(profile.documents)) {
    const artifact = manifest.files[variant];
    const pdf = readFileSync(pathFromRoot(`public/cv/${document.filename}`));
    if (!artifact || artifact.filename !== document.filename || artifact.sha256 !== sha256(pdf) || artifact.pages !== document.pages.length || !pdf.subarray(0, 5).equals(Buffer.from('%PDF-'))) {
      throw new Error(`Missing or stale ${document.label}`);
    }
  }
  console.log('Profile check passed: About data and both CV PDFs are in sync.');
} catch (error) {
  console.error(`${error.message}. Run npm run generate:cv and review both PDFs before building.`);
  process.exitCode = 1;
}
