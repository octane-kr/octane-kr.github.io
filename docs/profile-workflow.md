# About and CV maintenance

## Canonical content

`src/data/profile.json` is the shared content source for `/about/` and the two
English PDFs. Update facts there; do not hand-edit generated PDFs or duplicate
career facts into templates. The `about` and `documents` arrays select, group,
and order records for each audience. An intentionally omitted CV item is still
available in the shared source and About.

The public domain is `https://ohtae.in/`. Keep `website` in the profile data,
Astro's `site`, and `public/CNAME` consistent. Verify CV downloads on this domain.

- About: full relevant profile, with Leadership & Service and Arts & Activities.
- Academic CV: education, research interests, teaching, academic participation,
  selected honors, contest results, and university service.
- General CV: education, contest results, qualifications, teaching, leadership,
  service, and selected arts activities. Two pages; no invented skills inventory.

The profile site's home, teaching, and activities pages predate this data source.
When an education, teaching, or academic-activity fact changes, check those pages
too. They are not silently rewritten by the CV generator.

## Editorial decisions confirmed by the author

- Use factual roles and short descriptions, not promotional summaries.
- Use established LaTeX templates, not a custom AI-designed PDF layout.
- Do not list ICPC preliminary ranks. Seoul onsite participation is one
  2024-2025 entry; the full record is accessible through the ICPC profile.
- Competition names/results in About are plain text. Keep the ICPC link in
  Online Profiles, and retain the existing problem link in RUN service.
- Favely: president in 2025 only, not Spring 2026. Keep title and dates only. Do not add a revival narrative,
  numerical growth claim, or an inferred personal interest in fashion.
- Proctor: actually led class sessions and mentored freshmen. Program planning
  belonged to the Freshman Program Designers. Do not relabel this as an
  instructor appointment or claim curriculum design.
- Omit low-involvement memberships (mathematics club, Moonshine, MindFreak).
  Do not publish reasons for leaving clubs.
- Do not duplicate a role in two sections of the same document.
- Do not add age, birthday, home town, private contact details, or a photo from
  administrative profile screenshots. The email used in the CVs is already
  public on the personal site's home page.

## Evidence and qualifications (2026-09-20)

| Records | Basis / limitation |
| --- | --- |
| Education, GRASP Lab, advisor, email | Current `src/pages/index.astro`; M.S. from Sep. 2026, B.S. Mar. 2023-Aug. 2026 |
| Teaching and academic events | Existing `src/pages/teaching.astro`, `activities.astro`, and About; event participation does not imply a talk |
| Soong-Ko-Han Div. 1 | Author supplied the 2026 scoreboard and explicitly confirmed it is final: kokiri is cute, external team, 1st place, 10 solves. The Korean name is preserved in About. The PDF name is an English rendering, not a claim of official English branding. Do not invent a medal or an internal-team award. |
| ICPC | Author's official ICPCID excerpt; APAC 47th separately confirmed by the final standings |
| KOI | Author confirmed 2022 Round 2, Silver Medal, 21st place |
| Favely | Author explicitly clarified that the presidency was in 2025 and did not include Spring 2026. The SPARCS Clubs display must not be used to extend the actual term. Use 2025 in About and the General CV; the role is not selected for the Academic CV. |
| RUN | Existing vice-president, study-leader, contest operation, and problem-setting facts; author confirmed continued active participation; membership history begins in 2023 |
| Lunatic | Author confirmed Fall 2024 locking practice team lead; supplied club membership history spans 2023-2025. This does not claim to have led the whole club or choreographed performances. |
| Ghutto's | Author confirmed SoundCloud uploads and performances at STadium, Saeteo, and the Student Cultural Festival. The festival performance year was recalled as probably 2024: do not print that year as certain. Membership history spans 2023-2025. Do not claim composition, production, or a particular track without confirmation. |
| G-inK | Author confirmed Fall 2024-Spring 2025, communications/exchange department: contact with campus offices, campus clubs, and clubs at other universities. The English duty description is descriptive, not an official department title. Public Instagram cards show the organization's work but do not prove the author's contribution to specific projects. |
| Ratings | Latest values confirmed in this conversation: CF 2368, AtCoder 1948; DOJ peak Expert (1756), verified on the public DOJ profile on 2026-09-20. solved.ac statistics retain the prior About snapshot; they are not live counters. Refresh from the profile when the author requests a rating update. |

Useful sources:

- https://icpc.global/ICPCID/DSTKB8C1U659
- https://storage.googleapis.com/files.icpc.jp/championship2026/standings.html
- https://freshman.kaist.ac.kr/en/page/sub/en_sub_0401.do
- https://freshman.kaist.ac.kr/ko/page/sub/sub_0201.do
- https://www.kaist.ac.kr/kr/html/campus/053401.html (G-inK)
- https://www.instagram.com/green_in_kaist/ (public cards only reviewed)
- https://kaistvision.kaist.ac.kr/article/11/7 (Saeteo)
- https://gistnews.co.kr/?p=6389 (STadium)
- https://herald.kaist.ac.kr/news/articleView.html?idxno=20126 (Ghutto's spelling)

## Templates

- Academic: moderncv's `classic` style, black, roman font, from its standard
  `template.tex`. Copyright Xavier Danaux / moderncv maintainers, LPPL 1.3c.
  Adapted under the distinct filename `docs/cv/templates/academic.tex`.
  https://github.com/moderncv/moderncv/blob/master/template.tex
  https://www.latex-project.org/lppl/lppl-1-3c/
- General: Sourabh Bajaj's single-column `sb2nov/resume`, MIT, at upstream commit
  `7b70fe14876f97180034787f2a7f661597416a17`. Adaptations are A4, wrapping title
  columns, a two-page selection, and update/page footers. Keep the accompanying
  `LICENSE-sb2nov.txt`. No sample person's resume content is included.
  https://github.com/sb2nov/resume

## Update and release

1. Read the author's latest corrections before selecting content. Update shared
   records, the document selections if needed, and `updated` in profile.json.
2. Run `npm.cmd run generate:cv`. Requires Node and a working `pdflatex`
   installation (MiKTeX or TeX Live), with moderncv, lmodern, babel, geometry,
   fullpage, titlesec, enumitem, hyperref, fancyhdr, and tabularx.
   `PDFLATEX` can override the executable path. No shell escape is used.
3. The generator writes editable compiled `.tex` sources, logs, and PDFs under
   ignored `output/pdf/`. It copies the final PDFs to `public/cv/` and writes a
   manifest recording source and artifact hashes. Never hand-edit the manifest.
4. Render **all pages of both PDFs**, for example with `pdftoppm -png`. Review
   typography, line wraps, missing glyphs, whitespace, and page breaks. Inspect
   extracted text as well. A successful LaTeX compile alone is not visual QA.
5. Run `npm.cmd run build`; its profile check refuses stale or missing PDFs.
   Normal CI uses the reviewed checked-in PDFs; it does not need LaTeX installed.
6. Check About in desktop and narrow mobile viewports, including dates and both
   download links. Update the data/templates and regenerate if anything changes.
7. Stage only the intended profile source, generator/templates/docs, About, and
   reviewed PDF artifacts. Preserve unrelated writing/Lens work. After an
   authorized push, verify Pages succeeds and download both live PDF URLs to
   compare their hashes with the manifest; also check the live About text.

Stable download URLs:

- `/cv/taein-oh-academic-cv.pdf`
- `/cv/taein-oh-general-cv.pdf`

Do not turn profile updates into post edits or change post publication timestamps.
