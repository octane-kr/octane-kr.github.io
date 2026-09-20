# Post Authoring Workflow

Read this document before every post creation, editing, completion, or
publication task. The workflow must remain recoverable from repository files
and checks after a context reset; do not rely on remembered conversation state.

## Ownership and locations

- The author writes the Markdown prose.
- Codex manages titles, categories, descriptions, timestamps, revision hashes,
  publication moves, and Reference Lens documents.
- `src/drafts/posts/<slug>.md` is local author prose. It has no frontmatter and
  does not create a public route.
- `src/drafts/posts/<slug>.json` is its local Codex-owned metadata sidecar.
- `src/pages/posts/<slug>.md` is published author prose. Its only frontmatter is
  the fixed Astro layout hook below.
- `src/post-metadata/<slug>.json` is the canonical tracked metadata for a
  published post.
- `src/lens/posts/<slug>.md` is the optional Codex-owned Lens document.

The fixed published header is infrastructure, not author metadata:

```md
---
layout: ../../layouts/PostLayout.astro
---
```

Do not put `title`, category fields, timestamps, `draft`, Lens fields, or other
mutable metadata back into post Markdown.

## Inline typography

Use the same rules in new and existing posts. Before a layout or typography
cleanup, inspect related older posts as well as the current post. For a request
to unify existing posts, inventory all published posts and local drafts; do not
limit the review to recent posts or a filename pattern.

