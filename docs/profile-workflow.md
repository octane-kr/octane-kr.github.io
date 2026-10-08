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
- Academic CV: a concise mathematics/theoretical-CS profile: education, research
  interests, supervised individual study, selected mathematics/theory coursework,
  teaching, schools/workshops, and a small selection of honors. Currently one page
  at the existing 11pt moderncv size. Broad club/service detail stays in About and
  General CV; do not treat the profiles of ML/engineering peers as its content plan.
- General CV: education, contest results, qualifications, teaching, leadership,
  service, and selected arts activities. Two pages; no invented skills inventory.

The profile site's home, teaching, and activities pages predate this data source.
When an education, teaching, or academic-activity fact changes, check those pages
too. They are not silently rewritten by the CV generator.

## Editorial decisions confirmed by the author

- Use factual roles and short descriptions, not promotional summaries.
- For prose audits, inspect every shared record, profile description, section
  heading, and separately maintained Home/Activities/Teaching/blog introduction.
  A fact being supported does not justify a long role narrative. Do not fill
  short entries with guessed accomplishments to make their lengths uniform.
- G-inK currently uses membership and period only; omit the expanded outreach
  narrative. Proctor, Lunatic, and Ghutto's use brief, concrete activity lines.
  Avoid evaluative modifiers such as "active" for membership.
- Label the individual-study course as Supervised Study in the PDFs and Study
  & Coursework in About, rather than suggesting a separate research position.
- Use established LaTeX templates, not a custom AI-designed PDF layout.
- The author completed Individual Study (CS.91100) with Prof. Sebastian Wiederrecht
  from Spring 2025 through Spring 2026. Keep period and supervisor only unless the
  author supplies a concrete topic/result. Do not claim extensive paper reading,
  formal presentations, publications, a paid RA position, or a named theorem.
- Selected Coursework should represent completed mathematical/theoretical training,
  not a list of the best grades. Withdrawn courses (including Advanced Graph Theory,
  Advanced Discrete Geometry, Machine Learning, and Quantum Algorithms) are not
  completed coursework. NP-Hard algorithms was later completed after a withdrawal.
- Do not copy GPA, core-GPA definitions, qualifications, or research metrics from
  reference CVs. The 2026-09-21 calculation from the author's complete pasted list
  remains a private reconstruction under ignored `output/pdf/gpa-audit.*`, with
  AP/exchange-credit scenarios and explicit subject scopes. Official cumulative
  and major GPA are unconfirmed, so GPA is currently omitted from the public profile
  and submission PDFs. Do not publish the grade inventory or calculations by accident.
- Keep Seoul Science High School as a single school-name entry after the KAIST
  degrees in the General CV. Academic CV education stays focused on KAIST;
  About keeps its existing school entry. Do not infer graduation dates or add
  promotional labels. `pdfDetails` may shorten an entry for PDFs while retaining
  its full `details` in About.
- Do not list ICPC preliminary ranks. Seoul onsite participation is one
  2024-2025 entry; the full record is accessible through the ICPC profile.
- Keep the 2022 KOI silver medal in About and the General CV only. The author
  excluded it from the Academic CV on 2026-10-08.
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
- Do not list SW-IT 2025 as a standalone reviewing credit. The author removed
  it on 2026-10-08 because it selectively represents a much broader reviewing
  history. Do not re-add isolated reviewing credits from contest prose.
- Do not add age, birthday, home town, private contact details, or a photo from
  administrative profile screenshots. The email used in the CVs is already
  public on the personal site's home page.

## Evidence and qualifications (2026-09-20)

The individual-study and coursework entries were confirmed/added on 2026-09-21.
Their deferred release is included in the author's 2026-10-08 profile refresh.

| Records | Basis / limitation |
| --- | --- |
| Education, GRASP Lab, advisor, email | Current `src/pages/index.astro`; M.S. from Sep. 2026, B.S. Mar. 2023-Aug. 2026 |
| Individual Study | Author confirmed Spring 2025-Spring 2026 with Prof. Sebastian Wiederrecht, mostly discussions in meetings. CS.91100 appears four times with final grade S in the supplied course list. No specific research contribution or output is claimed. |
| Selected Coursework | Completed final grades in the author-supplied list: Analysis I/II, Modern Algebra I/II, Topology; Algorithmic Graph Theory; Graph Classes, Algorithms, Logic; Algorithms Design and Analysis for NP-Hard Problems. Grades are not listed in the CV. |
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

## Refresh audit (2026-10-08)

The author requested a full review of About and related profile surfaces after
publishing the SW-IT review. Preserve the earlier audience/selection decisions.

