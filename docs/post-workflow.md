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

## Film review opening notice

Use simple film-review titles such as `[[오디세이]] 후기`. Do not add an
interpretive subtitle or a generated description/summary unless the author
explicitly asks for one (author correction, 2026-09-15).

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

Optional fields are `--subcategory "..."` and `--description "..."`. The
command safely resumes an identical partial/existing draft pair, but refuses
conflicting metadata or a published slug. The Markdown file is empty by design
when the request is only to create a shell.

Draft sidecars contain only reader-facing metadata. They never contain
`publishedAt`, `updatedAt`, `contentHash`, `layout`, or `draft`; physical
location is the draft state. A draft category may remain provisional while the
article is unfinished, but publication rejects it until it is registered in
`src/data/categories.txt`.

## Publish

Publication always requires an explicit user request. A statement such as
“다 썼어” or “완성했어” authorizes review, not publication, unless the user also
asks to publish.

1. Read the complete draft and its sidecar. Do not silently rewrite prose.
2. Confirm the body is non-empty and its category/subcategory exists in
   `src/data/categories.txt`.
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
revision hash covers the body, title, description, category, and subcategory;
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