- Personal account handles and individual contest display names use inline
  code: `gs20036`, `abra_stone`, `졸업못함연구쉬었음청년`. Keep Korean particles
  and honorifics outside the backticks. Use inline code for linked handles too,
  such as `` [`gs20036`](https://codeforces.com/profile/gs20036) ``; a person's
  real name stays in ordinary text.
- Team names use ordinary text, including single-word and identifier-like
  names: HeyJinhwi, Kokiri is cute, Reboot Ssal Game, 1MiB, floorsum. Preserve
  the author's spelling, capitalization, spacing, and existing quotation marks.
- In contest narration, problem labels (A, B, A번), verdicts and submission
  counts (AC, WA, 2WA, 1TLE), elapsed times, and ordinary numeric limits use
  ordinary text. Do not mark them as code just because they are short or ASCII.
- Literal code, identifiers, types, calls, search queries, and exact output
  strings use inline code: `long long`, `arr[i]`, `printf`, `Oh no!`. Algorithm
  names and ordinary prose, including link labels, do not need code styling.
  Preserve existing mathematical notation and code blocks.
- Formatting does not authorize rewriting sentences, changing facts, renaming
  people or teams, or changing link destinations. Inspect rendered output and
  verify that only the intended formatting changed. Published-body formatting
  changes still require the Lens review, revision acknowledgement, and build
  described below.

## Posts and Scraps

- The optional metadata field `section` is either `posts` (the default when
  omitted) or `scraps`. It is separate from category and publication status.
- Leave `category` and `subcategory` out of Scraps. Their list and article
  headers do not display classifications. Assign a category when promoting a
  Scrap to a regular Post; Posts still require a registered category.
- Codex-organized records such as the conversational film reviews belong in
  `scraps`. Choose this explicitly from the actual writing process; do not
  classify every film review or every mention of AI as a Scrap.
- Scraps appear only in `/scraps/`, not the blog home's Recent Posts, the Posts
  list, its category filters, or its title/body search index.
- The Scraps introduction is exactly: "제가 던진 글 뭉치를 Codex가 정리한 기록들입니다. 추후 다듬어 정식 Post로 업로드될 수 있습니다."
- Keep published files and URLs under `src/pages/posts/<slug>.md` and
  `/posts/<slug>/` so existing links, comments, and reactions retain their
  identity. A Scrap's navigation and list link point back to Scraps.
- Start a local Scrap with `post:new -- <slug> --title "..." --section scraps`.
  Publication still requires an explicit request and the
  same Lens review and finish-publication steps below.
- Moving an already published entry between Posts and Scraps is a
  reader-visible classification change: edit its metadata `section`, review
  Lens, then run `post:mark-updated -- <slug> --lens-reviewed`. Promote a
  polished Scrap by assigning a registered `category` (and optional
  `subcategory`), then setting `section` to `posts` or removing the field.

## Film reviews

Match the blog's existing review titles: the film name followed by `후기`.
Enclose the film name in single angle brackets, such as `〈오디세이〉 후기`
or `〈토이 스토리 5〉 후기`.
Omit descriptions to match the existing post lists. Do not add an interpretive
subtitle or a generated summary unless the author explicitly asks for one
(author correction, 2026-09-15).

For film reviews formed by Codex from the author's conversational impressions,
start the prose with the following reader-facing notice (author request, 2026-09-15):

```md
**스포일러 주의:** 영화의 결말과 주요 장면을 다룹니다.

제가 영화를 보고 Codex에게 두서없이 풀어놓은 감상을, Codex가 정리하고 재배치한 글입니다. 여유가 생기면 언젠가는 직접 쓴 글도 올려보려 합니다.

---
```

Apply this to the existing Odyssey and Toy Story 5 drafts and future film reviews
prepared in the same way. If the author later writes a review directly, describe
that actual process instead of automatically reusing the Codex disclosure.
This notice is part of the prose; it does not change draft/publication status.
When the author supplies a star rating, put it at the very end of the review,
after the prose, rather than in the opening notice. Do not invent ratings.

## Trigger table

| User intent | Required action |
| --- | --- |
| Create a draft, file, or header-only shell | Create an empty draft Markdown and a JSON sidecar. Add no prose, heading, placeholder, or timestamp. |
| Edit an unfinished draft | Edit only the requested prose or its draft sidecar. Do not create a public route or timestamps. |
| Says the draft is complete | Read the whole draft and reconcile title/category/description, but create no public Lens file. Completion alone is not permission to publish; the publication workflow rereads the whole post later. |
| Explicitly asks to publish | Prepare the pending public post, review Lens against that public source, finish publication, then build. |
| Edit published body/title/description/category | Make the edit, reconcile Lens, acknowledge the revision timestamp and hash, then build. |
| Edit only Lens, site code, styling, or fixed layout plumbing | Do not change the post timestamp. Build normally. |

## Create a draft

Use:

```powershell
npm.cmd run post:new -- <slug> --title "..." --category "..."
```

Optional fields are `--subcategory "..."`, `--description "..."`, and
`--section posts|scraps`. Omit `--category` for a Scrap; it is required for
regular Posts. A subcategory always requires a category. The
command safely resumes an identical partial/existing draft pair, but refuses
conflicting metadata or a published slug. The Markdown file is empty by design
when the request is only to create a shell.

Draft sidecars contain only reader-facing metadata. They never contain
`publishedAt`, `updatedAt`, `contentHash`, `layout`, or `draft`; physical
location is the draft state. Scraps need no category. A supplied draft category
may remain provisional while the article is unfinished, but publication rejects
it until it is registered in `src/data/categories.txt`.

## Publish

Publication always requires an explicit user request. A statement such as
“다 썼어” or “완성했어” authorizes review, not publication, unless the user also
asks to publish.

1. Read the complete draft and its sidecar. Do not silently rewrite prose.
2. Confirm the body is non-empty. Regular Posts require a category; any supplied
   category/subcategory must exist in `src/data/categories.txt`.
3. Run `npm.cmd run post:publish -- <slug>`. For a user-supplied historical
   time, append `--at YYYY-MM-DDTHH:mm:ss+09:00`.
4. The command adds the fixed layout hook, moves the prose into the public
   route, creates published metadata, and sets `publishedAt = updatedAt` from
   one Seoul-time clock read. Draft creation time is never reused. It also sets
   a tracked `lens-review-pending` workflow state, so builds remain blocked.
5. Read the complete public post and `docs/reference-lens-workflow.md`, then
   create or refresh its Lens document only for meaningful definitions,
   notation, or named results.
6. Run
   `npm.cmd run post:finish-publication -- <slug> --lens-reviewed`. The required
   flag is the durable semantic-review acknowledgement and clears the pending
   state. It also accepts the reviewed public body as the initial hash without
   creating a false post-publication revision; the two initial timestamps stay
   equal.
7. Run `npm.cmd run build`.

If publication was interrupted, do not guess which files to move or delete.
When `check:posts` reports an incomplete publication move, rerun
`npm.cmd run post:publish -- <slug>` first. It verifies the pending public and
draft copies, restores a missing public Markdown file when safe, and removes
only matching leftover drafts. After that succeeds, perform the whole-post Lens
review and run `post:finish-publication` as above. This ordering also applies
when both the draft and public paths temporarily exist.

Published slugs are stable identities for URLs, reactions, comments, and Lens
references. Do not rename one without explicit authorization and an impact
review.

## Edit a published post

The workflow treats `publishedAt` as immutable after first publication; normal
revision commands preserve it, and corrections require an explicit user
request. `updatedAt` records the last acknowledged reader-visible revision. The
revision hash covers the body, title, description, category, subcategory, and section;
it excludes timestamps, the fixed layout hook, Lens documents, and site code.
It hashes normalized Markdown source conservatively so reader-visible code
examples cannot slip through.

After the final reader-visible edit, first reconcile its Lens document. Then use
the following command as the final acknowledgement that both prose and Lens
review are complete:

```powershell
npm.cmd run post:mark-updated -- <slug> --lens-reviewed
```

For an explicitly supplied historical correction time, use:

```powershell
npm.cmd run post:mark-updated -- <slug> --lens-reviewed --at YYYY-MM-DDTHH:mm:ss+09:00
```

The required flag records that the whole-post Lens review happened. The command
changes `updatedAt` and `contentHash` together. It preserves
`publishedAt`, requires timestamps to increase, and leaves the time unchanged
when it detects no reader-visible revision. Run it only after all prose,
metadata, and Lens work, then build.

`npm.cmd run build` runs `check:posts` before Astro. The check fails closed on
missing or orphan sidecars, extra post frontmatter, empty published bodies,
invalid categories or Seoul timestamps, backwards dates, and unacknowledged
revision hashes. Pending publication and revision-hash errors include their
next command; other errors identify the exact path and broken invariant for a
fresh context to repair. Workflow commands write canonical metadata and public
Markdown through same-directory atomic handoffs, so an interrupted write leaves
the prior complete file (or no final file) instead of a truncated canonical
file. Unique temporary handoff files end in `.codex-write.tmp`, and a per-target
`.codex-write.lock` safely rejects overlapping writes to the same file. The
checker reports either artifact when an interrupted process leaves one behind
instead of silently ignoring it.

## Fresh-context checklist

1. Read `AGENTS.md`, this document, and `git status --short`.
2. Locate the post by slug in both the Markdown and metadata paths. Inspect
   ignored drafts explicitly; ordinary Git listings do not show them.
3. Decide whether the request is draft creation, draft editing, completion
   review, published editing, or explicit publication.
4. Preserve unrelated dirty work and never infer publication permission.
5. Follow the matching trigger above and finish with `npm.cmd run build` for any
   completed change.