| Surface / records | Evidence checked and decision |
| --- | --- |
| Home, blog introduction, education, advisor | Checked `/`, `/blog/`, shared education records, and the live [GRASP member page](https://grasp-kaist.github.io/members). Current M.S. status remains correct. No new degree or advisor change established. |
| About and both CVs | Release the previously confirmed individual study/coursework and the one-page Academic / two-page General selections, then regenerate both PDFs with `updated = 2026-10-08`. |
| SW-IT 2026 | Author's published account plus the [official scoreboard](https://aoj.anacnu.kr/contests/19/scoreboard): Kokiri is cute, 1st, 14 solves, 364 displayed penalty. The [official event site](https://2026-swit-contest.anacnu.kr/) lists 대상 for one team and the issuing award as 충남대학교데이터보안활용 혁신융합대학사업단장상. About uses 대상 (1st place); `pdfResult` provides the descriptive English rendering Grand Prize, 1st place. Add to About / General CV only. |
| Contest service | [DOJ Contest 7](https://doj.kr/ko/contests/doj-contest-7) and [DOJ Beginner Contest 11](https://doj.kr/ko/contests/bcd11) publicly list octane as a setter. Checked all 20 contests linked from the current DOJ contest index; these are the two matching staff listings. BCD 11 is ongoing; this is a setter credit, not a contest result. Keep this record to those 2026 setter credits. The author requested removal of the selectively added reviewing credit. |
| Online profiles | Rechecked [Codeforces](https://codeforces.com/profile/octane), [AtCoder](https://atcoder.jp/users/octanec8h18), [DOJ](https://doj.kr/ko/user/octane), and [solved.ac](https://solved.ac/profile/octane). Existing peak values 2368 / 1948 / 1756 and solved.ac Ruby V 2745, 1,336 solved remain accurate. Preserve peak versus current distinctions. |
| ICPC and other contest records | Read the live official ICPCID. The new 2026 first-round entry has no result; Huawei Online Challenge participation is not a finalist/award record. Preserve the selected results and do not add preliminary ranks. Reviewed the site's contest posts for later results; SW-IT is the new selected result. |
| Research, academic activities, historical awards, leadership, arts | Reviewed the complete shared record inventory, Activities page, existing evidence table, GRASP pages, and focused name/handle searches. No additional attributable completed research output, talk, academic event, or role change established. Retain author-confirmed historical facts; do not join unrelated namesakes or turn scheduled participation into attendance. |
| Teaching roles and materials | Existing Fall 2026 roles remain current. Add the prepared `02-hw1-solutions/week-3-lecture-slides.pdf` from the CS.20002 workspace, removing only source page 30 (the student interview notice). The public copy has 29 pages and preserves original slide numbering. The source has no printed lecture date, so the link does not invent one. Keep the source PDF intact. |
| Supplementary PDFs | Inspected the v1.1 release, but the author explicitly excluded these from publication. Do not copy or link the PS tips, mint, or OJ guide PDFs. |

The lecture source is under
`C:/octane/Project/2026Aug CS.20002/current/2026/course-materials/02-hw1-solutions/`.
Before replacing the public copy, inspect the source for student-specific pages
again; never blindly copy the entire PDF. Do not reproduce student IDs in this
repository's documentation or release records.

## Full copy review (2026-10-08)

Reviewed all 37 shared records, all five online-profile descriptions, About
section headings, both CV selections/templates, and the separately maintained
Home, Activities, Teaching, and blog introduction. This was a prose and claim
scope review against the recorded evidence above, not a new independent
verification of every historical credential.

| Records / surface | Decision |
| --- | --- |
| masters, bachelors, high-school | Retain school, degree, dates, advisor and existing school-class detail; no added achievements. |
| individual-study, math-coursework, theory-coursework | Retain course names, period and supervisor. Use study headings instead of Research Experience for the single individual-study course. |
| ps-head-ta, automata-ta, ps-ta, run-study | Retain confirmed roles, courses, institution and periods. |
| contest-service | Retain the two named DOJ setter credits; do not restore the removed reviewing credit. |
| favely | Retain president and 2025 only. Do not invent duties to match the length of other entries. |
| proctor | Shorten to the two named class sessions and freshman mentoring; remove the explanatory course/program narrative. |
| gink | Keep membership and period; remove the entire expanded outreach description. No claim that the author has approved deleting membership itself. |
| run-vp | Retain the named events, operations and linked problem. Replace evaluative Active member with Member since 2023. |
| sw-it, soong-ko-han, apac, hcmc | Retain contest, result, team and year; no superlatives or inferred award upgrades. |
| scpc, acpc, ucpc, ucpc-qualification, seoul, mobis, nypc | Retain the existing participation/qualification records and explicit 2026 UCPC nonattendance. |
| university-math, koi, re-math, graduation-math, fkmo, kmo-high, kmo-middle | Retain factual award records; preserve each document's selection, including KOI's exclusion from Academic CV. |
| summer-school, kscw | Retain participant, event, date and location; do not suggest invited talks. |
| lunatic | Replace the repeated led/team leader sentence with Locking practice team leader, Fall 2024. |
| ghuttos | Keep SoundCloud uploads and named performances as a brief list; do not infer composition or production. |
| Online Profiles | Retain five factual descriptions, peak/current distinction and exact official rank colors. |
| Home and blog introduction | Retain the supplied affiliation and education copy; no promotional summary added. |
| Activities and Teaching | Retain event/role/material facts and the functional note about omitted private slides; no promotional copy found. |
| CV templates and remaining headings | Keep the established templates, factual contact/affiliation lines and section labels. No layout redesign or unrelated selection changes. |

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
